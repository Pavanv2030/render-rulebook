// Razorpay webhook handler — verifies signature & auto-processes UPI payments
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function tgSend(token: string, chatId: string, text: string, kb?: any) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", reply_markup: kb }),
    });
  } catch (e) { console.error("tgSend failed:", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
  const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
  const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "";

  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") || "";
  const expected = await hmacSha256Hex(WEBHOOK_SECRET, raw);
  if (sig !== expected) {
    console.error("Invalid webhook signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw);
  console.log("Razorpay webhook event:", event.event);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Extract payment from various event shapes
  const payment = event.payload?.payment?.entity;
  if (!payment || payment.status !== "captured") {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const notes = payment.notes || {};
  const purpose = notes.purpose;        // "order" | "topup"
  const referenceId = notes.reference_id;
  const telegramId = notes.telegram_id;
  const chatId = notes.chat_id || telegramId;
  const ourOrderId = notes.our_id;      // razorpay_payments PK

  if (!ourOrderId) {
    console.error("payment.captured missing our_id note", payment.id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Idempotency: check current status
  const { data: rp } = await supabase
    .from("razorpay_payments")
    .select("status")
    .eq("razorpay_order_id", ourOrderId)
    .maybeSingle();

  if (rp?.status === "paid") {
    return new Response(JSON.stringify({ ok: true, already: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("razorpay_payments").update({
    razorpay_payment_id: payment.id,
    status: "paid",
    paid_at: new Date().toISOString(),
  }).eq("razorpay_order_id", ourOrderId);

  const amountInr = Number(payment.amount) / 100;

  if (purpose === "order") {
    // Mark order paid + trigger auto-deliver
    await supabase.from("orders").update({
      status: "payment_received",
      payment_method: "UPI Auto",
      transaction_id: payment.id,
    }).eq("order_id", referenceId);

    await tgSend(BOT_TOKEN, chatId,
      `✅ *Payment Received!*\n━━━━━━━━━━━━━━━\n\n🆔 Order: \`${referenceId}\`\n💰 ₹${amountInr.toFixed(2)}\n📱 Via UPI Auto\n\n⏳ Preparing your accounts...`,
      { inline_keyboard: [[{ text: "📊 Track Order", callback_data: "check_status" }]] });

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/auto-deliver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          ...(ADMIN_PASSWORD ? { "x-admin-key": ADMIN_PASSWORD } : {}),
        },
        body: JSON.stringify({ orderId: referenceId }),
      });
    } catch (e) { console.error("auto-deliver failed:", e); }

    if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
      await tgSend(ADMIN_BOT_TOKEN, ADMIN_CHAT_ID,
        `⚡ *Razorpay Auto-Pay*\n━━━━━━━━━━━━━━━\n👤 \`${telegramId}\`\n🆔 Order: \`${referenceId}\`\n💰 ₹${amountInr.toFixed(2)}\n🧾 Payment: \`${payment.id}\``);
    }
  } else if (purpose === "topup") {
    // Credit wallet
    const { error: rpcErr } = await supabase.rpc("adjust_wallet_balance", {
      _telegram_id: telegramId,
      _currency: "INR",
      _delta: amountInr,
      _type: "topup",
      _reference_id: payment.id,
      _note: "Razorpay UPI Auto",
    });

    if (rpcErr) {
      console.error("wallet credit failed:", rpcErr);
    } else {
      // Mark any pending topup_request as approved (if exists)
      if (referenceId) {
        await supabase.from("wallet_topup_requests").update({
          status: "approved",
          resolved_at: new Date().toISOString(),
          admin_notes: `Auto-approved via Razorpay ${payment.id}`,
        }).eq("id", referenceId);
      }

      const { data: w } = await supabase.from("customer_wallets")
        .select("balance_inr").eq("telegram_id", telegramId).maybeSingle();
      const newBal = Number(w?.balance_inr || 0);

      await tgSend(BOT_TOKEN, chatId,
        `✅ *Wallet Credited!*\n━━━━━━━━━━━━━━━\n\n💵 Added: *₹${amountInr.toFixed(2)}*\n💰 New Balance: *₹${newBal.toFixed(2)}*\n📱 Via UPI Auto\n\nYou can now use it to pay for orders.`,
        { inline_keyboard: [[
          { text: "💵 Wallet", callback_data: "wallet" },
          { text: "🛒 Buy", callback_data: "start" },
        ]] });

      if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
        await tgSend(ADMIN_BOT_TOKEN, ADMIN_CHAT_ID,
          `⚡ *Razorpay Wallet Top-up*\n━━━━━━━━━━━━━━━\n👤 \`${telegramId}\`\n💵 +₹${amountInr.toFixed(2)}\n💰 New: ₹${newBal.toFixed(2)}\n🧾 \`${payment.id}\``);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

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

  // Accept payment.captured, payment.authorized, qr_code.credited
  const payment = event.payload?.payment?.entity;
  const qrCode = event.payload?.qr_code?.entity;
  const evtType: string = event.event || "";
  const isQrCredited = evtType === "qr_code.credited";

  // For payment.* events require captured. qr_code.credited is itself the credit confirmation.
  if (!isQrCredited) {
    if (!payment || payment.status !== "captured") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Notes may live on qr_code (QR payments) or on payment (orders/links).
  // For QR-based UPI, payment.notes is often empty, so we MUST fall back to qr.id lookup.
  const notes = qrCode?.notes || payment?.notes || {};
  const ourRef = notes.reference_id;
  const purposeHint = notes.purpose;
  const appOrderId = notes.app_order_id || ourRef;
  let telegramId = notes.telegram_id;
  let chatId = notes.chat_id || telegramId;

  // Primary lookup: qr_code.id (stored as razorpay_order_id when QR was created).
  // Fallback: reference_id from notes.
  let rp: any = null;
  if (qrCode?.id) {
    const { data } = await supabase
      .from("razorpay_payments")
      .select("*")
      .eq("razorpay_order_id", qrCode.id)
      .maybeSingle();
    rp = data;
  }
  if (!rp && ourRef) {
    const { data } = await supabase
      .from("razorpay_payments")
      .select("*")
      .eq("reference_id", ourRef)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    rp = data;
  }

  if (!rp) {
    console.error("No razorpay_payments row for event", evtType, "qr.id=", qrCode?.id, "ref=", ourRef, "pay=", payment?.id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  if (rp.status === "paid") {
    return new Response(JSON.stringify({ ok: true, already: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  telegramId = telegramId || rp.telegram_id;
  chatId = chatId || rp.chat_id;
  const purpose = rp.purpose || purposeHint;

  // Resolve payment id and amount from whichever entity carries it.
  // qr_code.credited puts the credited amount on qr_code.payments_amount_received and
  // also includes payment.entity. Fall back to our stored amount if needed.
  const payId = payment?.id || qrCode?.last_payment_id || null;
  const amountPaise = Number(payment?.amount ?? qrCode?.payments_amount_received ?? 0);

  // Never trust a payment that does not cover the stored amount (and order total)
  let requiredPaise = Math.round(Number(rp.amount) * 100);
  if (purpose === "order") {
    const { data: ord } = await supabase.from("orders").select("amount").eq("order_id", rp.reference_id).maybeSingle();
    if (!ord) {
      console.error("Order missing for payment", rp.reference_id);
      return new Response(JSON.stringify({ ok: true, skipped: "order_missing" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    requiredPaise = Math.max(requiredPaise, Math.round(Number(ord.amount) * 100));
  }
  if (!isFinite(amountPaise) || amountPaise < requiredPaise) {
    console.error("Underpaid payment", rp.razorpay_order_id, amountPaise, requiredPaise);
    return new Response(JSON.stringify({ ok: true, skipped: "amount_mismatch" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Atomically claim this payment — only one event (webhook or manual check) will succeed.
  const { data: claimed } = await supabase.from("razorpay_payments").update({
    razorpay_payment_id: payId,
    status: "paid",
    paid_at: new Date().toISOString(),
  })
    .eq("razorpay_order_id", rp.razorpay_order_id)
    .eq("status", "created")
    .select("razorpay_order_id");

  if (!claimed || claimed.length === 0) {
    return new Response(JSON.stringify({ ok: true, already: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const amountInr = amountPaise / 100;


  if (purpose === "order") {
    // Mark order paid + trigger auto-deliver
    await supabase.from("orders").update({
      status: "payment_received",
      payment_method: "UPI Auto",
      transaction_id: payId,
    }).eq("order_id", appOrderId);

    await tgSend(BOT_TOKEN, chatId,
      `✅ *Payment Received!*\n━━━━━━━━━━━━━━━\n\n🆔 Order: \`${appOrderId}\`\n💰 ₹${amountInr.toFixed(2)}\n📱 Via UPI Auto\n\n⏳ Preparing your accounts...`,
      { inline_keyboard: [[{ text: "📊 Track Order", callback_data: "check_status" }]] });

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/auto-deliver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          ...(ADMIN_PASSWORD ? { "x-admin-key": ADMIN_PASSWORD } : {}),
        },
        body: JSON.stringify({ orderId: appOrderId }),
      });
    } catch (e) { console.error("auto-deliver failed:", e); }

    if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
      await tgSend(ADMIN_BOT_TOKEN, ADMIN_CHAT_ID,
        `⚡ *Razorpay Auto-Pay*\n━━━━━━━━━━━━━━━\n👤 \`${telegramId}\`\n🆔 Order: \`${appOrderId}\`\n💰 ₹${amountInr.toFixed(2)}\n🧾 Payment: \`${payId}\``);
    }
  } else if (purpose === "topup") {
    // Credit wallet
    const { error: rpcErr } = await supabase.rpc("adjust_wallet_balance", {
      _telegram_id: telegramId,
      _currency: "INR",
      _delta: amountInr,
      _type: "topup",
      _reference_id: payId,
      _note: "Razorpay UPI Auto",
    });

    if (rpcErr) {
      console.error("wallet credit failed:", rpcErr);
    } else {

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
          `⚡ *Razorpay Wallet Top-up*\n━━━━━━━━━━━━━━━\n👤 \`${telegramId}\`\n💵 +₹${amountInr.toFixed(2)}\n💰 New: ₹${newBal.toFixed(2)}\n🧾 \`${payId}\``);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REGULAR_PRICE = 50; // ₹50 per account
const AGED_PRICE = 100;   // ₹100 per account
const MIN_QTY = 1;
const MAX_QTY = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { message, sessionId } = body;
    if (!message || !sessionId) {
      return new Response(JSON.stringify({ error: "message and sessionId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const chatId = `web_${sessionId}`;
    const input = String(message).toLowerCase().trim();

    // ========== WALLET ACTIONS (web) ==========
    if (input === "__get_wallet__") {
      const { data: w } = await supabase.from("customer_wallets").select("balance_inr, balance_usdt").eq("telegram_id", chatId).maybeSingle();
      const { data: tx } = await supabase.from("wallet_transactions").select("*").eq("telegram_id", chatId).order("created_at", { ascending: false }).limit(10);
      const { data: pending } = await supabase.from("wallet_topup_requests").select("*").eq("telegram_id", chatId).eq("status", "pending").order("created_at", { ascending: false });
      const { data: settings } = await supabase.from("sell_settings").select("min_topup_inr, min_topup_usdt").eq("id", 1).maybeSingle();
      const { data: upi } = await supabase.from("upi_wallets").select("upi_id, display_name").eq("is_active", true).limit(1);
      const { data: crypto } = await supabase.from("crypto_wallets").select("coin_symbol, coin_name, network, wallet_address").eq("is_active", true);
      return new Response(JSON.stringify({
        wallet: w || { balance_inr: 0, balance_usdt: 0 },
        transactions: tx || [],
        pendingTopups: pending || [],
        minTopupInr: Number(settings?.min_topup_inr ?? 50),
        minTopupUsdt: Number(settings?.min_topup_usdt ?? 2),
        upi: upi?.[0] || null,
        crypto: crypto || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (input === "__create_topup__") {
      const { amount, currency, payment_method, proof_text } = body;
      const amt = Number(amount);
      if (!isFinite(amt) || amt <= 0 || !["INR", "USDT"].includes(currency) || !["upi", "crypto"].includes(payment_method)) {
        return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: settings } = await supabase.from("sell_settings").select("min_topup_inr, min_topup_usdt").eq("id", 1).maybeSingle();
      const min = currency === "INR" ? Number(settings?.min_topup_inr ?? 50) : Number(settings?.min_topup_usdt ?? 2);
      if (amt < min) {
        return new Response(JSON.stringify({ error: `Minimum ${currency === "INR" ? "₹" : "$"}${min}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("customers").upsert({ telegram_id: chatId, username: "web_user", first_name: "Web Visitor" }, { onConflict: "telegram_id" });
      const { data: rq } = await supabase.from("wallet_topup_requests").insert({
        telegram_id: chatId, username: "web_user", amount: amt, currency, payment_method,
        proof_text: proof_text || null, source: "web",
      }).select().single();

      const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
      const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
      if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID && rq) {
        const sym = currency === "INR" ? "₹" : "$";
        await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: `💰 *NEW WALLET TOP-UP (Web)*\n\n👤 \`${chatId}\`\n💵 ${sym}${amt.toFixed(2)} ${currency}\n💳 ${payment_method.toUpperCase()}\n${proof_text ? `🔖 \`${proof_text}\`\n` : ""}\nReview in admin panel.`,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify({ inline_keyboard: [[
              { text: "✅ Approve", callback_data: `topup_approve_${rq.id}` },
              { text: "❌ Reject", callback_data: `topup_reject_${rq.id}` },
            ]]}),
          }),
        });
      }
      return new Response(JSON.stringify({ success: true, id: rq?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (input === "__pay_with_balance__") {
      const { orderId } = body;
      if (!orderId) return new Response(JSON.stringify({ error: "orderId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: order } = await supabase.from("orders").select("*").eq("order_id", orderId).eq("customer_id", chatId).maybeSingle();
      if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (order.status !== "pending") return new Response(JSON.stringify({ error: `Order is ${order.status}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const currency = (order.currency || "INR").toUpperCase();
      const { error: rpcErr } = await supabase.rpc("adjust_wallet_balance", {
        _telegram_id: chatId, _currency: currency, _delta: -Number(order.amount),
        _type: "order_payment", _reference_id: orderId, _note: `Order ${orderId}`,
      });
      if (rpcErr) return new Response(JSON.stringify({ error: rpcErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabase.from("orders").update({ status: "approved", payment_method: "wallet" }).eq("order_id", orderId);
      // Notify admin bot of wallet purchase
      try {
        const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
        const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
        if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
          const sym = currency === "USDT" ? "$" : "₹";
          const { data: w } = await supabase.from("customer_wallets").select("balance_inr,balance_usdt").eq("telegram_id", chatId).maybeSingle();
          const newBal = currency === "USDT" ? Number(w?.balance_usdt || 0) : Number(w?.balance_inr || 0);
          const text = `💼 *Wallet Purchase* (Web)\n━━━━━━━━━━━━━━━\n👤 \`${chatId}\`\n🆔 Order: \`${orderId}\`\n${order.country} • ${order.account_type} × ${order.quantity}\n💸 Spent: *${sym}${Number(order.amount).toFixed(2)}*\n💰 Remaining: *${sym}${newBal.toFixed(2)}*`;
          await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: "Markdown" }),
          });
        }
      } catch (e) { console.error("admin notify failed:", e); }
      const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "";
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/auto-deliver`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, ...(ADMIN_PASSWORD ? { "x-admin-key": ADMIN_PASSWORD } : {}) },
          body: JSON.stringify({ orderId }),
        });
      } catch (e) { console.error("auto-deliver failed:", e); }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== RAZORPAY UPI AUTO-PAY (QR) ==========
    if (input === "__create_rzp_qr__") {
      const { purpose, amount, orderId } = body;
      let amt = Number(amount);
      if (!["order", "topup"].includes(purpose) || (purpose === "topup" && (!isFinite(amt) || amt <= 0 || amt > 100000))) {
        return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (purpose === "order") {
        if (!orderId || typeof orderId !== "string") {
          return new Response(JSON.stringify({ error: "orderId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Price always comes from the stored order, never from the request
        const { data: ord } = await supabase.from("orders").select("amount, status, customer_id")
          .eq("order_id", orderId).eq("customer_id", chatId).maybeSingle();
        if (!ord || ord.status !== "pending") {
          return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        amt = Number(ord.amount);
      }
      const RP_KEY = Deno.env.get("RAZORPAY_KEY_ID");
      const RP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
      if (!RP_KEY || !RP_SECRET) {
        return new Response(JSON.stringify({ error: "Auto-Pay is not configured" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("customers").upsert({ telegram_id: chatId, username: "web_user", first_name: "Web Visitor" }, { onConflict: "telegram_id" });
      const ourId = purpose === "order" ? orderId : `TOPUP-${Date.now()}`;
      const amountPaise = Math.round(amt * 100);
      const closeBy = Math.floor(Date.now() / 1000) + 30 * 60;
      try {
        const rpRes = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
          method: "POST",
          headers: { Authorization: "Basic " + btoa(`${RP_KEY}:${RP_SECRET}`), "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "upi_qr",
            name: purpose === "order" ? `Order ${orderId}` : `Wallet Top-up`,
            usage: "single_use",
            fixed_amount: true,
            payment_amount: amountPaise,
            description: purpose === "order" ? `Order ${orderId}` : `Wallet Top-up ₹${amt}`,
            close_by: closeBy,
            notes: { purpose, reference_id: ourId, app_order_id: orderId || "", telegram_id: chatId, chat_id: chatId, source: "web" },
          }),
        });
        const rpData = await rpRes.json();
        if (!rpRes.ok || !rpData.id || !rpData.image_url) {
          console.error("Razorpay QR create failed:", rpData);
          return new Response(JSON.stringify({ error: rpData?.error?.description || "Razorpay error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        await supabase.from("razorpay_payments").insert({
          razorpay_order_id: rpData.id, amount: amt, currency: "INR",
          purpose, reference_id: ourId, telegram_id: chatId, chat_id: chatId, status: "created",
        });
        return new Response(JSON.stringify({
          qrId: rpData.id, imageUrl: rpData.image_url, amount: amt, expiresAt: closeBy * 1000,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        console.error("Razorpay create error:", e);
        return new Response(JSON.stringify({ error: "Razorpay request failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (input === "__check_rzp__") {
      const { qrId } = body;
      if (!qrId) return new Response(JSON.stringify({ error: "qrId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const RP_KEY = Deno.env.get("RAZORPAY_KEY_ID");
      const RP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
      const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "";

      const { data: rp } = await supabase.from("razorpay_payments").select("*").eq("razorpay_order_id", qrId).eq("telegram_id", chatId).maybeSingle();
      if (!rp) return new Response(JSON.stringify({ error: "QR not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (rp.status === "paid") {
        return new Response(JSON.stringify({ paid: true, purpose: rp.purpose, reference_id: rp.reference_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!RP_KEY || !RP_SECRET) {
        return new Response(JSON.stringify({ paid: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      let captured: any = null;
      try {
        const res = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrId}/payments`, {
          headers: { Authorization: "Basic " + btoa(`${RP_KEY}:${RP_SECRET}`) },
        });
        const j = await res.json();
        captured = (j?.items || []).find((p: any) => p.status === "captured");
      } catch (e) { console.error("rzp check failed:", e); }
      if (!captured) {
        return new Response(JSON.stringify({ paid: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Captured amount must cover the stored payment (and order) amount
      {
        let required = Math.round(Number(rp.amount) * 100);
        if (rp.purpose === "order") {
          const { data: ord } = await supabase.from("orders").select("amount").eq("order_id", rp.reference_id).maybeSingle();
          if (!ord) return new Response(JSON.stringify({ paid: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          required = Math.max(required, Math.round(Number(ord.amount) * 100));
        }
        if (Number(captured.amount) < required) {
          console.error("Underpaid QR", qrId, captured.amount, required);
          return new Response(JSON.stringify({ paid: false, error: "Amount mismatch" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      const { data: claimed } = await supabase.from("razorpay_payments")
        .update({ status: "paid", razorpay_payment_id: captured.id, paid_at: new Date().toISOString() })
        .eq("razorpay_order_id", qrId).eq("status", "created").select();
      const amountInr = Number(captured.amount) / 100;

      if (claimed?.length) {
        if (rp.purpose === "order") {
          await supabase.from("orders").update({
            status: "payment_received", payment_method: "UPI Auto", transaction_id: captured.id,
          }).eq("order_id", rp.reference_id);
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/auto-deliver`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, ...(ADMIN_PASSWORD ? { "x-admin-key": ADMIN_PASSWORD } : {}) },
              body: JSON.stringify({ orderId: rp.reference_id }),
            });
          } catch (e) { console.error("auto-deliver failed:", e); }
        } else if (rp.purpose === "topup") {
          await supabase.rpc("adjust_wallet_balance", {
            _telegram_id: rp.telegram_id, _currency: "INR", _delta: amountInr,
            _type: "topup", _reference_id: captured.id, _note: "Razorpay UPI Auto (Web)",
          });
        }
        // Notify admin
        try {
          const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
          const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
          if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
            const text = rp.purpose === "order"
              ? `⚡ *Web Auto-Pay* (Order)\n👤 \`${rp.telegram_id}\`\n🆔 \`${rp.reference_id}\`\n💰 ₹${amountInr.toFixed(2)}\n🧾 \`${captured.id}\``
              : `⚡ *Web Auto-Pay* (Top-up)\n👤 \`${rp.telegram_id}\`\n💵 +₹${amountInr.toFixed(2)}\n🧾 \`${captured.id}\``;
            await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: "Markdown" }),
            });
          }
        } catch (e) { console.error("admin notify failed:", e); }
      }
      return new Response(JSON.stringify({ paid: true, purpose: rp.purpose, reference_id: rp.reference_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== BUY-SECTION ACTIONS ==========
    if (input === "__get_public_data__") {
      const { data: pricing } = await supabase
        .from("country_pricing").select("*").order("country_name");
      const { data: stockRows } = await supabase.rpc("get_public_stock");
      const stock: Record<string, { regular: number; aged: number }> = {};
      for (const r of (stockRows || []) as any[]) {
        if (!stock[r.country]) stock[r.country] = { regular: 0, aged: 0 };
        stock[r.country][r.account_type as "regular" | "aged"] = Number(r.available);
      }
      const { data: upi } = await supabase
        .from("upi_wallets").select("upi_id, display_name").eq("is_active", true).limit(1);
      return new Response(JSON.stringify({
        pricing: pricing || [], stock, upi: upi?.[0] || null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (input === "__create_order__") {
      const { country, accountType, quantity } = body;
      const qty = parseInt(String(quantity));
      const acctType = accountType === "aged" ? "aged" : "regular";
      if (!country || !isFinite(qty) || qty < MIN_QTY || qty > MAX_QTY) {
        return new Response(JSON.stringify({ error: "Invalid order input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: priceRow } = await supabase
        .from("country_pricing").select("regular_price, aged_price")
        .eq("country_code", country).maybeSingle();
      if (!priceRow) {
        return new Response(JSON.stringify({ error: "Invalid country" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const pricePerAcc = acctType === "aged" ? Number(priceRow.aged_price) : Number(priceRow.regular_price);
      const totalAmount = pricePerAcc * qty;
      await supabase.from("customers").upsert(
        { telegram_id: chatId, username: "web_user", first_name: "Web Buyer" },
        { onConflict: "telegram_id" }
      );
      const oid = `ORD${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("orders").insert({
        order_id: oid, customer_id: chatId, country, account_type: acctType,
        quantity: qty, amount: totalAmount, currency: "INR", status: "pending",
        username: "web_user", payment_method: "upi",
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ orderId: oid, amount: totalAmount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (input === "__mark_paid__") {
      const { orderId } = body;
      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: order } = await supabase.from("orders")
        .select("*").eq("order_id", orderId).eq("customer_id", chatId).maybeSingle();
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (order.status !== "pending") {
        return new Response(JSON.stringify({ error: `Order is ${order.status}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("orders").update({ status: "payment_received" }).eq("order_id", orderId);

      const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
      const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
      if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
        try {
          await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              text: `🚨 *NEW PAYMENT (Web)!*\n\n🆔 Order: \`${order.order_id}\`\n👤 Web Customer\n🌍 ${order.country}\n📦 ${order.quantity}x ${order.account_type}\n💵 *₹${order.amount}*`,
              parse_mode: "Markdown",
              reply_markup: JSON.stringify({ inline_keyboard: [[
                { text: `✅ Approve ${order.order_id}`, callback_data: `approve_${order.order_id}` },
                { text: `❌ Reject ${order.order_id}`, callback_data: `reject_${order.order_id}` },
              ]]}),
            }),
          });
        } catch (e) { console.error("admin notify failed:", e); }
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create conversation state
    let { data: state } = await supabase
      .from("conversation_states")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    if (!state) {
      await supabase.from("conversation_states").insert({ chat_id: chatId, state: "idle" });
      await supabase.from("customers").upsert(
        { telegram_id: chatId, username: "web_user", first_name: "Web Visitor" },
        { onConflict: "telegram_id" }
      );
      state = { state: "idle", selected_country: null, selected_quantity: null, selected_type: null, pending_order_id: null };
    }

    let reply = "";
    let buttons: { text: string; data: string }[] = [];
    let newState: any = {};

    // /start, hi, hello
    if (input === "/start" || input === "hi" || input === "hello" || input === "start" || state.state === "idle") {
      reply = `👋 *Welcome to AirdropAccounts Pro!*\n\n` +
        `🚀 Premium Telegram accounts for airdrop farming.\n\n` +
        `⭐ *Why trust us?*\n` +
        `✅ 3,847+ verified orders delivered\n` +
        `🔒 Instant auto-delivery after payment\n` +
        `💯 100% working accounts guaranteed\n\n` +
        `📦 *Pricing:*\n` +
        `• Regular: ₹50/account\n` +
        `• Aged (6mo+): ₹100/account\n\n` +
        `*Choose account type:*`;
      buttons = [
        { text: "📦 Regular (₹50/acc)", data: "type_regular" },
        { text: "👑 Aged (₹100/acc)", data: "type_aged" },
      ];
      newState = { state: "awaiting_type" };
    }

    // Type selection
    else if (input === "type_regular" || input === "type_aged") {
      const type = input === "type_aged" ? "aged" : "regular";
      const price = type === "aged" ? AGED_PRICE : REGULAR_PRICE;
      reply = `${type === "aged" ? "👑" : "📦"} *${type === "aged" ? "Aged" : "Regular"} Accounts* — ₹${price}/account\n\n` +
        `Enter the number of accounts you want (${MIN_QTY}-${MAX_QTY}):`;
      buttons = [];
      newState = { state: "awaiting_quantity", selected_type: type };
    }

    // Quantity input (number between 1-100)
    else if (state.state === "awaiting_quantity") {
      const qty = parseInt(input);
      const type = state.selected_type || "regular";
      const pricePerAcc = type === "aged" ? AGED_PRICE : REGULAR_PRICE;

      if (isNaN(qty) || qty < MIN_QTY || qty > MAX_QTY) {
        reply = `❌ Please enter a valid number between ${MIN_QTY} and ${MAX_QTY}.`;
        newState = {}; // keep current state
      } else {
        const totalPrice = qty * pricePerAcc;
        const orderId = "ORD" + Date.now().toString().slice(-6);

        await supabase.from("orders").insert({
          order_id: orderId, customer_id: chatId, username: "web_user",
          country: "IN", account_type: type === "aged" ? "Aged" : "Regular",
          quantity: qty, currency: "INR", amount: totalPrice, status: "pending",
        });

        // Fetch active UPI from DB
        const { data: upiWallets } = await supabase.from("upi_wallets").select("*").eq("is_active", true).order("created_at").limit(1);
        const upiId = upiWallets && upiWallets.length > 0 ? upiWallets[0].upi_id : "venkat342@fam";

        reply = `📋 *Order Summary*\n\n` +
          `🆔 Order: \`${orderId}\`\n` +
          `📦 Type: ${type === "aged" ? "👑 Aged" : "Regular"}\n` +
          `🔢 Quantity: ${qty} accounts\n` +
          `💰 Total: *₹${totalPrice.toLocaleString()} INR*\n\n` +
          `💳 *Payment via UPI:*\n` +
          `UPI ID: ${upiId}\n` +
          `Send ₹${totalPrice.toLocaleString()} via GPay/Paytm/PhonePe\n` +
          `Scan the QR code below to pay!\n`;

        buttons = [
          { text: "✅ I have paid", data: "paid" },
          { text: "❌ Cancel order", data: "cancel" },
        ];
        newState = { state: "awaiting_payment", selected_quantity: qty, selected_type: type, pending_order_id: orderId };
      }
    }

    // Payment
    else if (input === "paid" || input.includes("i have paid")) {
      if (state.pending_order_id) {
        await supabase.from("orders").update({ status: "payment_received" }).eq("order_id", state.pending_order_id);
        reply = `✅ *Payment Noted!*\n\n🆔 Order: \`${state.pending_order_id}\`\n\n⏳ We're verifying your payment. Your accounts will be delivered shortly.\n\n📥 You'll receive a download link once verified! 🚀`;
        buttons = [{ text: "🛒 New Order", data: "start" }];

        // Notify admin via admin bot
        const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
        const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
        if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
          const { data: order } = await supabase.from("orders").select("*").eq("order_id", state.pending_order_id).single();
          if (order) {
            const adminBody: any = {
              chat_id: ADMIN_CHAT_ID,
              text: `🚨 *NEW PAYMENT (Web)!*\n\n🆔 Order: \`${order.order_id}\`\n👤 Web Customer\n🌍 Country: 🇮🇳 ${order.country}\n📦 ${order.quantity}x ${order.account_type}\n💵 Amount: *₹${order.amount}*\n\n⚡ Use buttons below to take action:`,
              parse_mode: "Markdown",
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [{ text: `✅ Approve ${order.order_id}`, callback_data: `approve_${order.order_id}` },
                   { text: `❌ Reject ${order.order_id}`, callback_data: `reject_${order.order_id}` }]
                ]
              })
            };
            await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(adminBody),
            });
          }
        }

        newState = { state: "idle", pending_order_id: null };
      } else {
        reply = "❓ No pending order found. Start a new order!";
        buttons = [{ text: "🛒 Start", data: "start" }];
      }
    }

    // Cancel
    else if (input === "cancel") {
      if (state.pending_order_id) {
        await supabase.from("orders").update({ status: "cancelled" }).eq("order_id", state.pending_order_id);
        reply = "❌ Order cancelled.";
      } else {
        reply = "No active order to cancel.";
      }
      buttons = [{ text: "🛒 New Order", data: "start" }];
      newState = { state: "idle", pending_order_id: null };
    }

    // /status
    else if (input === "/status" || input === "status") {
      const { data: orders } = await supabase
        .from("orders").select("*").eq("customer_id", chatId)
        .order("created_at", { ascending: false }).limit(5);

      if (orders && orders.length > 0) {
        reply = "📊 *Your Recent Orders:*\n\n";
        for (const o of orders) {
          const emoji = o.status === "delivered" ? "✅" : o.status === "pending" ? "⏳" : o.status === "payment_received" ? "🔍" : "❌";
          reply += `${emoji} \`${o.order_id}\` — ${o.quantity}x ${o.account_type} — ₹${o.amount} — ${o.status}\n`;
        }
      } else {
        reply = "📭 No orders found. Start your first order!";
      }
      buttons = [{ text: "🛒 New Order", data: "start" }];
    }

    // Fallback
    else {
      reply = `🤖 *AirdropAccounts Pro*\n\nI can help you buy Telegram accounts!\n\nChoose an option below:`;
      buttons = [
        { text: "🛒 Order Accounts", data: "start" },
        { text: "📊 Order Status", data: "status" },
      ];
    }

    // Update state
    if (Object.keys(newState).length > 0) {
      await supabase.from("conversation_states")
        .upsert({ chat_id: chatId, ...newState, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
    }

    // UPI modal data
    const responseData: any = { reply, buttons };
    if (newState.pending_order_id && newState.state === "awaiting_payment") {
      const pricePerAcc = (newState.selected_type === "aged") ? AGED_PRICE : REGULAR_PRICE;
      const totalPrice = (newState.selected_quantity || 0) * pricePerAcc;
      responseData.upiAmount = totalPrice;
      responseData.orderId = newState.pending_order_id;
      const { data: upiWallets } = await supabase.from("upi_wallets")
        .select("upi_id").eq("is_active", true).order("created_at").limit(1);
      responseData.upiId = upiWallets?.[0]?.upi_id || "venkat342@fam";
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Web chat error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

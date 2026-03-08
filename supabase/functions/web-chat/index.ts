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
    const { message, sessionId } = await req.json();
    if (!message || !sessionId) {
      return new Response(JSON.stringify({ error: "message and sessionId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const chatId = `web_${sessionId}`;
    const input = message.toLowerCase().trim();

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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICING: Record<string, any> = {
  IN: { regular: { 5: 250, 10: 500, 25: 1200, 50: 2300, 100: 4500 }, aged: { 5: 1245, 10: 2235, 25: 4500 }, sym: "₹", curr: "INR", upi: true },
  US: { regular: { 5: 5, 10: 9, 25: 20, 50: 35, 100: 60 }, aged: { 5: 15, 10: 27, 25: 60 }, sym: "$", curr: "USDT", upi: false },
  PK: { regular: { 5: 1390, 10: 2500, 25: 5560, 50: 9730 }, aged: { 5: 4170, 10: 7500, 25: 16680 }, sym: "₨", curr: "PKR", upi: false },
  BD: { regular: { 5: 550, 10: 990, 25: 2200, 50: 3850, 100: 6600 }, aged: { 5: 1650, 10: 2970, 25: 6600 }, sym: "৳", curr: "BDT", upi: false },
  PH: { regular: { 5: 285, 10: 513, 25: 1140, 50: 1995, 100: 3420 }, aged: { 5: 855, 10: 1539, 25: 3420 }, sym: "₱", curr: "PHP", upi: false },
};

const COUNTRY_MAP: Record<string, string> = {
  india: "IN", usa: "US", us: "US", pakistan: "PK", bangladesh: "BD", philippines: "PH",
};

const COUNTRY_FLAGS: Record<string, string> = { IN: "🇮🇳", US: "🇺🇸", PK: "🇵🇰", BD: "🇧🇩", PH: "🇵🇭" };
const COUNTRY_NAMES: Record<string, string> = { IN: "India", US: "USA", PK: "Pakistan", BD: "Bangladesh", PH: "Philippines" };

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
      state = { state: "idle", selected_country: null, selected_quantity: null, selected_type: "regular", pending_order_id: null };
    }

    let reply = "";
    let buttons: { text: string; data: string }[] = [];
    let newState: any = {};

    // /start, hi, hello
    if (input === "/start" || input === "hi" || input === "hello" || input === "start" || state.state === "idle") {
      reply = `👋 *Welcome to AirdropAccounts Pro!*\n\n` +
        `🚀 Premium virtual Telegram accounts for airdrop farming.\n\n` +
        `⭐ *Why trust us?*\n` +
        `✅ 3,847+ verified orders delivered\n` +
        `🔒 Instant auto-delivery after payment\n` +
        `💯 100% working accounts guaranteed\n\n` +
        `🌍 *Select your country:*`;
      buttons = [
        { text: "🇮🇳 India", data: "country_india" },
        { text: "🇺🇸 USA", data: "country_usa" },
        { text: "🇵🇰 Pakistan", data: "country_pakistan" },
        { text: "🇧🇩 Bangladesh", data: "country_bangladesh" },
        { text: "🇵🇭 Philippines", data: "country_philippines" },
      ];
      newState = { state: "awaiting_country" };
    }

    // Country selection
    else if (input.startsWith("country_") || COUNTRY_MAP[input]) {
      const countryKey = input.startsWith("country_") ? input.replace("country_", "") : input;
      const code = COUNTRY_MAP[countryKey];

      if (code && PRICING[code]) {
        const p = PRICING[code];
        reply = `${COUNTRY_FLAGS[code]} *${COUNTRY_NAMES[code]} — Prices in ${p.curr}*\n\n`;
        reply += "*Regular Accounts:*\n";
        for (const [qty, price] of Object.entries(p.regular)) {
          const popular = qty === "25";
          reply += `${popular ? "🔥" : "📦"} ${qty} accounts = ${p.sym}${price}${popular ? " (POPULAR)" : ""}\n`;
        }
        reply += "\n*👑 Aged Accounts (6mo+) — 3x Success Rate:*\n";
        for (const [qty, price] of Object.entries(p.aged)) {
          reply += `👑 ${qty} accounts = ${p.sym}${price}\n`;
        }
        reply += "\n*Select quantity:*";

        for (const q of Object.keys(p.regular)) {
          buttons.push({ text: `📦 ${q} accs`, data: `qty_regular_${q}` });
        }
        for (const q of Object.keys(p.aged)) {
          buttons.push({ text: `👑 ${q} aged`, data: `qty_aged_${q}` });
        }
        newState = { state: "awaiting_quantity", selected_country: code };
      }
    }

    // Quantity selection
    else if (input.startsWith("qty_")) {
      const parts = input.replace("qty_", "").split("_");
      const type = parts[0];
      const qty = parseInt(parts[1]);
      const country = state.selected_country || "US";
      const p = PRICING[country];
      const priceTable = type === "aged" ? p.aged : p.regular;
      const price = priceTable?.[qty];

      if (!price) {
        reply = "❌ Invalid quantity. Please try again.";
      } else {
        const orderId = "ORD" + Date.now().toString().slice(-6);
        await supabase.from("orders").insert({
          order_id: orderId, customer_id: chatId, username: "web_user",
          country, account_type: type === "aged" ? "Aged" : "Regular",
          quantity: qty, currency: p.curr, amount: price, status: "pending",
        });

        reply = `📋 *Order Summary*\n\n` +
          `🆔 Order: \`${orderId}\`\n` +
          `🌍 Country: ${COUNTRY_FLAGS[country]} ${COUNTRY_NAMES[country]}\n` +
          `📦 Type: ${type === "aged" ? "👑 Aged" : "Regular"}\n` +
          `🔢 Quantity: ${qty} accounts\n` +
          `💰 Total: *${p.sym}${price} ${p.curr}*\n\n`;

        if (p.upi) {
          reply += `💳 *Payment via UPI:*\nSend ${p.sym}${price} to our UPI ID\nAfter payment, click "I have paid"\n`;
        } else {
          reply += `💳 *Payment via USDT:*\nSend equivalent in USDT (TRC20/BEP20)\nAfter payment, click "I have paid"\n`;
        }
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
        reply = `✅ *Payment Noted!*\n\n🆔 Order: \`${state.pending_order_id}\`\n\n⏳ We're verifying your payment. Your accounts will be delivered shortly.\n\nUse the bot on Telegram for faster delivery! 🚀`;
        buttons = [{ text: "🛒 New Order", data: "start" }];
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
          reply += `${emoji} \`${o.order_id}\` — ${o.quantity}x ${o.account_type} — ${o.status}\n`;
        }
      } else {
        reply = "📭 No orders found. Start your first order!";
      }
      buttons = [{ text: "🛒 New Order", data: "start" }];
    }

    // Fallback
    else {
      reply = `🤖 *AirdropAccounts Pro*\n\nI can help you buy Telegram accounts!\n\n` +
        `Choose an option below:`;
      buttons = [
        { text: "🛒 Browse Accounts", data: "start" },
        { text: "📊 Order Status", data: "status" },
      ];
    }

    // Update state
    if (Object.keys(newState).length > 0) {
      await supabase.from("conversation_states")
        .upsert({ chat_id: chatId, ...newState, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
    }

    return new Response(JSON.stringify({ reply, buttons }), {
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

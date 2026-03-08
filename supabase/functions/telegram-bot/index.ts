import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  "🇮🇳 india": "IN", "🇺🇸 usa": "US", "🇵🇰 pakistan": "PK", "🇧🇩 bangladesh": "BD", "🇵🇭 philippines": "PH",
};

const COUNTRY_FLAGS: Record<string, string> = {
  IN: "🇮🇳", US: "🇺🇸", PK: "🇵🇰", BD: "🇧🇩", PH: "🇵🇭",
};

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", US: "USA", PK: "Pakistan", BD: "Bangladesh", PH: "Philippines",
};

async function sendTelegramMessage(botToken: string, chatId: string, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);
  
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!BOT_TOKEN) {
    return new Response("TELEGRAM_BOT_TOKEN not configured", { status: 500 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const update = await req.json();
    
    // Extract message info
    const message = update.message || update.callback_query?.message;
    const callbackQuery = update.callback_query;
    const chatId = String(message?.chat?.id || callbackQuery?.from?.id);
    const text = (update.message?.text || "").trim();
    const callbackData = callbackQuery?.data || "";
    const username = (message?.from?.username || update.callback_query?.from?.username || "unknown");
    const firstName = (message?.from?.first_name || update.callback_query?.from?.first_name || "User");

    if (!chatId) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Answer callback query immediately
    if (callbackQuery) {
      await answerCallbackQuery(BOT_TOKEN, callbackQuery.id);
    }

    // Get or create conversation state
    let { data: state } = await supabase
      .from("conversation_states")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    if (!state) {
      const { data: newState } = await supabase
        .from("conversation_states")
        .insert({ chat_id: chatId, state: "idle" })
        .select()
        .single();
      state = newState;
    }

    // Upsert customer
    await supabase.from("customers").upsert(
      { telegram_id: chatId, username, first_name: firstName },
      { onConflict: "telegram_id" }
    );

    const input = (callbackData || text).toLowerCase();

    // ========== ROUTING ==========

    // /start, hi, hello → Welcome
    if (input === "/start" || input === "hi" || input === "hello" || input === "start") {
      await sendTelegramMessage(BOT_TOKEN, chatId,
        `👋 *Welcome to AirdropAccounts Pro, ${firstName}!*\n\n` +
        `🚀 Premium virtual Telegram accounts for airdrop farming.\n\n` +
        `⭐ *Why trust us?*\n` +
        `✅ 3,847+ verified orders delivered\n` +
        `🔒 Instant auto-delivery after payment\n` +
        `💯 100% working accounts guaranteed\n` +
        `🎁 Free sample for new buyers — type /sample\n\n` +
        `🌍 *Select your country to see prices:*`,
        {
          inline_keyboard: [
            [{ text: "🇮🇳 India", callback_data: "country_india" }, { text: "🇺🇸 USA", callback_data: "country_usa" }],
            [{ text: "🇵🇰 Pakistan", callback_data: "country_pakistan" }, { text: "🇧🇩 Bangladesh", callback_data: "country_bangladesh" }],
            [{ text: "🇵🇭 Philippines", callback_data: "country_philippines" }],
          ],
        }
      );
      await supabase.from("conversation_states").update({ state: "awaiting_country", updated_at: new Date().toISOString() }).eq("chat_id", chatId);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Country selection
    if (input.startsWith("country_") || COUNTRY_MAP[input]) {
      const countryKey = input.startsWith("country_") ? input.replace("country_", "") : input;
      const code = COUNTRY_MAP[countryKey];
      
      if (code && PRICING[code]) {
        const p = PRICING[code];
        let msg = `${COUNTRY_FLAGS[code]} *${COUNTRY_NAMES[code]} — Prices in ${p.curr}*\n\n`;
        msg += "*Regular Accounts:*\n";
        for (const [qty, price] of Object.entries(p.regular)) {
          const popular = qty === "25";
          msg += `${popular ? "🔥" : "📦"} ${qty} accounts = ${p.sym}${price}${popular ? " (POPULAR)" : ""}\n`;
        }
        msg += "\n*👑 Aged Accounts (6mo+) — 3x Success Rate:*\n";
        for (const [qty, price] of Object.entries(p.aged)) {
          msg += `👑 ${qty} accounts = ${p.sym}${price}\n`;
        }
        msg += "\n*Select quantity:*";

        const regularBtns = Object.keys(p.regular).map((q) => ({
          text: `📦 ${q} accs`, callback_data: `qty_regular_${q}`,
        }));
        const agedBtns = Object.keys(p.aged).map((q) => ({
          text: `👑 ${q} aged`, callback_data: `qty_aged_${q}`,
        }));

        // Chunk into rows of 3
        const chunk = (arr: any[], size: number) => {
          const res = [];
          for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
          return res;
        };

        await sendTelegramMessage(BOT_TOKEN, chatId, msg, {
          inline_keyboard: [...chunk(regularBtns, 3), ...chunk(agedBtns, 3)],
        });

        await supabase.from("conversation_states")
          .update({ state: "awaiting_quantity", selected_country: code, updated_at: new Date().toISOString() })
          .eq("chat_id", chatId);
        
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
    }

    // Quantity selection
    if (input.startsWith("qty_")) {
      const parts = input.replace("qty_", "").split("_");
      const type = parts[0]; // regular or aged
      const qty = parseInt(parts[1]);
      const country = state?.selected_country || "US";
      const p = PRICING[country];
      const priceTable = type === "aged" ? p.aged : p.regular;
      const price = priceTable[qty];

      if (!price) {
        await sendTelegramMessage(BOT_TOKEN, chatId, "❌ Invalid quantity. Please try again.");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const orderId = "ORD" + Date.now().toString().slice(-6);

      // Save order
      await supabase.from("orders").insert({
        order_id: orderId,
        customer_id: chatId,
        username,
        country,
        account_type: type === "aged" ? "Aged" : "Regular",
        quantity: qty,
        currency: p.curr,
        amount: price,
        status: "pending",
      });

      await supabase.from("conversation_states")
        .update({ state: "awaiting_payment", selected_quantity: qty, selected_type: type, pending_order_id: orderId, updated_at: new Date().toISOString() })
        .eq("chat_id", chatId);

      let paymentMsg = `📋 *Order Summary*\n\n` +
        `🆔 Order: \`${orderId}\`\n` +
        `🌍 Country: ${COUNTRY_FLAGS[country]} ${COUNTRY_NAMES[country]}\n` +
        `📦 Type: ${type === "aged" ? "👑 Aged" : "Regular"}\n` +
        `🔢 Quantity: ${qty} accounts\n` +
        `💰 Total: *${p.sym}${price} ${p.curr}*\n\n`;

      if (p.upi) {
        paymentMsg += `💳 *Payment via UPI:*\n` +
          `Send ${p.sym}${price} to our UPI ID\n` +
          `After payment, send screenshot or type "paid"\n`;
      } else {
        paymentMsg += `💳 *Payment via USDT:*\n` +
          `Send equivalent in USDT (TRC20/BEP20)\n` +
          `After payment, type "paid" with transaction ID\n`;
      }

      await sendTelegramMessage(BOT_TOKEN, chatId, paymentMsg, {
        inline_keyboard: [
          [{ text: "✅ I have paid", callback_data: "paid" }],
          [{ text: "❌ Cancel order", callback_data: "cancel" }],
        ],
      });

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Payment confirmation
    if (input === "paid" || input.includes("i have paid") || input.includes("payment done")) {
      if (state?.pending_order_id) {
        await supabase.from("orders")
          .update({ status: "payment_received" })
          .eq("order_id", state.pending_order_id);

        await supabase.from("conversation_states")
          .update({ state: "payment_review", updated_at: new Date().toISOString() })
          .eq("chat_id", chatId);

        await sendTelegramMessage(BOT_TOKEN, chatId,
          `✅ *Payment Noted!*\n\n` +
          `🆔 Order: \`${state.pending_order_id}\`\n\n` +
          `⏳ We're verifying your payment. Your accounts will be delivered shortly.\n` +
          `📦 You'll receive a ZIP file directly here once confirmed.\n\n` +
          `Use /status to check your order status anytime.`
        );
      } else {
        await sendTelegramMessage(BOT_TOKEN, chatId, "❓ No pending order found. Start a new order with /start");
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Cancel order
    if (input === "cancel") {
      if (state?.pending_order_id) {
        await supabase.from("orders").update({ status: "cancelled" }).eq("order_id", state.pending_order_id);
        await supabase.from("conversation_states")
          .update({ state: "idle", pending_order_id: null, updated_at: new Date().toISOString() })
          .eq("chat_id", chatId);
        await sendTelegramMessage(BOT_TOKEN, chatId, "❌ Order cancelled. Type /start to begin a new order.");
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // /status
    if (input === "/status") {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", chatId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (orders && orders.length > 0) {
        let msg = "📊 *Your Recent Orders:*\n\n";
        for (const o of orders) {
          const statusEmoji = o.status === "delivered" ? "✅" : o.status === "pending" ? "⏳" : o.status === "payment_received" ? "🔍" : "❌";
          msg += `${statusEmoji} \`${o.order_id}\` — ${o.quantity}x ${o.account_type} (${COUNTRY_FLAGS[o.country] || ""}) — ${o.status}\n`;
        }
        await sendTelegramMessage(BOT_TOKEN, chatId, msg);
      } else {
        await sendTelegramMessage(BOT_TOKEN, chatId, "📭 No orders found. Type /start to place your first order!");
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // /refer
    if (input === "/refer") {
      let { data: customer } = await supabase
        .from("customers")
        .select("referral_code")
        .eq("telegram_id", chatId)
        .single();

      let refCode = customer?.referral_code;
      if (!refCode) {
        refCode = "REF" + chatId.slice(-6) + Math.random().toString(36).slice(-3).toUpperCase();
        await supabase.from("customers").update({ referral_code: refCode }).eq("telegram_id", chatId);
      }

      await sendTelegramMessage(BOT_TOKEN, chatId,
        `🎁 *Referral Program*\n\n` +
        `Share your code and earn *5% commission* on every sale!\n\n` +
        `Your referral code: \`${refCode}\`\n` +
        `Share link: https://t.me/airdro12pbot?start=${refCode}\n\n` +
        `When someone uses your code, you earn automatically! 💰`
      );
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Support/human
    if (input.includes("support") || input.includes("human") || input.includes("help me")) {
      await sendTelegramMessage(BOT_TOKEN, chatId,
        `🧑‍💻 *Need Human Support?*\n\n` +
        `Our team typically responds within 30 minutes.\n\n` +
        `In the meantime, try:\n` +
        `📊 /status — Check order status\n` +
        `🛒 /start — Place a new order\n` +
        `🎁 /refer — Get your referral code\n\n` +
        `A support agent will reach out to you shortly! 🙏`
      );
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Fallback
    await sendTelegramMessage(BOT_TOKEN, chatId,
      `🤖 *AirdropAccounts Pro Bot*\n\n` +
      `Available commands:\n` +
      `🛒 /start — Browse & order accounts\n` +
      `📊 /status — Check your order status\n` +
      `🎁 /refer — Get referral link (earn 5%)\n` +
      `🧑‍💻 Type "support" — Contact human agent\n\n` +
      `Need accounts? Just type /start to begin! 🚀`
    );

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (error) {
    console.error("Bot error:", error);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }
});

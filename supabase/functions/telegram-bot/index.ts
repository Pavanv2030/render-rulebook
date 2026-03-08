import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PER_ACCOUNT_PRICE = { regular: 50, aged: 100 };
const CURRENCY = "INR";
const SYMBOL = "₹";

const COUNTRIES = [
  { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "US", flag: "🇺🇸", name: "USA" },
  { code: "UK", flag: "🇬🇧", name: "UK" },
  { code: "ET", flag: "🇪🇹", name: "Ethiopia" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" },
];

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
  const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const update = await req.json();

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

    // /start → Welcome with country selection
    if (input === "/start" || input === "hi" || input === "hello" || input === "start") {
      const countryButtons = COUNTRIES.map(c => [
        { text: `${c.flag} ${c.name}`, callback_data: `country_${c.code}` }
      ]);

      await sendTelegramMessage(BOT_TOKEN, chatId,
        `👋 *Welcome to AirdropAccounts Pro, ${firstName}!*\n\n` +
        `🚀 Premium Telegram accounts for airdrop farming.\n\n` +
        `⭐ *Why trust us?*\n` +
        `✅ 3,847+ verified orders delivered\n` +
        `🔒 Delivery after payment verification\n` +
        `💯 100% working accounts guaranteed\n\n` +
        `📦 *Pricing:*\n` +
        `• Regular: ${SYMBOL}${PER_ACCOUNT_PRICE.regular}/account\n` +
        `• Aged (6mo+): ${SYMBOL}${PER_ACCOUNT_PRICE.aged}/account\n\n` +
        `🌍 *Select your country:*`,
        { inline_keyboard: countryButtons }
      );

      await supabase.from("conversation_states")
        .update({ state: "awaiting_country", updated_at: new Date().toISOString() })
        .eq("chat_id", chatId);

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Country selection
    if (input.startsWith("country_")) {
      const countryCode = input.replace("country_", "").toUpperCase();
      const country = COUNTRIES.find(c => c.code === countryCode);

      if (!country) {
        await sendTelegramMessage(BOT_TOKEN, chatId, "❌ Invalid country. Please try /start again.");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      await supabase.from("conversation_states")
        .update({ state: "awaiting_type", selected_country: countryCode, updated_at: new Date().toISOString() })
        .eq("chat_id", chatId);

      await sendTelegramMessage(BOT_TOKEN, chatId,
        `${country.flag} *${country.name}* selected!\n\n*Choose account type:*`,
        {
          inline_keyboard: [
            [
              { text: `📦 Regular (${SYMBOL}${PER_ACCOUNT_PRICE.regular}/acc)`, callback_data: "type_regular" },
              { text: `👑 Aged (${SYMBOL}${PER_ACCOUNT_PRICE.aged}/acc)`, callback_data: "type_aged" },
            ],
          ],
        }
      );
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Type selection
    if (input === "type_regular" || input === "type_aged") {
      const type = input === "type_aged" ? "aged" : "regular";
      const price = PER_ACCOUNT_PRICE[type];
      const label = type === "aged" ? "👑 Aged" : "📦 Regular";

      await supabase.from("conversation_states")
        .update({ state: "awaiting_quantity", selected_type: type, updated_at: new Date().toISOString() })
        .eq("chat_id", chatId);

      await sendTelegramMessage(BOT_TOKEN, chatId,
        `${label} *Accounts* — ${SYMBOL}${price}/account\n\n` +
        `Enter the number of accounts you want (1-100):`
      );
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Quantity input
    if (state?.state === "awaiting_quantity") {
      const qty = parseInt(input);
      if (isNaN(qty) || qty < 1 || qty > 100) {
        await sendTelegramMessage(BOT_TOKEN, chatId,
          "❌ Please enter a valid number between 1 and 100."
        );
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const type = state.selected_type || "regular";
      const country = state.selected_country || "IN";
      const countryInfo = COUNTRIES.find(c => c.code === country);
      const pricePerAcc = type === "aged" ? PER_ACCOUNT_PRICE.aged : PER_ACCOUNT_PRICE.regular;
      const totalPrice = qty * pricePerAcc;
      const label = type === "aged" ? "👑 Aged" : "Regular";
      const orderId = "ORD" + Date.now().toString().slice(-6);

      // Save order with country
      await supabase.from("orders").insert({
        order_id: orderId,
        customer_id: chatId,
        username,
        country,
        account_type: label,
        quantity: qty,
        currency: CURRENCY,
        amount: totalPrice,
        status: "pending",
      });

      await supabase.from("conversation_states")
        .update({
          state: "awaiting_payment",
          selected_quantity: qty,
          pending_order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq("chat_id", chatId);

      const paymentMsg =
        `📋 *Order Summary*\n\n` +
        `🆔 Order: \`${orderId}\`\n` +
        `🌍 Country: ${countryInfo?.flag || ""} ${countryInfo?.name || country}\n` +
        `📦 Type: ${label}\n` +
        `🔢 Quantity: ${qty} accounts\n` +
        `💰 Total: *${SYMBOL}${totalPrice} ${CURRENCY}*\n\n` +
        `💳 *Payment via UPI:*\n` +
        `UPI ID: \`venkat342@fam\`\n` +
        `Send ${SYMBOL}${totalPrice} via GPay / Paytm / PhonePe\n` +
        `After payment, send screenshot or tap "I have paid"`;

      await sendTelegramMessage(BOT_TOKEN, chatId, paymentMsg, {
        inline_keyboard: [
          [{ text: "✅ I have paid", callback_data: "paid" }],
          [{ text: "❌ Cancel order", callback_data: "cancel" }],
        ],
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Payment confirmation — notify admin for approval (NO auto-deliver)
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
          `⏳ Your payment is being reviewed by our admin.\n` +
          `📦 Once approved, your accounts will be delivered instantly here!\n\n` +
          `Use /status to check your order status anytime.`
        );

        // Notify admin about new payment
        if (ADMIN_CHAT_ID) {
          const { data: order } = await supabase.from("orders")
            .select("*")
            .eq("order_id", state.pending_order_id)
            .single();

          if (order) {
            const countryInfo = COUNTRIES.find(c => c.code === order.country);
            await sendTelegramMessage(BOT_TOKEN, ADMIN_CHAT_ID,
              `💰 *New Payment Received!*\n\n` +
              `🆔 Order: \`${order.order_id}\`\n` +
              `👤 @${username} (${firstName})\n` +
              `🌍 Country: ${countryInfo?.flag || ""} ${order.country}\n` +
              `📦 ${order.quantity}x ${order.account_type}\n` +
              `💵 Amount: ${SYMBOL}${order.amount}\n\n` +
              `Go to Admin Panel to approve & deliver. ✅`
            );
          }
        }
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
          const ci = COUNTRIES.find(c => c.code === o.country);
          msg += `${statusEmoji} \`${o.order_id}\` — ${ci?.flag || ""} ${o.quantity}x ${o.account_type} — *${SYMBOL}${o.amount}* — ${o.status.replace("_", " ")}\n`;
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

    // Support
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

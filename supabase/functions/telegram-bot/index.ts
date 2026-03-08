import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CURRENCY = "INR";
const SYMBOL = "₹";

const COUNTRIES = [
  { code: "IN", flag: "🇮🇳", name: "India" }, { code: "US", flag: "🇺🇸", name: "USA" },
  { code: "UK", flag: "🇬🇧", name: "UK" }, { code: "ET", flag: "🇪🇹", name: "Ethiopia" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" }, { code: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "DE", flag: "🇩🇪", name: "Germany" }, { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria" }, { code: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa" }, { code: "AE", flag: "🇦🇪", name: "UAE" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia" }, { code: "TR", flag: "🇹🇷", name: "Turkey" },
  { code: "CA", flag: "🇨🇦", name: "Canada" }, { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "JP", flag: "🇯🇵", name: "Japan" }, { code: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "TM", flag: "🇹🇲", name: "Turkmenistan" }, { code: "MG", flag: "🇲🇬", name: "Madagascar" },
];

async function sendMsg(botToken: string, chatId: string, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);
  return await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

async function answerCb(botToken: string, cbId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: cbId, text }),
  });
}

async function getPricing(supabase: any): Promise<Record<string, { regular: number; aged: number }>> {
  try {
    const { data } = await supabase.from("country_pricing").select("country_code, regular_price, aged_price");
    if (data && data.length > 0) {
      const pricing: Record<string, { regular: number; aged: number }> = {};
      for (const row of data) {
        pricing[row.country_code] = { regular: Number(row.regular_price), aged: Number(row.aged_price) };
      }
      return pricing;
    }
  } catch (e) { console.error("Pricing fetch failed:", e); }
  return { IN: { regular: 50, aged: 100 }, US: { regular: 50, aged: 150 } };
}

async function getStock(supabase: any, country: string): Promise<{ regular: number; aged: number }> {
  const { data } = await supabase.from("account_inventory").select("account_type").eq("country", country).eq("status", "available");
  let regular = 0, aged = 0;
  (data || []).forEach((i: any) => { if (i.account_type === "aged") aged++; else regular++; });
  return { regular, aged };
}

function progressBar(step: number, total: number): string {
  const filled = "▓";
  const empty = "░";
  return filled.repeat(step) + empty.repeat(total - step) + ` ${step}/${total}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!BOT_TOKEN) return new Response("BOT_TOKEN not set", { status: 500 });

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
    const username = message?.from?.username || callbackQuery?.from?.username || "unknown";
    const firstName = message?.from?.first_name || callbackQuery?.from?.first_name || "Friend";

    if (!chatId) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    if (callbackQuery) await answerCb(BOT_TOKEN, callbackQuery.id);

    // Upsert customer & conversation state
    let { data: state } = await supabase.from("conversation_states").select("*").eq("chat_id", chatId).single();
    if (!state) {
      const { data: ns } = await supabase.from("conversation_states").insert({ chat_id: chatId, state: "idle" }).select().single();
      state = ns;
    }
    await supabase.from("customers").upsert({ telegram_id: chatId, username, first_name: firstName }, { onConflict: "telegram_id" });

    const input = (callbackData || text).toLowerCase();
    const PRICING = await getPricing(supabase);

    // ═══════════════════════════════════════
    // 📸 Photo/Screenshot Handler
    // ═══════════════════════════════════════
    const photo = update.message?.photo;
    if (photo && photo.length > 0 && (state?.state === "awaiting_payment" || state?.state === "payment_review") && state?.pending_order_id) {
      const fileId = photo[photo.length - 1].file_id; // highest resolution
      const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");

      // Mark as payment_received
      await supabase.from("orders").update({ status: "payment_received" }).eq("order_id", state.pending_order_id);
      await supabase.from("conversation_states").update({ state: "payment_review", updated_at: new Date().toISOString() }).eq("chat_id", chatId);

      await sendMsg(BOT_TOKEN, chatId,
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `   📸 *SCREENSHOT RECEIVED*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `✅ Your payment screenshot for\n` +
        `order \`${state.pending_order_id}\` has been\nforwarded to our admin.\n\n` +
        `⏱️ Verification time: *5–15 min*\n\n` +
        `💡 _You'll be notified once your\naccounts are ready!_`,
        { inline_keyboard: [
          [{ text: "📊 Check Status", callback_data: "check_status" }],
          [{ text: "🛒 Place Another Order", callback_data: "start" }],
        ]});

      // Forward screenshot + order info to admin bot
      if (ADMIN_CHAT_ID && ADMIN_BOT_TOKEN) {
        const { data: order } = await supabase.from("orders").select("*").eq("order_id", state.pending_order_id).single();
        if (order) {
          const ci = COUNTRIES.find(c => c.code === order.country);
          // Send photo with caption to admin
          await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              photo: fileId,
              caption: `🚨 *PAYMENT SCREENSHOT*\n\n🆔 Order: \`${order.order_id}\`\n👤 @${username} (${firstName})\n🌍 ${ci?.flag || ""} ${order.country}\n📦 ${order.quantity}x ${order.account_type}\n💵 *${SYMBOL}${order.amount}*`,
              parse_mode: "Markdown",
            }),
          });
          // Send action buttons separately
          await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              text: `⚡ *Take action on ${order.order_id}:*`,
              parse_mode: "Markdown",
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [{ text: `✅ Approve ${order.order_id}`, callback_data: `approve_${order.order_id}` },
                   { text: `❌ Reject ${order.order_id}`, callback_data: `reject_${order.order_id}` }]
                ]
              }),
            }),
          });
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════
    // 🏠 /start — Welcome Screen
    // ═══════════════════════════════════════
    if (input === "/start" || input === "hi" || input === "hello" || input === "start" || input === "menu") {
      // Country buttons in rows of 2
      const rows: any[][] = [];
      for (let i = 0; i < COUNTRIES.length; i += 2) {
        const row = [{ text: `${COUNTRIES[i].flag} ${COUNTRIES[i].name}`, callback_data: `country_${COUNTRIES[i].code}` }];
        if (COUNTRIES[i + 1]) row.push({ text: `${COUNTRIES[i + 1].flag} ${COUNTRIES[i + 1].name}`, callback_data: `country_${COUNTRIES[i + 1].code}` });
        rows.push(row);
      }

      await sendMsg(BOT_TOKEN, chatId,
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `    🚀 *AIRDROP ACCOUNTS PRO*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Hey *${firstName}*! 👋\n\n` +
        `Premium Telegram accounts ready\nfor airdrop farming — delivered\ninstantly to your inbox.\n\n` +
        `╔══════════════════╗\n` +
        `║  ✅  3,847+ Orders Delivered    ║\n` +
        `║  ⭐  4.9/5 Customer Rating       ║\n` +
        `║  ⚡  Instant Auto-Delivery        ║\n` +
        `║  🔒  100% Working Guarantee   ║\n` +
        `╚══════════════════╝\n\n` +
        `🌍 *Step 1:* Select your country below:\n\n` +
        `${progressBar(1, 4)}`,
        { inline_keyboard: rows });

      await supabase.from("conversation_states").update({ state: "awaiting_country", updated_at: new Date().toISOString() }).eq("chat_id", chatId);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════
    // 🌍 Country Selection
    // ═══════════════════════════════════════
    if (input.startsWith("country_")) {
      const code = input.replace("country_", "").toUpperCase();
      const country = COUNTRIES.find(c => c.code === code);
      if (!country) {
        await sendMsg(BOT_TOKEN, chatId, "❌ Invalid selection. Tap /start to try again.");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const pricing = PRICING[code] || { regular: 50, aged: 100 };
      const stock = await getStock(supabase, code);

      await supabase.from("conversation_states").update({ state: "awaiting_type", selected_country: code, updated_at: new Date().toISOString() }).eq("chat_id", chatId);

      await sendMsg(BOT_TOKEN, chatId,
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${country.flag} *${country.name}* — Pricing\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `┌─────────────────────┐\n` +
        `│ 📦 *Regular Accounts*        │\n` +
        `│ Price: *${SYMBOL}${pricing.regular}*/account     │\n` +
        `│ Stock: ${stock.regular > 0 ? `✅ ${stock.regular} available` : "❌ Out of stock"}  │\n` +
        `├─────────────────────┤\n` +
        `│ 👑 *Aged Accounts (6mo+)* │\n` +
        `│ Price: *${SYMBOL}${pricing.aged}*/account      │\n` +
        `│ Stock: ${stock.aged > 0 ? `✅ ${stock.aged} available` : "❌ Out of stock"}    │\n` +
        `└─────────────────────┘\n\n` +
        `📋 *Step 2:* Choose account type:\n\n` +
        `${progressBar(2, 4)}`,
        { inline_keyboard: [
          [{ text: `📦 Regular — ${SYMBOL}${pricing.regular}/acc`, callback_data: "type_regular" }],
          [{ text: `👑 Aged — ${SYMBOL}${pricing.aged}/acc`, callback_data: "type_aged" }],
          [{ text: "🔙 Back to Countries", callback_data: "start" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════
    // 📦 Type Selection
    // ═══════════════════════════════════════
    if (input === "type_regular" || input === "type_aged") {
      const type = input === "type_aged" ? "aged" : "regular";
      const selectedCountry = state?.selected_country || "IN";
      const pricing = PRICING[selectedCountry] || { regular: 50, aged: 100 };
      const price = pricing[type as "regular" | "aged"];
      const label = type === "aged" ? "👑 Aged" : "📦 Regular";
      const country = COUNTRIES.find(c => c.code === selectedCountry);

      await supabase.from("conversation_states").update({ state: "awaiting_quantity", selected_type: type, updated_at: new Date().toISOString() }).eq("chat_id", chatId);

      // Quick quantity buttons
      const qtyRows = [
        [{ text: "1️⃣", callback_data: "qty_1" }, { text: "2️⃣", callback_data: "qty_2" }, { text: "3️⃣", callback_data: "qty_3" }, { text: "5️⃣", callback_data: "qty_5" }],
        [{ text: "🔟 10", callback_data: "qty_10" }, { text: "📦 25", callback_data: "qty_25" }, { text: "📦 50", callback_data: "qty_50" }, { text: "💯 100", callback_data: "qty_100" }],
        [{ text: "🔙 Back", callback_data: `country_${selectedCountry}` }],
      ];

      await sendMsg(BOT_TOKEN, chatId,
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${label} — ${country?.flag || ""} ${country?.name || selectedCountry}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `💰 *${SYMBOL}${price}* per account\n\n` +
        `🔢 *Step 3:* How many accounts?\n\n` +
        `Tap a quick option below or\ntype any number (1–100):\n\n` +
        `${progressBar(3, 4)}`,
        { inline_keyboard: qtyRows });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════
    // 🔢 Quantity — Quick Buttons
    // ═══════════════════════════════════════
    if (input.startsWith("qty_")) {
      const qty = parseInt(input.replace("qty_", ""));
      if (!isNaN(qty) && qty >= 1 && qty <= 100) {
        // Process as quantity input
        return await processQuantity(qty, state, chatId, username, supabase, BOT_TOKEN, PRICING, ADMIN_CHAT_ID);
      }
    }

    // ═══════════════════════════════════════
    // 🔢 Quantity — Manual Input
    // ═══════════════════════════════════════
    if (state?.state === "awaiting_quantity") {
      const qty = parseInt(input);
      if (isNaN(qty) || qty < 1 || qty > 100) {
        await sendMsg(BOT_TOKEN, chatId, "⚠️ Please enter a number between *1* and *100*.\n\nOr tap a quick option above ☝️");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      return await processQuantity(qty, state, chatId, username, supabase, BOT_TOKEN, PRICING, ADMIN_CHAT_ID);
    }

    // ═══════════════════════════════════════
    // ✅ Payment Confirmation
    // ═══════════════════════════════════════
    if (input === "paid" || input.includes("i have paid") || input.includes("payment done") || input.includes("paid done")) {
      if (state?.pending_order_id) {
        await supabase.from("orders").update({ status: "payment_received" }).eq("order_id", state.pending_order_id);
        await supabase.from("conversation_states").update({ state: "payment_review", updated_at: new Date().toISOString() }).eq("chat_id", chatId);

        await sendMsg(BOT_TOKEN, chatId,
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `   ✅ *PAYMENT RECEIVED*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🆔 Order: \`${state.pending_order_id}\`\n\n` +
          `🔄 *What happens next:*\n\n` +
          `  1️⃣  Admin verifies payment ⏳\n` +
          `  2️⃣  Order gets approved ✅\n` +
          `  3️⃣  Accounts delivered here 📥\n\n` +
          `⏱️ Typical time: *5–15 minutes*\n\n` +
          `💡 _You'll get a notification as soon\nas your accounts are ready!_\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━`,
          { inline_keyboard: [
            [{ text: "📊 Check Status", callback_data: "check_status" }],
            [{ text: "🛒 Place Another Order", callback_data: "start" }],
          ]});

        // Notify admin
        const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
        if (ADMIN_CHAT_ID && ADMIN_BOT_TOKEN) {
          const { data: order } = await supabase.from("orders").select("*").eq("order_id", state.pending_order_id).single();
          if (order) {
            const ci = COUNTRIES.find(c => c.code === order.country);
            const adminBody = {
              chat_id: ADMIN_CHAT_ID,
              text: `🚨 *NEW PAYMENT RECEIVED!*\n\n🆔 Order: \`${order.order_id}\`\n👤 @${username} (${firstName})\n🌍 ${ci?.flag || ""} ${order.country}\n📦 ${order.quantity}x ${order.account_type}\n💵 *${SYMBOL}${order.amount}*\n\n⚡ Take action:`,
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
      } else {
        await sendMsg(BOT_TOKEN, chatId, "❓ No pending order found.\n\nTap below to start a new order! 👇",
          { inline_keyboard: [[{ text: "🛒 Start New Order", callback_data: "start" }]] });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════
    // ❌ Cancel Order
    // ═══════════════════════════════════════
    if (input === "cancel") {
      if (state?.pending_order_id) {
        await supabase.from("orders").update({ status: "cancelled" }).eq("order_id", state.pending_order_id);
        await supabase.from("conversation_states").update({ state: "idle", pending_order_id: null, updated_at: new Date().toISOString() }).eq("chat_id", chatId);
        await sendMsg(BOT_TOKEN, chatId,
          `❌ *Order Cancelled*\n\nYour order \`${state.pending_order_id}\` has been cancelled.\nNo payment required.\n\nWant to try again? 👇`,
          { inline_keyboard: [[{ text: "🛒 New Order", callback_data: "start" }]] });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════
    // 📊 /status or check_status
    // ═══════════════════════════════════════
    if (input === "/status" || input === "check_status" || input === "/myorders") {
      const limit = input === "/myorders" ? 20 : 5;
      const { data: orders } = await supabase.from("orders").select("*").eq("customer_id", chatId).order("created_at", { ascending: false }).limit(limit);

      if (orders && orders.length > 0) {
        let msg = `━━━━━━━━━━━━━━━━━━━━━━\n   📊 *YOUR ORDERS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        let totalSpent = 0, delivered = 0;

        for (const o of orders) {
          const emoji = o.status === "delivered" ? "✅" : o.status === "pending" ? "⏳" : o.status === "payment_received" ? "🔍" : o.status === "approved" ? "📦" : o.status === "rejected" ? "❌" : "🚫";
          const statusText = o.status === "payment_received" ? "Under Review" : o.status === "delivered" ? "Delivered ✓" : o.status.replace("_", " ");
          const ci = COUNTRIES.find(c => c.code === o.country);
          const date = new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

          msg += `${emoji} \`${o.order_id}\`\n`;
          msg += `   ${ci?.flag || "🌍"} ${o.quantity}x ${o.account_type} — *${SYMBOL}${o.amount}*\n`;
          msg += `   Status: *${statusText}* • ${date}\n\n`;

          if (o.status === "delivered") { totalSpent += o.amount; delivered++; }
        }

        msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📈 *${orders.length} orders* | ✅ *${delivered} delivered* | 💰 *${SYMBOL}${totalSpent}* spent`;

        await sendMsg(BOT_TOKEN, chatId, msg,
          { inline_keyboard: [[{ text: "🛒 New Order", callback_data: "start" }, { text: "🔄 Refresh", callback_data: "check_status" }]] });
      } else {
        await sendMsg(BOT_TOKEN, chatId,
          `📭 *No orders yet!*\n\nYou haven't placed any orders.\nStart your first order now! 🚀`,
          { inline_keyboard: [[{ text: "🛒 Start Shopping", callback_data: "start" }]] });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════
    // 🎁 /refer
    // ═══════════════════════════════════════
    if (input === "/refer") {
      let { data: customer } = await supabase.from("customers").select("referral_code").eq("telegram_id", chatId).single();
      let refCode = customer?.referral_code;
      if (!refCode) {
        refCode = "REF" + chatId.slice(-6) + Math.random().toString(36).slice(-3).toUpperCase();
        await supabase.from("customers").update({ referral_code: refCode }).eq("telegram_id", chatId);
      }

      await sendMsg(BOT_TOKEN, chatId,
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `   🎁 *REFERRAL PROGRAM*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Earn *5% commission* on every\nsale from your referrals! 💰\n\n` +
        `🔗 *Your Referral Link:*\nhttps://t.me/airdro12pbot?start=${refCode}\n\n` +
        `📋 *Your Code:* \`${refCode}\`\n\n` +
        `*How it works:*\n` +
        `1️⃣ Share your link with friends\n` +
        `2️⃣ They place an order\n` +
        `3️⃣ You earn 5% automatically! 🤑\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`,
        { inline_keyboard: [[{ text: "🛒 Back to Shop", callback_data: "start" }]] });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════
    // 🧑‍💻 Support
    // ═══════════════════════════════════════
    if (input.includes("support") || input.includes("human") || input.includes("help me") || input === "/support") {
      await sendMsg(BOT_TOKEN, chatId,
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `   🧑‍💻 *CUSTOMER SUPPORT*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Our team typically responds\nwithin *15–30 minutes*.\n\n` +
        `A support agent will contact\nyou shortly! 🙏\n\n` +
        `💡 *Quick Help:*`,
        { inline_keyboard: [
          [{ text: "📊 Check Order Status", callback_data: "check_status" }],
          [{ text: "🛒 Place New Order", callback_data: "start" }],
          [{ text: "🎁 Referral Program", callback_data: "/refer" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════
    // 🤖 Fallback — Main Menu
    // ═══════════════════════════════════════
    await sendMsg(BOT_TOKEN, chatId,
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `   🚀 *AIRDROP ACCOUNTS PRO*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Hey *${firstName}*! What would you\nlike to do today?\n\n` +
      `Choose an option below 👇`,
      { inline_keyboard: [
        [{ text: "🛒 Buy Accounts", callback_data: "start" }],
        [{ text: "📊 My Orders", callback_data: "check_status" }, { text: "🎁 Refer & Earn", callback_data: "/refer" }],
        [{ text: "🧑‍💻 Support", callback_data: "support" }],
      ]});
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

  } catch (error) {
    console.error("Bot error:", error);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }
});

// ═══════════════════════════════════════
// Process Quantity & Create Order
// ═══════════════════════════════════════
async function processQuantity(qty: number, state: any, chatId: string, username: string, supabase: any, BOT_TOKEN: string, PRICING: any, ADMIN_CHAT_ID?: string) {
  const type = state?.selected_type || "regular";
  const country = state?.selected_country || "IN";
  const ci = COUNTRIES.find(c => c.code === country);
  const pricing = PRICING[country] || { regular: 50, aged: 100 };
  const pricePerAcc = pricing[type as "regular" | "aged"];
  const totalPrice = qty * pricePerAcc;
  const label = type === "aged" ? "👑 Aged" : "📦 Regular";
  const orderId = "ORD" + Date.now().toString().slice(-6);

  await supabase.from("orders").insert({
    order_id: orderId, customer_id: chatId, username, country,
    account_type: type === "aged" ? "Aged" : "Regular",
    quantity: qty, currency: "INR", amount: totalPrice, status: "pending",
  });

  await supabase.from("conversation_states").update({
    state: "awaiting_payment", selected_quantity: qty, pending_order_id: orderId, updated_at: new Date().toISOString(),
  }).eq("chat_id", chatId);

  await sendMsg(BOT_TOKEN, chatId,
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `   📋 *ORDER SUMMARY*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🆔 Order ID: \`${orderId}\`\n\n` +
    `┌─────────────────────┐\n` +
    `│ 🌍 Country:  ${ci?.flag || ""} *${ci?.name || country}*\n` +
    `│ 📦 Type:       ${label}\n` +
    `│ 🔢 Quantity:  *${qty}* accounts\n` +
    `│ 💵 Price:      ${SYMBOL}${pricePerAcc} × ${qty}\n` +
    `├─────────────────────┤\n` +
    `│ 💰 *TOTAL: ${SYMBOL}${totalPrice.toLocaleString()} INR*\n` +
    `└─────────────────────┘\n\n` +
    `${progressBar(4, 4)}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `         💳 *PAY VIA UPI*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📱 UPI ID: \`venkat342@fam\`\n\n` +
    `Send exactly *${SYMBOL}${totalPrice.toLocaleString()}* via:\n` +
    `  • Google Pay\n  • PhonePe\n  • Paytm\n  • Any UPI app\n\n` +
    `📸 *Send payment screenshot* here\nfor faster verification!\n\n` +
    `Or tap *"✅ I Have Paid"* below 👇`,
    { inline_keyboard: [
      [{ text: "✅ I Have Paid", callback_data: "paid" }],
      [{ text: "❌ Cancel Order", callback_data: "cancel" }],
    ]});

  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
}

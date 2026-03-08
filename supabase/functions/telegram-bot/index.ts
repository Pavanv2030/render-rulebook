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

// ── Persistent reply keyboard (always visible) ──
const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "🛒 Buy Accounts" }, { text: "📊 My Orders" }],
    [{ text: "📖 Guide" }, { text: "📲 Login Guide" }],
    [{ text: "🎁 Refer & Earn" }, { text: "🧑‍💻 Support" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

async function sendMsg(botToken: string, chatId: string, text: string, inlineMarkup?: any) {
  const body: any = {
    chat_id: chatId, text, parse_mode: "Markdown",
    reply_markup: inlineMarkup ? JSON.stringify(inlineMarkup) : JSON.stringify(MAIN_KEYBOARD),
  };
  return await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

async function sendPhoto(botToken: string, chatId: string, photo: string, caption: string, inlineMarkup?: any) {
  const body: any = {
    chat_id: chatId, photo, caption, parse_mode: "Markdown",
    reply_markup: inlineMarkup ? JSON.stringify(inlineMarkup) : JSON.stringify(MAIN_KEYBOARD),
  };
  return await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

async function answerCb(botToken: string, cbId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: cbId, text: text || "✓" }),
  });
}

async function getPricing(supabase: any): Promise<Record<string, { regular: number; aged: number }>> {
  try {
    const { data } = await supabase.from("country_pricing").select("country_code, regular_price, aged_price");
    if (data && data.length > 0) {
      const pricing: Record<string, { regular: number; aged: number }> = {};
      for (const row of data) pricing[row.country_code] = { regular: Number(row.regular_price), aged: Number(row.aged_price) };
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

function stepIndicator(step: number): string {
  const steps = ["🌍 Country", "📦 Type", "🔢 Qty", "💳 Pay"];
  return steps.map((s, i) => i + 1 === step ? `▸ *${s}*` : i + 1 < step ? `✅ ${s}` : `○ ${s}`).join("  ");
}

function stockBadge(count: number): string {
  if (count === 0) return "🔴 Sold Out";
  if (count <= 5) return `🟡 ${count} left`;
  return `🟢 ${count} in stock`;
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
    const rawText = (update.message?.text || "").trim();
    const callbackData = callbackQuery?.data || "";
    const username = message?.from?.username || callbackQuery?.from?.username || "unknown";
    const firstName = message?.from?.first_name || callbackQuery?.from?.first_name || "Friend";

    if (!chatId) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    if (callbackQuery) await answerCb(BOT_TOKEN, callbackQuery.id);

    // Upsert state & customer
    let { data: state } = await supabase.from("conversation_states").select("*").eq("chat_id", chatId).single();
    if (!state) {
      const { data: ns } = await supabase.from("conversation_states").insert({ chat_id: chatId, state: "idle" }).select().single();
      state = ns;
    }
    await supabase.from("customers").upsert({ telegram_id: chatId, username, first_name: firstName }, { onConflict: "telegram_id" });

    // Normalize input — handle both callbacks and keyboard button text
    let input = (callbackData || rawText).toLowerCase();
    if (input === "🛒 buy accounts") input = "start";
    if (input === "📊 my orders") input = "check_status";
    if (input === "🎁 refer & earn") input = "/refer";
    if (input === "🧑‍💻 support") input = "support";
    if (input === "📖 guide") input = "/guide";
    if (input === "📲 login guide") input = "/loginguide";

    const PRICING = await getPricing(supabase);

    // ════════════════════════════════════════════
    // 📸 Photo/Screenshot Handler
    // ════════════════════════════════════════════
    const photo = update.message?.photo;
    if (photo && photo.length > 0 && (state?.state === "awaiting_payment" || state?.state === "payment_review") && state?.pending_order_id) {
      const fileId = photo[photo.length - 1].file_id;
      const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");

      await supabase.from("orders").update({ status: "payment_received" }).eq("order_id", state.pending_order_id);
      await supabase.from("conversation_states").update({ state: "payment_review", updated_at: new Date().toISOString() }).eq("chat_id", chatId);

      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║   📸  SCREENSHOT RECEIVED     ║\n` +
        `╚═══════════════════════╝\n\n` +
        `✅ Payment proof for \`${state.pending_order_id}\`\nhas been sent to our team!\n\n` +
        `⏱️ *ETA:* 5–15 minutes\n\n` +
        `We'll send your accounts right\nhere once verified! 📥`,
        { inline_keyboard: [
          [{ text: "📊 Track Order", callback_data: "check_status" }],
          [{ text: "🏠 Main Menu", callback_data: "start" }],
        ]});

      if (ADMIN_CHAT_ID && ADMIN_BOT_TOKEN) {
        const { data: order } = await supabase.from("orders").select("*").eq("order_id", state.pending_order_id).single();
        if (order) {
          const ci = COUNTRIES.find(c => c.code === order.country);
          await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendPhoto`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID, photo: fileId,
              caption: `🚨 *PAYMENT SCREENSHOT*\n\n🆔 \`${order.order_id}\`\n👤 @${username} (${firstName})\n🌍 ${ci?.flag || ""} ${order.country}\n📦 ${order.quantity}x ${order.account_type}\n💵 *${SYMBOL}${order.amount}*`,
              parse_mode: "Markdown",
            }),
          });
          await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              text: `⚡ *Action for ${order.order_id}:*`,
              parse_mode: "Markdown",
              reply_markup: JSON.stringify({ inline_keyboard: [
                [{ text: `✅ Approve`, callback_data: `approve_${order.order_id}` },
                 { text: `❌ Reject`, callback_data: `reject_${order.order_id}` }]
              ]}),
            }),
          });
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📢 Channel Join Check Helper
    // ════════════════════════════════════════════
    const CHANNEL_USERNAME = "riox239";

    async function checkChannelMembership(botToken: string, userId: string): Promise<boolean> {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: `@${CHANNEL_USERNAME}`, user_id: userId }),
        });
        const data = await res.json();
        const status = data?.result?.status;
        return ["member", "administrator", "creator"].includes(status);
      } catch (e) { console.error("Channel check failed:", e); return false; }
    }

    // ════════════════════════════════════════════
    // ✅ "Joined" callback — verify membership
    // ════════════════════════════════════════════
    if (input === "check_joined") {
      const isMember = await checkChannelMembership(BOT_TOKEN, chatId);
      if (!isMember) {
        await sendMsg(BOT_TOKEN, chatId,
          `❌ *You haven't joined yet!*\n\nPlease join our channel first, then tap "✅ Joined" again.`,
          { inline_keyboard: [
            [{ text: "📢 Join Channel", url: "https://t.me/riox239" }],
            [{ text: "✅ Joined", callback_data: "check_joined" }],
          ]});
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      // Member verified — fall through to /start logic below
      input = "start";
    }

    // ════════════════════════════════════════════
    // 🏠 /start — Welcome
    // ════════════════════════════════════════════
    if (input === "/start" || input === "hi" || input === "hello" || input === "start" || input === "menu" || input === "home") {

      // ── Channel join gate for new users ──
      const isMember = await checkChannelMembership(BOT_TOKEN, chatId);
      if (!isMember) {
        await sendMsg(BOT_TOKEN, chatId,
          `╔═══════════════════════╗\n` +
          `║  📢  JOIN OUR CHANNEL         ║\n` +
          `╚═══════════════════════╝\n\n` +
          `Hey *${firstName}*! 👋\n\n` +
          `Before you start, please join our\nofficial channel for:\n\n` +
          `🔹 Latest deals & discounts\n` +
          `🔹 Stock updates\n` +
          `🔹 Important announcements\n` +
          `🔹 Tips & tricks\n\n` +
          `👇 *Tap "Join Channel" then come\nback and tap "✅ Joined"*`,
          { inline_keyboard: [
            [{ text: "📢 Join @riox239", url: "https://t.me/riox239" }],
            [{ text: "✅ Joined", callback_data: "check_joined" }],
          ]});
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Check if first-time user — send promo video
      const { data: existingOrders } = await supabase.from("orders").select("id").eq("customer_id", chatId).limit(1);
      if (!existingOrders || existingOrders.length === 0) {
        const videoUrl = `${SUPABASE_URL}/storage/v1/object/public/bot-assets/promo-video.mp4`;
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId, video: videoUrl,
            caption: `🎬 *Welcome to RIOX ACCOUNTS PRO!*\n\nWatch this quick intro to see how easy it is to buy premium Telegram accounts.\n\n_New here? Type /guide for a step-by-step tutorial!_`,
            parse_mode: "Markdown",
            supports_streaming: true,
          }),
        });
      }

      // Popular countries first row, then rest in groups of 3
      const popular = ["IN", "US", "UK", "AE"];
      const popularRow = popular.map(code => {
        const c = COUNTRIES.find(x => x.code === code)!;
        return { text: `${c.flag} ${c.name}`, callback_data: `country_${c.code}` };
      });

      const rest = COUNTRIES.filter(c => !popular.includes(c.code));
      const restRows: any[][] = [];
      for (let i = 0; i < rest.length; i += 3) {
        const row = rest.slice(i, i + 3).map(c => ({ text: `${c.flag} ${c.name}`, callback_data: `country_${c.code}` }));
        restRows.push(row);
      }

      const allRows = [
        [{ text: "📖 How to Buy (Guide)", callback_data: "guide_1" }],
        popularRow,
        ...restRows,
        [{ text: "📊 My Orders", callback_data: "check_status" }, { text: "🎁 Referrals", callback_data: "/refer" }],
        [{ text: "🧑‍💻 Support", callback_data: "support" }],
      ];

      const bannerUrl = `${SUPABASE_URL}/storage/v1/object/public/bot-assets/welcome-banner.jpg`;

      await sendPhoto(BOT_TOKEN, chatId, bannerUrl,
        `Hey *${firstName}*! 👋 Welcome to\n\n` +
        `╔═══════════════════════╗\n` +
        `║   🚀  RIOX ACCOUNTS PRO       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `Premium Telegram accounts for\nairdrop farming — delivered instantly.\n\n` +
        `┌──── ✨ *Why Us?* ────┐\n` +
        `│                                                     │\n` +
        `│  ✅  3,847+ Happy Customers  │\n` +
        `│  ⭐  4.9★ Avg Rating                │\n` +
        `│  ⚡  Auto-Delivery in <5 min     │\n` +
        `│  🔒  100% Working Guarantee  │\n` +
        `│  💰  Lowest Market Prices        │\n` +
        `│                                                     │\n` +
        `└─────────────────────┘\n\n` +
        `${stepIndicator(1)}\n\n` +
        `⬇️ *Pick your country to begin:*\n` +
        `_(⭐ Popular countries shown first)_\n` +
        `_(📖 New? Tap "How to Buy" for a guide!)_`,
        { inline_keyboard: allRows });

      await supabase.from("conversation_states").update({ state: "awaiting_country", updated_at: new Date().toISOString() }).eq("chat_id", chatId);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📖 /guide — Interactive Step-by-Step Tutorial
    // ════════════════════════════════════════════
    if (input === "/guide" || input === "guide_1") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 1 of 5* — 🌍 Choose Country\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `After pressing /start, you'll see\na list of 20 countries.\n\n` +
        `🔹 *Popular countries* appear first:\n` +
        `   🇮🇳 India • 🇺🇸 USA • 🇬🇧 UK • 🇦🇪 UAE\n\n` +
        `🔹 Simply *tap on your country*\n   to see pricing & availability.\n\n` +
        `💡 _Each country has different\nprices and stock levels._\n\n` +
        `▓░░░░ 1/5`,
        { inline_keyboard: [
          [{ text: "Next → Step 2 📦", callback_data: "guide_2" }],
          [{ text: "⏭️ Skip Guide — Start Buying", callback_data: "start" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input === "guide_2") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 2 of 5* — 📦 Pick Account Type\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `You'll see two options:\n\n` +
        `📦 *Regular Accounts*\n` +
        `   • Fresh, newly created\n` +
        `   • Lower price\n` +
        `   • Great for general farming\n\n` +
        `👑 *Aged Accounts (6mo+)*\n` +
        `   • 6+ months old\n` +
        `   • Higher trust scores\n` +
        `   • Best for premium airdrops\n\n` +
        `🔹 Tap the button to select.\n` +
        `🔹 Stock levels shown in real-time!\n\n` +
        `▓▓░░░ 2/5`,
        { inline_keyboard: [
          [{ text: "← Step 1", callback_data: "guide_1" }, { text: "Step 3 →", callback_data: "guide_3" }],
          [{ text: "⏭️ Skip — Start Buying", callback_data: "start" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input === "guide_3") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 3 of 5* — 🔢 Set Quantity\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Choose how many accounts:\n\n` +
        `🔹 *Quick buttons:*\n` +
        `   1️⃣ 2️⃣ 3️⃣ 5️⃣ 🔟 📦25 📦50 💯\n\n` +
        `🔹 Or *type any number* (1–100)\n\n` +
        `📊 A *price calculator* shows\ntotal cost for each quantity!\n\n` +
        `_Example: 10 × ₹50 = ₹500 total_\n\n` +
        `▓▓▓░░ 3/5`,
        { inline_keyboard: [
          [{ text: "← Step 2", callback_data: "guide_2" }, { text: "Step 4 →", callback_data: "guide_4" }],
          [{ text: "⏭️ Skip — Start Buying", callback_data: "start" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input === "guide_4") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 4 of 5* — 💳 Make Payment\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `After confirming your order:\n\n` +
        `1️⃣ You'll see the *order summary*\n   with total amount\n\n` +
        `2️⃣ A *UPI QR code* is shown —\n   scan it with any UPI app:\n` +
        `   • Google Pay\n   • PhonePe\n   • Paytm\n\n` +
        `3️⃣ Pay the exact amount shown\n\n` +
        `4️⃣ *Send a screenshot* 📸 of your\n   payment for faster verification!\n\n` +
        `5️⃣ Tap *"✅ I Have Paid"*\n\n` +
        `▓▓▓▓░ 4/5`,
        { inline_keyboard: [
          [{ text: "← Step 3", callback_data: "guide_3" }, { text: "Step 5 →", callback_data: "guide_5" }],
          [{ text: "⏭️ Skip — Start Buying", callback_data: "start" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (input === "guide_5") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📖  HOW TO BUY — GUIDE       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*STEP 5 of 5* — 📥 Get Your Accounts!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `After payment verification:\n\n` +
        `✅ Admin approves your order\n` +
        `📥 Accounts are *delivered right here*\n   in this chat as a file!\n\n` +
        `⏱️ *Typical wait: 5–15 minutes*\n\n` +
        `📊 Track anytime: tap *"My Orders"*\n   or type /status\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎉 *That's it! Super easy!*\n\n` +
        `Ready to buy your first accounts?\nTap the button below! 🚀\n\n` +
        `▓▓▓▓▓ 5/5 ✅`,
        { inline_keyboard: [
          [{ text: "🛒 Start Buying Now!", callback_data: "start" }],
          [{ text: "← Back to Step 4", callback_data: "guide_4" }],
          [{ text: "📲 How to Login Accounts", callback_data: "login_guide" }],
          [{ text: "🎬 Watch Promo Video", callback_data: "watch_promo" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📲 Login Guide — How to use .zip accounts
    // ════════════════════════════════════════════
    if (input === "/loginguide" || input === "login_guide") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║  📲  LOGIN GUIDE                       ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*How to Login Accounts Using*\n*the ZIP File You Received:*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Step 1:* 🤖 Start the login bot\n` +
        `   👉 Open @NewLonamiBot\n\n` +
        `*Step 2:* 📖 Click on *"Read OTP"*\n\n` +
        `*Step 3:* 📁 Send the *ZIP file*\n   you received from us\n\n` +
        `*Step 4:* 📱 You'll get a phone number\n` +
        `   → Enter it in your Telegram app\n` +
        `   → Send OTP from your app\n` +
        `   → *Only after sending*, click\n     *"OTP 💑"* in the bot\n` +
        `   → Copy the OTP, paste it\n` +
        `   → Enter the password: \`123\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `⚠️ *IMPORTANT NOTE:*\n` +
        `Click on OTP *only after* you've\nsent the code from your app!\n\n` +
        `🔐 *2-Step Password:* \`123\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`,
        { inline_keyboard: [
          [{ text: "🤖 Open Login Bot", url: "https://t.me/NewLonamiBot" }],
          [{ text: "🛒 Buy Accounts", callback_data: "start" }],
          [{ text: "📖 Buying Guide", callback_data: "guide_1" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Watch promo video on demand
    if (input === "watch_promo" || input === "/video") {
      const videoUrl = `${SUPABASE_URL}/storage/v1/object/public/bot-assets/promo-video.mp4`;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId, video: videoUrl,
          caption: `🎬 *RIOX ACCOUNTS PRO*\n\nPremium Telegram accounts — instant delivery, guaranteed quality!\n\nReady to start? 👇`,
          parse_mode: "Markdown",
          supports_streaming: true,
          reply_markup: JSON.stringify({ inline_keyboard: [
            [{ text: "🛒 Buy Now", callback_data: "start" }],
            [{ text: "📖 Step-by-Step Guide", callback_data: "guide_1" }],
          ]}),
        }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🌍 Country Selection
    // ════════════════════════════════════════════
    if (input.startsWith("country_")) {
      const code = input.replace("country_", "").toUpperCase();
      const country = COUNTRIES.find(c => c.code === code);
      if (!country) {
        await sendMsg(BOT_TOKEN, chatId, "❌ Invalid country. Tap below to retry.", { inline_keyboard: [[{ text: "🏠 Start Over", callback_data: "start" }]] });
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const pricing = PRICING[code] || { regular: 50, aged: 100 };
      const stock = await getStock(supabase, code);

      await supabase.from("conversation_states").update({ state: "awaiting_type", selected_country: code, updated_at: new Date().toISOString() }).eq("chat_id", chatId);

      const regDiscount = stock.regular > 20 ? "" : stock.regular > 0 ? "\n│  ⚠️ _Limited stock!_" : "\n│  🚫 _Currently unavailable_";
      const agedDiscount = stock.aged > 20 ? "" : stock.aged > 0 ? "\n│  ⚠️ _Limited stock!_" : "\n│  🚫 _Currently unavailable_";

      await sendMsg(BOT_TOKEN, chatId,
        `${country.flag} *${country.name}*\n\n` +
        `${stepIndicator(2)}\n\n` +
        `╔═══ 📦 *REGULAR* ═══╗\n` +
        `║                                                  ║\n` +
        `║  💰 *${SYMBOL}${pricing.regular}* per account           ║\n` +
        `║  📊 ${stockBadge(stock.regular)}               ║\n` +
        `║  ✓ Fresh accounts                       ║\n` +
        `║  ✓ Ready to use                           ║${regDiscount}\n` +
        `║                                                  ║\n` +
        `╠═══ 👑 *AGED (6mo+)* ═══╣\n` +
        `║                                                  ║\n` +
        `║  💰 *${SYMBOL}${pricing.aged}* per account             ║\n` +
        `║  📊 ${stockBadge(stock.aged)}                 ║\n` +
        `║  ✓ 6+ months old                         ║\n` +
        `║  ✓ Higher trust score                   ║\n` +
        `║  ✓ Best for premium drops          ║${agedDiscount}\n` +
        `║                                                  ║\n` +
        `╚══════════════════╝\n\n` +
        `👇 *Select account type:*`,
        { inline_keyboard: [
          [{ text: `📦 Regular — ${SYMBOL}${pricing.regular}/acc`, callback_data: "type_regular" }],
          [{ text: `👑 Aged — ${SYMBOL}${pricing.aged}/acc`, callback_data: "type_aged" }],
          [{ text: "🔙 Change Country", callback_data: "start" }, { text: "🏠 Menu", callback_data: "home" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📦 Type Selection → Quantity
    // ════════════════════════════════════════════
    if (input === "type_regular" || input === "type_aged") {
      const type = input === "type_aged" ? "aged" : "regular";
      const selectedCountry = state?.selected_country || "IN";
      const pricing = PRICING[selectedCountry] || { regular: 50, aged: 100 };
      const price = pricing[type as "regular" | "aged"];
      const label = type === "aged" ? "👑 Aged" : "📦 Regular";
      const country = COUNTRIES.find(c => c.code === selectedCountry);

      await supabase.from("conversation_states").update({ state: "awaiting_quantity", selected_type: type, updated_at: new Date().toISOString() }).eq("chat_id", chatId);

      await sendMsg(BOT_TOKEN, chatId,
        `${country?.flag || ""} *${country?.name}* → ${label}\n\n` +
        `${stepIndicator(3)}\n\n` +
        `💰 Price: *${SYMBOL}${price}* per account\n\n` +
        `╔══════════════════╗\n` +
        `║  🧮 *PRICE CALCULATOR*          ║\n` +
        `╠══════════════════╣\n` +
        `║  1 acc  →  ${SYMBOL}${price}                         ║\n` +
        `║  5 acc  →  ${SYMBOL}${price * 5}                     ║\n` +
        `║  10 acc →  ${SYMBOL}${price * 10}                   ║\n` +
        `║  25 acc →  ${SYMBOL}${price * 25}                   ║\n` +
        `║  50 acc →  ${SYMBOL}${price * 50}                   ║\n` +
        `║  100 acc → ${SYMBOL}${price * 100}                 ║\n` +
        `╚══════════════════╝\n\n` +
        `*How many accounts?*\nTap below or type a number (1-100):`,
        { inline_keyboard: [
          [{ text: "1️⃣ 1", callback_data: "qty_1" }, { text: "2️⃣ 2", callback_data: "qty_2" }, { text: "3️⃣ 3", callback_data: "qty_3" }, { text: "5️⃣ 5", callback_data: "qty_5" }],
          [{ text: "🔟 10", callback_data: "qty_10" }, { text: "📦 25", callback_data: "qty_25" }, { text: "📦 50", callback_data: "qty_50" }, { text: "💯 100", callback_data: "qty_100" }],
          [{ text: "🔙 Change Type", callback_data: `country_${selectedCountry}` }, { text: "🏠 Menu", callback_data: "home" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🔢 Quantity — Quick Buttons
    // ════════════════════════════════════════════
    if (input.startsWith("qty_")) {
      const qty = parseInt(input.replace("qty_", ""));
      if (!isNaN(qty) && qty >= 1 && qty <= 100) {
        return await processQuantity(qty, state, chatId, username, firstName, supabase, BOT_TOKEN, PRICING, ADMIN_CHAT_ID);
      }
    }

    // ════════════════════════════════════════════
    // 🔢 Quantity — Manual Input
    // ════════════════════════════════════════════
    if (state?.state === "awaiting_quantity") {
      const qty = parseInt(input);
      if (isNaN(qty) || qty < 1 || qty > 100) {
        await sendMsg(BOT_TOKEN, chatId,
          `⚠️ *Invalid number!*\n\nPlease enter between *1* and *100*.\nOr tap a quick option above ☝️`,
          { inline_keyboard: [[{ text: "🔙 Go Back", callback_data: `country_${state.selected_country || "IN"}` }]] });
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      return await processQuantity(qty, state, chatId, username, firstName, supabase, BOT_TOKEN, PRICING, ADMIN_CHAT_ID);
    }

    // ════════════════════════════════════════════
    // ✅ Payment Confirmation
    // ════════════════════════════════════════════
    if (input === "paid" || input.includes("i have paid") || input.includes("payment done") || input.includes("paid done")) {
      if (state?.pending_order_id) {
        await supabase.from("orders").update({ status: "payment_received" }).eq("order_id", state.pending_order_id);
        await supabase.from("conversation_states").update({ state: "payment_review", updated_at: new Date().toISOString() }).eq("chat_id", chatId);

        await sendMsg(BOT_TOKEN, chatId,
          `╔═══════════════════════╗\n` +
          `║   ✅  PAYMENT RECEIVED           ║\n` +
          `╚═══════════════════════╝\n\n` +
          `🆔 Order: \`${state.pending_order_id}\`\n\n` +
          `*What happens next:*\n\n` +
          `  ┌── Step 1 ──┐\n` +
          `  │ ⏳ Admin verifies payment │\n` +
          `  └──────────┘\n` +
          `          ⬇️\n` +
          `  ┌── Step 2 ──┐\n` +
          `  │ ✅ Order approved              │\n` +
          `  └──────────┘\n` +
          `          ⬇️\n` +
          `  ┌── Step 3 ──┐\n` +
          `  │ 📥 Accounts sent here     │\n` +
          `  └──────────┘\n\n` +
          `⏱️ *ETA: 5–15 minutes*\n\n` +
          `💡 _Tip: Send a payment screenshot\nfor even faster verification!_ 📸`,
          { inline_keyboard: [
            [{ text: "📊 Track My Order", callback_data: "check_status" }],
            [{ text: "🛒 Place Another Order", callback_data: "start" }],
            [{ text: "🧑‍💻 Need Help?", callback_data: "support" }],
          ]});

        // Notify admin
        const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
        if (ADMIN_CHAT_ID && ADMIN_BOT_TOKEN) {
          const { data: order } = await supabase.from("orders").select("*").eq("order_id", state.pending_order_id).single();
          if (order) {
            const ci = COUNTRIES.find(c => c.code === order.country);
            await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: `🚨 *NEW PAYMENT!*\n\n🆔 \`${order.order_id}\`\n👤 @${username} (${firstName})\n🌍 ${ci?.flag || ""} ${order.country}\n📦 ${order.quantity}x ${order.account_type}\n💵 *${SYMBOL}${order.amount}*`,
                parse_mode: "Markdown",
                reply_markup: JSON.stringify({ inline_keyboard: [
                  [{ text: `✅ Approve`, callback_data: `approve_${order.order_id}` },
                   { text: `❌ Reject`, callback_data: `reject_${order.order_id}` }]
                ]}),
              }),
            });
          }
        }
      } else {
        await sendMsg(BOT_TOKEN, chatId,
          `❓ *No pending order found.*\n\nStart a new order below! 👇`,
          { inline_keyboard: [[{ text: "🛒 Start New Order", callback_data: "start" }]] });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // ❌ Cancel Order
    // ════════════════════════════════════════════
    if (input === "cancel") {
      if (state?.pending_order_id) {
        await supabase.from("orders").update({ status: "cancelled" }).eq("order_id", state.pending_order_id);
        await supabase.from("conversation_states").update({ state: "idle", pending_order_id: null, updated_at: new Date().toISOString() }).eq("chat_id", chatId);
        await sendMsg(BOT_TOKEN, chatId,
          `╔═══════════════════════╗\n` +
          `║   ❌  ORDER CANCELLED             ║\n` +
          `╚═══════════════════════╝\n\n` +
          `Order \`${state.pending_order_id}\` cancelled.\nNo charges applied.\n\n` +
          `Ready to try again? 👇`,
          { inline_keyboard: [
            [{ text: "🛒 New Order", callback_data: "start" }],
            [{ text: "🏠 Main Menu", callback_data: "home" }],
          ]});
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 📊 Order Status
    // ════════════════════════════════════════════
    if (input === "/status" || input === "check_status" || input === "/myorders") {
      const limit = input === "/myorders" ? 20 : 5;
      const { data: orders } = await supabase.from("orders").select("*").eq("customer_id", chatId).order("created_at", { ascending: false }).limit(limit);

      if (orders && orders.length > 0) {
        let msg = `╔═══════════════════════╗\n║   📊  YOUR ORDERS                    ║\n╚═══════════════════════╝\n\n`;
        let totalSpent = 0, delivered = 0;

        for (const o of orders) {
          const emoji = o.status === "delivered" ? "🟢" : o.status === "pending" ? "🟡" : o.status === "payment_received" ? "🔵" : o.status === "approved" ? "🟢" : o.status === "rejected" ? "🔴" : "⚪";
          const statusLabel = o.status === "payment_received" ? "Under Review" : o.status === "delivered" ? "✓ Delivered" : o.status === "approved" ? "Approved" : o.status === "rejected" ? "Rejected" : o.status === "cancelled" ? "Cancelled" : "Pending";
          const ci = COUNTRIES.find(c => c.code === o.country);
          const date = new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

          msg += `${emoji} \`${o.order_id}\` • ${date}\n`;
          msg += `    ${ci?.flag || "🌍"} ${o.quantity}× ${o.account_type} — *${SYMBOL}${o.amount}*\n`;
          msg += `    Status: *${statusLabel}*\n\n`;

          if (o.status === "delivered") { totalSpent += o.amount; delivered++; }
        }

        msg += `┌─────────────────────┐\n`;
        msg += `│ 📈 ${orders.length} orders │ ✅ ${delivered} delivered │\n`;
        msg += `│ 💰 Total spent: *${SYMBOL}${totalSpent}*    │\n`;
        msg += `└─────────────────────┘`;

        await sendMsg(BOT_TOKEN, chatId, msg, { inline_keyboard: [
          [{ text: "🔄 Refresh", callback_data: "check_status" }, { text: "📜 Full History", callback_data: "/myorders" }],
          [{ text: "🛒 New Order", callback_data: "start" }, { text: "🏠 Menu", callback_data: "home" }],
        ]});
      } else {
        await sendMsg(BOT_TOKEN, chatId,
          `📭 *No orders yet!*\n\nYou haven't placed any orders.\nGet started now — it only takes\n30 seconds! ⚡`,
          { inline_keyboard: [
            [{ text: "🛒 Buy My First Accounts", callback_data: "start" }],
          ]});
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🎁 Referral Program
    // ════════════════════════════════════════════
    if (input === "/refer") {
      let { data: customer } = await supabase.from("customers").select("referral_code").eq("telegram_id", chatId).single();
      let refCode = customer?.referral_code;
      if (!refCode) {
        refCode = "REF" + chatId.slice(-6) + Math.random().toString(36).slice(-3).toUpperCase();
        await supabase.from("customers").update({ referral_code: refCode }).eq("telegram_id", chatId);
      }

      // Count referral stats
      const { data: refs } = await supabase.from("referrals").select("commission").eq("referrer_telegram_id", chatId);
      const totalEarned = (refs || []).reduce((s: number, r: any) => s + (r.commission || 0), 0);
      const totalRefs = refs?.length || 0;

      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║   🎁  REFERRAL PROGRAM           ║\n` +
        `╚═══════════════════════╝\n\n` +
        `Earn *5% commission* on every\nsale from your referrals! 💰\n\n` +
        `┌──── 📊 *Your Stats* ────┐\n` +
        `│  👥 Referrals: *${totalRefs}*                   │\n` +
        `│  💰 Earned: *${SYMBOL}${totalEarned}*               │\n` +
        `└─────────────────────┘\n\n` +
        `🔗 *Your Link (tap to copy):*\n\`https://t.me/airdro12pbot?start=${refCode}\`\n\n` +
        `📋 *Code:* \`${refCode}\`\n\n` +
        `*How it works:*\n` +
        `1️⃣ Share link → 2️⃣ They buy → 3️⃣ You earn 🤑`,
        { inline_keyboard: [
          [{ text: "🛒 Back to Shop", callback_data: "start" }, { text: "🏠 Menu", callback_data: "home" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🧑‍💻 Support
    // ════════════════════════════════════════════
    if (input.includes("support") || input.includes("human") || input.includes("help me") || input === "/support" || input === "/help") {
      await sendMsg(BOT_TOKEN, chatId,
        `╔═══════════════════════╗\n` +
        `║   🧑‍💻  CUSTOMER SUPPORT          ║\n` +
        `╚═══════════════════════╝\n\n` +
        `Our support team is here to help!\n\n` +
        `⏱️ Response time: *15–30 min*\n\n` +
        `A human agent will reach out\nto you shortly! 🙏\n\n` +
        `💡 *Quick self-service:*`,
        { inline_keyboard: [
          [{ text: "📊 Check Order Status", callback_data: "check_status" }],
          [{ text: "🛒 Place New Order", callback_data: "start" }],
          [{ text: "🎁 Referral Program", callback_data: "/refer" }],
          [{ text: "🏠 Main Menu", callback_data: "home" }],
        ]});
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ════════════════════════════════════════════
    // 🏠 Fallback — Main Menu
    // ════════════════════════════════════════════
    await sendMsg(BOT_TOKEN, chatId,
      `╔═══════════════════════╗\n` +
      `║   🚀  RIOX ACCOUNTS PRO       ║\n` +
      `╚═══════════════════════╝\n\n` +
      `Hey *${firstName}*! 👋\n\nWhat would you like to do?\n\n` +
      `Choose from the options below\nor use the menu buttons 👇`,
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

// ════════════════════════════════════════════
// Process Quantity & Create Order
// ════════════════════════════════════════════
async function processQuantity(qty: number, state: any, chatId: string, username: string, firstName: string, supabase: any, BOT_TOKEN: string, PRICING: any, ADMIN_CHAT_ID?: string) {
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

  // Send order summary first
  await sendMsg(BOT_TOKEN, chatId,
    `╔═══════════════════════╗\n` +
    `║   📋  ORDER CREATED!                ║\n` +
    `╚═══════════════════════╝\n\n` +
    `${stepIndicator(4)}\n\n` +
    `🆔 *Order:* \`${orderId}\`\n\n` +
    `┌─── 🧾 *Details* ───┐\n` +
    `│                                                │\n` +
    `│  🌍 ${ci?.flag || ""} *${ci?.name || country}*             │\n` +
    `│  📦 ${label}                              │\n` +
    `│  🔢 *${qty}* account${qty > 1 ? "s" : ""}                    │\n` +
    `│  💵 ${SYMBOL}${pricePerAcc} × ${qty}                  │\n` +
    `│                                                │\n` +
    `│  ━━━━━━━━━━━━━━━━━━       │\n` +
    `│  💰 *TOTAL: ${SYMBOL}${totalPrice.toLocaleString()}*       │\n` +
    `│                                                │\n` +
    `└─────────────────────┘`);

  // Send QR code photo with payment instructions
  const qrUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/bot-assets/upi-scanner.jpg`;
  await sendPhoto(BOT_TOKEN, chatId, qrUrl,
    `💳 *PAY VIA UPI*\n\n` +
    `📱 UPI ID: \`venkat342@fam\`\n` +
    `💰 Amount: *${SYMBOL}${totalPrice.toLocaleString()}*\n\n` +
    `Scan the QR above or pay via\nGPay • Paytm • PhonePe\n\n` +
    `📸 *Send payment screenshot* for\nfaster verification!\n\n` +
    `Or tap *"✅ I Have Paid"* below 👇`,
    { inline_keyboard: [
      [{ text: "✅ I Have Paid", callback_data: "paid" }],
      [{ text: "❌ Cancel Order", callback_data: "cancel" }, { text: "🧑‍💻 Help", callback_data: "support" }],
    ]});

  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
}

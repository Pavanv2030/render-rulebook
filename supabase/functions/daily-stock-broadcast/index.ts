import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COUNTRY_NAMES: Record<string, string> = {
  IN: "🇮🇳 India", US: "🇺🇸 USA", UK: "🇬🇧 UK", AE: "🇦🇪 UAE",
  ET: "🇪🇹 Ethiopia", AR: "🇦🇷 Argentina", BR: "🇧🇷 Brazil",
  DE: "🇩🇪 Germany", FR: "🇫🇷 France", NG: "🇳🇬 Nigeria",
  KE: "🇰🇪 Kenya", ZA: "🇿🇦 South Africa", SA: "🇸🇦 Saudi Arabia",
  TR: "🇹🇷 Turkey", CA: "🇨🇦 Canada", AU: "🇦🇺 Australia",
  JP: "🇯🇵 Japan", RU: "🇷🇺 Russia", TM: "🇹🇲 Turkmenistan",
  MG: "🇲🇬 Madagascar",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
  const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let preview = false;
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("preview") === "1") preview = true;
    if (req.method === "POST") {
      const b = await req.clone().json().catch(() => ({}));
      if (b?.preview) preview = true;
    }
  } catch {}

  try {
    // Aggregate stock by country & account type
    const { data: stock, error: stockErr } = await supabase
      .from("account_inventory")
      .select("country, account_type")
      .eq("status", "available");

    if (stockErr) throw stockErr;

    const grouped: Record<string, { regular: number; aged: number }> = {};
    for (const row of stock || []) {
      if (!grouped[row.country]) grouped[row.country] = { regular: 0, aged: 0 };
      if (row.account_type === "aged") grouped[row.country].aged++;
      else grouped[row.country].regular++;
    }

    const countries = Object.keys(grouped).sort();
    if (countries.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No stock to broadcast" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body = `🌅 *GOOD MORNING!*\n\n📊 *Today's Fresh Stock Update*\n\n`;
    for (const c of countries) {
      const cName = COUNTRY_NAMES[c] || c;
      const { regular, aged } = grouped[c];
      if (regular === 0 && aged === 0) continue;
      body += `${cName}\n`;
      if (regular > 0) body += `   📦 Regular: *${regular}*\n`;
      if (aged > 0) body += `   👑 Aged: *${aged}*\n`;
      body += `\n`;
    }
    body += `⚡ Order now before they sell out!\n🛒 Tap below to start shopping.`;

    const replyMarkup = {
      inline_keyboard: [[{ text: "🛒 Buy Accounts Now", callback_data: "buy" }]],
    };

    // Preview mode: only send to admin, don't broadcast
    if (preview) {
      if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
        await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: `👁 *PREVIEW — Daily Stock Broadcast*\n\n${body}`,
            parse_mode: "Markdown",
            reply_markup: replyMarkup,
          }),
        });
      }
      return new Response(JSON.stringify({ ok: true, preview: true, message: body }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all non-blocked customers
    const { data: customers, error: custErr } = await supabase
      .from("customers")
      .select("telegram_id")
      .eq("is_blocked", false);

    if (custErr) throw custErr;

    let sent = 0;
    let failed = 0;

    for (const cust of customers || []) {
      const chatId = cust.telegram_id;
      if (!chatId || chatId.startsWith("web_")) continue;
      try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: body,
            parse_mode: "Markdown",
            reply_markup: replyMarkup,
          }),
        });
        if (res.ok) sent++;
        else failed++;
        // Telegram rate limit: ~30 msgs/sec
        await new Promise((r) => setTimeout(r, 40));
      } catch {
        failed++;
      }
    }

    // Notify admin
    if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
      try {
        await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: `📣 *Daily Stock Broadcast Sent*\n\n✅ Delivered: *${sent}*\n❌ Failed: *${failed}*`,
            parse_mode: "Markdown",
          }),
        });
      } catch {}
    }

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-stock-broadcast error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

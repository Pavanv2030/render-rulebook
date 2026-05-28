const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const results: any[] = [];

  // Customer bot webhook
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (BOT_TOKEN) {
    const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    results.push({ bot: "customer", webhookUrl, result: await res.json() });

    // Set bot commands (shown when user taps the menu button)
    const commands = [
      { command: "start", description: "🏠 Main menu" },
      { command: "myorders", description: "📦 My orders" },
      { command: "reorder", description: "🔁 Quick reorder" },
      { command: "guide", description: "📖 How to buy" },
      { command: "manuallogin", description: "🔐 Manual login help" },
      { command: "refer", description: "🎁 Refer & earn" },
      { command: "language", description: "🌐 Change language" },
      { command: "support", description: "💬 Contact support" },
    ];
    const cmdRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    results.push({ bot: "customer", setMyCommands: await cmdRes.json() });

    // Set the menu button to show commands (the grid icon next to the input)
    const menuRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu_button: { type: "commands" } }),
    });
    results.push({ bot: "customer", setChatMenuButton: await menuRes.json() });
  }


  // Admin bot webhook
  const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
  if (ADMIN_BOT_TOKEN) {
    const webhookUrl = `${SUPABASE_URL}/functions/v1/admin-bot`;
    const res = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/setWebhook`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    results.push({ bot: "admin", webhookUrl, result: await res.json() });
  }

  return new Response(JSON.stringify({ results }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

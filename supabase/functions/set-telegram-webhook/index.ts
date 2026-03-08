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

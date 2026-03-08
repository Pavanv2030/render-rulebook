import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), { status: 500, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;

  // Set webhook
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });

  const result = await res.json();
  console.log("Set webhook result:", result);

  return new Response(JSON.stringify({ webhookUrl, result }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

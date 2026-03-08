import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BlobReader, ZipReader, BlobWriter } from "https://esm.sh/@zip.js/zip.js@2.7.34";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

const COUNTRIES = ["IN", "US", "UK", "ET", "AR", "BR", "DE", "FR", "NG", "KE", "ZA", "AE", "SA", "TR", "CA", "AU", "JP", "RU", "TM", "MG"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
  const adminKey = req.headers.get("x-admin-key");
  if (!ADMIN_PASSWORD || adminKey !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET: inventory stats by country
    if (req.method === "GET" && action === "inventory") {
      const stats: Record<string, Record<string, { available: number; total: number }>> = {};

      for (const country of COUNTRIES) {
        stats[country] = {};
        for (const type of ["regular", "aged"]) {
          const { data: available } = await supabase
            .from("account_inventory")
            .select("id")
            .eq("account_type", type)
            .eq("country", country)
            .eq("status", "available");
          const { data: total } = await supabase
            .from("account_inventory")
            .select("id")
            .eq("account_type", type)
            .eq("country", country);

          stats[country][type] = {
            available: available?.length || 0,
            total: total?.length || 0,
          };
        }
      }

      return new Response(JSON.stringify({ stats, countries: COUNTRIES }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: upload master ZIP
    if (req.method === "POST") {
      const formData = await req.formData();
      const accountType = (formData.get("accountType") as string) || "regular";
      const country = (formData.get("country") as string) || "IN";
      const file = formData.get("file") as File;

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const zipReader = new ZipReader(new BlobReader(file));
      const entries = await zipReader.getEntries();

      let added = 0;
      let skipped = 0;

      for (const entry of entries) {
        if (entry.directory || !entry.filename.endsWith(".session")) continue;

        const fileName = entry.filename.split("/").pop() || entry.filename;
        const filePath = `inventory/${country}/${accountType}/${fileName}`;

        const { data: existing } = await supabase
          .from("account_inventory")
          .select("id")
          .eq("file_path", filePath)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        const blobWriter = new BlobWriter();
        const blob = await entry.getData!(blobWriter);

        const { error: uploadError } = await supabase.storage
          .from("account-files")
          .upload(filePath, blob, { upsert: true });

        if (uploadError) {
          console.error(`Failed to upload ${fileName}:`, uploadError);
          continue;
        }

        await supabase.from("account_inventory").insert({
          account_type: accountType,
          country,
          file_path: filePath,
          file_name: fileName,
          status: "available",
        });

        added++;
      }

      await zipReader.close();

      // 🔔 Send stock alerts to subscribers
      if (added > 0) {
        const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (BOT_TOKEN) {
          const { data: alerts } = await supabase.from("stock_alerts")
            .select("*")
            .eq("country", country)
            .eq("account_type", accountType)
            .eq("notified", false);

          if (alerts && alerts.length > 0) {
            const countryNames: Record<string, string> = { IN: "🇮🇳 India", US: "🇺🇸 USA", UK: "🇬🇧 UK", AE: "🇦🇪 UAE", ET: "🇪🇹 Ethiopia", AR: "🇦🇷 Argentina", BR: "🇧🇷 Brazil", DE: "🇩🇪 Germany", FR: "🇫🇷 France", NG: "🇳🇬 Nigeria", KE: "🇰🇪 Kenya", ZA: "🇿🇦 South Africa", SA: "🇸🇦 Saudi Arabia", TR: "🇹🇷 Turkey", CA: "🇨🇦 Canada", AU: "🇦🇺 Australia", JP: "🇯🇵 Japan", RU: "🇷🇺 Russia", TM: "🇹🇲 Turkmenistan", MG: "🇲🇬 Madagascar" };
            const label = accountType === "aged" ? "👑 Aged" : "📦 Regular";
            const cName = countryNames[country] || country;

            for (const alert of alerts) {
              // Skip web users
              if (alert.chat_id.startsWith("web_")) continue;
              try {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: alert.chat_id,
                    text: `🔔 *STOCK ALERT!*\n\n${cName} — ${label} accounts are *back in stock!* 🎉\n\n*${added}* new accounts available.\n\nOrder now before they sell out! ⚡`,
                    parse_mode: "Markdown",
                    reply_markup: JSON.stringify({
                      inline_keyboard: [
                        [{ text: "🛒 Buy Now", callback_data: `country_${country}` }],
                      ],
                    }),
                  }),
                });
              } catch (e) {
                console.error(`Failed to notify ${alert.chat_id}:`, e);
              }
            }

            // Mark alerts as notified
            const alertIds = alerts.filter(a => !a.chat_id.startsWith("web_")).map(a => a.id);
            if (alertIds.length > 0) {
              await supabase.from("stock_alerts").update({ notified: true }).in("id", alertIds);
            }
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        added,
        skipped,
        message: `Added ${added} ${accountType} accounts for ${country}, skipped ${skipped} duplicates`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Upload master error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

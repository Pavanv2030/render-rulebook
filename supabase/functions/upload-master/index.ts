import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BlobReader, ZipReader, TextWriter, BlobWriter } from "https://esm.sh/@zip.js/zip.js@2.7.34";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

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

    // GET: inventory stats
    if (req.method === "GET" && action === "inventory") {
      const { data: regular } = await supabase
        .from("account_inventory")
        .select("id", { count: "exact" })
        .eq("account_type", "regular")
        .eq("status", "available");
      const { data: aged } = await supabase
        .from("account_inventory")
        .select("id", { count: "exact" })
        .eq("account_type", "aged")
        .eq("status", "available");
      const { data: totalRegular } = await supabase
        .from("account_inventory")
        .select("id", { count: "exact" })
        .eq("account_type", "regular");
      const { data: totalAged } = await supabase
        .from("account_inventory")
        .select("id", { count: "exact" })
        .eq("account_type", "aged");

      return new Response(JSON.stringify({
        regular: { available: regular?.length || 0, total: totalRegular?.length || 0 },
        aged: { available: aged?.length || 0, total: totalAged?.length || 0 },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: upload master ZIP
    if (req.method === "POST") {
      const formData = await req.formData();
      const accountType = (formData.get("accountType") as string) || "regular";
      const file = formData.get("file") as File;

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Read ZIP
      const zipReader = new ZipReader(new BlobReader(file));
      const entries = await zipReader.getEntries();

      let added = 0;
      let skipped = 0;

      for (const entry of entries) {
        // Skip directories and non-.session files
        if (entry.directory || !entry.filename.endsWith(".session")) continue;

        const fileName = entry.filename.split("/").pop() || entry.filename;
        const filePath = `inventory/${accountType}/${fileName}`;

        // Check if already exists in inventory
        const { data: existing } = await supabase
          .from("account_inventory")
          .select("id")
          .eq("file_path", filePath)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        // Extract file content
        const blobWriter = new BlobWriter();
        const blob = await entry.getData!(blobWriter);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("account-files")
          .upload(filePath, blob, { upsert: true });

        if (uploadError) {
          console.error(`Failed to upload ${fileName}:`, uploadError);
          continue;
        }

        // Track in inventory
        await supabase.from("account_inventory").insert({
          account_type: accountType,
          file_path: filePath,
          file_name: fileName,
          status: "available",
        });

        added++;
      }

      await zipReader.close();

      return new Response(JSON.stringify({
        success: true,
        added,
        skipped,
        message: `Added ${added} accounts, skipped ${skipped} duplicates`,
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

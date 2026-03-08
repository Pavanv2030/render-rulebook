import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth check
  const adminKey = req.headers.get("x-admin-key");
  if (!ADMIN_PASSWORD || adminKey !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET: List orders
    if (req.method === "GET" && action === "orders") {
      const status = url.searchParams.get("status");
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
      if (status && status !== "all") {
        query = query.eq("status", status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ orders: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Update order status / upload file
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";

      // Handle file upload (multipart)
      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const orderId = formData.get("orderId") as string;
        const file = formData.get("file") as File;

        if (!orderId || !file) {
          return new Response(JSON.stringify({ error: "orderId and file required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Bucket "account-files" is pre-created via migration

        const filePath = `orders/${orderId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("account-files")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Update order
        await supabase.from("orders").update({
          delivery_file_path: filePath,
          status: "delivered",
          delivered_at: new Date().toISOString(),
        }).eq("order_id", orderId);

        return new Response(JSON.stringify({ success: true, filePath }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // JSON actions
      const body = await req.json();

      if (body.action === "update_status") {
        const { orderId, status } = body;
        const updateData: any = { status };
        if (status === "delivered") {
          updateData.delivered_at = new Date().toISOString();
        }
        const { error } = await supabase.from("orders").update(updateData).eq("order_id", orderId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (body.action === "get_download_url") {
        const { filePath } = body;
        const { data, error } = await supabase.storage
          .from("account-files")
          .createSignedUrl(filePath, 3600); // 1 hour
        if (error) throw error;
        return new Response(JSON.stringify({ url: data.signedUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin API error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

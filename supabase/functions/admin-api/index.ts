import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

async function sendTelegramDocument(botToken: string, chatId: string, fileUrl: string, caption: string, fileName: string) {
  const fileRes = await fetch(fileUrl);
  const fileBlob = await fileRes.blob();

  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("document", fileBlob, fileName);
  formData.append("caption", caption);
  formData.append("parse_mode", "Markdown");

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
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

    // POST actions
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";

      // Handle file upload (multipart) — manual delivery
      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const orderId = formData.get("orderId") as string;
        const file = formData.get("file") as File;

        if (!orderId || !file) {
          return new Response(JSON.stringify({ error: "orderId and file required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const filePath = `orders/${orderId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("account-files")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        await supabase.from("orders").update({
          delivery_file_path: filePath,
          status: "delivered",
          delivered_at: new Date().toISOString(),
        }).eq("order_id", orderId);

        // Send to customer via Telegram
        if (BOT_TOKEN) {
          const { data: order } = await supabase.from("orders")
            .select("customer_id, order_id, quantity, account_type, country")
            .eq("order_id", orderId)
            .single();

          if (order && order.customer_id && !order.customer_id.startsWith("web_")) {
            const { data: signedData } = await supabase.storage
              .from("account-files")
              .createSignedUrl(filePath, 600);

            if (signedData?.signedUrl) {
              try {
                await sendTelegramDocument(
                  BOT_TOKEN,
                  order.customer_id,
                  signedData.signedUrl,
                  `✅ *Order Delivered!*\n\n🆔 Order: \`${order.order_id}\`\n🌍 Country: ${order.country}\n📦 ${order.quantity}x ${order.account_type} accounts\n\n📥 Your accounts are attached above.\nThank you for your purchase! 🚀\n\nType /start to order more!`,
                  file.name
                );
              } catch (e) {
                console.error("Failed to send Telegram document:", e);
              }
            }
          }
        }

        return new Response(JSON.stringify({ success: true, filePath }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // JSON actions
      const body = await req.json();

      // Approve payment & trigger auto-deliver
      if (body.action === "approve_payment") {
        const { orderId } = body;

        // Update status to approved
        await supabase.from("orders").update({ status: "approved" }).eq("order_id", orderId);

        // Trigger auto-deliver
        const autoDeliverUrl = `${SUPABASE_URL}/functions/v1/auto-deliver`;
        const deliverRes = await fetch(autoDeliverUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ orderId }),
        });
        const deliverResult = await deliverRes.json();

        return new Response(JSON.stringify(deliverResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reject payment
      if (body.action === "reject_payment") {
        const { orderId, reason } = body;

        await supabase.from("orders").update({ status: "rejected" }).eq("order_id", orderId);

        // Notify customer via Telegram
        if (BOT_TOKEN) {
          const { data: order } = await supabase.from("orders")
            .select("customer_id, order_id, quantity, account_type, amount")
            .eq("order_id", orderId)
            .single();

          if (order && order.customer_id && !order.customer_id.startsWith("web_")) {
            await sendTelegramMessage(BOT_TOKEN, order.customer_id,
              `❌ *Payment Declined*\n\n` +
              `🆔 Order: \`${order.order_id}\`\n` +
              `📦 ${order.quantity}x ${order.account_type}\n` +
              `💰 ₹${order.amount}\n\n` +
              `${reason ? `📝 Reason: ${reason}\n\n` : ""}` +
              `Please re-check your payment and try again.\n` +
              `Type /start to place a new order.`
            );
          }
        }

        // Reset conversation state
        const { data: order } = await supabase.from("orders")
          .select("customer_id").eq("order_id", orderId).single();
        if (order) {
          await supabase.from("conversation_states")
            .update({ state: "idle", pending_order_id: null, updated_at: new Date().toISOString() })
            .eq("chat_id", order.customer_id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
          .createSignedUrl(filePath, 3600);
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

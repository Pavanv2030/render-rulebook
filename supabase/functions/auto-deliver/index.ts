import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BlobWriter, ZipWriter, BlobReader } from "https://esm.sh/@zip.js/zip.js@2.7.34";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendTelegramDocument(botToken: string, chatId: string, fileBlob: Blob, caption: string, fileName: string) {
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
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
  const LOW_STOCK_THRESHOLD = 10;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine account type for inventory lookup
    const accountType = order.account_type.toLowerCase().includes("aged") ? "aged" : "regular";

    // Pick N available accounts
    const { data: availableAccounts, error: invError } = await supabase
      .from("account_inventory")
      .select("*")
      .eq("account_type", accountType)
      .eq("status", "available")
      .limit(order.quantity);

    if (invError) throw invError;

    if (!availableAccounts || availableAccounts.length < order.quantity) {
      // Not enough stock
      const available = availableAccounts?.length || 0;
      if (BOT_TOKEN && order.customer_id && !order.customer_id.startsWith("web_")) {
        await sendTelegramMessage(BOT_TOKEN, order.customer_id,
          `⚠️ *Order Update*\n\n🆔 Order: \`${orderId}\`\n\n` +
          `We're currently restocking ${accountType} accounts. ` +
          `Only ${available}/${order.quantity} available.\n` +
          `Your order will be fulfilled as soon as stock is replenished. We'll notify you! 🙏`
        );
      }
      return new Response(JSON.stringify({
        success: false,
        error: "insufficient_stock",
        available,
        requested: order.quantity,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allocate accounts
    const accountIds = availableAccounts.map(a => a.id);
    await supabase
      .from("account_inventory")
      .update({
        status: "allocated",
        order_id: orderId,
        allocated_at: new Date().toISOString(),
      })
      .in("id", accountIds);

    // Create ZIP with the allocated .session files
    const zipBlobWriter = new BlobWriter("application/zip");
    const zipWriter = new ZipWriter(zipBlobWriter);

    for (const account of availableAccounts) {
      const { data: fileData, error: dlError } = await supabase.storage
        .from("account-files")
        .download(account.file_path);

      if (dlError || !fileData) {
        console.error(`Failed to download ${account.file_path}:`, dlError);
        continue;
      }

      await zipWriter.add(account.file_name, new BlobReader(fileData));
    }

    await zipWriter.close();
    const zipBlob = await zipBlobWriter.getData();

    // Store delivered ZIP
    const deliveryPath = `orders/${orderId}/accounts_${orderId}.zip`;
    await supabase.storage
      .from("account-files")
      .upload(deliveryPath, zipBlob, { upsert: true, contentType: "application/zip" });

    // Update order
    await supabase.from("orders").update({
      status: "delivered",
      delivery_file_path: deliveryPath,
      delivered_at: new Date().toISOString(),
    }).eq("order_id", orderId);

    // Send to customer via Telegram
    if (BOT_TOKEN && order.customer_id && !order.customer_id.startsWith("web_")) {
      try {
        await sendTelegramDocument(
          BOT_TOKEN,
          order.customer_id,
          zipBlob,
          `✅ *Order Delivered!*\n\n🆔 Order: \`${orderId}\`\n📦 ${order.quantity}x ${order.account_type} accounts\n\n📥 Your accounts are attached above.\nThank you for your purchase! 🚀\n\nType /start to order more!`,
          `accounts_${orderId}.zip`
        );
      } catch (e) {
        console.error("Failed to send Telegram document:", e);
      }
    }

    // Reset conversation state
    await supabase.from("conversation_states")
      .update({ state: "idle", pending_order_id: null, updated_at: new Date().toISOString() })
      .eq("chat_id", order.customer_id);

    // Check low stock and alert admin
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      for (const type of ["regular", "aged"]) {
        const { data: remaining } = await supabase
          .from("account_inventory")
          .select("id", { count: "exact" })
          .eq("account_type", type)
          .eq("status", "available");

        const count = remaining?.length || 0;
        if (count < LOW_STOCK_THRESHOLD) {
          await sendTelegramMessage(BOT_TOKEN, ADMIN_CHAT_ID,
            `🚨 *LOW STOCK ALERT*\n\n` +
            `${type === "aged" ? "👑 Aged" : "📦 Regular"} accounts: *${count}* remaining\n` +
            `Threshold: ${LOW_STOCK_THRESHOLD}\n\n` +
            `Please upload more .session files to restock! ⚡`
          );
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      delivered: availableAccounts.length,
      orderId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auto-deliver error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

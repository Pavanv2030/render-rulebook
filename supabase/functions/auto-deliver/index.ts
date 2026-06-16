import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BlobWriter, ZipWriter, BlobReader } from "https://esm.sh/@zip.js/zip.js@2.7.34";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
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
  try { return await res.json(); } catch { return { ok: false, error: `http_${res.status}` }; }
}

// Retry the Telegram document send with exponential backoff.
// Returns { ok, attempts, response, error } — ok=true only after a confirmed Telegram ack.
async function sendTelegramDocumentWithRetry(
  botToken: string,
  chatId: string,
  fileBlob: Blob,
  caption: string,
  fileName: string,
  maxAttempts = 4,
): Promise<{ ok: boolean; attempts: number; response?: unknown; error?: string }> {
  let lastErr: string | undefined;
  let lastResp: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await sendTelegramDocument(botToken, chatId, fileBlob, caption, fileName);
      lastResp = resp;
      if (resp?.ok) return { ok: true, attempts: attempt, response: resp };
      // Honor Telegram rate-limit hint when present
      const retryAfter = Number(resp?.parameters?.retry_after) || 0;
      lastErr = JSON.stringify(resp);
      console.error(`sendTelegramDocument attempt ${attempt}/${maxAttempts} failed:`, lastErr);
      const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(15000, 1000 * 2 ** (attempt - 1));
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, backoff));
    } catch (e) {
      lastErr = (e as Error).message;
      console.error(`sendTelegramDocument attempt ${attempt}/${maxAttempts} threw:`, lastErr);
      if (attempt < maxAttempts) {
        const backoff = Math.min(15000, 1000 * 2 ** (attempt - 1));
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  return { ok: false, attempts: maxAttempts, response: lastResp, error: lastErr };
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<number | null> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
  try {
    const j = await res.json();
    return j?.result?.message_id ?? null;
  } catch { return null; }
}

async function editTelegramMessage(botToken: string, chatId: string, messageId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "Markdown" }),
    });
  } catch (e) { console.error("edit failed", e); }
}

function buildProgress(orderId: string, country: string, current: number, total: number) {
  const pct = Math.floor((current / total) * 100);
  const filled = Math.floor((current / total) * 10);
  const bar = "■".repeat(filled) + "□".repeat(10 - filled);
  return `⏳ | *Creating sessions in progress ...*\n\n- Country : ${country}\n- Quantity : ${total}\n\n- Order ID: ${orderId}\n${pct}% [${bar}] - (${current} / ${total})`;
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

  // Support both service-role calls and admin-key calls
  const adminKey = req.headers.get("x-admin-key");
  const authHeader = req.headers.get("authorization");
  const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
  const isServiceRole = authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY);
  const isAdmin = ADMIN_PASSWORD && adminKey === ADMIN_PASSWORD;

  if (!isServiceRole && !isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

    const accountType = order.account_type.toLowerCase().includes("aged") ? "aged" : "regular";
    const country = order.country || "IN";

    // Pick N available accounts filtered by country + type
    const { data: availableAccounts, error: invError } = await supabase
      .from("account_inventory")
      .select("*")
      .eq("account_type", accountType)
      .eq("country", country)
      .eq("status", "available")
      .limit(order.quantity);

    if (invError) throw invError;

    if (!availableAccounts || availableAccounts.length < order.quantity) {
      const available = availableAccounts?.length || 0;
      if (BOT_TOKEN && order.customer_id && !order.customer_id.startsWith("web_")) {
        await sendTelegramMessage(BOT_TOKEN, order.customer_id,
          `⚠️ *Order Update*\n\n🆔 Order: \`${orderId}\`\n\n` +
          `We're currently restocking ${accountType} accounts for ${country}. ` +
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

    // Create ZIP
    const zipBlobWriter = new BlobWriter("application/zip");
    const zipWriter = new ZipWriter(zipBlobWriter);

    // Send initial progress message to customer
    let progressMsgId: number | null = null;
    const isTgUser = !!(BOT_TOKEN && order.customer_id && !order.customer_id.startsWith("web_"));
    if (isTgUser) {
      progressMsgId = await sendTelegramMessage(BOT_TOKEN!, order.customer_id, buildProgress(orderId, country, 0, order.quantity));
    }

    const stepEvery = Math.max(1, Math.floor(availableAccounts.length / 10));
    for (let i = 0; i < availableAccounts.length; i++) {
      const account = availableAccounts[i];
      const { data: fileData, error: dlError } = await supabase.storage
        .from("account-files")
        .download(account.file_path);

      if (dlError || !fileData) {
        console.error(`Failed to download ${account.file_path}:`, dlError);
        continue;
      }

      await zipWriter.add(account.file_name, new BlobReader(fileData));

      if (isTgUser && progressMsgId && (i === availableAccounts.length - 1 || i % stepEvery === 0)) {
        await editTelegramMessage(BOT_TOKEN!, order.customer_id, progressMsgId, buildProgress(orderId, country, i + 1, order.quantity));
      }
    }

    await zipWriter.close();
    const zipBlob = await zipBlobWriter.getData();

    // 🚀 Send to customer FIRST — only mark delivered after a successful Telegram send.
    // (Previously we uploaded to storage + marked delivered before sending, so any
    //  Telegram send error left the order flagged as "delivered" with no file sent.)
    let sentToCustomer = false;
    let sendError: string | null = null;
    let sendAttempts = 0;
    if (isTgUser) {
      const result = await sendTelegramDocumentWithRetry(
        BOT_TOKEN!,
        order.customer_id,
        zipBlob,
        `✅ *Order Delivered!*\n\n🆔 Order: \`${orderId}\`\n🌍 Country: ${country}\n📦 ${order.quantity}x ${order.account_type} accounts\n\n📥 Your accounts are attached above.\nThank you for your purchase! 🚀\n\nType /start to order more!`,
        `accounts_${orderId}.zip`,
        4,
      );
      sendAttempts = result.attempts;
      if (result.ok) {
        sentToCustomer = true;
        await sendTelegramMessage(BOT_TOKEN!, order.customer_id,
          `🔐 *Two-Step Verification Code*\n\n` +
          `Your 2FA code for the accounts: \`123\`\n\n` +
          `Use this code when prompted during login.`
        );
      } else {
        sendError = result.error || JSON.stringify(result.response);
        console.error(`Telegram document send failed after ${result.attempts} attempts:`, sendError);
      }
    } else {
      sentToCustomer = true; // web users — no Telegram send needed
    }

    if (!sentToCustomer) {
      // Release the allocated accounts so the order can be retried cleanly
      await supabase.from("account_inventory")
        .update({ status: "available", order_id: null, allocated_at: null })
        .in("id", accountIds);

      if (isTgUser && progressMsgId) {
        await editTelegramMessage(BOT_TOKEN!, order.customer_id, progressMsgId,
          `⚠️ *Delivery failed*\n\n🆔 Order: \`${orderId}\`\n\nWe couldn't send the accounts file. Our team has been notified and will re-deliver shortly.`);
      }
      const ADMIN_BOT_TOKEN_ERR = Deno.env.get("ADMIN_BOT_TOKEN");
      if (ADMIN_BOT_TOKEN_ERR && ADMIN_CHAT_ID) {
        await sendTelegramMessage(ADMIN_BOT_TOKEN_ERR, ADMIN_CHAT_ID,
          `🚨 *Delivery FAILED* (after ${sendAttempts} retries)\n━━━━━━━━━━━━━━━\n🆔 \`${orderId}\`\n👤 \`${order.customer_id}\`\n🌍 ${country} × ${order.quantity}\n\nError: ${sendError || "unknown"}\n\nAccounts re-released to inventory. Please re-trigger delivery from admin.`);
      }
      return new Response(JSON.stringify({ success: false, error: "telegram_send_failed", attempts: sendAttempts, detail: sendError }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store delivered ZIP for admin/audit access (after successful send)
    const deliveryPath = `orders/${orderId}/accounts_${orderId}.zip`;
    await supabase.storage
      .from("account-files")
      .upload(deliveryPath, zipBlob, { upsert: true, contentType: "application/zip" });

    // Update order to delivered
    await supabase.from("orders").update({
      status: "delivered",
      delivery_file_path: deliveryPath,
      delivered_at: new Date().toISOString(),
    }).eq("order_id", orderId);

    // Reset conversation state
    await supabase.from("conversation_states")
      .update({ state: "idle", pending_order_id: null, updated_at: new Date().toISOString() })
      .eq("chat_id", order.customer_id);

    // Admin: order delivered notification
    const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
    if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
      const uname = order.customer_username ? ` (@${order.customer_username})` : "";
      await sendTelegramMessage(ADMIN_BOT_TOKEN, ADMIN_CHAT_ID,
        `✅ *Order Delivered*\n━━━━━━━━━━━━━━━\n🆔 \`${orderId}\`\n👤 \`${order.customer_id}\`${uname}\n🌍 ${country} — ${order.quantity}x ${accountType === "aged" ? "👑 Aged" : "📦 Regular"}\n💰 ${order.currency || "₹"}${order.total_amount} • ${order.payment_method || "—"}`
      );
    }

    // Low stock alert
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      const { data: remaining } = await supabase
        .from("account_inventory")
        .select("id")
        .eq("account_type", accountType)
        .eq("country", country)
        .eq("status", "available");

      const count = remaining?.length || 0;
      if (count < LOW_STOCK_THRESHOLD) {
        await sendTelegramMessage(BOT_TOKEN, ADMIN_CHAT_ID,
          `🚨 *LOW STOCK ALERT*\n\n` +
          `🌍 ${country} — ${accountType === "aged" ? "👑 Aged" : "📦 Regular"}: *${count}* remaining\n` +
          `Threshold: ${LOW_STOCK_THRESHOLD}\n\n` +
          `Please upload more .session files to restock! ⚡`
        );
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

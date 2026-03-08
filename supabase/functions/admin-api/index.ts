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
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, { method: "POST", body: formData });
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

  const adminKey = req.headers.get("x-admin-key");
  if (!ADMIN_PASSWORD || adminKey !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ========== GET ACTIONS ==========

    if (req.method === "GET" && action === "orders") {
      const status = url.searchParams.get("status");
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
      if (status && status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;

      // Enrich orders with customer info and purchase history
      const customerIds = [...new Set((data || []).map((o: any) => o.customer_id))];
      const { data: customersData } = await supabase.from("customers").select("telegram_id, username, first_name").in("telegram_id", customerIds);
      const { data: allOrders } = await supabase.from("orders").select("customer_id, amount, status, quantity").in("customer_id", customerIds);
      
      const customerMap: Record<string, any> = {};
      (customersData || []).forEach((c: any) => { customerMap[c.telegram_id] = c; });
      
      const customerHistory: Record<string, { total_orders: number; total_accounts: number; total_spent: number; delivered: number }> = {};
      (allOrders || []).forEach((o: any) => {
        if (!customerHistory[o.customer_id]) customerHistory[o.customer_id] = { total_orders: 0, total_accounts: 0, total_spent: 0, delivered: 0 };
        customerHistory[o.customer_id].total_orders++;
        customerHistory[o.customer_id].total_accounts += o.quantity;
        if (o.status === "delivered") { customerHistory[o.customer_id].delivered++; customerHistory[o.customer_id].total_spent += o.amount; }
      });

      const enrichedOrders = (data || []).map((o: any) => ({
        ...o,
        customer_username: customerMap[o.customer_id]?.username || o.username || null,
        customer_name: customerMap[o.customer_id]?.first_name || null,
        customer_history: customerHistory[o.customer_id] || { total_orders: 0, total_accounts: 0, total_spent: 0, delivered: 0 },
      }));

      return new Response(JSON.stringify({ orders: enrichedOrders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "customers") {
      const search = url.searchParams.get("search") || "";
      let query = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(500);
      if (search) {
        query = query.or(`username.ilike.%${search}%,first_name.ilike.%${search}%,telegram_id.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      // Get order counts per customer
      const { data: orders } = await supabase.from("orders").select("customer_id, amount, status, quantity");
      const customerStats: Record<string, { total_orders: number; total_spent: number; delivered: number; total_accounts: number }> = {};
      (orders || []).forEach((o: any) => {
        if (!customerStats[o.customer_id]) customerStats[o.customer_id] = { total_orders: 0, total_spent: 0, delivered: 0, total_accounts: 0 };
        customerStats[o.customer_id].total_orders++;
        customerStats[o.customer_id].total_accounts += o.quantity;
        if (o.status === "delivered") {
          customerStats[o.customer_id].delivered++;
          customerStats[o.customer_id].total_spent += o.amount;
        }
      });
      return new Response(JSON.stringify({ customers: data, customerStats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "customer_orders") {
      const customerId = url.searchParams.get("customer_id");
      const { data, error } = await supabase.from("orders").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ orders: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "pricing") {
      const { data, error } = await supabase.from("country_pricing").select("*").order("country_name");
      if (error) throw error;
      return new Response(JSON.stringify({ pricing: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "inventory_list") {
      const country = url.searchParams.get("country");
      const type = url.searchParams.get("type");
      const status = url.searchParams.get("inv_status");
      let query = supabase.from("account_inventory").select("*").order("created_at", { ascending: false }).limit(500);
      if (country && country !== "all") query = query.eq("country", country);
      if (type && type !== "all") query = query.eq("account_type", type);
      if (status && status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ inventory: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "dashboard") {
      // Aggregate stats
      const { data: allOrders } = await supabase.from("orders").select("amount, status, created_at, country");
      const { data: allInventory } = await supabase.from("account_inventory").select("country, account_type, status");
      const { data: allCustomers } = await supabase.from("customers").select("id");

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

      let totalRevenue = 0, todayRevenue = 0, weekRevenue = 0, monthRevenue = 0;
      let totalOrders = 0, todayOrders = 0, weekOrders = 0, monthOrders = 0;
      let deliveredCount = 0, pendingCount = 0;
      const countryRevenue: Record<string, number> = {};

      (allOrders || []).forEach((o: any) => {
        totalOrders++;
        const orderDate = o.created_at.split("T")[0];
        if (orderDate === todayStr) todayOrders++;
        if (o.created_at >= weekAgo) weekOrders++;
        if (o.created_at >= monthAgo) monthOrders++;

        if (o.status === "delivered") {
          deliveredCount++;
          totalRevenue += o.amount;
          if (orderDate === todayStr) todayRevenue += o.amount;
          if (o.created_at >= weekAgo) weekRevenue += o.amount;
          if (o.created_at >= monthAgo) monthRevenue += o.amount;
          countryRevenue[o.country] = (countryRevenue[o.country] || 0) + o.amount;
        }
        if (o.status === "pending" || o.status === "payment_received") pendingCount++;
      });

      // Stock levels
      const stockLevels: Record<string, { regular: number; aged: number }> = {};
      (allInventory || []).forEach((i: any) => {
        if (i.status === "available") {
          if (!stockLevels[i.country]) stockLevels[i.country] = { regular: 0, aged: 0 };
          stockLevels[i.country][i.account_type as "regular" | "aged"]++;
        }
      });

      const topCountries = Object.entries(countryRevenue)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([country, revenue]) => ({ country, revenue }));

      return new Response(JSON.stringify({
        totalRevenue, todayRevenue, weekRevenue, monthRevenue,
        totalOrders, todayOrders, weekOrders, monthOrders,
        deliveredCount, pendingCount,
        totalCustomers: allCustomers?.length || 0,
        topCountries, stockLevels,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== POST ACTIONS ==========
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";

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
        const { error: uploadError } = await supabase.storage.from("account-files").upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        await supabase.from("orders").update({ delivery_file_path: filePath, status: "delivered", delivered_at: new Date().toISOString() }).eq("order_id", orderId);

        if (BOT_TOKEN) {
          const { data: order } = await supabase.from("orders").select("customer_id, order_id, quantity, account_type, country").eq("order_id", orderId).single();
          if (order && order.customer_id && !order.customer_id.startsWith("web_")) {
            const { data: signedData } = await supabase.storage.from("account-files").createSignedUrl(filePath, 600);
            if (signedData?.signedUrl) {
              try {
                await sendTelegramDocument(BOT_TOKEN, order.customer_id, signedData.signedUrl,
                  `✅ *Order Delivered!*\n\n🆔 Order: \`${order.order_id}\`\n🌍 Country: ${order.country}\n📦 ${order.quantity}x ${order.account_type} accounts\n\n📥 Your accounts are attached above.\nThank you! 🚀\n\nType /start to order more!`,
                  file.name);
              } catch (e) { console.error("Failed to send Telegram document:", e); }
            }
          }
        }
        return new Response(JSON.stringify({ success: true, filePath }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const body = await req.json();

      if (body.action === "approve_payment") {
        const { orderId } = body;
        await supabase.from("orders").update({ status: "approved" }).eq("order_id", orderId);

        // Notify customer about approval
        if (BOT_TOKEN) {
          const { data: ord } = await supabase.from("orders").select("customer_id, order_id, quantity, account_type, amount, country").eq("order_id", orderId).single();
          if (ord && ord.customer_id && !ord.customer_id.startsWith("web_")) {
            await sendTelegramMessage(BOT_TOKEN, ord.customer_id,
              `✅ *Payment Approved!*\n\n` +
              `🆔 Order: \`${ord.order_id}\`\n` +
              `📦 ${ord.quantity}x ${ord.account_type}\n` +
              `💰 ₹${ord.amount}\n\n` +
              `⏳ Preparing your accounts for delivery...\nYou'll receive them shortly! 🚀`
            );
          }
        }

        const autoDeliverUrl = `${SUPABASE_URL}/functions/v1/auto-deliver`;
        const deliverRes = await fetch(autoDeliverUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ orderId }),
        });
        const deliverResult = await deliverRes.json();
        return new Response(JSON.stringify(deliverResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (body.action === "reject_payment") {
        const { orderId, reason } = body;
        await supabase.from("orders").update({ status: "rejected" }).eq("order_id", orderId);
        if (BOT_TOKEN) {
          const { data: order } = await supabase.from("orders").select("customer_id, order_id, quantity, account_type, amount").eq("order_id", orderId).single();
          if (order && order.customer_id && !order.customer_id.startsWith("web_")) {
            await sendTelegramMessage(BOT_TOKEN, order.customer_id,
              `❌ *Payment Declined*\n\n🆔 Order: \`${order.order_id}\`\n📦 ${order.quantity}x ${order.account_type}\n💰 ₹${order.amount}\n\n${reason ? `📝 Reason: ${reason}\n\n` : ""}Please re-check your payment and try again.\nType /start to place a new order.`);
          }
        }
        const { data: order } = await supabase.from("orders").select("customer_id").eq("order_id", orderId).single();
        if (order) {
          await supabase.from("conversation_states").update({ state: "idle", pending_order_id: null, updated_at: new Date().toISOString() }).eq("chat_id", order.customer_id);
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (body.action === "update_status") {
        const { orderId, status } = body;
        const updateData: any = { status };
        if (status === "delivered") updateData.delivered_at = new Date().toISOString();
        const { error } = await supabase.from("orders").update(updateData).eq("order_id", orderId);
        if (error) throw error;

        // Notify customer about status change
        if (BOT_TOKEN) {
          const { data: ord } = await supabase.from("orders").select("customer_id, order_id, quantity, account_type, amount").eq("order_id", orderId).single();
          if (ord && ord.customer_id && !ord.customer_id.startsWith("web_")) {
            const statusMessages: Record<string, string> = {
              approved: `✅ *Payment Approved!*\n\n🆔 Order: \`${ord.order_id}\`\n📦 ${ord.quantity}x ${ord.account_type}\n💰 ₹${ord.amount}\n\n⏳ Preparing your accounts... You'll receive them shortly! 🚀`,
              delivered: `📦 *Order Delivered!*\n\n🆔 Order: \`${ord.order_id}\`\n📦 ${ord.quantity}x ${ord.account_type}\n💰 ₹${ord.amount}\n\n✅ Your accounts have been delivered! Check your messages above.\nType /start to order more! 🎉`,
              rejected: `❌ *Order Rejected*\n\n🆔 Order: \`${ord.order_id}\`\n📦 ${ord.quantity}x ${ord.account_type}\n💰 ₹${ord.amount}\n\nPlease contact support or try again.\nType /start to place a new order.`,
              cancelled: `🚫 *Order Cancelled*\n\n🆔 Order: \`${ord.order_id}\`\n📦 ${ord.quantity}x ${ord.account_type}\n💰 ₹${ord.amount}\n\nType /start to place a new order.`,
            };
            const msg = statusMessages[status];
            if (msg) await sendTelegramMessage(BOT_TOKEN, ord.customer_id, msg);
          }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (body.action === "get_download_url") {
        const { filePath } = body;
        const { data, error } = await supabase.storage.from("account-files").createSignedUrl(filePath, 3600);
        if (error) throw error;
        return new Response(JSON.stringify({ url: data.signedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update pricing
      if (body.action === "update_pricing") {
        const { pricing } = body;
        for (const p of pricing) {
          const updateData: any = { updated_at: new Date().toISOString() };
          if (p.regular_price !== undefined) updateData.regular_price = p.regular_price;
          if (p.aged_price !== undefined) updateData.aged_price = p.aged_price;
          if (p.regular_price_usdt !== undefined) updateData.regular_price_usdt = p.regular_price_usdt;
          if (p.aged_price_usdt !== undefined) updateData.aged_price_usdt = p.aged_price_usdt;
          await supabase.from("country_pricing").update(updateData).eq("country_code", p.country_code);
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Delete inventory items
      if (body.action === "delete_inventory") {
        const { ids } = body; // Array of inventory IDs
        // Delete from storage too
        const { data: items } = await supabase.from("account_inventory").select("file_path").in("id", ids);
        if (items && items.length > 0) {
          const paths = items.map((i: any) => i.file_path);
          await supabase.storage.from("account-files").remove(paths);
        }
        const { error } = await supabase.from("account_inventory").delete().in("id", ids);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, deleted: ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Add country
      if (body.action === "add_country") {
        const { country_code, country_name, flag, regular_price, aged_price, regular_price_usdt, aged_price_usdt } = body;
        if (!country_code || !country_name) {
          return new Response(JSON.stringify({ error: "country_code and country_name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { error } = await supabase.from("country_pricing").upsert({
          country_code: country_code.toUpperCase(),
          country_name,
          flag: flag || "🌍",
          regular_price: regular_price || 50,
          aged_price: aged_price || 100,
          regular_price_usdt: regular_price_usdt || 0,
          aged_price_usdt: aged_price_usdt || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "country_code" });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Remove country
      if (body.action === "remove_country") {
        const { country_code } = body;
        if (!country_code) {
          return new Response(JSON.stringify({ error: "country_code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Check if there's inventory or orders for this country
        const { data: invCheck } = await supabase.from("account_inventory").select("id").eq("country", country_code).eq("status", "available").limit(1);
        if (invCheck && invCheck.length > 0) {
          return new Response(JSON.stringify({ error: "Cannot remove country with available inventory. Delete inventory first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { error } = await supabase.from("country_pricing").delete().eq("country_code", country_code);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Broadcast message
      if (body.action === "broadcast") {
        const { message } = body;
        if (!BOT_TOKEN) {
          return new Response(JSON.stringify({ error: "Bot token not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: customers } = await supabase.from("customers").select("telegram_id");
        let sent = 0, failed = 0;
        for (const c of (customers || [])) {
          try {
            await sendTelegramMessage(BOT_TOKEN, c.telegram_id, message);
            sent++;
          } catch {
            failed++;
          }
        }
        return new Response(JSON.stringify({ success: true, sent, failed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ========== CRYPTO WALLETS ==========
      if (body.action === "get_crypto_wallets") {
        const { data, error } = await supabase.from("crypto_wallets").select("*").order("coin_symbol");
        if (error) throw error;
        return new Response(JSON.stringify({ wallets: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (body.action === "add_crypto_wallet") {
        const { coin_name, coin_symbol, network, wallet_address } = body;
        if (!coin_name || !coin_symbol || !wallet_address) {
          return new Response(JSON.stringify({ error: "coin_name, coin_symbol, and wallet_address required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { error } = await supabase.from("crypto_wallets").insert({
          coin_name, coin_symbol: coin_symbol.toUpperCase(), network: network || "", wallet_address, is_active: true,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (body.action === "update_crypto_wallet") {
        const { id, coin_name, coin_symbol, network, wallet_address, is_active } = body;
        if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const updateData: any = { updated_at: new Date().toISOString() };
        if (coin_name !== undefined) updateData.coin_name = coin_name;
        if (coin_symbol !== undefined) updateData.coin_symbol = coin_symbol.toUpperCase();
        if (network !== undefined) updateData.network = network;
        if (wallet_address !== undefined) updateData.wallet_address = wallet_address;
        if (is_active !== undefined) updateData.is_active = is_active;
        const { error } = await supabase.from("crypto_wallets").update(updateData).eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (body.action === "delete_crypto_wallet") {
        const { id } = body;
        if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { error } = await supabase.from("crypto_wallets").delete().eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ========== UPI WALLETS ==========
      if (body.action === "add_upi_wallet") {
        const { upi_id, display_name } = body;
        if (!upi_id) return new Response(JSON.stringify({ error: "upi_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { error } = await supabase.from("upi_wallets").insert({ upi_id, display_name: display_name || "", is_active: true });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (body.action === "update_upi_wallet") {
        const { id, upi_id, display_name, is_active } = body;
        if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const updateData: any = { updated_at: new Date().toISOString() };
        if (upi_id !== undefined) updateData.upi_id = upi_id;
        if (display_name !== undefined) updateData.display_name = display_name;
        if (is_active !== undefined) updateData.is_active = is_active;
        const { error } = await supabase.from("upi_wallets").update(updateData).eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (body.action === "delete_upi_wallet") {
        const { id } = body;
        if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { error } = await supabase.from("upi_wallets").delete().eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // GET crypto wallets
    if (req.method === "GET" && action === "crypto_wallets") {
      const { data, error } = await supabase.from("crypto_wallets").select("*").order("coin_symbol");
      if (error) throw error;
      return new Response(JSON.stringify({ wallets: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET UPI wallets
    if (req.method === "GET" && action === "upi_wallets") {
      const { data, error } = await supabase.from("upi_wallets").select("*").order("created_at");
      if (error) throw error;
      return new Response(JSON.stringify({ wallets: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

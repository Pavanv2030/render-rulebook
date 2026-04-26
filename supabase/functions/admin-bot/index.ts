import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COUNTRIES = [
  { code: "IN", flag: "🇮🇳", name: "India" }, { code: "US", flag: "🇺🇸", name: "USA" },
  { code: "UK", flag: "🇬🇧", name: "UK" }, { code: "ET", flag: "🇪🇹", name: "Ethiopia" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" }, { code: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "DE", flag: "🇩🇪", name: "Germany" }, { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria" }, { code: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa" }, { code: "AE", flag: "🇦🇪", name: "UAE" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia" }, { code: "TR", flag: "🇹🇷", name: "Turkey" },
  { code: "CA", flag: "🇨🇦", name: "Canada" }, { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "JP", flag: "🇯🇵", name: "Japan" }, { code: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "TM", flag: "🇹🇲", name: "Turkmenistan" }, { code: "MG", flag: "🇲🇬", name: "Madagascar" },
];

const SYMBOL = "₹";

function getCountryInfo(code: string) {
  return COUNTRIES.find(c => c.code === code) || { code, flag: "🌍", name: code };
}

async function sendMsg(botToken: string, chatId: string, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

async function sendToCustomer(customerBotToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${customerBotToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
  const CUSTOMER_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
  if (!BOT_TOKEN) return new Response("ADMIN_BOT_TOKEN not configured", { status: 500 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const update = await req.json();
    const message = update.message || update.callback_query?.message;
    const callbackQuery = update.callback_query;
    const chatId = String(message?.chat?.id || callbackQuery?.from?.id);
    const text = (update.message?.text || "").trim();
    const callbackData = callbackQuery?.data || "";

    if (!chatId) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    // Only allow admin
    if (ADMIN_CHAT_ID && chatId !== ADMIN_CHAT_ID) {
      await sendMsg(BOT_TOKEN, chatId, "⛔ Unauthorized. This bot is for admin only.");
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (callbackQuery) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQuery.id }),
      });
    }

    const input = (callbackData || text).toLowerCase();

    // ==================== /start or /help ====================
    if (input === "/start" || input === "/help") {
      await sendMsg(BOT_TOKEN, chatId,
        `🛡️ *Admin Bot — Command Center*\n\n` +
        `📊 /dashboard — Revenue & stats overview\n` +
        `📦 /orders — Recent orders (all)\n` +
        `⏳ /pending — Pending approval orders\n` +
        `📦 /stock — Inventory levels\n` +
        `👥 /customers — Top customers\n` +
        `💰 /pricing — View current pricing\n` +
        `📢 /broadcast <msg> — Message all customers\n\n` +
        `*Order Actions:*\n` +
        `✅ /approve ORDxxxxxx\n` +
        `❌ /reject ORDxxxxxx <reason>\n` +
        `📥 /deliver ORDxxxxxx\n\n` +
        `*Stock Management:*\n` +
        `📦 /restock — Upload .session files via Telegram\n` +
        `🌍 /countries — List all countries\n` +
        `➕ /addcountry CODE Name Flag RegPrice AgedPrice\n` +
        `✏️ /editcountry CODE field value\n` +
        `🗑️ /removecountry CODE\n` +
        `💲 /setprice CC regular aged\n\n` +
        `*Crypto Wallets:*\n` +
        `💰 /crypto — List all wallets\n` +
        `➕ /addwallet SYMBOL Name Network Address\n` +
        `✏️ /editwallet SYMBOL NewAddress\n` +
        `🔄 /togglewallet SYMBOL — Enable/disable\n` +
        `🗑️ /removewallet SYMBOL — Delete wallet\n\n` +
        `*Manual Login:*\n` +
        `🔑 /sendotp REQUEST\\_ID OTP 2FA — Send OTP+2FA to customer\n` +
        `📋 /loginrequests — View pending login requests\n\n` +
        `*Web Support:*\n` +
        `💬 /reply SESSION\\_ID message — Reply to web customer`
      );
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /dashboard ====================
    if (input === "/dashboard") {
      const { data: allOrders } = await supabase.from("orders").select("amount, status, created_at, country");
      const { data: allCustomers } = await supabase.from("customers").select("id");
      const { data: allInventory } = await supabase.from("account_inventory").select("country, account_type, status");

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

      let totalRevenue = 0, todayRevenue = 0, weekRevenue = 0, monthRevenue = 0;
      let totalOrders = 0, todayOrders = 0, pendingCount = 0, deliveredCount = 0;
      const countryRev: Record<string, number> = {};

      (allOrders || []).forEach((o: any) => {
        totalOrders++;
        if (o.created_at.split("T")[0] === todayStr) todayOrders++;
        if (o.status === "delivered") {
          deliveredCount++;
          totalRevenue += o.amount;
          if (o.created_at.split("T")[0] === todayStr) todayRevenue += o.amount;
          if (o.created_at >= weekAgo) weekRevenue += o.amount;
          if (o.created_at >= monthAgo) monthRevenue += o.amount;
          countryRev[o.country] = (countryRev[o.country] || 0) + o.amount;
        }
        if (o.status === "pending" || o.status === "payment_received") pendingCount++;
      });

      // Stock totals
      let totalStock = 0;
      (allInventory || []).forEach((i: any) => { if (i.status === "available") totalStock++; });

      const topCountries = Object.entries(countryRev).sort(([,a],[,b]) => b - a).slice(0, 5)
        .map(([c, r]) => `${getCountryInfo(c).flag} ${getCountryInfo(c).name}: ${SYMBOL}${r.toLocaleString()}`).join("\n");

      await sendMsg(BOT_TOKEN, chatId,
        `📊 *DASHBOARD*\n\n` +
        `💰 *Revenue*\n` +
        `├ Today: *${SYMBOL}${todayRevenue.toLocaleString()}*\n` +
        `├ This Week: *${SYMBOL}${weekRevenue.toLocaleString()}*\n` +
        `├ This Month: *${SYMBOL}${monthRevenue.toLocaleString()}*\n` +
        `└ All Time: *${SYMBOL}${totalRevenue.toLocaleString()}*\n\n` +
        `📦 *Orders*\n` +
        `├ Total: ${totalOrders}\n` +
        `├ Today: ${todayOrders}\n` +
        `├ Pending: ${pendingCount}\n` +
        `└ Delivered: ${deliveredCount}\n\n` +
        `👥 Customers: ${allCustomers?.length || 0}\n` +
        `📦 Stock Available: ${totalStock}\n\n` +
        `🏆 *Top Countries:*\n${topCountries || "No data yet"}`
      );
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /orders ====================
    if (input === "/orders") {
      const { data: orders } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(15);
      if (!orders || orders.length === 0) {
        await sendMsg(BOT_TOKEN, chatId, "📭 No orders found.");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      const ids = [...new Set(orders.map((o: any) => o.customer_id))];
      const { data: custs } = await supabase.from("customers").select("telegram_id, customer_code").in("telegram_id", ids);
      const codeMap: Record<string, string> = {};
      (custs || []).forEach((c: any) => { codeMap[c.telegram_id] = c.customer_code; });

      let msg = "📦 *Recent Orders:*\n\n";
      for (const o of orders) {
        const ci = getCountryInfo(o.country);
        const emoji = o.status === "delivered" ? "✅" : o.status === "payment_received" ? "💳" : o.status === "pending" ? "⏳" : o.status === "rejected" ? "❌" : "🚫";
        const code = codeMap[o.customer_id] || "—";
        msg += `${emoji} \`${o.order_id}\` ${ci.flag} ${o.quantity}x ${o.account_type}\n   👤 \`${code}\` @${o.username || "?"}\n   💰${SYMBOL}${o.amount} — ${o.status.replace("_"," ")}\n\n`;
      }
      await sendMsg(BOT_TOKEN, chatId, msg);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /pending ====================
    if (input === "/pending") {
      const { data: orders } = await supabase.from("orders").select("*").eq("status", "payment_received").order("created_at", { ascending: false }).limit(20);
      if (!orders || orders.length === 0) {
        await sendMsg(BOT_TOKEN, chatId, "✅ No pending approvals!");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      const ids = [...new Set(orders.map((o: any) => o.customer_id))];
      const { data: custs } = await supabase.from("customers").select("telegram_id, customer_code").in("telegram_id", ids);
      const codeMap: Record<string, string> = {};
      (custs || []).forEach((c: any) => { codeMap[c.telegram_id] = c.customer_code; });

      let msg = `💳 *${orders.length} Orders Awaiting Approval:*\n\n`;
      const buttons: any[][] = [];
      for (const o of orders) {
        const ci = getCountryInfo(o.country);
        const code = codeMap[o.customer_id] || "—";
        msg += `\`${o.order_id}\` — ${ci.flag} ${o.quantity}x ${o.account_type} — ${SYMBOL}${o.amount}\n👤 \`${code}\` @${o.username || "?"}\n\n`;
        buttons.push([
          { text: `✅ Approve ${o.order_id}`, callback_data: `approve_${o.order_id}` },
          { text: `❌ Reject ${o.order_id}`, callback_data: `reject_${o.order_id}` },
        ]);
      }
      await sendMsg(BOT_TOKEN, chatId, msg, { inline_keyboard: buttons });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /approve ====================
    if (input.startsWith("/approve ") || input.startsWith("approve_")) {
      const orderId = input.startsWith("approve_") ? input.replace("approve_", "").toUpperCase() : text.split(" ")[1]?.toUpperCase();
      if (!orderId) { await sendMsg(BOT_TOKEN, chatId, "Usage: /approve ORDxxxxxx"); return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders }); }

      await sendMsg(BOT_TOKEN, chatId, `⏳ Approving & delivering ${orderId}...`);
      await supabase.from("orders").update({ status: "approved" }).eq("order_id", orderId);

      // Notify customer about approval
      if (CUSTOMER_BOT_TOKEN) {
        const { data: ord } = await supabase.from("orders").select("customer_id, order_id, quantity, account_type, amount, country").eq("order_id", orderId).single();
        if (ord && ord.customer_id && !ord.customer_id.startsWith("web_")) {
          const ci = getCountryInfo(ord.country);
          await sendToCustomer(CUSTOMER_BOT_TOKEN, ord.customer_id,
            `✅ *Payment Approved!*\n\n` +
            `🆔 Order: \`${ord.order_id}\`\n` +
            `${ci.flag} Country: ${ci.name}\n` +
            `📦 ${ord.quantity}x ${ord.account_type}\n` +
            `💰 ${SYMBOL}${ord.amount}\n\n` +
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
      const result = await deliverRes.json();

      if (result.success) {
        await sendMsg(BOT_TOKEN, chatId, `✅ *Order ${orderId} Delivered!*\n📦 ${result.delivered} accounts sent to customer.`);
      } else if (result.error === "insufficient_stock") {
        await sendMsg(BOT_TOKEN, chatId, `⚠️ *Insufficient stock for ${orderId}*\nAvailable: ${result.available}, Requested: ${result.requested}`);
      } else {
        await sendMsg(BOT_TOKEN, chatId, `❌ Delivery failed: ${result.error || "Unknown error"}`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /reject ====================
    if (input.startsWith("/reject ") || input.startsWith("reject_")) {
      let orderId: string, reason: string;
      if (input.startsWith("reject_")) {
        orderId = input.replace("reject_", "").toUpperCase();
        reason = "";
      } else {
        const parts = text.split(" ");
        orderId = parts[1]?.toUpperCase() || "";
        reason = parts.slice(2).join(" ");
      }
      if (!orderId) { await sendMsg(BOT_TOKEN, chatId, "Usage: /reject ORDxxxxxx [reason]"); return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders }); }

      await supabase.from("orders").update({ status: "rejected" }).eq("order_id", orderId);

      // Notify customer
      if (CUSTOMER_BOT_TOKEN) {
        const { data: order } = await supabase.from("orders").select("customer_id, order_id, quantity, account_type, amount").eq("order_id", orderId).single();
        if (order && order.customer_id && !order.customer_id.startsWith("web_")) {
          await sendToCustomer(CUSTOMER_BOT_TOKEN, order.customer_id,
            `❌ *Payment Declined*\n\n🆔 Order: \`${order.order_id}\`\n📦 ${order.quantity}x ${order.account_type}\n💰 ${SYMBOL}${order.amount}\n\n${reason ? `📝 Reason: ${reason}\n\n` : ""}Please re-check and try again.\nType /start to place a new order.`);
        }
      }

      // Reset conversation state
      const { data: order } = await supabase.from("orders").select("customer_id").eq("order_id", orderId).single();
      if (order) {
        await supabase.from("conversation_states").update({ state: "idle", pending_order_id: null, updated_at: new Date().toISOString() }).eq("chat_id", order.customer_id);
      }

      await sendMsg(BOT_TOKEN, chatId, `❌ *Order ${orderId} rejected.*${reason ? `\nReason: ${reason}` : ""}\nCustomer notified.`);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /deliver (trigger auto-deliver) ====================
    if (input.startsWith("/deliver ")) {
      const orderId = text.split(" ")[1]?.toUpperCase();
      if (!orderId) { await sendMsg(BOT_TOKEN, chatId, "Usage: /deliver ORDxxxxxx"); return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders }); }

      await sendMsg(BOT_TOKEN, chatId, `⏳ Triggering delivery for ${orderId}...`);
      const autoDeliverUrl = `${SUPABASE_URL}/functions/v1/auto-deliver`;
      const deliverRes = await fetch(autoDeliverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ orderId }),
      });
      const result = await deliverRes.json();
      if (result.success) {
        await sendMsg(BOT_TOKEN, chatId, `✅ *Delivered ${orderId}!* ${result.delivered} accounts sent.`);
      } else {
        await sendMsg(BOT_TOKEN, chatId, `❌ Failed: ${result.error || "Unknown"}`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /stock ====================
    if (input === "/stock") {
      const { data: inv } = await supabase.from("account_inventory").select("country, account_type, status");
      const levels: Record<string, { regular: number; aged: number; allocated: number }> = {};
      (inv || []).forEach((i: any) => {
        if (!levels[i.country]) levels[i.country] = { regular: 0, aged: 0, allocated: 0 };
        if (i.status === "available") levels[i.country][i.account_type as "regular" | "aged"]++;
        if (i.status === "allocated") levels[i.country].allocated++;
      });

      let msg = "📦 *Inventory Stock Levels:*\n\n";
      let totalAvail = 0;
      for (const [code, l] of Object.entries(levels)) {
        const ci = getCountryInfo(code);
        const avail = l.regular + l.aged;
        totalAvail += avail;
        if (avail > 0 || l.allocated > 0) {
          msg += `${ci.flag} *${ci.name}*\n`;
          msg += `   📦 Regular: ${l.regular} | 👑 Aged: ${l.aged}`;
          if (l.allocated > 0) msg += ` | 🔒 Allocated: ${l.allocated}`;
          msg += `\n\n`;
        }
      }
      if (totalAvail === 0) msg += "⚠️ No stock available!\n";
      else msg += `\n📊 *Total Available: ${totalAvail}*`;

      await sendMsg(BOT_TOKEN, chatId, msg);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /customers ====================
    if (input === "/customers") {
      const { data: orders } = await supabase.from("orders").select("customer_id, username, amount, status");
      const stats: Record<string, { username: string; orders: number; spent: number; delivered: number }> = {};
      (orders || []).forEach((o: any) => {
        if (o.customer_id.startsWith("web_")) return;
        if (!stats[o.customer_id]) stats[o.customer_id] = { username: o.username || "?", orders: 0, spent: 0, delivered: 0 };
        stats[o.customer_id].orders++;
        if (o.status === "delivered") { stats[o.customer_id].spent += o.amount; stats[o.customer_id].delivered++; }
      });

      const sorted = Object.entries(stats).sort(([,a],[,b]) => b.spent - a.spent).slice(0, 15);
      let msg = `👥 *Top ${sorted.length} Customers:*\n\n`;
      sorted.forEach(([id, s], i) => {
        msg += `${i + 1}. @${s.username} — ${SYMBOL}${s.spent.toLocaleString()} spent\n   📦 ${s.orders} orders | ✅ ${s.delivered} delivered\n\n`;
      });
      if (sorted.length === 0) msg += "No customers yet.";

      await sendMsg(BOT_TOKEN, chatId, msg);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /countries ====================
    if (input === "/countries") {
      const { data: countries } = await supabase.from("country_pricing").select("*").order("country_name");
      if (!countries || countries.length === 0) {
        await sendMsg(BOT_TOKEN, chatId, "🌍 No countries configured.\n\nAdd one with:\n`/addcountry CODE Name Flag RegPrice AgedPrice`");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Get stock counts per country
      const { data: inv } = await supabase.from("account_inventory").select("country, account_type, status");
      const stockMap: Record<string, { regular: number; aged: number }> = {};
      (inv || []).forEach((i: any) => {
        if (i.status !== "available") return;
        if (!stockMap[i.country]) stockMap[i.country] = { regular: 0, aged: 0 };
        stockMap[i.country][i.account_type as "regular" | "aged"]++;
      });

      let msg = `🌍 *Countries (${countries.length}):*\n\n`;
      for (const c of countries) {
        const stock = stockMap[c.country_code] || { regular: 0, aged: 0 };
        msg += `${c.flag} *${c.country_name}* (${c.country_code})\n`;
        msg += `   💰 Regular: ${SYMBOL}${c.regular_price}${c.regular_price_usdt ? ` / $${c.regular_price_usdt}` : ""}\n`;
        msg += `   👑 Aged: ${SYMBOL}${c.aged_price}${c.aged_price_usdt ? ` / $${c.aged_price_usdt}` : ""}\n`;
        msg += `   📦 Stock: ${stock.regular} regular, ${stock.aged} aged\n\n`;
      }
      msg += `_Commands: /addcountry, /editcountry, /removecountry_`;
      await sendMsg(BOT_TOKEN, chatId, msg);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /pricing ====================
    if (input === "/pricing") {
      const { data: pricing } = await supabase.from("country_pricing").select("*").order("country_name");
      if (!pricing || pricing.length === 0) {
        await sendMsg(BOT_TOKEN, chatId, "No pricing data found.");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      let msg = "💰 *Current Pricing:*\n\n";
      for (const p of pricing) {
        msg += `${p.flag} *${p.country_name}* (${p.country_code})\n   📦 Regular: ${SYMBOL}${p.regular_price} | 👑 Aged: ${SYMBOL}${p.aged_price}\n\n`;
      }
      msg += `\n_To update: /setprice CC regular aged_\n_Example: /setprice IN 60 120_`;
      await sendMsg(BOT_TOKEN, chatId, msg);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /addcountry ====================
    if (input.startsWith("/addcountry ")) {
      const parts = text.split(" ");
      // /addcountry CODE Name Flag RegPrice AgedPrice RegUSDT AgedUSDT
      const countryCode = parts[1]?.toUpperCase();
      const countryName = parts[2];
      const flag = parts[3] || "🌍";
      const regularPrice = parseFloat(parts[4]) || 50;
      const agedPrice = parseFloat(parts[5]) || 100;
      const regularPriceUsdt = parseFloat(parts[6]) || 0;
      const agedPriceUsdt = parseFloat(parts[7]) || 0;

      if (!countryCode || !countryName) {
        await sendMsg(BOT_TOKEN, chatId,
          "Usage: `/addcountry CODE Name Flag RegPrice AgedPrice [RegUSDT] [AgedUSDT]`\n\n" +
          "Examples:\n" +
          "`/addcountry PK Pakistan 🇵🇰 50 100`\n" +
          "`/addcountry PK Pakistan 🇵🇰 50 100 1.5 3`");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Check if already exists
      const { data: existing } = await supabase.from("country_pricing").select("id").eq("country_code", countryCode).single();
      if (existing) {
        await sendMsg(BOT_TOKEN, chatId, `⚠️ *${countryCode}* already exists! Use /editcountry to modify it.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { error } = await supabase.from("country_pricing").insert({
        country_code: countryCode, country_name: countryName, flag,
        regular_price: regularPrice, aged_price: agedPrice,
        regular_price_usdt: regularPriceUsdt, aged_price_usdt: agedPriceUsdt,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Error: ${error.message}`);
      } else {
        await sendMsg(BOT_TOKEN, chatId,
          `✅ *Country Added!*\n\n${flag} *${countryName}* (${countryCode})\n` +
          `📦 Regular: ${SYMBOL}${regularPrice}${regularPriceUsdt ? ` / $${regularPriceUsdt}` : ""}\n` +
          `👑 Aged: ${SYMBOL}${agedPrice}${agedPriceUsdt ? ` / $${agedPriceUsdt}` : ""}\n\n` +
          `_Available immediately in the customer bot._`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /editcountry ====================
    if (input.startsWith("/editcountry ")) {
      const parts = text.split(" ");
      // /editcountry CODE field value
      const countryCode = parts[1]?.toUpperCase();
      const field = parts[2]?.toLowerCase();
      const value = parts.slice(3).join(" ");

      if (!countryCode || !field || !value) {
        await sendMsg(BOT_TOKEN, chatId,
          "Usage: `/editcountry CODE field value`\n\n" +
          "*Fields:* name, flag, regular, aged, regular\\_usdt, aged\\_usdt\n\n" +
          "Examples:\n" +
          "`/editcountry IN name India`\n" +
          "`/editcountry IN flag 🇮🇳`\n" +
          "`/editcountry IN regular 60`\n" +
          "`/editcountry IN aged 120`\n" +
          "`/editcountry IN regular_usdt 2`\n" +
          "`/editcountry IN aged_usdt 4`");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { data: existing } = await supabase.from("country_pricing").select("*").eq("country_code", countryCode).single();
      if (!existing) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Country *${countryCode}* not found. Use /addcountry to create it.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      let fieldLabel = "";

      switch (field) {
        case "name":
          updateData.country_name = value;
          fieldLabel = `Name → *${value}*`;
          break;
        case "flag":
          updateData.flag = value;
          fieldLabel = `Flag → ${value}`;
          break;
        case "regular":
          updateData.regular_price = parseFloat(value);
          fieldLabel = `Regular Price → ${SYMBOL}${value}`;
          break;
        case "aged":
          updateData.aged_price = parseFloat(value);
          fieldLabel = `Aged Price → ${SYMBOL}${value}`;
          break;
        case "regular_usdt":
          updateData.regular_price_usdt = parseFloat(value);
          fieldLabel = `Regular USDT → $${value}`;
          break;
        case "aged_usdt":
          updateData.aged_price_usdt = parseFloat(value);
          fieldLabel = `Aged USDT → $${value}`;
          break;
        default:
          await sendMsg(BOT_TOKEN, chatId, `❌ Unknown field: *${field}*\n\nValid fields: name, flag, regular, aged, regular\\_usdt, aged\\_usdt`);
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { error } = await supabase.from("country_pricing").update(updateData).eq("country_code", countryCode);
      if (error) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Error: ${error.message}`);
      } else {
        await sendMsg(BOT_TOKEN, chatId,
          `✅ *Country Updated!*\n\n${existing.flag} *${existing.country_name}* (${countryCode})\n${fieldLabel}\n\n_Changes apply immediately._`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /removecountry ====================
    if (input.startsWith("/removecountry ")) {
      const countryCode = text.split(" ")[1]?.toUpperCase();
      if (!countryCode) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: `/removecountry CODE`\nExample: `/removecountry PK`");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { data: existing } = await supabase.from("country_pricing").select("country_name, flag").eq("country_code", countryCode).single();
      if (!existing) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Country *${countryCode}* not found.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Check inventory
      const { data: invCheck } = await supabase.from("account_inventory").select("id").eq("country", countryCode).eq("status", "available").limit(1);
      if (invCheck && invCheck.length > 0) {
        await sendMsg(BOT_TOKEN, chatId, `⚠️ Cannot remove *${countryCode}* — it has available inventory.\n\nDelete inventory first or wait until stock runs out.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Check pending orders
      const { data: pendingOrders } = await supabase.from("orders").select("id").eq("country", countryCode).in("status", ["pending", "payment_received", "approved"]).limit(1);
      if (pendingOrders && pendingOrders.length > 0) {
        await sendMsg(BOT_TOKEN, chatId, `⚠️ Cannot remove *${countryCode}* — it has pending/active orders.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { error } = await supabase.from("country_pricing").delete().eq("country_code", countryCode);
      if (error) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Error: ${error.message}`);
      } else {
        await sendMsg(BOT_TOKEN, chatId, `✅ *Country Removed!*\n\n${existing.flag} *${existing.country_name}* (${countryCode})\n\n_It will no longer appear in the customer bot._`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /setprice ====================
    if (input.startsWith("/setprice ")) {
      const parts = text.split(" ");
      const countryCode = parts[1]?.toUpperCase();
      const regular = parseFloat(parts[2]);
      const aged = parseFloat(parts[3]);

      if (!countryCode || isNaN(regular) || isNaN(aged)) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: /setprice CC regular aged\nExample: /setprice IN 60 120");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { error } = await supabase.from("country_pricing").update({
        regular_price: regular, aged_price: aged, updated_at: new Date().toISOString(),
      }).eq("country_code", countryCode);

      if (error) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Error: ${error.message}`);
      } else {
        const ci = getCountryInfo(countryCode);
        await sendMsg(BOT_TOKEN, chatId,
          `✅ *Pricing Updated!*\n\n${ci.flag} *${ci.name}*\n📦 Regular: ${SYMBOL}${regular}\n👑 Aged: ${SYMBOL}${aged}\n\n_Changes apply immediately to the customer bot._`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /crypto — List crypto wallets ====================
    if (input === "/crypto") {
      const { data: wallets } = await supabase.from("crypto_wallets").select("*").order("coin_symbol");
      if (!wallets || wallets.length === 0) {
        await sendMsg(BOT_TOKEN, chatId, "💰 *No crypto wallets configured.*\n\nAdd one with:\n`/addwallet SYMBOL CoinName Network Address`\n\nExample:\n`/addwallet USDT Tether TRC20 TYourWalletAddress`");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      let msg = "💰 *Crypto Wallets:*\n\n";
      for (const w of wallets) {
        const status = w.is_active ? "🟢 Active" : "🔴 Inactive";
        msg += `*${w.coin_symbol}* — ${w.coin_name}${w.network ? ` (${w.network})` : ""}\n`;
        msg += `\`${w.wallet_address}\`\n${status}\n\n`;
      }
      msg += `_Commands:_\n/addwallet — Add new\n/editwallet — Update address\n/togglewallet — Enable/disable\n/removewallet — Delete`;
      await sendMsg(BOT_TOKEN, chatId, msg);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /addwallet ====================
    if (input.startsWith("/addwallet ")) {
      // /addwallet SYMBOL CoinName Network Address
      const parts = text.split(" ");
      const symbol = parts[1]?.toUpperCase();
      const coinName = parts[2];
      const network = parts[3] || "";
      const address = parts.slice(4).join(" ") || parts[3] || "";

      if (!symbol || !coinName || !address) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: `/addwallet SYMBOL CoinName Network Address`\n\nExamples:\n`/addwallet USDT Tether TRC20 TYourAddress`\n`/addwallet BTC Bitcoin Mainnet bc1YourAddress`\n`/addwallet ETH Ethereum ERC20 0xYourAddress`");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // If network is actually the address (3 parts only)
      let finalNetwork = network;
      let finalAddress = address;
      if (parts.length === 4) {
        finalNetwork = "";
        finalAddress = parts[3];
      } else {
        finalNetwork = parts[3];
        finalAddress = parts.slice(4).join(" ");
      }

      const { error } = await supabase.from("crypto_wallets").insert({
        coin_symbol: symbol, coin_name: coinName, network: finalNetwork, wallet_address: finalAddress, is_active: true,
      });
      if (error) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Error: ${error.message}`);
      } else {
        await sendMsg(BOT_TOKEN, chatId, `✅ *Wallet Added!*\n\n*${symbol}* — ${coinName}${finalNetwork ? ` (${finalNetwork})` : ""}\n\`${finalAddress}\`\n\n_Available immediately in the customer bot._`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /editwallet ====================
    if (input.startsWith("/editwallet ")) {
      // /editwallet SYMBOL NewAddress
      const parts = text.split(" ");
      const symbol = parts[1]?.toUpperCase();
      const newAddress = parts.slice(2).join(" ");

      if (!symbol || !newAddress) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: `/editwallet SYMBOL NewAddress`\nExample: `/editwallet USDT TNewWalletAddress`");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { data: existing } = await supabase.from("crypto_wallets").select("id").eq("coin_symbol", symbol).limit(1);
      if (!existing || existing.length === 0) {
        await sendMsg(BOT_TOKEN, chatId, `❌ No wallet found for *${symbol}*. Use /addwallet to create one.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { error } = await supabase.from("crypto_wallets").update({ wallet_address: newAddress, updated_at: new Date().toISOString() }).eq("coin_symbol", symbol);
      if (error) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Error: ${error.message}`);
      } else {
        await sendMsg(BOT_TOKEN, chatId, `✅ *${symbol} wallet updated!*\n\nNew address: \`${newAddress}\``);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /togglewallet ====================
    if (input.startsWith("/togglewallet ")) {
      const symbol = text.split(" ")[1]?.toUpperCase();
      if (!symbol) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: `/togglewallet SYMBOL`\nExample: `/togglewallet BTC`");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { data: wallet } = await supabase.from("crypto_wallets").select("id, is_active, coin_symbol").eq("coin_symbol", symbol).single();
      if (!wallet) {
        await sendMsg(BOT_TOKEN, chatId, `❌ No wallet found for *${symbol}*.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const newStatus = !wallet.is_active;
      await supabase.from("crypto_wallets").update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq("id", wallet.id);
      await sendMsg(BOT_TOKEN, chatId, `✅ *${symbol}* is now ${newStatus ? "🟢 Active" : "🔴 Inactive"}`);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /removewallet ====================
    if (input.startsWith("/removewallet ")) {
      const symbol = text.split(" ")[1]?.toUpperCase();
      if (!symbol) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: `/removewallet SYMBOL`\nExample: `/removewallet BTC`");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { error } = await supabase.from("crypto_wallets").delete().eq("coin_symbol", symbol);
      if (error) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Error: ${error.message}`);
      } else {
        await sendMsg(BOT_TOKEN, chatId, `✅ *${symbol} wallet removed!*`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /broadcast ====================
    if (input.startsWith("/broadcast ")) {
      const message = text.substring(11).trim();
      if (!message) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: /broadcast Your message here");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      if (!CUSTOMER_BOT_TOKEN) {
        await sendMsg(BOT_TOKEN, chatId, "❌ Customer bot token not configured.");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const { data: customers } = await supabase.from("customers").select("telegram_id");
      const realCustomers = (customers || []).filter(c => !c.telegram_id.startsWith("web_"));

      await sendMsg(BOT_TOKEN, chatId, `📢 Broadcasting to ${realCustomers.length} customers...`);

      let sent = 0, failed = 0;
      for (const c of realCustomers) {
        try {
          await sendToCustomer(CUSTOMER_BOT_TOKEN, c.telegram_id, message);
          sent++;
        } catch { failed++; }
      }

      await sendMsg(BOT_TOKEN, chatId, `✅ *Broadcast Complete!*\n\n📨 Sent: ${sent}\n❌ Failed: ${failed}`);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /sendotp ====================
    if (input.startsWith("/sendotp ") || input.startsWith("admin_sendotp_")) {
      let requestId: string, otpCode: string, twofaCode: string;

      if (input.startsWith("admin_sendotp_")) {
        // Callback from inline button — ask admin to reply with codes
        requestId = callbackData.replace("admin_sendotp_", "");
        await sendMsg(BOT_TOKEN, chatId, `🔑 Reply with:\n\`/sendotp ${requestId} OTP_CODE 2FA_CODE\`\n\nExample:\n\`/sendotp ${requestId} 45821 mypass123\``);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const parts = text.replace("/sendotp ", "").split(/\s+/);
      if (parts.length < 3) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: /sendotp REQUEST_ID OTP_CODE 2FA_CODE");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      requestId = parts[0];
      otpCode = parts[1];
      twofaCode = parts.slice(2).join(" ");

      // Get login request
      const { data: loginReq } = await supabase.from("login_requests").select("*").eq("id", requestId).single();
      if (!loginReq) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Login request \`${requestId}\` not found.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Update request with codes
      await supabase.from("login_requests").update({
        otp_code: otpCode, twofa_code: twofaCode, status: "resolved", resolved_at: new Date().toISOString(),
      }).eq("id", requestId);

      // Send to customer via customer bot
      if (CUSTOMER_BOT_TOKEN) {
        await sendToCustomer(CUSTOMER_BOT_TOKEN, loginReq.customer_chat_id,
          `🔑 *LOGIN CODES RECEIVED!*\n\n` +
          `📱 Number: \`${loginReq.phone_number}\`\n` +
          `🆔 Order: \`${loginReq.order_id}\`\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🔐 *OTP Code:* \`${otpCode}\`\n` +
          `🛡️ *2FA Code:* \`${twofaCode}\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚠️ _Use these codes quickly!\nOTP expires in a few minutes._`
        );
      }

      await sendMsg(BOT_TOKEN, chatId,
        `✅ *OTP+2FA Sent!*\n\n` +
        `📱 Number: \`${loginReq.phone_number}\`\n` +
        `👤 Customer: \`${loginReq.customer_chat_id}\`\n` +
        `🔐 OTP: \`${otpCode}\`\n` +
        `🛡️ 2FA: \`${twofaCode}\``
      );
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /loginrequests ====================
    if (input === "/loginrequests") {
      const { data: requests } = await supabase.from("login_requests").select("*")
        .eq("status", "pending").order("created_at", { ascending: false }).limit(20);

      if (!requests || requests.length === 0) {
        await sendMsg(BOT_TOKEN, chatId, "📋 *No pending login requests.*");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      let msg = `📋 *PENDING LOGIN REQUESTS*\n\n`;
      for (const r of requests) {
        const age = Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000);
        msg += `🔑 \`${r.id}\`\n` +
          `  📱 \`${r.phone_number}\`\n` +
          `  🆔 Order: \`${r.order_id}\`\n` +
          `  ⏱️ ${age} min ago\n` +
          `  Reply: \`/sendotp ${r.id} OTP 2FA\`\n\n`;
      }

      await sendMsg(BOT_TOKEN, chatId, msg);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /reply (web support) ====================
    if (input.startsWith("/reply ")) {
      const firstSpace = text.indexOf(" ", 7);
      if (firstSpace === -1) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: /reply SESSION_ID Your reply message");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      const targetSession = text.substring(7, firstSpace).trim();
      const replyText = text.substring(firstSpace + 1).trim();

      if (!replyText) {
        await sendMsg(BOT_TOKEN, chatId, "Usage: /reply SESSION_ID Your reply message");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Save admin reply to support_messages
      const { error: insertErr } = await supabase.from("support_messages").insert({
        session_id: targetSession,
        sender: "admin",
        message: replyText,
      });

      if (insertErr) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Failed to send reply: ${insertErr.message}`);
      } else {
        await sendMsg(BOT_TOKEN, chatId, `✅ Reply sent to web customer!\n\n💬 "${replyText}"`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /restock ====================
    if (input === "/restock") {
      const buttons = [];
      for (let i = 0; i < COUNTRIES.length; i += 2) {
        const row = [{ text: `${COUNTRIES[i].flag} ${COUNTRIES[i].name}`, callback_data: `restock_country_${COUNTRIES[i].code}` }];
        if (COUNTRIES[i + 1]) row.push({ text: `${COUNTRIES[i + 1].flag} ${COUNTRIES[i + 1].name}`, callback_data: `restock_country_${COUNTRIES[i + 1].code}` });
        buttons.push(row);
      }
      await sendMsg(BOT_TOKEN, chatId, "📦 *RESTOCK — Select Country:*", { inline_keyboard: buttons });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Restock country selection
    if (callbackData.startsWith("restock_country_")) {
      const country = callbackData.replace("restock_country_", "");
      const ci = getCountryInfo(country);
      await sendMsg(BOT_TOKEN, chatId, `${ci.flag} *${ci.name}* — Select account type:`, {
        inline_keyboard: [
          [{ text: "📦 Regular", callback_data: `restock_type_${country}_regular` }, { text: "👑 Aged", callback_data: `restock_type_${country}_aged` }],
        ],
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Restock type selection — store state and ask for files
    if (callbackData.startsWith("restock_type_")) {
      const parts = callbackData.replace("restock_type_", "").split("_");
      const country = parts[0];
      const accountType = parts[1];
      const ci = getCountryInfo(country);
      const label = accountType === "aged" ? "👑 Aged" : "📦 Regular";

      // Store restock state in conversation_states using chat_id
      await supabase.from("conversation_states").upsert({
        chat_id: `admin_${chatId}`,
        state: "restock_awaiting_files",
        selected_country: country,
        selected_type: accountType,
        updated_at: new Date().toISOString(),
      }, { onConflict: "chat_id" });

      await sendMsg(BOT_TOKEN, chatId,
        `✅ *Ready to receive files!*\n\n` +
        `${ci.flag} ${ci.name} — ${label}\n\n` +
        `📎 Now send me \`.session\` files as documents.\n` +
        `Send as many as you need, one at a time or multiple.\n\n` +
        `When done, type /done to finish restocking.`
      );
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== /done (finish restock) ====================
    if (input === "/done") {
      const { data: state } = await supabase.from("conversation_states")
        .select("*").eq("chat_id", `admin_${chatId}`).single();
      if (state?.state === "restock_awaiting_files") {
        await supabase.from("conversation_states").update({
          state: "idle", selected_country: null, selected_type: null, updated_at: new Date().toISOString(),
        }).eq("chat_id", `admin_${chatId}`);
        await sendMsg(BOT_TOKEN, chatId, "✅ *Restock session complete!*\n\nUse /stock to check inventory levels.");
      } else {
        await sendMsg(BOT_TOKEN, chatId, "ℹ️ No active restock session.");
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== Document upload handler (for restock) ====================
    if (update.message?.document) {
      const { data: state } = await supabase.from("conversation_states")
        .select("*").eq("chat_id", `admin_${chatId}`).single();

      if (state?.state !== "restock_awaiting_files") {
        await sendMsg(BOT_TOKEN, chatId, "ℹ️ No active restock session. Use /restock first.");
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const doc = update.message.document;
      const fileName = doc.file_name || "unknown.session";

      if (!fileName.endsWith(".session")) {
        await sendMsg(BOT_TOKEN, chatId, `⚠️ Skipped \`${fileName}\` — only .session files accepted.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const country = state.selected_country!;
      const accountType = state.selected_type!;
      const filePath = `inventory/${country}/${accountType}/${fileName}`;

      // Check duplicate
      const { data: existing } = await supabase.from("account_inventory")
        .select("id").eq("file_path", filePath).single();
      if (existing) {
        await sendMsg(BOT_TOKEN, chatId, `⏭️ \`${fileName}\` — duplicate, skipped.`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Download file from Telegram
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: doc.file_id }),
      });
      const fileInfo = await fileInfoRes.json();
      if (!fileInfo.ok) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Failed to get file info for \`${fileName}\``);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      const telegramFilePath = fileInfo.result.file_path;
      const fileRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${telegramFilePath}`);
      const fileBlob = await fileRes.blob();

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("account-files")
        .upload(filePath, fileBlob, { upsert: true });

      if (uploadError) {
        await sendMsg(BOT_TOKEN, chatId, `❌ Upload failed for \`${fileName}\`: ${uploadError.message}`);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Add to inventory
      await supabase.from("account_inventory").insert({
        account_type: accountType,
        country,
        file_path: filePath,
        file_name: fileName,
        status: "available",
      });

      const ci = getCountryInfo(country);
      const label = accountType === "aged" ? "👑 Aged" : "📦 Regular";
      await sendMsg(BOT_TOKEN, chatId, `✅ \`${fileName}\` added!\n${ci.flag} ${ci.name} — ${label}\n\n_Send more files or type /done_`);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ==================== Fallback ====================
    await sendMsg(BOT_TOKEN, chatId, `🤖 Unknown command. Type /help to see available commands.`);
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

  } catch (error) {
    console.error("Admin bot error:", error);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }
});

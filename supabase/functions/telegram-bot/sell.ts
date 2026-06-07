// Sell-account flow using MTKruto for Telegram MTProto auth
// State machine stored in `sell_sessions` table; submissions in `account_submissions`
import { Client, StorageMemory } from "jsr:@mtkruto/mtkruto@0.132.0";

const SYMBOL = "₹";

async function sendMsg(botToken: string, chatId: string, text: string, inline?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (inline) body.reply_markup = JSON.stringify(inline);
  return await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

async function getSettings(supabase: any) {
  const { data } = await supabase.from("sell_settings").select("*").eq("id", 1).maybeSingle();
  return data || { min_withdrawal_inr: 500 };
}

async function getOrCreateWallet(supabase: any, telegramId: string) {
  const { data } = await supabase.from("customer_wallets").select("*").eq("telegram_id", telegramId).maybeSingle();
  if (data) return data;
  const { data: nw } = await supabase.from("customer_wallets").insert({ telegram_id: telegramId }).select().single();
  return nw;
}

async function setSellState(supabase: any, chatId: string, patch: any) {
  await supabase.from("sell_sessions").upsert(
    { chat_id: chatId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "chat_id" }
  );
}

async function getSellState(supabase: any, chatId: string) {
  const { data } = await supabase.from("sell_sessions").select("*").eq("chat_id", chatId).maybeSingle();
  return data;
}

function makeClient(sessionString?: string) {
  const apiId = parseInt(Deno.env.get("TELEGRAM_API_ID") || "0", 10);
  const apiHash = Deno.env.get("TELEGRAM_API_HASH") || "";
  if (!apiId || !apiHash) throw new Error("TELEGRAM_API_ID / TELEGRAM_API_HASH not configured");
  const storage = new StorageMemory();
  const client = new Client({ storage, apiId, apiHash });
  if (sessionString) (storage as any).import?.(sessionString);
  return client;
}

// === Public entry: returns true if handled ===
export async function handleSellInput(opts: {
  supabase: any;
  botToken: string;
  chatId: string;
  username: string;
  input: string;
  rawText: string;
  isCallback: boolean;
}): Promise<boolean> {
  const { supabase, botToken, chatId, username, input, rawText, isCallback } = opts;

  // ---- Menu entry ----
  if (input === "/sell" || input === "sell" || input === "sell_menu") {
    await showSellMenu(supabase, botToken, chatId);
    return true;
  }
  if (input === "wallet" || input === "/wallet" || input === "balance") {
    await showWallet(supabase, botToken, chatId);
    return true;
  }
  if (input === "withdraw" || input === "/withdraw") {
    await startWithdrawal(supabase, botToken, chatId);
    return true;
  }

  // ---- Top-up flow ----
  if (input === "addbalance" || input === "/addbalance" || input === "topup" || input === "/topup") {
    await sendMsg(botToken, chatId,
      `➕ *ADD BALANCE*\n━━━━━━━━━━━━━━━\n\nSelect top-up method:`,
      { inline_keyboard: [
        [{ text: "⚡ INR — UPI Auto (instant)", callback_data: "topup_rzp" }],
        [{ text: "💳 INR — UPI (manual)", callback_data: "topup_inr" }, { text: "₿ USDT (Crypto)", callback_data: "topup_usdt" }],
        [{ text: "💵 Wallet", callback_data: "wallet" }, { text: "🏠 Menu", callback_data: "home" }],
      ]});
    return true;
  }

  // ---- Razorpay auto top-up: ask amount ----
  if (input === "topup_rzp") {
    const { data: settings } = await supabase.from("sell_settings").select("min_topup_inr").eq("id", 1).maybeSingle();
    const min = Number(settings?.min_topup_inr ?? 50);
    await setSellState(supabase, chatId, { state: `awaiting_topup_amount_INR_rzp`, phone_number: null, withdrawal_method: null });
    await sendMsg(botToken, chatId,
      `⚡ *UPI Auto Top-up*\n━━━━━━━━━━━━━━━\n\n*How much do you want to add?*\nMin: *₹${min}*\n\nType the amount (e.g. \`500\`).\n\n_You'll get a QR — scan with any UPI app, payment is auto-detected ✨_`,
      { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "wallet" }]] });
    return true;
  }

  if (input === "topup_inr" || input === "topup_usdt") {
    const currency = input === "topup_inr" ? "INR" : "USDT";
    const method = input === "topup_inr" ? "upi" : "crypto";
    const { data: settings } = await supabase.from("sell_settings").select("min_topup_inr, min_topup_usdt").eq("id", 1).maybeSingle();
    const min = currency === "INR" ? Number(settings?.min_topup_inr ?? 50) : Number(settings?.min_topup_usdt ?? 2);
    const sym = currency === "INR" ? "₹" : "$";
    await setSellState(supabase, chatId, { state: `awaiting_topup_amount_${currency}_${method}`, phone_number: null, withdrawal_method: null });
    await sendMsg(botToken, chatId,
      `➕ *Add ${currency} Balance*\n━━━━━━━━━━━━━━━\n\n*How much do you want to add?*\nMin: *${sym}${min}*\n\nType the amount (e.g. \`${currency === "INR" ? "500" : "10"}\`):`,
      { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "wallet" }]] });
    return true;
  }

  // ---- Country pick: sell_country_<CODE> ----
  if (input.startsWith("sell_country_")) {
    const code = input.replace("sell_country_", "").toUpperCase();
    await pickService(supabase, botToken, chatId, code);
    return true;
  }
  // ---- Service pick: sell_svc_<CODE>_<SERVICE> ----
  if (input.startsWith("sell_svc_")) {
    const rest = input.replace("sell_svc_", "");
    const [code, svc] = rest.split("_");
    await setSellState(supabase, chatId, { state: "awaiting_phone", country_code: code.toUpperCase(), service: svc, phone_number: null, phone_code_hash: null, mtproto_session: null });
    await sendMsg(botToken, chatId,
      `📱 *Send phone number*\n━━━━━━━━━━━━━━━\n\n` +
      `Send the phone number with country code (e.g. \`+919876543210\`).\n\n` +
      `We'll send a Telegram login code to that number's app.`,
      { inline_keyboard: [[{ text: "🔙 Back", callback_data: "sell_menu" }]] });
    return true;
  }

  // ---- Withdrawal method pick: wd_<method> ----
  if (input.startsWith("wd_")) {
    const method = input.replace("wd_", "");
    if (!["upi", "btc", "eth", "usdt"].includes(method)) return false;
    await setSellState(supabase, chatId, { state: "awaiting_payout_address", withdrawal_method: method });
    const label = method === "upi" ? "UPI ID" : `${method.toUpperCase()} wallet address`;
    await sendMsg(botToken, chatId,
      `💸 *Withdrawal — ${method.toUpperCase()}*\n━━━━━━━━━━━━━━━\n\nSend your *${label}* now:`,
      { inline_keyboard: [[{ text: "🔙 Cancel", callback_data: "sell_menu" }]] });
    return true;
  }

  // ---- Cancel sell flow ----
  if (input === "sell_cancel") {
    await setSellState(supabase, chatId, { state: "idle", country_code: null, service: null, phone_number: null, phone_code_hash: null, mtproto_session: null, withdrawal_method: null });
    await showSellMenu(supabase, botToken, chatId);
    return true;
  }

  // ---- State-driven text input ----
  if (!isCallback && rawText) {
    const st = await getSellState(supabase, chatId);
    if (!st) return false;

    if (st.state === "awaiting_phone") {
      return await handlePhoneInput(supabase, botToken, chatId, username, rawText.trim(), st);
    }
    if (st.state === "awaiting_code") {
      return await handleCodeInput(supabase, botToken, chatId, username, rawText.trim().replace(/\s+/g, ""), st);
    }
    if (st.state === "awaiting_2fa") {
      return await handle2faInput(supabase, botToken, chatId, username, rawText, st);
    }
    if (st.state === "awaiting_payout_address") {
      return await handlePayoutAddress(supabase, botToken, chatId, rawText.trim(), st);
    }
    if (st.state === "awaiting_withdrawal_amount") {
      return await handleWithdrawalAmount(supabase, botToken, chatId, rawText.trim(), st);
    }
    if (typeof st.state === "string" && st.state.startsWith("awaiting_topup_amount_")) {
      return await handleTopupAmount(supabase, botToken, chatId, username, rawText.trim(), st);
    }
    if (typeof st.state === "string" && st.state.startsWith("awaiting_topup_proof_")) {
      return await handleTopupProof(supabase, botToken, chatId, username, rawText.trim(), st);
    }
  }

  return false;
}

// ─── Menu ───
async function showSellMenu(supabase: any, botToken: string, chatId: string) {
  const wallet = await getOrCreateWallet(supabase, chatId);
  const { data: pricing } = await supabase.from("sell_pricing").select("*").eq("is_active", true).order("country_name");
  const list = pricing || [];

  await setSellState(supabase, chatId, { state: "idle" });

  if (list.length === 0) {
    await sendMsg(botToken, chatId,
      `💰 *SELL TELEGRAM ACCOUNT*\n━━━━━━━━━━━━━━━\n\n` +
      `💵 Balance: *${SYMBOL}${Number(wallet.balance_inr).toFixed(2)}*\n\n` +
      `⚠️ No buying countries are configured yet.\nCheck back soon!`,
      { inline_keyboard: [[{ text: "💵 Wallet", callback_data: "wallet" }, { text: "🏠 Menu", callback_data: "home" }]] });
    return;
  }

  // Group by country
  const countries: Record<string, { country_name: string; flag: string; services: any[] }> = {};
  for (const p of list) {
    if (!countries[p.country_code]) countries[p.country_code] = { country_name: p.country_name, flag: p.flag, services: [] };
    countries[p.country_code].services.push(p);
  }
  const codes = Object.keys(countries);
  const rows: any[] = [];
  for (let i = 0; i < codes.length; i += 3) {
    rows.push(codes.slice(i, i + 3).map(c => {
      const info = countries[c];
      const max = Math.max(...info.services.map((s: any) => Number(s.price_inr)));
      return { text: `${info.flag} ${info.country_name.slice(0, 8)} ${SYMBOL}${max}`, callback_data: `sell_country_${c}` };
    }));
  }
  rows.push([{ text: "💵 Wallet", callback_data: "wallet" }, { text: "📤 Withdraw", callback_data: "withdraw" }]);
  rows.push([{ text: "🏠 Main Menu", callback_data: "home" }]);

  await sendMsg(botToken, chatId,
    `💰 *SELL TELEGRAM ACCOUNT*\n━━━━━━━━━━━━━━━\n\n` +
    `💵 Your Balance: *${SYMBOL}${Number(wallet.balance_inr).toFixed(2)}*\n` +
    `📈 Total Earned: *${SYMBOL}${Number(wallet.total_earned).toFixed(2)}*\n\n` +
    `👇 *Pick the country of the account you want to sell:*\n_(price shown is per account)_`,
    { inline_keyboard: rows });
}

async function pickService(supabase: any, botToken: string, chatId: string, code: string) {
  const { data } = await supabase.from("sell_pricing").select("*").eq("country_code", code).eq("is_active", true);
  const list = data || [];
  if (list.length === 0) {
    await sendMsg(botToken, chatId, "❌ No services available for this country.", { inline_keyboard: [[{ text: "🔙 Back", callback_data: "sell_menu" }]] });
    return;
  }
  const rows: any[] = list.map((s: any) => [
    { text: `${s.service.toUpperCase()} — ${SYMBOL}${Number(s.price_inr)} / $${Number(s.price_usdt)}`, callback_data: `sell_svc_${code}_${s.service}` }
  ]);
  rows.push([{ text: "🔙 Change Country", callback_data: "sell_menu" }]);
  await sendMsg(botToken, chatId,
    `${list[0].flag} *${list[0].country_name}*\n━━━━━━━━━━━━━━━\n\n` +
    `Choose the type of account you're selling:`,
    { inline_keyboard: rows });
}

// ─── Phone number → request code via MTProto ───
async function handlePhoneInput(supabase: any, botToken: string, chatId: string, _username: string, phone: string, st: any): Promise<boolean> {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    await sendMsg(botToken, chatId, "⚠️ Invalid phone number. Use international format like `+919876543210`.");
    return true;
  }
  const phoneNumber = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;

  // Check duplicate (active submission)
  const { data: dup } = await supabase.from("account_submissions").select("id, status")
    .eq("phone_number", phoneNumber).in("status", ["pending", "approved"]).maybeSingle();
  if (dup) {
    await sendMsg(botToken, chatId, `⚠️ This number is already in our system (status: *${dup.status}*).`,
      { inline_keyboard: [[{ text: "🔙 Back", callback_data: "sell_menu" }]] });
    return true;
  }

  await sendMsg(botToken, chatId, `⏳ Sending login code to *${phoneNumber}*...`);

  try {
    const client = makeClient();
    await client.connect();
    const sent = await client.sendCode(phoneNumber);
    const phoneCodeHash = (sent as any).phoneCodeHash || (sent as any).phone_code_hash;
    const exported = await (client.storage as any).export?.() || "";
    await client.disconnect().catch(() => {});

    await setSellState(supabase, chatId, {
      state: "awaiting_code",
      phone_number: phoneNumber,
      phone_code_hash: phoneCodeHash,
      mtproto_session: typeof exported === "string" ? exported : JSON.stringify(exported),
    });

    await sendMsg(botToken, chatId,
      `✅ *Code Sent!*\n━━━━━━━━━━━━━━━\n\n` +
      `📱 Open Telegram on the phone *${phoneNumber}*\n` +
      `📩 You'll receive a login code from Telegram\n\n` +
      `👇 *Type the code here* (digits only, e.g. \`12345\`):\n\n` +
      `_⚠️ Do NOT share this code with anyone else._`,
      { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "sell_cancel" }]] });
  } catch (e: any) {
    console.error("sendCode failed:", e);
    await sendMsg(botToken, chatId,
      `❌ *Could not send code*\n\n${String(e?.message || e).slice(0, 200)}\n\nTry again or contact support.`,
      { inline_keyboard: [[{ text: "🔙 Back", callback_data: "sell_menu" }]] });
  }
  return true;
}

// ─── Code input → signIn ───
async function handleCodeInput(supabase: any, botToken: string, chatId: string, username: string, code: string, st: any): Promise<boolean> {
  if (!/^\d{4,7}$/.test(code)) {
    await sendMsg(botToken, chatId, "⚠️ Code must be digits only (e.g. `12345`). Try again:");
    return true;
  }
  await sendMsg(botToken, chatId, "⏳ Verifying code...");

  try {
    const client = makeClient();
    if (st.mtproto_session) {
      try { (client.storage as any).import?.(JSON.parse(st.mtproto_session)); } catch { (client.storage as any).import?.(st.mtproto_session); }
    }
    await client.connect();
    try {
      await (client as any).signIn({ phone: st.phone_number, phoneCodeHash: st.phone_code_hash, phoneCode: code });
    } catch (signErr: any) {
      const msg = String(signErr?.message || signErr);
      if (msg.includes("SESSION_PASSWORD_NEEDED") || msg.toUpperCase().includes("PASSWORD")) {
        const exported = await (client.storage as any).export?.() || "";
        await client.disconnect().catch(() => {});
        await setSellState(supabase, chatId, {
          state: "awaiting_2fa",
          mtproto_session: typeof exported === "string" ? exported : JSON.stringify(exported),
        });
        await sendMsg(botToken, chatId,
          `🔐 *Two-Factor Password Required*\n━━━━━━━━━━━━━━━\n\n` +
          `This account has a 2FA cloud password.\nSend the password now to complete login:`,
          { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "sell_cancel" }]] });
        return true;
      }
      throw signErr;
    }

    await finalizeSubmission(supabase, botToken, chatId, username, client, st);
  } catch (e: any) {
    console.error("signIn failed:", e);
    const msg = String(e?.message || e);
    let userMsg = `❌ Code verification failed.\n\n\`${msg.slice(0, 150)}\``;
    if (msg.includes("PHONE_CODE_INVALID")) userMsg = "❌ *Wrong code.* Please re-enter the code:";
    if (msg.includes("PHONE_CODE_EXPIRED")) userMsg = "❌ *Code expired.* Please start again.";
    await sendMsg(botToken, chatId, userMsg, msg.includes("PHONE_CODE_INVALID")
      ? undefined
      : { inline_keyboard: [[{ text: "🔄 Restart", callback_data: "sell_menu" }]] });
  }
  return true;
}

// ─── 2FA password ───
async function handle2faInput(supabase: any, botToken: string, chatId: string, username: string, password: string, st: any): Promise<boolean> {
  await sendMsg(botToken, chatId, "⏳ Verifying 2FA password...");
  try {
    const client = makeClient();
    if (st.mtproto_session) {
      try { (client.storage as any).import?.(JSON.parse(st.mtproto_session)); } catch { (client.storage as any).import?.(st.mtproto_session); }
    }
    await client.connect();
    await (client as any).checkPassword(password);
    await finalizeSubmission(supabase, botToken, chatId, username, client, st);
  } catch (e: any) {
    console.error("2FA failed:", e);
    await sendMsg(botToken, chatId,
      `❌ Wrong 2FA password.\n\`${String(e?.message || e).slice(0, 150)}\`\n\nTry again or cancel.`,
      { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "sell_cancel" }]] });
  }
  return true;
}

async function finalizeSubmission(supabase: any, botToken: string, chatId: string, username: string, client: any, st: any) {
  // Get pricing
  const { data: pricing } = await supabase.from("sell_pricing").select("*")
    .eq("country_code", st.country_code).eq("service", st.service).maybeSingle();
  const priceInr = Number(pricing?.price_inr || 0);
  const priceUsdt = Number(pricing?.price_usdt || 0);

  // Export session
  let session = "";
  try {
    const ex = await (client.storage as any).export?.();
    session = typeof ex === "string" ? ex : JSON.stringify(ex);
  } catch {}
  await client.disconnect().catch(() => {});

  // Insert submission (auto-credit)
  await supabase.from("account_submissions").insert({
    seller_telegram_id: chatId,
    seller_username: username,
    country_code: st.country_code,
    service: st.service,
    phone_number: st.phone_number,
    session_string: session,
    price_inr: priceInr,
    price_usdt: priceUsdt,
    status: "approved",
    credited_at: new Date().toISOString(),
  });

  // Credit wallet (atomic-ish)
  const wallet = await getOrCreateWallet(supabase, chatId);
  const newBal = Number(wallet.balance_inr) + priceInr;
  const newEarned = Number(wallet.total_earned) + priceInr;
  await supabase.from("customer_wallets").update({
    balance_inr: newBal, total_earned: newEarned, updated_at: new Date().toISOString(),
  }).eq("telegram_id", chatId);

  await setSellState(supabase, chatId, {
    state: "idle", country_code: null, service: null, phone_number: null, phone_code_hash: null, mtproto_session: null,
  });

  await sendMsg(botToken, chatId,
    `✅ *ACCOUNT SOLD SUCCESSFULLY!*\n━━━━━━━━━━━━━━━\n\n` +
    `📱 Phone: \`${st.phone_number}\`\n` +
    `🌍 Country: ${st.country_code}\n` +
    `💰 Earned: *${SYMBOL}${priceInr}*\n\n` +
    `💵 *New Balance: ${SYMBOL}${newBal.toFixed(2)}*\n\n` +
    `Sell more or withdraw your earnings 👇`,
    { inline_keyboard: [
      [{ text: "💰 Sell Another", callback_data: "sell_menu" }],
      [{ text: "📤 Withdraw", callback_data: "withdraw" }, { text: "💵 Wallet", callback_data: "wallet" }],
      [{ text: "🏠 Menu", callback_data: "home" }],
    ]});

  // Notify admin
  const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
  const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
  if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
    await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: `📥 *NEW ACCOUNT SUBMISSION*\n\n📱 \`${st.phone_number}\`\n🌍 ${st.country_code} / ${st.service}\n👤 @${username || "—"} (\`${chatId}\`)\n💰 ${SYMBOL}${priceInr}\n\nUse /submissions to manage.`,
        parse_mode: "Markdown",
      }),
    });
  }
}

// ─── Wallet ───
async function showWallet(supabase: any, botToken: string, chatId: string) {
  const wallet = await getOrCreateWallet(supabase, chatId);
  const settings = await getSettings(supabase);
  const { data: tx } = await supabase.from("wallet_transactions")
    .select("*").eq("telegram_id", chatId).order("created_at", { ascending: false }).limit(8);
  const { data: pending } = await supabase.from("wallet_topup_requests")
    .select("amount, currency, payment_method, created_at").eq("telegram_id", chatId).eq("status", "pending");

  let msg = `💵 *MY WALLET*\n━━━━━━━━━━━━━━━\n\n` +
    `💰 INR Balance:  *${SYMBOL}${Number(wallet.balance_inr).toFixed(2)}*\n` +
    `💲 USDT Balance: *$${Number(wallet.balance_usdt || 0).toFixed(2)}*\n\n` +
    `📈 Total Earned: ${SYMBOL}${Number(wallet.total_earned).toFixed(2)}\n` +
    `📤 Total Withdrawn: ${SYMBOL}${Number(wallet.total_withdrawn).toFixed(2)}\n\n` +
    `_Min withdrawal: ${SYMBOL}${Number(settings.min_withdrawal_inr).toFixed(0)}_\n` +
    `_Min top-up: ${SYMBOL}${Number(settings.min_topup_inr ?? 50)} / $${Number(settings.min_topup_usdt ?? 2)}_\n\n`;

  if (pending && pending.length) {
    msg += `⏳ *Pending top-ups:*\n`;
    for (const p of pending) msg += `• ${p.currency === "INR" ? SYMBOL : "$"}${Number(p.amount).toFixed(2)} ${p.currency} (${p.payment_method})\n`;
    msg += `\n`;
  }

  if (tx && tx.length) {
    msg += `*Recent transactions:*\n`;
    for (const r of tx) {
      const sym = r.currency === "INR" ? SYMBOL : "$";
      const sign = Number(r.amount) >= 0 ? "+" : "";
      msg += `• ${sign}${sym}${Number(r.amount).toFixed(2)} _(${r.type})_\n`;
    }
  } else {
    msg += `_No transactions yet._\n`;
  }

  await sendMsg(botToken, chatId, msg, {
    inline_keyboard: [
      [{ text: "➕ Add Balance", callback_data: "addbalance" }, { text: "📤 Withdraw", callback_data: "withdraw" }],
      [{ text: "💰 Sell Account", callback_data: "sell_menu" }, { text: "🏠 Menu", callback_data: "home" }],
    ],
  });
}

// ─── Top-up handlers ───
async function handleTopupAmount(supabase: any, botToken: string, chatId: string, username: string, raw: string, st: any): Promise<boolean> {
  const parts = String(st.state).split("_"); // awaiting_topup_amount_<CUR>_<METHOD>
  const currency = parts[3];
  const method = parts[4];
  const amount = parseFloat(raw);
  const settings = await getSettings(supabase);
  const min = currency === "INR" ? Number(settings.min_topup_inr ?? 50) : Number(settings.min_topup_usdt ?? 2);
  const sym = currency === "INR" ? SYMBOL : "$";
  if (!isFinite(amount) || amount <= 0) {
    await sendMsg(botToken, chatId, `⚠️ Invalid amount. Type a number like \`${currency === "INR" ? "500" : "10"}\`:`);
    return true;
  }
  if (amount < min) {
    await sendMsg(botToken, chatId, `⚠️ Minimum top-up is *${sym}${min}*. Try again:`);
    return true;
  }

  // Show payment instructions
  let payInfo = "";
  if (method === "upi") {
    const { data: upi } = await supabase.from("upi_wallets").select("upi_id, display_name").eq("is_active", true).limit(1);
    const id = upi?.[0]?.upi_id || "venkat342@fam";
    payInfo = `📱 *UPI ID:* \`${id}\`\n${upi?.[0]?.display_name ? `👤 ${upi[0].display_name}\n` : ""}`;
  } else {
    const { data: ws } = await supabase.from("crypto_wallets").select("coin_symbol, network, wallet_address").eq("is_active", true);
    if (ws && ws.length) {
      payInfo = ws.map((w: any) => `*${w.coin_symbol}*${w.network ? ` (${w.network})` : ""}\n\`${w.wallet_address}\``).join("\n\n") + "\n";
    } else {
      payInfo = `_No crypto wallets configured. Contact support._\n`;
    }
  }

  await setSellState(supabase, chatId, { state: `awaiting_topup_proof_${currency}_${method}_${amount}` });
  await sendMsg(botToken, chatId,
    `💳 *Pay ${sym}${amount.toFixed(2)} ${currency}*\n━━━━━━━━━━━━━━━\n\n${payInfo}\n` +
    `After paying, *reply with the UTR / TxID* (transaction reference) here so admin can verify and credit your wallet.`,
    { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "wallet" }]] });
  return true;
}

async function handleTopupProof(supabase: any, botToken: string, chatId: string, username: string, raw: string, st: any): Promise<boolean> {
  const parts = String(st.state).split("_"); // awaiting_topup_proof_<CUR>_<METHOD>_<AMOUNT>
  const currency = parts[3];
  const method = parts[4];
  const amount = parseFloat(parts[5] || "0");
  if (!amount) {
    await sendMsg(botToken, chatId, "❌ Session expired. Please start again.", { inline_keyboard: [[{ text: "💵 Wallet", callback_data: "wallet" }]] });
    return true;
  }
  const proof = raw.slice(0, 200);
  const { data: rq } = await supabase.from("wallet_topup_requests").insert({
    telegram_id: chatId, username, amount, currency, payment_method: method,
    proof_text: proof, source: "bot",
  }).select().single();
  await setSellState(supabase, chatId, { state: "idle" });

  const sym = currency === "INR" ? SYMBOL : "$";
  await sendMsg(botToken, chatId,
    `✅ *Top-up Submitted!*\n━━━━━━━━━━━━━━━\n\n` +
    `🆔 \`${rq.id.slice(0, 8)}\`\n💰 *${sym}${amount.toFixed(2)} ${currency}*\n💳 ${method.toUpperCase()}\n🔖 \`${proof}\`\n\n` +
    `⏱️ Admin will verify within 24h.\nYou'll be notified once approved.`,
    { inline_keyboard: [[{ text: "💵 Wallet", callback_data: "wallet" }, { text: "🏠 Menu", callback_data: "home" }]] });

  const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
  const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
  if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
    await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: `💰 *NEW WALLET TOP-UP*\n\n🆔 \`${rq.id}\`\n👤 @${username || "—"} (\`${chatId}\`)\n💵 ${sym}${amount.toFixed(2)} ${currency}\n💳 ${method.toUpperCase()}\n🔖 \`${proof}\``,
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({ inline_keyboard: [[
          { text: "✅ Approve", callback_data: `topup_approve_${rq.id}` },
          { text: "❌ Reject", callback_data: `topup_reject_${rq.id}` },
        ]]}),
      }),
    });
  }
  return true;
}

// ─── Withdrawal ───
async function startWithdrawal(supabase: any, botToken: string, chatId: string) {
  const wallet = await getOrCreateWallet(supabase, chatId);
  const settings = await getSettings(supabase);
  const min = Number(settings.min_withdrawal_inr);
  if (Number(wallet.balance_inr) < min) {
    await sendMsg(botToken, chatId,
      `❌ *Insufficient balance*\n\nYour balance: *${SYMBOL}${Number(wallet.balance_inr).toFixed(2)}*\nMinimum withdrawal: *${SYMBOL}${min}*\n\nSell more accounts to reach the minimum.`,
      { inline_keyboard: [[{ text: "💰 Sell Account", callback_data: "sell_menu" }], [{ text: "🏠 Menu", callback_data: "home" }]] });
    return;
  }
  await setSellState(supabase, chatId, { state: "awaiting_withdrawal_amount", withdrawal_method: null });
  await sendMsg(botToken, chatId,
    `📤 *WITHDRAW EARNINGS*\n━━━━━━━━━━━━━━━\n\n` +
    `💵 Available: *${SYMBOL}${Number(wallet.balance_inr).toFixed(2)}*\n` +
    `🔻 Minimum: ${SYMBOL}${min}\n\n` +
    `*How much do you want to withdraw?*\nType the amount in INR (e.g. \`1000\`):`,
    { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "sell_menu" }]] });
}

async function handleWithdrawalAmount(supabase: any, botToken: string, chatId: string, raw: string, st: any): Promise<boolean> {
  const amount = parseFloat(raw);
  const wallet = await getOrCreateWallet(supabase, chatId);
  const settings = await getSettings(supabase);
  if (!isFinite(amount) || amount <= 0) {
    await sendMsg(botToken, chatId, "⚠️ Invalid amount. Type a number like `1000`:");
    return true;
  }
  if (amount < Number(settings.min_withdrawal_inr)) {
    await sendMsg(botToken, chatId, `⚠️ Minimum withdrawal is *${SYMBOL}${settings.min_withdrawal_inr}*. Try again:`);
    return true;
  }
  if (amount > Number(wallet.balance_inr)) {
    await sendMsg(botToken, chatId, `⚠️ You only have *${SYMBOL}${wallet.balance_inr}*. Enter a smaller amount:`);
    return true;
  }
  // Save amount in withdrawal_method field temporarily? Use phone_number field? Use a dedicated holder.
  await setSellState(supabase, chatId, { state: "choosing_withdrawal_method", phone_number: String(amount) });
  await sendMsg(botToken, chatId,
    `Selected: *${SYMBOL}${amount.toFixed(2)}*\n\n*Choose payout method:*`,
    { inline_keyboard: [
      [{ text: "💳 UPI", callback_data: "wd_upi" }],
      [{ text: "₿ BTC", callback_data: "wd_btc" }, { text: "Ξ ETH", callback_data: "wd_eth" }, { text: "💲 USDT", callback_data: "wd_usdt" }],
      [{ text: "❌ Cancel", callback_data: "sell_menu" }],
    ]});
  return true;
}

async function handlePayoutAddress(supabase: any, botToken: string, chatId: string, addr: string, st: any): Promise<boolean> {
  const amount = parseFloat(st.phone_number || "0");
  const method = st.withdrawal_method;
  if (!amount || !method) {
    await sendMsg(botToken, chatId, "❌ Session lost. Please start again.", { inline_keyboard: [[{ text: "🔙 Back", callback_data: "sell_menu" }]] });
    return true;
  }
  if (addr.length < 4 || addr.length > 200) {
    await sendMsg(botToken, chatId, "⚠️ Address looks invalid. Try again:");
    return true;
  }

  // Re-check balance
  const wallet = await getOrCreateWallet(supabase, chatId);
  if (Number(wallet.balance_inr) < amount) {
    await sendMsg(botToken, chatId, "❌ Balance changed. Please retry.", { inline_keyboard: [[{ text: "🔙 Back", callback_data: "sell_menu" }]] });
    return true;
  }

  // Hold the funds: deduct now, return on rejection
  await supabase.from("customer_wallets").update({
    balance_inr: Number(wallet.balance_inr) - amount,
    updated_at: new Date().toISOString(),
  }).eq("telegram_id", chatId);

  const { data: req } = await supabase.from("withdrawal_requests").insert({
    telegram_id: chatId, amount_inr: amount, method, payout_address: addr, status: "pending",
  }).select().single();

  await setSellState(supabase, chatId, { state: "idle", phone_number: null, withdrawal_method: null });

  await sendMsg(botToken, chatId,
    `✅ *Withdrawal Requested!*\n━━━━━━━━━━━━━━━\n\n` +
    `🆔 Request: \`${req.id.slice(0, 8)}\`\n` +
    `💰 Amount: *${SYMBOL}${amount.toFixed(2)}*\n` +
    `💳 Method: ${method.toUpperCase()}\n` +
    `📍 To: \`${addr}\`\n\n` +
    `⏱️ Admin will process within 24h.\nYou'll be notified once paid.`,
    { inline_keyboard: [[{ text: "💵 Wallet", callback_data: "wallet" }, { text: "🏠 Menu", callback_data: "home" }]] });

  // Notify admin
  const ADMIN_BOT_TOKEN = Deno.env.get("ADMIN_BOT_TOKEN");
  const ADMIN_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
  if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
    await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: `📤 *WITHDRAWAL REQUEST*\n\n🆔 \`${req.id}\`\n👤 \`${chatId}\`\n💰 ${SYMBOL}${amount.toFixed(2)}\n💳 ${method.toUpperCase()}\n📍 \`${addr}\`\n\nUse /withdrawals to manage.`,
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({ inline_keyboard: [[
          { text: "✅ Mark Paid", callback_data: `wd_paid_${req.id}` },
          { text: "❌ Reject", callback_data: `wd_reject_${req.id}` },
        ]]}),
      }),
    });
  }
  return true;
}

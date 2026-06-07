
# Razorpay Auto-Payment Integration (Customer Bot)

Add automated INR payment via Razorpay so users pay from a UPI app and the bot instantly credits the order/wallet — no manual UTR, no admin approval, no leaving Telegram for a web form.

## How it works (UX)

```
User taps "💳 Pay with UPI (Auto)"
   │
   ▼
Bot creates Razorpay Order via API
   │
   ▼
Bot sends in chat:
   • UPI QR image (scan with any UPI app)
   • upi:// deep link button ("Open in UPI app")
   • Amount + Order ID + 10-min expiry
   │
   ▼
User pays in their UPI app (GPay/PhonePe/Paytm)
   │
   ▼
Razorpay webhook → our edge function
   │
   ▼
Auto: mark order paid → auto-deliver files
       OR credit wallet top-up
   │
   ▼
Bot sends "✅ Payment received! Delivering accounts…"
```

Everything stays inside Telegram. No browser, no Razorpay checkout page — only the user's own UPI app opens.

## Scope

- Orders: add "💳 UPI Auto Pay" alongside existing UPI manual / Crypto / Wallet options.
- Wallet top-ups (INR): add "💳 UPI Auto Pay" alongside existing manual UPI proof flow.
- Currency: INR only (USDT auto stays manual for now).
- Existing manual UPI flow is kept as fallback.

## Backend changes

### Secrets (requested after plan approval)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

### Database (migration)
New table `razorpay_payments`:
- `razorpay_order_id` (pk), `razorpay_payment_id`, `amount`, `currency`
- `purpose` (`order` | `topup`), `reference_id` (our order_id or wallet topup id)
- `telegram_id`, `chat_id`, `status` (`created` | `paid` | `failed` | `expired`)
- `created_at`, `paid_at`
- RLS: `no_public_access` (server-only, matches existing pattern).
- Grants: `service_role` only.

### New edge function `razorpay-webhook` (`verify_jwt = false`)
- Verifies `X-Razorpay-Signature` (HMAC-SHA256 of raw body with webhook secret).
- On `payment.captured`:
  - Look up `razorpay_payments` row by `order_id`.
  - If `purpose = order`: update orders → `payment_received` (method `upi_auto`), call existing `auto-deliver` function → bot sends delivery in chat.
  - If `purpose = topup`: call `adjust_wallet_balance(_telegram_id, 'INR', amount, 'topup', ref_id, 'Razorpay UPI')` → bot sends "Wallet credited ₹X" message.
  - Notify admin bot (reuse existing pattern).
- Idempotent (skip if already `paid`).

### `telegram-bot/index.ts` updates
- New helper `createRazorpayOrder(amount, purpose, refId, telegramId, chatId)`:
  - POST `https://api.razorpay.com/v1/orders` with basic auth (key:secret).
  - Insert row into `razorpay_payments`.
- New helper `buildUpiPayload(orderAmount, orderId)`:
  - Returns `upi://pay?pa=<merchant-vpa>&pn=Riox&am=<amt>&tn=<orderid>&cu=INR` (vpa from Razorpay or fallback to active `upi_wallets` row).
  - Generates QR image via `https://api.qrserver.com/v1/create-qr-code/?data=<encoded>` and sends with `sendPhoto`.
- Order checkout payment picker: add `💳 UPI Auto Pay` button → creates Razorpay order → sends QR + deep-link button + "I've paid" status check button.
- Wallet `➕ Add Balance` → currency INR → method picker now has `💳 UPI Auto Pay` (in addition to manual UPI).
- Status check button calls Razorpay `fetch order` API; on `paid` triggers same flow as webhook (safety net if webhook delayed).

### `admin-bot/index.ts`
- Notification on every auto-captured payment (already gets order notify via auto-deliver, just add small "Razorpay auto" tag).

### `set-telegram-webhook/index.ts`
- No change.

## Frontend changes

None. (Razorpay integration lives only in the customer Telegram bot per request.)

## Razorpay setup (one-time, by user)

After secrets are added:
1. Razorpay Dashboard → Settings → Webhooks → Add webhook
2. URL: `https://ptjqnvbebnpzaxdhxbtr.supabase.co/functions/v1/razorpay-webhook`
3. Secret: same as `RAZORPAY_WEBHOOK_SECRET`
4. Events: `payment.captured`, `payment.failed`
5. Enable UPI under Payment Methods.

I'll send these exact steps after deploy.

## Implementation order

1. Request 3 secrets.
2. Migration: `razorpay_payments` table.
3. Edge function `razorpay-webhook` + config.toml entry.
4. `telegram-bot/index.ts`: order + wallet flows + QR helper.
5. Deploy + give user webhook URL to paste in Razorpay dashboard.
6. Test end-to-end with a ₹1 live payment.

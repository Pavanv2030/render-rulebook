# Wallet / Balance Feature

Add a customer wallet system with INR + USDT balances. Users top up via bot or website (admin approves), admins can manually credit/debit any user, and balance can be used as payment for orders alongside existing UPI/crypto flows.

## Database changes

Migration adds:

1. **`customer_wallets`** — add `balance_usdt numeric default 0` and `total_earned_usdt`, `total_withdrawn_usdt` (mirror existing INR cols).
2. **`wallet_topup_requests`** (new) — top-up requests pending admin approval:
   - `id`, `telegram_id`, `username`
   - `amount`, `currency` (`INR` | `USDT`)
   - `payment_method` (`upi` | `crypto`)
   - `proof_text` (utr/txid), `proof_image_path` (optional)
   - `source` (`bot` | `web`)
   - `status` (`pending` | `approved` | `rejected`)
   - `admin_notes`, `created_at`, `resolved_at`
3. **`wallet_transactions`** (new) — full ledger:
   - `id`, `telegram_id`, `currency`, `amount` (signed), `type` (`topup`, `admin_credit`, `admin_debit`, `order_payment`, `refund`), `reference_id` (order_id or topup id), `note`, `created_at`
4. **`sell_settings`** — add `min_topup_inr default 50`, `min_topup_usdt default 2`.
5. RLS: deny public on new tables (server-only via service role, matching existing pattern).
6. Helper SQL function `adjust_wallet_balance(_telegram_id, _currency, _delta)` — updates wallet atomically and inserts ledger row.

## Backend (edge functions)

### `telegram-bot/index.ts`
- Add **💰 Wallet** menu button → shows INR + USDT balance, recent 5 transactions, "➕ Add Balance" + "🔄 Refresh".
- Add Balance flow (conversation_states):
  1. Choose currency (INR / USDT)
  2. Choose method (UPI for INR, Crypto for USDT)
  3. Enter amount (>= min)
  4. Show payment instructions (active UPI / crypto wallet from existing tables)
  5. Ask for UTR/TxID → creates `wallet_topup_requests` row, notifies admin bot.
- Order checkout: when payment method picker shown, add **💼 Pay from Balance** option. If balance ≥ amount → debit wallet, mark order `payment_received`, trigger auto-deliver. If insufficient → show shortfall.

### `admin-bot/index.ts`
- New menu: **💼 Wallets**
  - View pending top-ups → approve/reject (approve calls `adjust_wallet_balance`, notifies user)
  - Search user by code/telegram → view balances → ➕ Credit / ➖ Debit (amount + currency + note)
- Notify admin chat on every new top-up request.

### `admin-api/index.ts`
- Endpoints (POST actions):
  - `list_topups` (filter by status)
  - `approve_topup`, `reject_topup`
  - `adjust_balance` (telegram_id, currency, delta, note)
  - `list_wallet_transactions` (per user)

### `web-chat/index.ts` / new `wallet-api`
- Use existing `admin-api` style for user-facing wallet ops, or extend `web-chat`:
  - `get_balance` (by session/telegram_id mapped customer)
  - `create_topup_request` (with proof)
  - `pay_with_balance` (orderId)

### `auto-deliver/index.ts`
- Already triggers on `payment_received`; no change needed.

## Frontend

### `src/pages/Admin.tsx`
New **Wallets** tab:
- **Pending Top-ups** table: user, amount, currency, method, proof, [Approve] [Reject] buttons.
- **Manual Adjust**: search user (telegram_id / customer_code) → show current balances → form to add/subtract INR or USDT with note.
- **Transaction log** (filterable per user).

### `src/components/BuySection.tsx`
- After order created, payment modal gets a third option: **💼 Pay with Wallet (Balance: ₹X / $Y)**. Disabled if insufficient. On click → calls `pay_with_balance` → success state.

### New `src/components/WalletSection.tsx` (rendered on landing page after Buy)
- Shows wallet balance (requires telegram_id / login — for web users, identify by `web_<sessionId>` customer record).
- "Add Balance" form: currency, amount, UPI screenshot/UTR or crypto txid → submits top-up request.
- Recent transactions list.

### Localization
- Add wallet strings to `src/lib/i18n.ts` for EN/HI/ES/AR.

## Flow summary

```
User                    System                       Admin
 │  Add ₹500 (UPI)        │                            │
 ├──────────────────────► │                            │
 │                        │  topup_request created     │
 │                        ├──────────────────────────► │  notify
 │                        │                            │  approve
 │                        │ ◄──────────────────────────┤
 │  ✅ Balance updated    │  adjust_wallet + ledger    │
 │ ◄──────────────────────┤                            │
 │                        │                            │
 │  Buy 5 IN Regular      │                            │
 │  Pay with Wallet       │                            │
 ├──────────────────────► │  debit wallet, order paid  │
 │                        │  → auto-deliver            │
 │  📦 Files delivered    │                            │
```

## Implementation order

1. Migration (DB + RLS + helper function).
2. Edge functions (admin-api, telegram-bot, admin-bot, web-chat updates).
3. Admin panel Wallets tab.
4. BuySection wallet payment option + WalletSection on landing.
5. i18n strings.
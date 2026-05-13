import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WalletData {
  wallet: { balance_inr: number; balance_usdt: number };
  transactions: Array<{ id: string; currency: string; amount: number; type: string; note: string | null; created_at: string }>;
  pendingTopups: Array<{ id: string; amount: number; currency: string; payment_method: string; created_at: string }>;
  minTopupInr: number;
  minTopupUsdt: number;
  upi: { upi_id: string; display_name: string } | null;
  crypto: Array<{ coin_symbol: string; coin_name: string; network: string; wallet_address: string }>;
}

interface Props { t: (key: string) => string }

const WalletSection = ({ t }: Props) => {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [currency, setCurrency] = useState<"INR" | "USDT">("INR");
  const [method, setMethod] = useState<"upi" | "crypto">("upi");
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const sessionId = (() => {
    let s = localStorage.getItem("airdrop_session_id");
    if (!s) { s = crypto.randomUUID(); localStorage.setItem("airdrop_session_id", s); }
    return s;
  })();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.functions.invoke("web-chat", {
        body: { message: "__get_wallet__", sessionId },
      });
      if (res) setData(res as WalletData);
    } finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    setMethod(currency === "INR" ? "upi" : "crypto");
  }, [currency]);

  const submitTopup = async () => {
    setMsg("");
    const amt = Number(amount);
    if (!amt || amt <= 0) { setMsg("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("web-chat", {
        body: { message: "__create_topup__", sessionId, amount: amt, currency, payment_method: method, proof_text: proof || null },
      });
      if (error || (res as any)?.error) { setMsg((res as any)?.error || error?.message || "Failed"); return; }
      setMsg("✅ Top-up submitted. Awaiting admin approval.");
      setAmount(""); setProof("");
      setTimeout(() => { setShowTopup(false); setMsg(""); refresh(); }, 1500);
    } finally { setSubmitting(false); }
  };

  const sym = (c: string) => c === "INR" ? "₹" : "$";
  const txIcon = (type: string) => type === "topup" || type === "admin_credit" || type === "refund"
    ? <ArrowDownRight className="w-4 h-4 text-[hsl(var(--success))]" />
    : <ArrowUpRight className="w-4 h-4 text-destructive" />;

  return (
    <section id="wallet" className="py-24 px-6">
      <div className="container max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-3">
            💼 <span className="gradient-text">Wallet</span>
          </h2>
          <p className="text-muted-foreground">Top up your balance and pay instantly without re-entering UPI/crypto each time.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass rounded-2xl neon-border p-6 md:p-8">
          {loading && !data ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Balances */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-card/60 rounded-xl p-5 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">INR Balance</div>
                  <div className="text-3xl font-bold neon-text">₹{Number(data?.wallet.balance_inr || 0).toFixed(2)}</div>
                </div>
                <div className="bg-card/60 rounded-xl p-5 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">USDT Balance</div>
                  <div className="text-3xl font-bold gradient-text">${Number(data?.wallet.balance_usdt || 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="flex gap-2 mb-6">
                <button onClick={() => setShowTopup(s => !s)} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all">
                  <Plus className="w-4 h-4" /> Add Balance
                </button>
                <button onClick={refresh} aria-label="Refresh wallet" className="px-4 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Top-up form */}
              {showTopup && (
                <div className="bg-card/40 rounded-xl p-5 border border-border mb-6 space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Currency</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["INR", "USDT"] as const).map(c => (
                        <button key={c} onClick={() => setCurrency(c)}
                          className={`py-2 rounded-lg text-sm font-medium border ${currency === c ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card/50 text-muted-foreground"}`}>
                          {c === "INR" ? "₹ INR" : "$ USDT"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Amount (min {sym(currency)}{currency === "INR" ? data?.minTopupInr : data?.minTopupUsdt})
                    </label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`${sym(currency)}100`}
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>

                  {currency === "INR" && data?.upi && (
                    <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground">
                      Pay to UPI: <span className="text-foreground font-mono">{data.upi.upi_id}</span> ({data.upi.display_name})
                    </div>
                  )}
                  {currency === "USDT" && data?.crypto?.[0] && (
                    <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                      {data.crypto.map(c => (
                        <div key={c.coin_symbol}>
                          <span className="text-foreground">{c.coin_name} ({c.network}):</span> <span className="font-mono break-all">{c.wallet_address}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">UTR / Transaction ID</label>
                    <input value={proof} onChange={e => setProof(e.target.value)} placeholder="e.g. 4231XXXXXXX"
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>

                  {msg && <div className="text-sm text-foreground">{msg}</div>}

                  <button onClick={submitTopup} disabled={submitting} className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit Top-up Request
                  </button>
                </div>
              )}

              {/* Pending */}
              {data && data.pendingTopups.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-warning" /> Pending Approval</h3>
                  <div className="space-y-2">
                    {data.pendingTopups.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 text-sm">
                        <span>{sym(p.currency)}{Number(p.amount).toFixed(2)} via {p.payment_method.toUpperCase()}</span>
                        <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Recent Transactions</h3>
                {data?.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {data?.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between bg-card/40 border border-border rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          {txIcon(tx.type)}
                          <div>
                            <div className="font-medium capitalize">{tx.type.replace(/_/g, " ")}</div>
                            <div className="text-[11px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}{tx.note ? ` · ${tx.note}` : ""}</div>
                          </div>
                        </div>
                        <div className={`font-mono ${Number(tx.amount) >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                          {Number(tx.amount) >= 0 ? "+" : ""}{sym(tx.currency)}{Number(tx.amount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default WalletSection;

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Wallet, Loader2, Zap, CheckCircle } from "lucide-react";
import upiScannerImg from "@/assets/upi-scanner.jpg";
import { supabase } from "@/integrations/supabase/client";

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId: string;
  onPaid: () => void;
}

const UpiPaymentModal = ({ isOpen, onClose, amount, orderId, onPaid }: UpiPaymentModalProps) => {
  const [upiId, setUpiId] = useState("venkat342@fam");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState("");
  const [rzpLoading, setRzpLoading] = useState(false);
  const [rzpQr, setRzpQr] = useState<{ qrId: string; imageUrl: string; amount: number } | null>(null);
  const [rzpPaid, setRzpPaid] = useState(false);
  const pollRef = useRef<number | null>(null);

  const sessionId = (() => {
    let s = localStorage.getItem("airdrop_session_id");
    if (!s) { s = crypto.randomUUID(); localStorage.setItem("airdrop_session_id", s); }
    return s;
  })();

  useEffect(() => {
    if (!isOpen) return;
    setErr(""); setRzpQr(null); setRzpPaid(false);
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("web-chat", {
          body: { message: "__get_wallet__", sessionId },
        });
        setWalletBalance(Number((data as any)?.wallet?.balance_inr || 0));
        if ((data as any)?.upi?.upi_id) setUpiId((data as any).upi.upi_id);
      } catch { setWalletBalance(0); }
    })();
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [isOpen, sessionId]);

  const payWithWallet = async () => {
    setPaying(true); setErr("");
    try {
      const { data, error } = await supabase.functions.invoke("web-chat", {
        body: { message: "__pay_with_balance__", sessionId, orderId },
      });
      if (error || (data as any)?.error) {
        setErr((data as any)?.error || error?.message || "Payment failed");
        return;
      }
      onPaid();
    } finally { setPaying(false); }
  };

  const startAutoPay = async () => {
    setErr(""); setRzpLoading(true); setRzpPaid(false);
    try {
      const { data, error } = await supabase.functions.invoke("web-chat", {
        body: { message: "__create_rzp_qr__", sessionId, purpose: "order", amount, orderId },
      });
      if (error || (data as any)?.error) {
        setErr((data as any)?.error || error?.message || "Could not generate QR");
        return;
      }
      setRzpQr(data as any);
    } finally { setRzpLoading(false); }
  };

  useEffect(() => {
    if (!rzpQr || rzpPaid) return;
    const poll = async () => {
      try {
        const { data } = await supabase.functions.invoke("web-chat", {
          body: { message: "__check_rzp__", sessionId, qrId: rzpQr.qrId },
        });
        if ((data as any)?.paid) {
          setRzpPaid(true);
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setTimeout(() => { onPaid(); }, 2000);
        }
      } catch {}
    };
    poll();
    pollRef.current = window.setInterval(poll, 4000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rzpQr, rzpPaid]);

  if (!isOpen) return null;

  const canPayWallet = walletBalance !== null && walletBalance >= amount;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass neon-border rounded-2xl p-6 max-w-sm w-full relative max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} aria-label="Close payment modal" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold mb-1 text-center">💳 Choose Payment</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Order: <code className="text-primary text-xs">{orderId}</code>
        </p>

        {rzpQr ? (
          rzpPaid ? (
            <div className="text-center py-8">
              <CheckCircle className="w-14 h-14 mx-auto text-[hsl(var(--success))] mb-3" />
              <h3 className="text-lg font-bold mb-1">Payment Received!</h3>
              <p className="text-sm text-muted-foreground">Preparing your accounts…</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-3 mb-3">
                <img src={rzpQr.imageUrl} alt="UPI QR" className="w-full rounded-lg" />
              </div>
              <div className="text-center text-2xl font-bold neon-text mb-2">₹{rzpQr.amount.toFixed(2)}</div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-3">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for payment… auto-detected instantly
              </div>
              <button onClick={() => setRzpQr(null)} className="w-full text-xs text-muted-foreground hover:text-foreground py-2">
                ← Back to payment options
              </button>
            </>
          )
        ) : (
          <>
            {/* Auto-Pay QR */}
            <button
              onClick={startAutoPay}
              disabled={rzpLoading}
              className="w-full mb-3 p-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.3)] disabled:opacity-50"
            >
              {rzpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              ⚡ UPI Auto-Pay (Instant QR)
            </button>

            {/* Wallet pay option */}
            {walletBalance !== null && (
              <button
                onClick={payWithWallet}
                disabled={!canPayWallet || paying}
                className={`w-full mb-3 p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                  canPayWallet
                    ? "border-primary bg-primary/10 hover:bg-primary/20"
                    : "border-border bg-card/40 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-2">
                  {paying ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Wallet className="w-5 h-5 text-primary" />}
                  <div>
                    <div className="font-semibold text-sm">Pay from Wallet</div>
                    <div className="text-xs text-muted-foreground">Balance: ₹{walletBalance.toFixed(2)}</div>
                  </div>
                </div>
                {!canPayWallet && <span className="text-[10px] text-destructive">Insufficient</span>}
              </button>
            )}

            {err && <div className="mb-3 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{err}</div>}

            <div className="text-center text-[11px] text-muted-foreground mb-2">— or pay manually via UPI —</div>

            <div className="bg-card rounded-xl p-3 mb-4 border border-border">
              <img src={upiScannerImg} alt="UPI QR Code - Scan to Pay" className="w-full rounded-lg" />
            </div>

            <div className="text-center space-y-2 mb-5">
              <div className="text-2xl font-bold neon-text">₹{amount.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">
                UPI ID: <span className="text-foreground font-mono text-xs">{upiId}</span>
              </div>
              <div className="text-xs text-muted-foreground">GPay • Paytm • PhonePe</div>
            </div>

            <button
              onClick={onPaid}
              className="w-full bg-secondary text-foreground font-semibold py-3 rounded-xl border border-border hover:bg-secondary/80 transition-all"
            >
              ✅ I have paid manually
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default UpiPaymentModal;

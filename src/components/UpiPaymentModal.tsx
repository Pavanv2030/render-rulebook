import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Wallet, Loader2 } from "lucide-react";
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
  const [upiId] = useState("venkat342@fam");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState("");

  const sessionId = (() => {
    let s = localStorage.getItem("airdrop_session_id");
    if (!s) { s = crypto.randomUUID(); localStorage.setItem("airdrop_session_id", s); }
    return s;
  })();

  useEffect(() => {
    if (!isOpen) return;
    setErr("");
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("web-chat", {
          body: { message: "__get_wallet__", sessionId },
        });
        setWalletBalance(Number((data as any)?.wallet?.balance_inr || 0));
      } catch { setWalletBalance(0); }
    })();
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

  if (!isOpen) return null;

  const canPayWallet = walletBalance !== null && walletBalance >= amount;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass neon-border rounded-2xl p-6 max-w-sm w-full relative"
      >
        <button onClick={onClose} aria-label="Close payment modal" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold mb-1 text-center">💳 Choose Payment</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Order: <code className="text-primary text-xs">{orderId}</code>
        </p>

        {/* Wallet pay option */}
        {walletBalance !== null && (
          <button
            onClick={payWithWallet}
            disabled={!canPayWallet || paying}
            className={`w-full mb-4 p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
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

        <div className="text-center text-[11px] text-muted-foreground mb-2">— or pay via UPI —</div>

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
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all"
        >
          ✅ I have paid via UPI
        </button>
      </motion.div>
    </div>
  );
};

export default UpiPaymentModal;

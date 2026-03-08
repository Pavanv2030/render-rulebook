import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import upiScannerImg from "@/assets/upi-scanner.jpg";

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId: string;
  onPaid: () => void;
}

const UpiPaymentModal = ({ isOpen, onClose, amount, orderId, onPaid }: UpiPaymentModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass neon-border rounded-2xl p-6 max-w-sm w-full relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold mb-1 text-center">💳 Pay via UPI</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Order: <code className="text-primary text-xs">{orderId}</code>
        </p>

        <div className="bg-card rounded-xl p-3 mb-4 border border-border">
          <img
            src={upiScannerImg}
            alt="UPI QR Code - Scan to Pay"
            className="w-full rounded-lg"
          />
        </div>

        <div className="text-center space-y-2 mb-5">
          <div className="text-2xl font-bold neon-text">₹{amount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">
            UPI ID: <span className="text-foreground font-mono text-xs">venkat342@fam</span>
          </div>
          <div className="text-xs text-muted-foreground">
            GPay • Paytm • PhonePe
          </div>
        </div>

        <button
          onClick={onPaid}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all"
        >
          ✅ I have paid
        </button>
      </motion.div>
    </div>
  );
};

export default UpiPaymentModal;

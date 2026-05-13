import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Globe, Package, Crown, Minus, Plus, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UpiPaymentModal from "./UpiPaymentModal";

interface Country {
  country_code: string;
  country_name: string;
  flag: string;
  regular_price: number;
  aged_price: number;
  regular_price_usdt: number;
  aged_price_usdt: number;
}

interface StockInfo {
  regular: number;
  aged: number;
}

interface Props {
  t: (key: string) => string;
}

const BuySection = ({ t }: Props) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [stock, setStock] = useState<Record<string, StockInfo>>({});
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [accountType, setAccountType] = useState<"regular" | "aged">("regular");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [orderAmount, setOrderAmount] = useState(0);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: pricingData } = await supabase
        .from("country_pricing")
        .select("*")
        .order("country_name");

      if (pricingData && pricingData.length > 0) {
        setCountries(pricingData);
        setSelectedCountry(pricingData[0].country_code);
      }

      // Fetch stock via web-chat function (lightweight check)
      const { data: invData } = await supabase
        .from("account_inventory")
        .select("country, account_type, status");

      const stockMap: Record<string, StockInfo> = {};
      (invData || []).forEach((item: any) => {
        if (item.status !== "available") return;
        if (!stockMap[item.country]) stockMap[item.country] = { regular: 0, aged: 0 };
        stockMap[item.country][item.account_type as "regular" | "aged"]++;
      });
      setStock(stockMap);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  };

  const country = countries.find(c => c.country_code === selectedCountry);
  const price = country
    ? accountType === "aged" ? country.aged_price : country.regular_price
    : 0;
  const totalAmount = price * quantity;
  const availableStock = stock[selectedCountry]?.[accountType] || 0;

  const handleOrder = async () => {
    if (!country || quantity < 1 || quantity > 100) return;
    setOrdering(true);

    try {
      // Create order via web-chat edge function
      const sessionId = localStorage.getItem("airdrop_session_id") || crypto.randomUUID();
      localStorage.setItem("airdrop_session_id", sessionId);

      const chatId = `web_${sessionId}`;

      // Ensure customer exists
      await supabase.from("customers").upsert(
        { telegram_id: chatId, username: "web_user", first_name: "Web Buyer" },
        { onConflict: "telegram_id" }
      );

      // Generate order ID
      const oid = `ORD${Date.now().toString(36).toUpperCase()}`;

      // Create order directly
      const { error } = await supabase.from("orders").insert({
        order_id: oid,
        customer_id: chatId,
        country: selectedCountry,
        account_type: accountType,
        quantity,
        amount: totalAmount,
        currency: "INR",
        status: "pending",
        username: "web_user",
        payment_method: "upi",
      });

      if (error) throw error;

      setOrderId(oid);
      setOrderAmount(totalAmount);
      setShowPayment(true);
    } catch (e) {
      console.error("Order failed:", e);
    } finally {
      setOrdering(false);
    }
  };

  const handlePaid = async () => {
    if (!orderId) return;
    await supabase.from("orders").update({
      status: "payment_received",
    }).eq("order_id", orderId);

    setShowPayment(false);
    setOrderSuccess(true);
    setTimeout(() => setOrderSuccess(false), 5000);
    setQuantity(1);
    setOrderId(null);
  };

  if (loading) {
    return (
      <section id="buy" className="py-24 px-6">
        <div className="container max-w-4xl mx-auto text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="buy" className="py-24 px-6">
        <div className="container max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("buy.title.1")} <span className="gradient-text">{t("buy.title.2")}</span>
            </h2>
            <p className="text-muted-foreground text-lg">{t("buy.subtitle")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl neon-border p-6 md:p-8 max-w-3xl mx-auto"
          >
            {/* Step 1: Country */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <Globe className="w-4 h-4 text-primary" />
                {t("buy.country")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {countries.map(c => {
                  const cStock = stock[c.country_code] || { regular: 0, aged: 0 };
                  const totalStock = cStock.regular + cStock.aged;
                  return (
                    <button
                      key={c.country_code}
                      onClick={() => { setSelectedCountry(c.country_code); setQuantity(1); }}
                      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        selectedCountry === c.country_code
                          ? "border-primary bg-primary/10 text-foreground shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
                          : "border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-card"
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="truncate">{c.country_name}</span>
                      {totalStock > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-[hsl(var(--success))] text-[hsl(var(--background))] text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {totalStock > 99 ? "99+" : totalStock}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Account Type */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <Package className="w-4 h-4 text-primary" />
                {t("buy.type")}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setAccountType("regular"); setQuantity(1); }}
                  className={`flex flex-col items-center gap-1 p-4 rounded-xl border transition-all ${
                    accountType === "regular"
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
                      : "border-border bg-card/50 hover:border-primary/40"
                  }`}
                >
                  <Package className={`w-6 h-6 ${accountType === "regular" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-semibold text-foreground">{t("buy.regular")}</span>
                  <span className="text-xs text-muted-foreground">
                    ₹{country?.regular_price || 0} {t("buy.each")}
                  </span>
                  <span className="text-xs text-[hsl(var(--success))]">
                    {stock[selectedCountry]?.regular || 0} {t("buy.instock")}
                  </span>
                </button>
                <button
                  onClick={() => { setAccountType("aged"); setQuantity(1); }}
                  className={`flex flex-col items-center gap-1 p-4 rounded-xl border transition-all relative ${
                    accountType === "aged"
                      ? "border-accent bg-accent/10 shadow-[0_0_15px_hsl(var(--accent)/0.2)]"
                      : "border-border bg-card/50 hover:border-accent/40"
                  }`}
                >
                  <div className="absolute top-1 right-1 bg-accent/20 text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    PREMIUM
                  </div>
                  <Crown className={`w-6 h-6 ${accountType === "aged" ? "text-accent" : "text-muted-foreground"}`} />
                  <span className="font-semibold text-foreground">{t("buy.aged")}</span>
                  <span className="text-xs text-muted-foreground">
                    ₹{country?.aged_price || 0} {t("buy.each")}
                  </span>
                  <span className="text-xs text-[hsl(var(--success))]">
                    {stock[selectedCountry]?.aged || 0} {t("buy.instock")}
                  </span>
                </button>
              </div>
            </div>

            {/* Step 3: Quantity */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <ShoppingCart className="w-4 h-4 text-primary" />
                {t("buy.quantity")}
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 rounded-lg border border-border bg-card/50 flex items-center justify-center hover:bg-card transition-colors text-foreground"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={Math.min(100, availableStock || 100)}
                  value={quantity}
                  aria-label="Quantity"
                  onChange={e => {
                    const v = parseInt(e.target.value) || 1;
                    setQuantity(Math.min(Math.max(1, v), Math.min(100, availableStock || 100)));
                  }}
                  className="w-20 text-center text-2xl font-bold bg-transparent border-b-2 border-primary text-foreground outline-none"
                />
                <button
                  onClick={() => setQuantity(Math.min(Math.min(100, availableStock || 100), quantity + 1))}
                  aria-label="Increase quantity"
                  className="w-10 h-10 rounded-lg border border-border bg-card/50 flex items-center justify-center hover:bg-card transition-colors text-foreground"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-center gap-2 mt-3">
                {[5, 10, 25, 50].map(q => (
                  <button
                    key={q}
                    onClick={() => setQuantity(Math.min(q, availableStock || q))}
                    className="px-3 py-1 text-xs rounded-lg border border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-card/80 rounded-xl p-4 mb-6 border border-border">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>{country?.flag} {country?.country_name} — {accountType === "aged" ? "👑 Aged" : "📦 Regular"}</span>
                <span>×{quantity}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground text-sm">{t("buy.total")}</span>
                <span className="text-3xl font-bold neon-text">₹{totalAmount.toLocaleString()}</span>
              </div>
              {country?.regular_price_usdt ? (
                <div className="text-right text-xs text-muted-foreground mt-1">
                  ≈ ${((accountType === "aged" ? country.aged_price_usdt : country.regular_price_usdt) * quantity).toFixed(2)} USDT
                </div>
              ) : null}
            </div>

            {/* Buy Button */}
            <AnimatePresence mode="wait">
              {orderSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 py-4 text-[hsl(var(--success))] font-semibold"
                >
                  <CheckCircle className="w-5 h-5" />
                  {t("buy.success")}
                </motion.div>
              ) : (
                <motion.button
                  key="buy"
                  onClick={handleOrder}
                  disabled={ordering || availableStock < quantity}
                  className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-lg shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {ordering ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5" />
                  )}
                  {availableStock < quantity
                    ? t("buy.outofstock")
                    : ordering
                      ? t("buy.processing")
                      : `${t("buy.pay")} ₹${totalAmount.toLocaleString()}`
                  }
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <UpiPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={orderAmount}
        orderId={orderId || ""}
        onPaid={handlePaid}
      />
    </>
  );
};

export default BuySection;

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Flame, Send } from "lucide-react";

const countries = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
];

type PricingData = {
  regular: Record<number, number>;
  aged: Record<number, number>;
  sym: string;
  curr: string;
};

const PRICING: Record<string, PricingData> = {
  IN: { regular: { 5: 250, 10: 745, 25: 1660, 50: 2905, 100: 4980 }, aged: { 5: 1245, 10: 2235, 25: 4980 }, sym: "₹", curr: "INR" },
  US: { regular: { 5: 5, 10: 9, 25: 20, 50: 35, 100: 60 }, aged: { 5: 15, 10: 27, 25: 60 }, sym: "$", curr: "USDT" },
  PK: { regular: { 5: 1390, 10: 2500, 25: 5560, 50: 9730 }, aged: { 5: 4170, 10: 7500, 25: 16680 }, sym: "₨", curr: "PKR" },
  BD: { regular: { 5: 550, 10: 990, 25: 2200, 50: 3850, 100: 6600 }, aged: { 5: 1650, 10: 2970, 25: 6600 }, sym: "৳", curr: "BDT" },
  PH: { regular: { 5: 285, 10: 513, 25: 1140, 50: 1995, 100: 3420 }, aged: { 5: 855, 10: 1539, 25: 3420 }, sym: "₱", curr: "PHP" },
};

const PricingSection = () => {
  const [selected, setSelected] = useState("IN");
  const data = PRICING[selected];

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="container max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Transparent <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg">Select your country to see prices in local currency</p>
        </motion.div>

        {/* Country selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {countries.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelected(c.code)}
              className={`px-5 py-3 rounded-lg font-medium transition-all text-sm ${
                selected === c.code
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                  : "glass-hover text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Regular */}
            <div className="glass rounded-2xl p-8 neon-border">
              <h3 className="text-xl font-semibold mb-1 flex items-center gap-2">
                📦 Regular Accounts
              </h3>
              <p className="text-sm text-muted-foreground mb-6">Fresh accounts, ready to use</p>
              <div className="space-y-3">
                {Object.entries(data.regular).map(([qty, price]) => {
                  const isPopular = qty === "25";
                  return (
                    <div
                      key={qty}
                      className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                        isPopular ? "bg-primary/10 border border-primary/30" : "bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isPopular && <Flame className="w-4 h-4 text-primary" />}
                        <span className="font-medium">{qty} accounts</span>
                        {isPopular && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-lg">
                        {data.sym}{price.toLocaleString()}
                        <span className="text-xs text-muted-foreground ml-1">{data.curr}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aged */}
            <div className="glass rounded-2xl p-8 border border-accent/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent/20 text-accent-foreground text-xs font-bold px-4 py-1 rounded-bl-xl">
                3x SUCCESS RATE
              </div>
              <h3 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <Crown className="w-5 h-5 text-accent" />
                Aged Accounts (6mo+)
              </h3>
              <p className="text-sm text-muted-foreground mb-6">Higher trust score, better for premium airdrops</p>
              <div className="space-y-3">
                {Object.entries(data.aged).map(([qty, price]) => (
                  <div key={qty} className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/10">
                    <div className="flex items-center gap-3">
                      <Crown className="w-4 h-4 text-accent" />
                      <span className="font-medium">{qty} accounts</span>
                    </div>
                    <span className="font-bold text-lg">
                      {data.sym}{price.toLocaleString()}
                      <span className="text-xs text-muted-foreground ml-1">{data.curr}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-3 rounded-lg bg-accent/10 text-sm text-accent-foreground/80 text-center">
                Aged accounts have 6+ months of history — ideal for high-value airdrops
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <a
            href="https://t.me/AirdropAccountsPro_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-semibold px-8 py-4 rounded-lg text-lg shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] transition-all hover:scale-105"
          >
            <Send className="w-5 h-5" />
            Order Now via Telegram
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;

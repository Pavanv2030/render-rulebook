import { motion } from "framer-motion";
import { Crown, Send, Package } from "lucide-react";

interface Props { t: (key: string) => string; }

const PricingSection = ({ t }: Props) => {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="container max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("pricing.title.1")} <span className="gradient-text">{t("pricing.title.2")}</span>
          </h2>
          <p className="text-muted-foreground text-lg">{t("pricing.subtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass rounded-2xl p-8 neon-border">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold">{t("pricing.regular")}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">{t("pricing.regular.desc")}</p>
            <div className="text-center py-6">
              <div className="text-5xl font-bold neon-text">₹50</div>
              <div className="text-muted-foreground mt-2">{t("pricing.per")}</div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li>✅ {t("pricing.regular.f1")}</li>
              <li>✅ {t("pricing.regular.f2")}</li>
              <li>✅ {t("pricing.regular.f3")}</li>
            </ul>
            <div className="text-center text-xs text-muted-foreground">
              Example: 10 accounts = ₹500 · 50 accounts = ₹2,500
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-8 border border-accent/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-accent/20 text-accent-foreground text-xs font-bold px-4 py-1 rounded-bl-xl">
              {t("pricing.aged.badge")}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-6 h-6 text-accent" />
              <h3 className="text-xl font-semibold">{t("pricing.aged")}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">{t("pricing.aged.desc")}</p>
            <div className="text-center py-6">
              <div className="text-5xl font-bold" style={{ color: "hsl(var(--accent))" }}>₹100</div>
              <div className="text-muted-foreground mt-2">{t("pricing.per")}</div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li>👑 {t("pricing.aged.f1")}</li>
              <li>✅ {t("pricing.aged.f2")}</li>
              <li>✅ {t("pricing.aged.f3")}</li>
            </ul>
            <div className="text-center text-xs text-muted-foreground">
              Example: 10 accounts = ₹1,000 · 25 accounts = ₹2,500
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-12">
          <a href="https://t.me/airdro12pbot" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-semibold px-8 py-4 rounded-lg text-lg shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] transition-all hover:scale-105">
            <Send className="w-5 h-5" />
            {t("pricing.cta")}
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;

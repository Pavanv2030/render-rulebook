import { motion } from "framer-motion";
import { Bot, CreditCard, Globe, Package, ShieldCheck, Clock } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Fully Automated Bot",
    desc: "24/7 Telegram bot handles orders, payments, and delivery without human intervention.",
  },
  {
    icon: CreditCard,
    title: "Multi-Currency Payments",
    desc: "Pay with UPI (India), USDT (TRC20/BEP20), or Telegram Stars — your choice.",
  },
  {
    icon: Globe,
    title: "8 Countries Supported",
    desc: "Accounts from India, USA, Pakistan, Nigeria, Bangladesh, Philippines, Brazil & Turkey.",
  },
  {
    icon: Package,
    title: "Instant ZIP Delivery",
    desc: "Receive your accounts as a ZIP file directly in Telegram within seconds after payment.",
  },
  {
    icon: ShieldCheck,
    title: "100% Working Guarantee",
    desc: "Every account is verified before delivery. Non-working accounts replaced for free.",
  },
  {
    icon: Clock,
    title: "Aged Accounts Available",
    desc: "6+ month old accounts with higher trust scores for premium airdrop opportunities.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 hero-gradient opacity-50" />
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why <span className="gradient-text">RIOX Accounts</span>?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Everything you need for successful airdrop farming at scale
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-hover rounded-2xl p-7 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

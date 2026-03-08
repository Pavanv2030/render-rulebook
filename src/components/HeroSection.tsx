import { motion } from "framer-motion";
import { Send, Shield, Zap, Users } from "lucide-react";
import mascotImg from "@/assets/mascot.jpg";

interface Props { t: (key: string) => string; }

const HeroSection = ({ t }: Props) => {
  const stats = [
    { icon: Users, value: "3,847+", label: t("hero.stat.orders") },
    { icon: Zap, value: "24/7", label: t("hero.stat.delivery") },
    { icon: Shield, value: "100%", label: t("hero.stat.guarantee") },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="container relative z-10 px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 glass neon-border rounded-full px-5 py-2 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
            <span className="text-sm text-muted-foreground">{t("hero.badge")}</span>
          </motion.div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <img src={mascotImg} alt="RIOX Mascot" className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)]" />
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              <span className="gradient-text">RIOX</span>
              <br />
              <span className="text-foreground">Accounts Pro</span>
            </h1>
          </div>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              href="https://t.me/airdro12pbot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-semibold px-8 py-4 rounded-lg text-lg shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] transition-shadow"
            >
              <Send className="w-5 h-5" />
              {t("hero.cta")}
            </motion.a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors px-6 py-4">
              {t("hero.pricing")}
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.15 }}
                className="glass rounded-xl p-5 text-center"
              >
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold neon-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;

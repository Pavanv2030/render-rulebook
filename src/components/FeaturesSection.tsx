import { motion } from "framer-motion";
import { Bot, CreditCard, Globe, Package, ShieldCheck, Clock } from "lucide-react";

interface Props { t: (key: string) => string; }

const FeaturesSection = ({ t }: Props) => {
  const features = [
    { icon: Bot, title: t("features.bot.title"), desc: t("features.bot.desc") },
    { icon: CreditCard, title: t("features.payment.title"), desc: t("features.payment.desc") },
    { icon: Globe, title: t("features.countries.title"), desc: t("features.countries.desc") },
    { icon: Package, title: t("features.delivery.title"), desc: t("features.delivery.desc") },
    { icon: ShieldCheck, title: t("features.guarantee.title"), desc: t("features.guarantee.desc") },
    { icon: Clock, title: t("features.aged.title"), desc: t("features.aged.desc") },
  ];

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
            {t("features.title.1")} <span className="gradient-text">{t("features.title.2")}</span>{t("features.title.3")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("features.subtitle")}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-hover rounded-2xl p-7 group">
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

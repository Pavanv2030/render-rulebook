import { motion } from "framer-motion";

interface Props { t: (key: string) => string; }

const HowItWorks = ({ t }: Props) => {
  const steps = [
    { num: "01", title: t("how.step1.title"), desc: t("how.step1.desc") },
    { num: "02", title: t("how.step2.title"), desc: t("how.step2.desc") },
    { num: "03", title: t("how.step3.title"), desc: t("how.step3.desc") },
    { num: "04", title: t("how.step4.title"), desc: t("how.step4.desc") },
  ];

  return (
    <section className="py-24 px-6">
      <div className="container max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("how.title.1")} <span className="gradient-text">{t("how.title.2")}</span>
          </h2>
        </motion.div>
        <div className="space-y-6">
          {steps.map((step, i) => (
            <motion.div key={step.num} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="glass-hover rounded-2xl p-6 flex items-start gap-6">
              <div className="text-3xl font-bold neon-text font-mono shrink-0">{step.num}</div>
              <div>
                <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

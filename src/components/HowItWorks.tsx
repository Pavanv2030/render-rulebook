import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Open Our Bot", desc: "Search @AirdropAccountsPro_bot on Telegram and tap /start" },
  { num: "02", title: "Select Country & Quantity", desc: "Choose your country, pick regular or aged, select quantity" },
  { num: "03", title: "Make Payment", desc: "Pay via UPI, USDT, or Telegram Stars — instant confirmation" },
  { num: "04", title: "Get Your Accounts", desc: "ZIP file delivered automatically in seconds. Start farming!" },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-6">
      <div className="container max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
        </motion.div>

        <div className="space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="glass-hover rounded-2xl p-6 flex items-start gap-6"
            >
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

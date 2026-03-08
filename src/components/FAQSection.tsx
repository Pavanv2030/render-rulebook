import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    q: "What are these accounts used for?",
    a: "These are virtual Telegram accounts used for airdrop farming — participating in crypto airdrops that require multiple Telegram accounts.",
  },
  {
    q: "How quickly will I receive my accounts?",
    a: "Delivery is instant and automated. Once your payment is confirmed, you'll receive a ZIP file containing your accounts within seconds.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept UPI (for Indian customers), USDT via TRC20 and BEP20 networks, and Telegram Stars.",
  },
  {
    q: "What's the difference between Regular and Aged accounts?",
    a: "Aged accounts are 6+ months old with established history. They have higher trust scores and are 3x more successful for premium airdrops.",
  },
  {
    q: "What if some accounts don't work?",
    a: "We offer a 100% working guarantee. Any non-working accounts will be replaced for free. Just contact support through the bot.",
  },
  {
    q: "Do you have a referral program?",
    a: "Yes! Use the /refer command in our bot to get your unique referral link. Earn 5% commission on every sale from your referrals.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-24 px-6">
      <div className="container max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="glass rounded-xl px-6 border-border/50 data-[state=open]:neon-border transition-all"
            >
              <AccordionTrigger className="text-left font-medium py-5 hover:no-underline hover:text-primary transition-colors">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

const TelegramWidget = () => {
  return (
    <motion.a
      href="https://t.me/airdro12pbot"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-[#0088cc] flex items-center justify-center shadow-[0_0_30px_rgba(0,136,204,0.4)] hover:shadow-[0_0_50px_rgba(0,136,204,0.6)] transition-shadow"
      aria-label="Chat on Telegram"
    >
      <MessageCircle className="w-7 h-7 text-foreground" style={{ color: "white" }} />
      
      {/* Ping animation */}
      <span className="absolute inset-0 rounded-full bg-[#0088cc] animate-ping opacity-20" />
    </motion.a>
  );
};

export default TelegramWidget;

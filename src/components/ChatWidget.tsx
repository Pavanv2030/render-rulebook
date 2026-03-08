import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UpiPaymentModal from "./UpiPaymentModal";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  buttons?: { text: string; data: string }[];
}

interface Props { t: (key: string) => string; }

const getSessionId = () => {
  let id = localStorage.getItem("airdrop_session_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("airdrop_session_id", id); }
  return id;
};

const renderText = (text: string) => {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*[^*]+\*|`[^`]+`)/g);
    return (
      <span key={i}>
        {parts.map((part, j) => {
          if (part.startsWith("*") && part.endsWith("*")) return <strong key={j} className="text-foreground font-semibold">{part.slice(1, -1)}</strong>;
          if (part.startsWith("`") && part.endsWith("`")) return <code key={j} className="bg-secondary/80 px-1.5 py-0.5 rounded text-xs font-mono text-primary">{part.slice(1, -1)}</code>;
          return <span key={j}>{part}</span>;
        })}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    );
  });
};

const ChatWidget = ({ t }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", text: t("chat.welcome"), sender: "bot", buttons: [{ text: t("chat.browse"), data: "start" }] },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [upiModal, setUpiModal] = useState<{ amount: number; orderId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(getSessionId());

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = async (text: string) => {
    const userMsg: Message = { id: crypto.randomUUID(), text, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("web-chat", { body: { message: text, sessionId: sessionId.current } });
      if (error) throw error;
      const botMsg: Message = { id: crypto.randomUUID(), text: data.reply || "Something went wrong.", sender: "bot", buttons: data.buttons };
      setMessages((prev) => [...prev, botMsg]);
      if (data.reply?.includes("Payment via UPI") && data.upiAmount && data.orderId) setUpiModal({ amount: data.upiAmount, orderId: data.orderId });
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), text: t("chat.error"), sender: "bot" }]);
    } finally { setIsLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (input.trim() && !isLoading) sendMessage(input.trim()); };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.6)] transition-shadow"
            aria-label="Open chat">
            <MessageCircle className="w-7 h-7 text-primary-foreground" />
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl overflow-hidden border border-border shadow-2xl shadow-primary/10"
            style={{ background: "hsl(var(--background))" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
                <div>
                  <div className="font-semibold text-sm">RIOX Bot</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    {t("chat.online")}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.sender === "bot" && <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-1"><Bot className="w-3.5 h-3.5 text-primary" /></div>}
                  <div className="max-w-[80%] space-y-2">
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.sender === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md text-card-foreground"}`}>
                      {renderText(msg.text)}
                    </div>
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.buttons.map((btn, i) => (
                          <button key={i} onClick={() => sendMessage(btn.data)} disabled={isLoading}
                            className="text-xs px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border hover:border-primary/40 transition-all disabled:opacity-50">
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.sender === "user" && <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1"><User className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 items-start">
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5 text-primary" /></div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-card/50 backdrop-blur-sm">
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("chat.placeholder")} disabled={isLoading}
                  className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 disabled:opacity-50 transition-all" />
                <button type="submit" disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <UpiPaymentModal isOpen={!!upiModal} onClose={() => setUpiModal(null)} amount={upiModal?.amount || 0} orderId={upiModal?.orderId || ""}
        onPaid={() => { setUpiModal(null); sendMessage("paid"); }} />
    </>
  );
};

export default ChatWidget;

import { motion } from "framer-motion";
import { Play, BookOpen, ArrowRight } from "lucide-react";
import promoVideo from "@/assets/promo-video.mp4";
import { useState, useRef } from "react";

interface Props { t: (key: string) => string; }

const VideoGuideSection = ({ t }: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (videoRef.current) { videoRef.current.play(); setIsPlaying(true); }
  };

  const steps = [
    { emoji: "🔍", title: t("video.step1"), desc: t("video.step1.desc") },
    { emoji: "▶️", title: t("video.step2"), desc: t("video.step2.desc") },
    { emoji: "🌍", title: t("video.step3"), desc: t("video.step3.desc") },
    { emoji: "🔢", title: t("video.step4"), desc: t("video.step4.desc") },
    { emoji: "💳", title: t("video.step5"), desc: t("video.step5.desc") },
  ];

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 glass neon-border rounded-full px-4 py-1.5 mb-6">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t("video.badge")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("video.title.1")} <span className="gradient-text">{t("video.title.2")}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("video.subtitle")}</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative group">
            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl shadow-primary/10 bg-card">
              <div className="relative aspect-video">
                <video ref={videoRef} src={promoVideo} className="w-full h-full object-cover" loop muted playsInline onEnded={() => setIsPlaying(false)} />
                {!isPlaying && (
                  <button onClick={handlePlay} aria-label="Play promo video" className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm transition-all group-hover:bg-background/30">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.5)]">
                      <Play className="w-8 h-8 text-primary-foreground ml-1" />
                    </motion.div>
                  </button>
                )}
              </div>
              <div className="p-4 border-t border-border">
                <p className="text-sm font-medium text-foreground">{t("video.caption")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("video.caption.sub")}</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-4">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-hover rounded-xl p-5 flex items-start gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shrink-0 group-hover:bg-primary/20 transition-colors">{step.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-primary/60">Step {i + 1}</span>
                    {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
                  </div>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </motion.div>
            ))}
            <motion.a initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              href="https://t.me/airdro12pbot" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full mt-6 bg-primary text-primary-foreground font-semibold py-4 rounded-xl shadow-[0_0_25px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-shadow">
              {t("video.cta")}
              <ArrowRight className="w-5 h-5" />
            </motion.a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoGuideSection;

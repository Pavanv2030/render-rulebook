import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import VideoGuideSection from "@/components/VideoGuideSection";
import PricingSection from "@/components/PricingSection";
import FAQSection from "@/components/FAQSection";
import FooterSection from "@/components/FooterSection";
import ChatWidget from "@/components/ChatWidget";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { type Lang, getStoredLang, setStoredLang, useTranslation } from "@/lib/i18n";

const Index = () => {
  const [lang, setLang] = useState<Lang>(getStoredLang());
  const t = useTranslation(lang);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    setStoredLang(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  return (
    <div className="min-h-screen bg-background">
      <LanguageSwitcher lang={lang} onChange={handleLangChange} />
      <HeroSection t={t} />
      <FeaturesSection t={t} />
      <HowItWorks t={t} />
      <VideoGuideSection t={t} />
      <PricingSection t={t} />
      <FAQSection t={t} />
      <FooterSection t={t} />
      <ChatWidget t={t} />
    </div>
  );
};

export default Index;

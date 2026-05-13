import { useState } from "react";
import { Helmet } from "react-helmet-async";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import VideoGuideSection from "@/components/VideoGuideSection";
import PricingSection from "@/components/PricingSection";
import BuySection from "@/components/BuySection";
import WalletSection from "@/components/WalletSection";
import FAQSection from "@/components/FAQSection";
import FooterSection from "@/components/FooterSection";
import ChatWidget from "@/components/ChatWidget";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { type Lang, getStoredLang, setStoredLang, useTranslation } from "@/lib/i18n";

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { q: "What are these accounts used for?", a: "These are virtual Telegram accounts used for airdrop farming — participating in crypto airdrops that require multiple Telegram accounts." },
    { q: "How quickly will I receive my accounts?", a: "Delivery is instant and automated. Once your payment is confirmed, you'll receive a ZIP file containing your accounts within seconds." },
    { q: "What payment methods do you accept?", a: "We accept UPI (for Indian customers), USDT via TRC20 and BEP20 networks, and Telegram Stars." },
    { q: "What's the difference between Regular and Aged accounts?", a: "Aged accounts are 6+ months old with established history. They have higher trust scores and are 3x more successful for premium airdrops." },
    { q: "What if some accounts don't work?", a: "We offer a 100% working guarantee. Any non-working accounts will be replaced for free. Just contact support through the bot." },
    { q: "Do you have a referral program?", a: "Yes! Use the /refer command in our bot to get your unique referral link. Earn 5% commission on every sale from your referrals." },
  ].map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

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
      <Helmet>
        <title>RIOX Accounts Pro — Premium Telegram Accounts for Airdrop Farming</title>
        <meta name="description" content="Buy premium virtual Telegram accounts for airdrop farming. Instant auto-delivery, INR & USDT payments, 100% working guarantee." />
        <link rel="canonical" href="https://render-rulebook.lovable.app/" />
        <meta property="og:title" content="RIOX Accounts Pro — Premium Telegram Accounts for Airdrop Farming" />
        <meta property="og:description" content="Buy premium virtual Telegram accounts for airdrop farming. Instant auto-delivery, INR & USDT payments, 100% working guarantee." />
        <meta property="og:url" content="https://render-rulebook.lovable.app/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="RIOX Accounts Pro — Premium Telegram Accounts for Airdrop Farming" />
        <meta name="twitter:description" content="Buy premium virtual Telegram accounts for airdrop farming. Instant auto-delivery, INR & USDT payments, 100% working guarantee." />
        <script type="application/ld+json">{JSON.stringify(FAQ_JSONLD)}</script>
      </Helmet>
      <LanguageSwitcher lang={lang} onChange={handleLangChange} />
      <HeroSection t={t} />
      <FeaturesSection t={t} />
      <HowItWorks t={t} />
      <VideoGuideSection t={t} />
      <PricingSection t={t} />
      <BuySection t={t} />
      <WalletSection t={t} />
      <FAQSection t={t} />
      <FooterSection t={t} />
      <ChatWidget t={t} />
    </div>
  );
};

export default Index;

import { Send } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="border-t border-border/50 py-12 px-6">
      <div className="container max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Send className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-lg">RIOX Accounts Pro</span>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} RIOX Accounts Pro. Premium Telegram accounts for airdrop farming.
        </p>
        <a
          href="https://t.me/airdro12pbot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          @airdro12pbot
        </a>
      </div>
    </footer>
  );
};

export default FooterSection;

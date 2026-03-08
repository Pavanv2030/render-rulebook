import { LANGUAGES, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

const LanguageSwitcher = ({ lang, onChange }: Props) => {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="glass rounded-xl border border-border/50 flex overflow-hidden">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => onChange(l.code)}
            className={`px-3 py-2 text-sm font-medium transition-all ${
              lang === l.code
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
            title={l.label}
          >
            {l.flag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;

import { Link } from "@tanstack/react-router";
import { LangToggle } from "./LangToggle";
import { useLang } from "@/lib/language-context";

export function SiteHeader() {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_12px_var(--gold)]" />
          <span className="font-display text-lg tracking-tight">
            Forever <span className="italic text-accent">Here</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LangToggle />
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 sm:px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <span className="hidden sm:inline">{t.header.create}</span>
            <span className="sm:hidden">+ Create</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

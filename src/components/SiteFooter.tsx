import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/language-context";

export function SiteFooter() {
  const { t } = useLang();
  const tf = t.footer;
  return (
    <footer className="mt-32 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-6 py-12 text-sm">
        <div className="font-display text-base mb-2">
          Forever <span className="italic text-accent">Here</span>
        </div>
        <p className="text-muted-foreground leading-relaxed max-w-sm">{tf.tagline}</p>
      </div>
      <div className="border-t border-border/50 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>{tf.copy(new Date().getFullYear())}</span>
          <div className="flex items-center gap-5">
            <Link to="/" className="hover:text-foreground transition">{tf.about}</Link>
            <Link to="/" className="hover:text-foreground transition">{tf.privacy}</Link>
            <Link to="/" className="hover:text-foreground transition">{tf.terms}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

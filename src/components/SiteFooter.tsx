import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/language-context";

export function SiteFooter() {
  const { t } = useLang();
  const tf = t.footer;
  return (
    <footer className="mt-32 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="font-display text-base mb-2">
            Forever <span className="italic text-accent">Here</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">{tf.tagline}</p>
        </div>
        <div className="text-muted-foreground">
          <div className="text-foreground font-medium mb-2">{tf.memorials}</div>
          <ul className="space-y-1">
            <li><Link to="/create" className="hover:text-foreground">{tf.createOne}</Link></li>
            <li><Link to="/" className="hover:text-foreground">{tf.examples}</Link></li>
            <li><Link to="/" className="hover:text-foreground">{tf.howItWorks}</Link></li>
          </ul>
        </div>
        <div className="text-muted-foreground">
          <div className="text-foreground font-medium mb-2">{tf.about}</div>
          <ul className="space-y-1">
            <li><Link to="/" className="hover:text-foreground">{tf.privacy}</Link></li>
            <li><Link to="/" className="hover:text-foreground">{tf.terms}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        {tf.copy(new Date().getFullYear())}
      </div>
    </footer>
  );
}

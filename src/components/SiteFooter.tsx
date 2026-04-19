import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="font-display text-base mb-2">
            Forever <span className="italic text-accent">Here</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            A quiet place for the stories of those we've loved.
          </p>
        </div>
        <div className="text-muted-foreground">
          <div className="text-foreground font-medium mb-2">Memorials</div>
          <ul className="space-y-1">
            <li><Link to="/create" className="hover:text-foreground">Create one</Link></li>
            <li><Link to="/" className="hover:text-foreground">Examples</Link></li>
            <li><Link to="/" className="hover:text-foreground">How it works</Link></li>
          </ul>
        </div>
        <div className="text-muted-foreground">
          <div className="text-foreground font-medium mb-2">About</div>
          <ul className="space-y-1">
            <li><Link to="/" className="hover:text-foreground">Privacy</Link></li>
            <li><Link to="/" className="hover:text-foreground">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Forever Here · Made with care
      </div>
    </footer>
  );
}

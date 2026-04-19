import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_12px_var(--gold)]" />
          <span className="font-display text-lg tracking-tight">
            Forever <span className="italic text-accent">Here</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link to="/" className="hover:text-foreground transition-colors">
            Examples
          </Link>
          <Link to="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Create memorial
          </Link>
        </div>
      </div>
    </header>
  );
}

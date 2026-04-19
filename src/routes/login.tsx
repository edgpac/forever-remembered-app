import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Forever Here" },
      { name: "description", content: "Sign in to manage memorials you've created." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) throw err;
      setStatus("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send link");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-candlelight">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-xs tracking-[0.3em] uppercase text-accent mb-3 text-center">
            Sign in
          </div>
          <h1 className="font-display text-4xl text-center leading-tight">Welcome back.</h1>
          <p className="mt-3 text-center text-muted-foreground font-serif">
            We'll send a one-time link to your email.
          </p>

          {status === "sent" ? (
            <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center">
              <div className="font-display text-2xl">Check your inbox</div>
              <p className="mt-3 text-sm text-muted-foreground">
                We sent a sign-in link to <span className="text-foreground">{email}</span>. It may
                take a minute to arrive.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="mt-6 text-sm text-accent hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-3 text-sm font-medium shadow-warm hover:opacity-90 disabled:opacity-60 transition"
              >
                {status === "sending" ? "Sending…" : "Send sign-in link"}
              </button>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Just creating a memorial?{" "}
                <Link to="/create" className="text-accent hover:underline">
                  No account needed
                </Link>
                .
              </p>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

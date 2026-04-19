import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in… — Forever Here" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // supabase-js detects the magic-link tokens in the URL hash automatically.
    let cancelled = false;
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" || session) {
        void navigate({ to: "/dashboard", replace: true });
      }
    });
    void supabase.auth.getSession().then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) setError(err.message);
      else if (data.session) void navigate({ to: "/dashboard", replace: true });
      else {
        // Wait briefly for hash detection
        setTimeout(() => {
          if (!cancelled) {
            void supabase.auth.getSession().then(({ data: d2 }) => {
              if (!cancelled && !d2.session) setError("Sign-in link expired or invalid.");
            });
          }
        }, 1500);
      }
    });
    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-candlelight px-6">
      <div className="text-center">
        {error ? (
          <>
            <h1 className="font-display text-3xl">Couldn't sign you in</h1>
            <p className="mt-3 text-muted-foreground">{error}</p>
            <a href="/login" className="mt-6 inline-block text-accent hover:underline">
              Try again
            </a>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-3 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-serif italic">Signing you in…</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

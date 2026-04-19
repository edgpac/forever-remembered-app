import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { formatYears } from "@/lib/memorial";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Your memorials — Forever Here" }],
  }),
  component: DashboardPage,
});

type Memorial = {
  memorial_id: string;
  full_name: string;
  nickname: string | null;
  birth_date: string | null;
  passing_date: string | null;
  status: string;
  portrait_url: string | null;
  qr_png_url: string | null;
  view_count: number;
  created_at: string;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        void navigate({ to: "/login", replace: true });
        return;
      }
      if (cancelled) return;
      setEmail(sess.session.user.email ?? null);

      const userEmail = sess.session.user.email;
      const userId = sess.session.user.id;

      // Backfill creator_user_id on memorials created with this email before sign-up
      if (userEmail) {
        await supabase
          .from("memorials")
          .update({ creator_user_id: userId })
          .eq("creator_email", userEmail)
          .is("creator_user_id", null);
      }

      const orFilter = userEmail
        ? `creator_user_id.eq.${userId},creator_email.eq.${userEmail}`
        : `creator_user_id.eq.${userId}`;

      const { data, error: err } = await supabase
        .from("memorials")
        .select(
          "memorial_id, full_name, nickname, birth_date, passing_date, status, portrait_url, qr_png_url, view_count, created_at"
        )
        .or(orFilter)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (err) setError(err.message);
      else setMemorials(data || []);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-candlelight">
      <SiteHeader />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div>
            <div className="text-xs tracking-[0.3em] uppercase text-accent mb-2">Your memorials</div>
            <h1 className="font-display text-4xl md:text-5xl leading-tight">
              The people you carry.
            </h1>
            {email && (
              <p className="mt-2 text-sm text-muted-foreground">
                Signed in as <span className="text-foreground">{email}</span> ·{" "}
                <button onClick={signOut} className="text-accent hover:underline">
                  sign out
                </button>
              </p>
            )}
          </div>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium shadow-warm hover:opacity-90 transition"
          >
            + New memorial
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground font-serif italic">
            Loading…
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : memorials.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border">
            <div className="font-display text-2xl">No memorials yet.</div>
            <p className="mt-3 text-muted-foreground">
              Create your first one — it takes about three minutes.
            </p>
            <Link
              to="/create"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm"
            >
              Create memorial
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {memorials.map((m) => {
              const display = m.nickname ? `${m.full_name} "${m.nickname}"` : m.full_name;
              const years = formatYears(m.birth_date, m.passing_date);
              return (
                <Link
                  key={m.memorial_id}
                  to="/remember/$memorialId"
                  params={{ memorialId: m.memorial_id }}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-warm transition"
                >
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    {m.portrait_url ? (
                      <img
                        src={m.portrait_url}
                        alt={m.full_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        ◯
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="font-display text-xl leading-tight">{display}</div>
                    {years && (
                      <div className="mt-1 text-sm text-muted-foreground font-serif">{years}</div>
                    )}
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          m.status === "active" ? "text-accent" : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            m.status === "active" ? "bg-accent" : "bg-muted-foreground animate-pulse"
                          }`}
                        />
                        {m.status === "active" ? "Live" : "Generating…"}
                      </span>
                      <span className="text-muted-foreground">{m.view_count} views</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

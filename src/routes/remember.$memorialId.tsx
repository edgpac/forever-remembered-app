import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatYears } from "@/lib/memorial";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const getMemorial = createServerFn({ method: "GET" })
  .inputValidator((data: { memorialId: string }) => data)
  .handler(async ({ data }) => {
    const { data: memorial, error } = await supabaseAdmin
      .from("memorials")
      .select(
        "memorial_id, status, subject_type, full_name, nickname, birth_date, passing_date, hometown, loves, catchphrase, narrative_en, narrative_es, language, portrait_url, qr_png_url, creator_relationship, theme"
      )
      .eq("memorial_id", data.memorialId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!memorial) return null;
    return memorial;
  });

export const Route = createFileRoute("/remember/$memorialId")({
  loader: async ({ params }) => {
    const memorial = await getMemorial({ data: { memorialId: params.memorialId } });
    if (!memorial) throw notFound();
    return { memorial };
  },
  head: ({ loaderData }) => {
    const m = loaderData?.memorial;
    if (!m) return {};
    const display = m.nickname ? `${m.full_name} "${m.nickname}"` : m.full_name;
    const desc =
      (m.narrative_en || m.narrative_es || "")?.slice(0, 150) ||
      `A memorial for ${m.full_name} on Forever Here.`;
    return {
      meta: [
        { title: `${display} — Forever Here` },
        { name: "description", content: desc },
        { property: "og:title", content: `${display} — Forever Here` },
        { property: "og:description", content: desc },
        ...(m.portrait_url ? [{ property: "og:image", content: m.portrait_url }] : []),
        ...(m.portrait_url ? [{ name: "twitter:image", content: m.portrait_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: MemorialPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center text-center px-6 py-24">
        <div>
          <h1 className="font-display text-4xl">Memorial not found</h1>
          <p className="mt-3 text-muted-foreground">
            The link may be incorrect or the memorial may have been removed.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm"
          >
            Go home
          </Link>
        </div>
      </main>
    </div>
  ),
});

function MemorialPage() {
  const { memorial: m } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const display = m.nickname ? `${m.full_name} "${m.nickname}"` : m.full_name;
  const years = formatYears(m.birth_date, m.passing_date);
  const narrative = m.language === "es" ? m.narrative_es : m.narrative_en;
  const generating = m.status === "generating" || !narrative;

  // Poll loader for completion while generating
  useEffect(() => {
    if (!generating) return;
    const id = setInterval(() => {
      void navigate({
        to: "/remember/$memorialId",
        params: { memorialId: m.memorial_id },
        replace: true,
      });
    }, 4000);
    return () => clearInterval(id);
  }, [generating, m.memorial_id, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-candlelight">
      <SiteHeader />
      <article className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 md:py-20">
        {/* Portrait */}
        <div className="text-center">
          {m.portrait_url ? (
            <div className="mx-auto w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden portrait-vignette shadow-warm">
              <img src={m.portrait_url} alt={m.full_name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="mx-auto w-48 h-48 md:w-56 md:h-56 rounded-full bg-muted shadow-warm" />
          )}
          <div className="text-xs tracking-[0.3em] uppercase text-accent mt-8">In loving memory</div>
          <h1 className="mt-3 font-display text-4xl md:text-5xl leading-tight">{display}</h1>
          {years && <div className="mt-2 text-muted-foreground font-serif">{years}</div>}
        </div>

        {/* Narrative */}
        <div className="mt-16 max-w-2xl mx-auto">
          {generating && !narrative ? (
            <GeneratingState />
          ) : (
            <div className="font-serif text-lg leading-relaxed text-foreground/90 space-y-5 first-letter:font-display first-letter:text-5xl first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-accent">
              {(narrative || "").split(/\n\n+/).map((p: string, i: number) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </div>

        {/* Quick facts */}
        {(m.hometown || m.loves || m.catchphrase) && (
          <div className="mt-16 max-w-2xl mx-auto grid sm:grid-cols-3 gap-4">
            {m.hometown && (
              <Fact label="From" value={m.hometown} />
            )}
            {m.loves && (
              <Fact label="Loved" value={m.loves.split(",").slice(0, 2).join(", ")} />
            )}
            {m.catchphrase && (
              <Fact label="Always said" value={`"${m.catchphrase}"`} />
            )}
          </div>
        )}

        {/* Share / QR */}
        <div className="mt-20 max-w-md mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <div className="text-xs tracking-[0.3em] uppercase text-accent mb-4">Share this memorial</div>
          {m.qr_png_url ? (
            <img
              src={m.qr_png_url}
              alt={`QR code for ${m.full_name}`}
              className="mx-auto w-32 h-32 rounded-lg border border-border"
            />
          ) : (
            <div className="mx-auto w-32 h-32 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
              QR generating…
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">Scan to share with family</p>
          <div className="mt-6 text-xs text-muted-foreground border-t border-border pt-4">
            foreverhere.app/remember/{m.memorial_id}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          {m.creator_relationship && (
            <p>
              Remembered by <span className="italic">{m.creator_relationship}</span>
            </p>
          )}
          <Link to="/" className="mt-4 inline-block hover:text-foreground transition">
            Forever Here — Create your own ↗
          </Link>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="text-[10px] tracking-[0.2em] uppercase text-accent">{label}</div>
      <div className="mt-1.5 text-sm text-foreground font-serif">{value}</div>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="text-center py-10">
      <div className="inline-flex items-center gap-3 text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="font-serif italic">Their story is being written…</span>
      </div>
      <p className="mt-4 text-sm text-muted-foreground max-w-sm mx-auto">
        This usually takes 10–20 seconds. The page will refresh automatically.
      </p>
    </div>
  );
}

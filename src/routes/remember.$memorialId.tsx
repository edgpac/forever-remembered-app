import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
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
        "memorial_id, status, subject_type, full_name, nickname, birth_date, passing_date, hometown, loves, catchphrase, narrative_en, narrative_es, language, portrait_url, qr_png_url, creator_relationship, theme, music_links"
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

function useFadeInOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useFadeInOnScroll();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function MemorialPage() {
  const { memorial: m } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const display = m.nickname ? `${m.full_name} "${m.nickname}"` : m.full_name;
  const years = formatYears(m.birth_date, m.passing_date);
  const narrative = m.language === "es" ? m.narrative_es : m.narrative_en;
  const generating = m.status === "generating" || !narrative;
  const paragraphs = (narrative || "").split(/\n\n+/).filter(Boolean);

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
    <div className="min-h-screen flex flex-col memorial-page-bg grain">
      <SiteHeader />

      <article className="flex-1 w-full">
        {/* ── Hero ── */}
        <header className="relative flex flex-col items-center pt-16 pb-20 px-6 overflow-hidden">
          {/* warm ambient glow behind portrait */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, color-mix(in oklab, var(--gold) 22%, transparent) 0%, transparent 70%)",
            }}
          />

          {/* Portrait */}
          <div className="relative z-10">
            {m.portrait_url ? (
              <div className="portrait-hero">
                <img
                  src={m.portrait_url}
                  alt={m.full_name}
                  className="w-full h-full object-cover"
                />
                <div className="portrait-hero-vignette" />
              </div>
            ) : (
              <div className="portrait-hero bg-muted" />
            )}
          </div>

          {/* Name block */}
          <div className="relative z-10 text-center mt-10">
            <p className="memorial-eyebrow">In Loving Memory</p>
            <h1 className="font-display memorial-name mt-3">{display}</h1>
            {years && (
              <p className="mt-3 font-serif text-lg italic text-muted-foreground tracking-wide">
                {years}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative z-10 mt-10 flex items-center gap-4 w-full max-w-xs">
            <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-accent text-lg">✦</span>
            <span className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
          </div>
        </header>

        {/* ── Narrative ── */}
        <section className="max-w-2xl mx-auto px-6 pb-20">
          {generating ? (
            <GeneratingState />
          ) : (
            <div className="space-y-6">
              {paragraphs.map((p, i) => (
                <FadeUp key={i} delay={i * 80}>
                  <p
                    className={[
                      "font-serif text-lg md:text-xl leading-[1.85] text-foreground/90",
                      i === 0 ? "first-paragraph" : "",
                    ].join(" ")}
                  >
                    {p}
                  </p>
                </FadeUp>
              ))}
            </div>
          )}
        </section>

        {/* ── Music ── */}
        {m.music_links && m.music_links.length > 0 && (
          <FadeUp className="max-w-2xl mx-auto px-6 pb-20">
            <MusicSection links={m.music_links as Array<{ url: string; title?: string }>} />
          </FadeUp>
        )}

        {/* ── Facts ── */}
        {(m.hometown || m.loves || m.catchphrase) && (
          <FadeUp className="max-w-2xl mx-auto px-6 pb-20">
            <div className="grid sm:grid-cols-3 gap-4">
              {m.hometown && <Fact label="From" value={m.hometown} />}
              {m.loves && <Fact label="Loved" value={m.loves.split(",").slice(0, 2).join(", ")} />}
              {m.catchphrase && <Fact label="Always said" value={`"${m.catchphrase}"`} />}
            </div>
          </FadeUp>
        )}

        {/* ── QR / Share ── */}
        <FadeUp className="max-w-sm mx-auto px-6 pb-24">
          <div className="keepsake-card text-center">
            <p className="memorial-eyebrow mb-5">Share this memorial</p>
            {m.qr_png_url ? (
              <img
                src={m.qr_png_url}
                alt={`QR code for ${m.full_name}`}
                className="mx-auto w-36 h-36 rounded-lg border border-border/50"
              />
            ) : (
              <div className="mx-auto w-36 h-36 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                QR generating…
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground font-serif italic">
              Scan to share with family
            </p>
            <div className="mt-5 text-[11px] text-muted-foreground/70 border-t border-border/60 pt-4 tracking-wide">
              foreverhere.app/remember/{m.memorial_id}
            </div>
          </div>
        </FadeUp>

        {/* ── Footer note ── */}
        <div className="pb-12 text-center text-sm text-muted-foreground">
          {m.creator_relationship && (
            <p className="font-serif italic">
              Remembered by {m.creator_relationship}
            </p>
          )}
          <Link to="/" className="mt-4 inline-block hover:text-foreground transition text-xs tracking-widest uppercase">
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
    <div className="rounded-2xl border border-border/70 bg-card/50 backdrop-blur-sm p-5">
      <div className="memorial-eyebrow mb-2">{label}</div>
      <div className="text-sm text-foreground font-serif leading-snug">{value}</div>
    </div>
  );
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const p = new URL(url);
    const id = p.hostname.includes("youtu.be")
      ? p.pathname.slice(1)
      : p.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

function getSpotifyEmbedUrl(url: string): string | null {
  try {
    const p = new URL(url);
    if (!p.hostname.includes("spotify.com")) return null;
    return `https://open.spotify.com/embed${p.pathname}`;
  } catch {
    return null;
  }
}

function MusicSection({ links }: { links: Array<{ url: string; title?: string }> }) {
  return (
    <div>
      <p className="memorial-eyebrow mb-6">Their music</p>
      <div className="space-y-4">
        {links.map((link, i) => {
          let platform = "other";
          try {
            const { hostname } = new URL(link.url);
            if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) platform = "youtube";
            else if (hostname.includes("spotify.com")) platform = "spotify";
            else if (hostname.includes("music.apple.com")) platform = "apple-music";
            else if (hostname.includes("soundcloud.com")) platform = "soundcloud";
          } catch {}

          if (platform === "youtube") {
            const embedUrl = getYouTubeEmbedUrl(link.url);
            if (embedUrl) {
              return (
                <div key={i} className="rounded-2xl overflow-hidden border border-border/70">
                  {link.title && (
                    <div className="px-4 py-2 text-xs text-muted-foreground bg-card/70 border-b border-border/50 font-serif italic">
                      {link.title}
                    </div>
                  )}
                  <iframe
                    src={embedUrl}
                    title={link.title || `Song ${i + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full aspect-video"
                  />
                </div>
              );
            }
          }

          if (platform === "spotify") {
            const embedUrl = getSpotifyEmbedUrl(link.url);
            if (embedUrl) {
              return (
                <div key={i} className="rounded-2xl overflow-hidden border border-border/70">
                  {link.title && (
                    <div className="px-4 py-2 text-xs text-muted-foreground bg-card/70 border-b border-border/50 font-serif italic">
                      {link.title}
                    </div>
                  )}
                  <iframe
                    src={embedUrl}
                    title={link.title || `Song ${i + 1}`}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="w-full"
                    height="152"
                  />
                </div>
              );
            }
          }

          const platformLabel: Record<string, string> = {
            "apple-music": "Apple Music",
            soundcloud: "SoundCloud",
            other: "Listen",
          };
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card/50 p-4 hover:border-accent/50 transition group"
            >
              <div className="flex-1 min-w-0">
                <div className="memorial-eyebrow mb-1">{platformLabel[platform] ?? "Listen"}</div>
                <div className="text-sm text-foreground truncate font-serif italic">
                  {link.title || link.url}
                </div>
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition text-lg">↗</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center gap-3 text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="font-serif italic text-lg">Their story is being written…</span>
      </div>
      <p className="mt-5 text-sm text-muted-foreground max-w-sm mx-auto font-serif">
        This usually takes 10–20 seconds. The page will refresh automatically.
      </p>
    </div>
  );
}

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabase } from "@/integrations/supabase/client";
import { formatYears } from "@/lib/memorial";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useLang } from "@/lib/language-context";

type MemorialNote = {
  id: string;
  author_name: string;
  note_text: string;
  created_at: string;
};

const getMemorial = createServerFn({ method: "GET" })
  .inputValidator((data: { memorialId: string }) => data)
  .handler(async ({ data }) => {
    const { data: memorial, error } = await supabaseAdmin
      .from("memorials")
      .select(
        "memorial_id, status, subject_type, memorial_mode, full_name, nickname, birth_date, passing_date, hometown, occupation, loves, insider_detail, catchphrase, narrative_en, narrative_es, language, portrait_url, gallery_urls, qr_png_url, creator_relationship, music_links, legacy_links, want_people_to_know"
      )
      .eq("memorial_id", data.memorialId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!memorial) return null;

    let notes: MemorialNote[] = [];
    try {
      const { data: notesData } = await (supabaseAdmin as ReturnType<typeof supabaseAdmin.from> extends never ? never : typeof supabaseAdmin)
        .from("memorial_notes")
        .select("id, author_name, note_text, created_at")
        .eq("memorial_id", data.memorialId)
        .order("created_at", { ascending: true })
        .limit(50) as unknown as { data: MemorialNote[] | null };
      notes = notesData ?? [];
    } catch {
      notes = [];
    }

    return { memorial, notes };
  });

const updateNarrative = createServerFn({ method: "POST" })
  .inputValidator((d: { memorialId: string; lang: "en" | "es"; text: string; email: string }) => d)
  .handler(async ({ data }) => {
    const { data: memorial, error: fetchErr } = await supabaseAdmin
      .from("memorials")
      .select("creator_email")
      .eq("memorial_id", data.memorialId)
      .maybeSingle();
    if (fetchErr || !memorial) throw new Error("Memorial not found");
    if (memorial.creator_email.toLowerCase() !== data.email.trim().toLowerCase()) {
      throw new Error("EMAIL_MISMATCH");
    }
    const patch = data.lang === "es"
      ? { narrative_es: data.text.trim() }
      : { narrative_en: data.text.trim() };
    const { error } = await supabaseAdmin
      .from("memorials")
      .update(patch)
      .eq("memorial_id", data.memorialId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const addAlbumPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: { memorialId: string; email: string; urls: string[] }) => d)
  .handler(async ({ data }) => {
    const { data: m, error: fetchErr } = await supabaseAdmin
      .from("memorials")
      .select("creator_email, gallery_urls")
      .eq("memorial_id", data.memorialId)
      .maybeSingle();
    if (fetchErr || !m) throw new Error("Memorial not found");
    if (m.creator_email.toLowerCase() !== data.email.trim().toLowerCase()) throw new Error("EMAIL_MISMATCH");
    const existing = (m.gallery_urls as string[] | null) ?? [];
    const updated = [...existing, ...data.urls];
    const { error } = await supabaseAdmin
      .from("memorials")
      .update({ gallery_urls: updated })
      .eq("memorial_id", data.memorialId);
    if (error) throw new Error(error.message);
    return { ok: true, urls: updated };
  });

const addNote = createServerFn({ method: "POST" })
  .inputValidator((d: { memorialId: string; author_name: string; note_text: string }) => d)
  .handler(async ({ data }) => {
    const trimmedName = data.author_name.trim().slice(0, 100);
    const trimmedText = data.note_text.trim().slice(0, 500);
    if (!trimmedName || !trimmedText) throw new Error("Name and message are required");

    const { data: note, error } = await supabaseAdmin
      .from("memorial_notes")
      .insert({ memorial_id: data.memorialId, author_name: trimmedName, note_text: trimmedText })
      .select("id, author_name, note_text, created_at")
      .single() as unknown as { data: MemorialNote | null; error: { message: string } | null };

    if (error) throw new Error(error.message);
    return note!;
  });

export const Route = createFileRoute("/remember/$memorialId")({
  loader: async ({ params }) => {
    const result = await getMemorial({ data: { memorialId: params.memorialId } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    const m = loaderData?.memorial;
    if (!m) return {};
    const display = m.nickname ? `${m.full_name} "${m.nickname}"` : m.full_name;
    const isStory = (m.memorial_mode ?? "memorial") === "story";
    const isAlbum = m.memorial_mode === "album";
    const fallback = isAlbum
      ? `${display} · Forever Here`
      : isStory
        ? `Their story — ${display} · Forever Here`
        : `In loving memory of ${display} · Forever Here`;
    const narrative = (m.narrative_en || m.narrative_es || "").trim();
    const desc = narrative ? narrative.slice(0, 150) + (narrative.length > 150 ? "…" : "") : fallback;
    const title = isAlbum
      ? `${display} · Forever Here`
      : isStory
        ? `Their story — ${display} · Forever Here`
        : `In loving memory of ${display} · Forever Here`;
    const pageUrl = `https://www.qrheadstone.com/remember/${m.memorial_id}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": m.subject_type === "pet" ? "Animal" : "Person",
      name: m.full_name,
      alternateName: m.nickname || undefined,
      birthDate: m.birth_date || undefined,
      deathDate: m.passing_date || undefined,
      description: desc,
      image: m.portrait_url || undefined,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
    };

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:site_name", content: "Forever Here · QR Headstone" },
        { property: "og:url", content: pageUrl },
        { property: "og:type", content: "profile" },
        ...(m.portrait_url ? [{ property: "og:image", content: m.portrait_url }] : []),
        ...(m.portrait_url ? [{ name: "twitter:image", content: m.portrait_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "robots", content: "index, follow" },
      ],
      links: [
        { rel: "canonical", href: pageUrl },
      ],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
      ],
    };
  },
  component: MemorialPage,
  notFoundComponent: () => {
    const { t } = useLang();
    const tm = t.memorial;
    return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center text-center px-6 py-24">
        <div>
          <h1 className="font-display text-4xl">{tm.notFoundTitle}</h1>
          <p className="mt-3 text-muted-foreground">{tm.notFoundBody}</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm">
            {tm.goHome}
          </Link>
        </div>
      </main>
    </div>
    );
  },
});

// ─── FadeUp ───────────────────────────────────────────────────────────────────

function useFadeInOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
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

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({
  m,
  display,
  years,
}: {
  m: { portrait_url: string | null; subject_type: string; creator_relationship: string | null; memorial_mode: string | null };
  display: string;
  years: string;
}) {
  const { t } = useLang();
  const tm = t.memorial;
  const isPet = m.subject_type === "pet";
  const isStory = (m.memorial_mode ?? "memorial") === "story";
  const isAlbum = m.memorial_mode === "album";
  const eyebrow = isAlbum ? tm.photoAlbum : isStory ? tm.storyEyebrow : isPet ? tm.foreverInHearts : tm.inLovingMemory;
  const creatorLabel = isAlbum ? tm.albumCreatedBy : tm.lovedBy;

  return (
    <div className="memorial-hero">
      {m.portrait_url ? (
        <img
          src={m.portrait_url}
          alt={display}
          className="memorial-hero-img"
        />
      ) : (
        <div className="memorial-hero-img memorial-hero-placeholder" />
      )}

      {/* Gradient overlay */}
      <div className="memorial-hero-overlay" />

      {/* Ambient top glow */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.25), transparent)",
        }}
      />

      {/* Name & dates — bottom-right editorial block */}
      <div className="memorial-hero-text">
        <p className="text-[11px] tracking-[0.35em] uppercase text-white/60 mb-2">
          {eyebrow}
        </p>
        <h1 className="font-display text-white leading-tight" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)" }}>
          {display}
          {isPet && !isAlbum && <span className="ml-3 text-[0.7em]">🐾</span>}
        </h1>
        {years && (
          <p className="mt-2 font-serif italic text-white/60" style={{ fontSize: "clamp(0.95rem, 2vw, 1.2rem)" }}>
            {years}
          </p>
        )}
        {m.creator_relationship && (
          <p className="mt-3 text-[11px] tracking-[0.2em] uppercase text-white/40">
            {creatorLabel} {m.creator_relationship}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function MemorialPage() {
  const { memorial: m, notes: initialNotes } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const { t } = useLang();
  const tm = t.memorial;
  const display = m.nickname ? `${m.full_name} "${m.nickname}"` : m.full_name;
  const years = formatYears(m.birth_date, m.passing_date);
  const narrative = m.language === "es" ? m.narrative_es : m.narrative_en;
  const generating = m.status === "generating" || (!narrative && m.status !== "error");
  const paragraphs = (narrative || "").split(/\n\n+/).filter(Boolean);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.qrheadstone.com";
  const memorialUrl = `${origin}/remember/${m.memorial_id}`;
  const isAlbum = m.memorial_mode === "album";
  const [galleryUrls, setGalleryUrls] = useState<string[]>((m.gallery_urls as string[] | null) ?? []);

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
        {/* Hero */}
        <HeroSection m={m} display={display} years={years} />

        {/* Divider */}
        <div className="flex items-center gap-4 max-w-xs mx-auto mt-12 px-6">
          <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-accent">{m.subject_type === "pet" ? "🐾" : "✦"}</span>
          <span className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
        </div>

        {/* Narrative */}
        <section className="max-w-2xl mx-auto px-6 py-14">
          {m.status === "error" ? (
            <ErrorState />
          ) : generating ? (
            <GeneratingState />
          ) : (
            <EditableNarrative
              memorialId={m.memorial_id}
              initialText={narrative ?? ""}
              lang={m.language === "es" ? "es" : "en"}
              paragraphs={paragraphs}
            />
          )}
        </section>

        {/* Gallery + album upload */}
        {isAlbum && (
          <FadeUp className="max-w-3xl mx-auto px-6 pb-8">
            <AlbumPhotoUpload memorialId={m.memorial_id} onUploaded={setGalleryUrls} />
          </FadeUp>
        )}
        {galleryUrls.length > 0 && (
          <FadeUp className="max-w-3xl mx-auto px-6 pb-16">
            <GallerySection urls={galleryUrls} name={m.full_name} />
          </FadeUp>
        )}

        {/* Music */}
        {m.music_links && m.music_links.length > 0 && (
          <FadeUp className="max-w-2xl mx-auto px-6 pb-16">
            <MusicSection links={m.music_links as Array<{ url: string; title?: string }>} />
          </FadeUp>
        )}

        {/* Facts */}
        {(m.hometown || m.loves || m.catchphrase || m.insider_detail) && (
          <FadeUp className="max-w-2xl mx-auto px-6 pb-16">
            <FactsSection m={m} />
          </FadeUp>
        )}

        {/* Links & Legacy */}
        {m.legacy_links && (m.legacy_links as Array<{ url: string; label?: string }>).length > 0 && (
          <FadeUp className="max-w-2xl mx-auto px-6 pb-16">
            <LinksSection links={m.legacy_links as Array<{ url: string; label?: string }>} />
          </FadeUp>
        )}

        {/* Leave a Memory */}
        <FadeUp className="max-w-2xl mx-auto px-6 pb-16">
          <LeaveMemorySection
            memorialId={m.memorial_id}
            initialNotes={initialNotes}
            isPet={m.subject_type === "pet"}
          />
        </FadeUp>

        {/* QR / Share */}
        <FadeUp className="max-w-sm mx-auto px-6 pb-24">
          <QRSection m={m} display={display} years={years} memorialUrl={memorialUrl} />
        </FadeUp>

        {/* Footer note */}
        <div className="pb-12 text-center text-sm text-muted-foreground">
          {m.creator_relationship && (
            <p className="font-serif italic">
              {(m.memorial_mode ?? "memorial") === "story" ? tm.storySharedBy : tm.rememberByPrefix} {m.creator_relationship}
            </p>
          )}
          <Link to="/" className="mt-4 inline-block hover:text-foreground transition text-xs tracking-widest uppercase">
            {tm.createOwn}
          </Link>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}

// ─── Album Photo Upload ───────────────────────────────────────────────────────

function AlbumPhotoUpload({
  memorialId,
  onUploaded,
}: {
  memorialId: string;
  onUploaded: (urls: string[]) => void;
}) {
  const { t } = useLang();
  const tm = t.memorial;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    if (!files.length || !email.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) continue;
        if (file.size > 10 * 1024 * 1024) continue;
        const path = `album-photos/${memorialId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("portraits")
          .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("portraits").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      if (!uploaded.length) throw new Error("No valid photos selected");
      const result = await addAlbumPhotos({ data: { memorialId, email, urls: uploaded } });
      onUploaded(result.urls);
      setDone(true);
      setOpen(false);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg === "EMAIL_MISMATCH" ? tm.addPhotosError : msg || tm.addPhotosError);
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm text-foreground hover:border-accent/60 hover:bg-accent/5 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {tm.addPhotosBtn}
        </button>
        {done && <span className="text-xs text-accent">{tm.addPhotosDone}</span>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <p className="text-xs text-muted-foreground">{tm.addPhotosEmailPrompt}</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => email.trim() && inputRef.current?.click()}
          disabled={uploading || !email.trim()}
          className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          {uploading ? tm.addPhotosUploading : tm.addPhotosSelect}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          {tm.addPhotosCancel}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">{tm.addPhotosHint}</p>
    </div>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function GallerySection({ urls, name }: { urls: string[]; name: string }) {
  const { t } = useLang();
  return (
    <div>
      <p className="memorial-eyebrow mb-5">{t.memorial.photosSectionLabel}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {urls.map((url, i) => (
          <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-muted">
            <img
              src={url}
              alt={`${name} — photo ${i + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition duration-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Facts ────────────────────────────────────────────────────────────────────

function FactsSection({ m }: { m: Record<string, unknown> }) {
  const { t } = useLang();
  const tm = t.memorial;
  const isPet = m.subject_type === "pet";
  const facts: { label: string; value: string }[] = [];

  if (m.hometown) facts.push({ label: tm.factsFrom, value: m.hometown as string });
  if (m.occupation && !isPet) facts.push({ label: tm.factsDid, value: m.occupation as string });
  if (m.occupation && isPet) facts.push({ label: tm.factsKind, value: m.occupation as string });
  if (m.loves) facts.push({ label: tm.factsLoved, value: (m.loves as string).split(",").slice(0, 2).join(", ") });
  if (m.catchphrase) facts.push({ label: isPet ? tm.factsHabit : tm.factsAlwaysSaid, value: `"${m.catchphrase}"` });
  if (m.insider_detail) facts.push({ label: tm.factsEnergy, value: (m.insider_detail as string).split(" — ")[0] });

  if (facts.length === 0) return null;

  return (
    <div>
      <p className="memorial-eyebrow mb-5">{tm.factsSectionLabel}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {facts.map((f) => (
          <div key={f.label} className="rounded-2xl border border-border/70 bg-card/50 backdrop-blur-sm p-5">
            <div className="memorial-eyebrow mb-1.5">{f.label}</div>
            <div className="text-sm text-foreground font-serif leading-snug">{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Links & Legacy ───────────────────────────────────────────────────────────

const LEGACY_EMOJI: Record<string, string> = {
  Instagram: "📸",
  Facebook: "📘",
  YouTube: "▶️",
  TikTok: "🎵",
  Website: "🌐",
  "Book / Published Work": "📖",
  "Film or TV": "🎬",
  Music: "🎶",
  "News Article": "📰",
  "Memorial post": "🕯️",
  "Sitio web": "🌐",
  "Libro / Publicación": "📖",
  "Cine o TV": "🎬",
  "Artículo de prensa": "📰",
  "Publicación memorial": "🕯️",
  Other: "🔗",
  Otro: "🔗",
};

function LinksSection({ links }: { links: Array<{ url: string; label?: string }> }) {
  const { t } = useLang();
  return (
    <div>
      <p className="memorial-eyebrow mb-5">{t.memorial.linksSectionLabel}</p>
      <div className="space-y-3">
        {links.map((link, i) => {
          const label = link.label || "Link";
          const emoji = LEGACY_EMOJI[label] ?? "🔗";
          let hostname = "";
          try { hostname = new URL(link.url).hostname.replace("www.", ""); } catch {}
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card/50 p-4 hover:border-accent/50 hover:shadow-warm transition group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-xl">
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="memorial-eyebrow mb-0.5">{label}</div>
                <div className="text-sm text-muted-foreground truncate font-serif">{hostname || link.url}</div>
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition text-lg flex-shrink-0">↗</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Music ────────────────────────────────────────────────────────────────────

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const p = new URL(url);
    const id = p.hostname.includes("youtu.be") ? p.pathname.slice(1) : p.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch { return null; }
}

function getSpotifyEmbedUrl(url: string): string | null {
  try {
    const p = new URL(url);
    if (!p.hostname.includes("spotify.com")) return null;
    return `https://open.spotify.com/embed${p.pathname}`;
  } catch { return null; }
}

function MusicSection({ links }: { links: Array<{ url: string; title?: string }> }) {
  const { t } = useLang();
  return (
    <div>
      <p className="memorial-eyebrow mb-5">{t.memorial.musicSectionLabel}</p>
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
            if (embedUrl) return (
              <div key={i} className="rounded-2xl overflow-hidden border border-border/70">
                {link.title && <div className="px-4 py-2 text-xs text-muted-foreground bg-card/70 border-b border-border/50 font-serif italic">{link.title}</div>}
                <iframe src={embedUrl} title={link.title || `Song ${i + 1}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full aspect-video" />
              </div>
            );
          }

          if (platform === "spotify") {
            const embedUrl = getSpotifyEmbedUrl(link.url);
            if (embedUrl) return (
              <div key={i} className="rounded-2xl overflow-hidden border border-border/70">
                {link.title && <div className="px-4 py-2 text-xs text-muted-foreground bg-card/70 border-b border-border/50 font-serif italic">{link.title}</div>}
                <iframe src={embedUrl} title={link.title || `Song ${i + 1}`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="w-full" height="152" />
              </div>
            );
          }

          const platformLabel: Record<string, string> = { "apple-music": "Apple Music", soundcloud: "SoundCloud", other: "Listen" };
          return (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card/50 p-4 hover:border-accent/50 transition group">
              <div className="flex-1 min-w-0">
                <div className="memorial-eyebrow mb-1">{platformLabel[platform] ?? "Listen"}</div>
                <div className="text-sm text-foreground truncate font-serif italic">{link.title || link.url}</div>
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition text-lg">↗</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leave a Memory ───────────────────────────────────────────────────────────

function LeaveMemorySection({
  memorialId,
  initialNotes,
  isPet,
}: {
  memorialId: string;
  initialNotes: MemorialNote[];
  isPet: boolean;
}) {
  const { t } = useLang();
  const tm = t.memorial;
  const [notes, setNotes] = useState<MemorialNote[]>(initialNotes);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;
    setSubmitting(true);
    setNoteError(null);
    try {
      const note = await addNote({ data: { memorialId, author_name: name, note_text: text } });
      setNotes((prev) => [...prev, note]);
      setName("");
      setText("");
      setSubmitted(true);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <p className="memorial-eyebrow">{tm.leaveMemoryTitle}</p>
        <span className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
      </div>

      {submitted ? (
        <div className="text-center py-4">
          <p className="font-serif italic text-foreground/70 text-lg">{tm.leaveThanks}</p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-4 text-xs tracking-widest uppercase text-accent hover:text-foreground transition"
          >
            {tm.leaveAnother}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tm.leaveNamePlaceholder}
            maxLength={100}
            className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition text-sm"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isPet ? tm.leavePetTextPlaceholder : tm.leaveTextPlaceholder}
            maxLength={500}
            rows={4}
            className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition text-sm font-serif leading-relaxed resize-none"
          />
          {noteError && <p className="text-xs text-destructive">{tm.leaveError}</p>}
          <button
            type="submit"
            disabled={submitting || !name.trim() || !text.trim()}
            className="rounded-full border-2 border-accent bg-accent/10 text-foreground px-6 py-2.5 text-sm font-medium hover:bg-accent/20 disabled:opacity-40 transition"
          >
            {submitting ? tm.leaveSending : tm.leaveSubmit}
          </button>
        </form>
      )}

      {notes.length > 0 && (
        <div className="mt-10 space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <p className="font-serif italic text-foreground/80 leading-relaxed">"{note.note_text}"</p>
              <p className="text-xs text-muted-foreground mt-3 tracking-wide">— {note.author_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QR / Share ───────────────────────────────────────────────────────────────

function QRSection({
  m,
  display,
  years,
  memorialUrl,
}: {
  m: { qr_png_url: string | null; memorial_id: string; full_name: string; memorial_mode: string | null };
  display: string;
  years: string;
  memorialUrl: string;
}) {
  const { t } = useLang();
  const tm = t.memorial;
  const isStory = (m.memorial_mode ?? "memorial") === "story";
  const isAlbum = m.memorial_mode === "album";
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title: `${display} — Forever Here`,
      text: isAlbum ? `${display} · Forever Here` : isStory ? `Their story — ${display} · Forever Here` : `In loving memory of ${display} · Forever Here`,
      url: memorialUrl,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(memorialUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // clipboard also unavailable — nothing to do
    }
  }

  function handlePrint() {
    const yearsHtml = years ? `<p class="years">${years}</p>` : "";
    const qrHtml = m.qr_png_url ? `<img class="qr" src="${m.qr_png_url}" alt="QR Code" />` : "";
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>QR Card — ${display}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:ital@0;1&display=swap" rel="stylesheet" />
  <style>
    @page { size: 4in 6in; margin: 0.4in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Lora', Georgia, serif;
      background: #fff;
      color: #1a1a1a;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 32px 24px;
      gap: 0;
    }
    .eyebrow {
      font-family: 'Lora', sans-serif;
      font-size: 9px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #b8860b;
      margin-bottom: 14px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 6px;
    }
    .years {
      font-style: italic;
      font-size: 13px;
      color: #777;
      margin-bottom: 20px;
    }
    .divider {
      width: 48px;
      height: 1px;
      background: #d4af70;
      margin: 0 auto 20px;
    }
    .qr {
      width: 180px;
      height: 180px;
      display: block;
      margin: 0 auto 16px;
    }
    .url {
      font-size: 9px;
      color: #aaa;
      letter-spacing: 0.04em;
      margin-top: 12px;
    }
    @media print {
      body { padding: 0; min-height: unset; }
    }
  </style>
</head>
<body>
  <p class="eyebrow">${tm.printEyebrow}</p>
  <h1>${display}</h1>
  ${yearsHtml}
  <div class="divider"></div>
  ${qrHtml}
  <p class="url">${memorialUrl}</p>
  <script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 300); });<\/script>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  return (
    <div className="keepsake-card text-center">
      <p className="memorial-eyebrow mb-5">{isAlbum ? tm.shareAlbumTitle : isStory ? tm.shareStoryTitle : tm.shareTitle}</p>

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
        {tm.shareScanLabel}
      </p>

      <div className="mt-5 text-[11px] text-muted-foreground/60 border-t border-border/60 pt-4 tracking-wide break-all">
        {memorialUrl}
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex gap-3 justify-center">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 rounded-full border-2 border-accent bg-accent/10 text-foreground px-5 py-2.5 text-sm font-medium hover:bg-accent/20 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          {copied ? tm.shareCopied : tm.shareBtn}
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-full border-2 border-border bg-card text-muted-foreground px-5 py-2.5 text-sm font-medium hover:border-accent/50 hover:text-foreground transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          {tm.printBtn}
        </button>
      </div>
    </div>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────

function EditableNarrative({
  memorialId,
  initialText,
  lang,
  paragraphs: initialParagraphs,
}: {
  memorialId: string;
  initialText: string;
  lang: "en" | "es";
  paragraphs: string[];
}) {
  const { t } = useLang();
  const tm = t.memorial;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateNarrative({ data: { memorialId, lang, text, email } });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg === "EMAIL_MISMATCH" ? tm.editError : msg || tm.editError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {editing ? (
        <div className="space-y-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[320px] rounded-xl border border-border bg-card px-5 py-4 font-serif text-base leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition resize-y"
            autoFocus
          />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{tm.editEmailPrompt}</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !email.trim()}
              className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? tm.editSaving : tm.editSave}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setText(initialText); setError(null); }}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              {tm.editCancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {paragraphs.map((p, i) => (
            <FadeUp key={i} delay={i * 80}>
              <p className={`font-serif text-lg md:text-xl leading-[1.85] text-foreground/90 ${i === 0 ? "first-paragraph" : ""}`}>
                {p}
              </p>
            </FadeUp>
          ))}
          <div className="pt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-4 py-1.5 transition"
            >
              {tm.editStory}
            </button>
            {saved && <span className="text-xs text-accent">{tm.editSaved}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function GeneratingState() {
  const { t } = useLang();
  const tm = t.memorial;
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center gap-3 text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="font-serif italic text-lg">{tm.generatingTitle}</span>
      </div>
      <p className="mt-5 text-sm text-muted-foreground max-w-sm mx-auto font-serif">
        {tm.generatingBody}
      </p>
    </div>
  );
}

function ErrorState() {
  const { t } = useLang();
  const tm = t.memorial;
  return (
    <div className="text-center py-16">
      <p className="font-serif italic text-lg text-muted-foreground">
        {tm.errorTitle}
      </p>
      <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
        {tm.errorBody}
      </p>
    </div>
  );
}

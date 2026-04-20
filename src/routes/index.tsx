import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLang } from "@/lib/language-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forever Here — A QR memorial for someone you love" },
      {
        name: "description",
        content:
          "A short form. A first-person story written in their voice. A QR code for the shrine, frame, or headstone. Forever Here keeps memory close.",
      },
      { property: "og:title", content: "Forever Here — A QR memorial for someone you love" },
      {
        property: "og:description",
        content: "A short form. A QR code. Their story, in their own voice.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <Examples />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  const { t } = useLang();
  const th = t.home;
  return (
    <section className="relative bg-candlelight overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] rounded-full bg-accent/8 blur-3xl" />
      </div>
      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-1.5 text-xs tracking-wide uppercase text-muted-foreground mb-8 max-w-[90vw]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {th.badge}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.05 }}
              className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight"
            >
              {th.heroTitle1}{" "}{th.heroTitle2}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15 }}
              className="mt-7 text-lg md:text-xl text-muted-foreground font-serif leading-relaxed max-w-lg"
            >
              {th.heroSub}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              className="mt-10 flex items-center gap-4"
            >
              <Link
                to="/create"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-3.5 text-sm font-medium shadow-warm hover:opacity-90 transition"
              >
                {th.heroCta}
                <span aria-hidden>→</span>
              </Link>
              <a
                href="#how"
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                {th.heroSeeHow}
              </a>
            </motion.div>
          </div>

          {/* Right — memorial card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.35 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-sm rounded-2xl bg-foreground text-background shadow-warm overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-7 pt-7 pb-5">
                <span className="text-accent text-[10px] tracking-[0.35em] uppercase font-medium">
                  Forever Here
                </span>
                <span className="text-[10px] tracking-widest uppercase text-background/40">
                  ✦ In Loving Memory
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-background/10 mx-7" />

              {/* Data rows */}
              <div className="px-7 pt-5 pb-3 space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[9px] tracking-[0.25em] uppercase text-background/40 shrink-0">Name</span>
                  <span className="font-display text-lg leading-tight text-right">
                    Marco "Marquito" Tamarín
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] tracking-[0.25em] uppercase text-background/40">Born</span>
                  <span className="text-sm text-background/80">2001</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] tracking-[0.25em] uppercase text-background/40">Passed</span>
                  <span className="text-sm text-background/80">2024</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-background/10 mx-7 mt-2" />

              {/* QR */}
              <div className="flex flex-col items-center px-7 py-7">
                <img
                  src="/marquito-qr.png"
                  alt="QR code — scan to read Marco Tamarín's memorial"
                  className="w-40 h-40 rounded-xl"
                />
                <span className="mt-4 text-[9px] tracking-[0.25em] uppercase text-background/40">
                  {th.heroScanLabel}
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useLang();
  const th = t.home;

  const steps = [
    { n: "01", title: th.step01Title, body: th.step01Body },
    { n: "02", title: th.step02Title, body: th.step02Body },
    { n: "03", title: th.step03Title, body: th.step03Body },
  ];

  return (
    <section id="how" className="bg-candlelight border-y border-border/40">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">

        {/* — Narrative intro + photo — */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 md:mb-28">

          {/* Text */}
          <div>
            <div className="text-xs tracking-[0.3em] uppercase text-accent mb-4">{th.howEyebrow}</div>
            <h2 className="font-display text-4xl md:text-5xl leading-tight text-accent italic">
              {th.howTitle1}<br />
              {th.howTitle2}
            </h2>

            <div className="mt-8 space-y-5 font-serif text-lg text-foreground/80 leading-relaxed max-w-lg">
              <p>{th.howP1}</p>
              <p>{th.howP2}</p>
              <p className="text-foreground font-medium not-italic">{th.howP3}</p>
              <p>{th.howP4}</p>
            </div>

            {/* Placement chips */}
            <div className="mt-8 flex flex-wrap gap-2">
              {th.placements.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground tracking-wide"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Photo — ash vase with QR */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-warm border border-border/50">
              <img
                src="/marquito-vase.png"
                alt="QR code placed on an ash vase memorial"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground font-serif italic">
              {th.howCaption}
            </p>
          </div>
        </div>

        {/* — Three steps — */}
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border bg-card/70 p-8 hover:shadow-warm transition-shadow"
            >
              <div className="font-display text-accent text-3xl">{s.n}</div>
              <h3 className="mt-4 font-display text-xl">{s.title}</h3>
              <p className="mt-3 text-muted-foreground font-serif leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

function Examples() {
  const { t } = useLang();
  const th = t.home;

  const examples = [
    {
      name: "Rosa Méndez",
      nick: "Abuelita",
      years: "1968 — 2023",
      quote: "Échale ganas, mija. Always.",
      img: "/examples/rosa.jpeg",
    },
    {
      name: "Luna",
      nick: "the cat",
      years: "2010 — 2024",
      quote: "Window sills. Tuna. Sunbeams.",
      img: "/examples/luna.jpeg",
    },
    {
      name: "Marco Tamarín",
      nick: "Marquito",
      years: "2001 — 2024",
      quote: "Ya merito — almost there.",
      img: "/examples/marco.jpeg",
    },
  ];
  return (
    <section className="bg-muted/40 border-y border-border/50">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs tracking-[0.3em] uppercase text-accent mb-3">{th.examplesEyebrow}</div>
          <h2 className="font-display text-4xl md:text-5xl">{th.examplesTitle}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {examples.map((e) => (
            <div
              key={e.name}
              className="rounded-2xl bg-card border border-border p-8 hover:-translate-y-1 transition-transform"
            >
              <div className="aspect-[4/5] rounded-xl overflow-hidden mb-6 portrait-vignette">
                <img
                  src={e.img}
                  alt={e.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="font-display text-2xl">{e.name}</div>
              <div className="text-sm text-muted-foreground italic">"{e.nick}"</div>
              <div className="text-xs text-muted-foreground mt-1">{e.years}</div>
              <p className="mt-4 font-serif italic text-foreground/80">"{e.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { t } = useLang();
  const th = t.home;
  return (
    <section className="max-w-3xl mx-auto px-6 py-24 md:py-32 text-center">
      <h2 className="font-display text-4xl md:text-5xl leading-tight text-accent italic">
        {th.ctaTitle1}{" "}{th.ctaTitle2}
      </h2>
      <p className="mt-6 text-muted-foreground font-serif text-lg">
        {th.ctaSub}
      </p>
      <Link
        to="/create"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-8 py-4 text-sm font-medium shadow-warm hover:opacity-90 transition"
      >
        {th.ctaBtn}
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

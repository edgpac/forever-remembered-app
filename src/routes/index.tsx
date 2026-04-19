import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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
  return (
    <section className="relative bg-candlelight overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-28 md:pt-28 md:pb-36 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-1.5 text-xs tracking-widest uppercase text-muted-foreground mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          A QR memorial for the people & pets we love
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.05 }}
          className="font-display text-5xl md:text-7xl leading-[1.05] tracking-tight"
        >
          Their story,{" "}
          <span className="italic text-accent">in their own voice.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-serif leading-relaxed"
        >
          Fill out a short form. We turn the details into a first-person memorial — and a QR
          code you can place on a shrine, a photo frame, an urn, or a headstone.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-3.5 text-sm font-medium shadow-warm hover:opacity-90 transition"
          >
            Begin a memorial
            <span aria-hidden>→</span>
          </Link>
          <a
            href="#how"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            See how it works
          </a>
        </motion.div>

        {/* Symbolic QR + portrait */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.45 }}
          className="mt-20 mx-auto max-w-md"
        >
          <div className="relative rounded-2xl border border-border bg-card shadow-warm p-6 md:p-8">
            <div className="text-[10px] tracking-[0.3em] text-accent uppercase mb-2">
              Forever Here
            </div>
            <div className="font-display text-2xl">Marco "Marquito" Tamarín</div>
            <div className="text-xs text-muted-foreground mt-1">2001 — 2024</div>
            <div className="mt-6 flex items-center justify-center">
              <div className="w-32 h-32 rounded-lg bg-foreground p-3">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, var(--cream) 30%, transparent 30%)",
                    backgroundSize: "12% 12%",
                    backgroundColor: "transparent",
                  }}
                />
              </div>
            </div>
            <div className="mt-4 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Scan to hear his story
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Tell us about them",
      body: "A 5-step form. Their name, their world, the things only you remember.",
    },
    {
      n: "02",
      title: "We write their story",
      body: "Our AI weaves your details into a warm, first-person narrative — in their voice.",
    },
    {
      n: "03",
      title: "Get a QR card",
      body: "A printable card arrives in your email. Place it anywhere. Anyone who scans it meets them.",
    },
  ];
  return (
    <section id="how" className="max-w-6xl mx-auto px-6 py-24 md:py-32">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="text-xs tracking-[0.3em] uppercase text-accent mb-3">How it works</div>
        <h2 className="font-display text-4xl md:text-5xl">Three quiet steps.</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-2xl border border-border bg-card p-8 hover:shadow-warm transition-shadow"
          >
            <div className="font-display text-accent text-3xl">{s.n}</div>
            <h3 className="mt-4 font-display text-xl">{s.title}</h3>
            <p className="mt-3 text-muted-foreground font-serif leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Examples() {
  const examples = [
    {
      name: "Rosa Méndez",
      nick: "Abuelita",
      years: "1938 — 2023",
      quote: "Échale ganas, mija. Always.",
    },
    {
      name: "Luna",
      nick: "the cat",
      years: "2010 — 2024",
      quote: "Window sills. Tuna. Sunbeams.",
    },
    {
      name: "Marco Tamarín",
      nick: "Marquito",
      years: "2001 — 2024",
      quote: "Ya merito — almost there.",
    },
  ];
  return (
    <section className="bg-muted/40 border-y border-border/50">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs tracking-[0.3em] uppercase text-accent mb-3">Examples</div>
          <h2 className="font-display text-4xl md:text-5xl">Lives, remembered.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {examples.map((e) => (
            <div
              key={e.name}
              className="rounded-2xl bg-card border border-border p-8 hover:-translate-y-1 transition-transform"
            >
              <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-muted to-secondary mb-6 portrait-vignette" />
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
  return (
    <section className="max-w-3xl mx-auto px-6 py-24 md:py-32 text-center">
      <h2 className="font-display text-4xl md:text-5xl leading-tight">
        Someone you loved deserves to be{" "}
        <span className="italic text-accent">heard again.</span>
      </h2>
      <p className="mt-6 text-muted-foreground font-serif text-lg">
        It takes about ten minutes. The QR card arrives in your inbox.
      </p>
      <Link
        to="/create"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-8 py-4 text-sm font-medium shadow-warm hover:opacity-90 transition"
      >
        Begin a memorial
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

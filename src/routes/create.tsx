import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  type MemorialFormData,
} from "@/lib/memorial-schemas";
import { generateMemorialId } from "@/lib/memorial";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { PortraitUpload } from "@/components/PortraitUpload";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a memorial — Forever Here" },
      {
        name: "description",
        content:
          "A short, gentle form. We'll write their story in their voice and send you a printable QR card.",
      },
    ],
  }),
  component: CreateMemorial,
});

const STEPS = [
  { n: 1, label: "Who" },
  { n: 2, label: "Their world" },
  { n: 3, label: "Memories" },
  { n: 4, label: "You" },
  { n: 5, label: "Confirm" },
];

const STEP_SCHEMAS = [step1Schema, step2Schema, step3Schema, step4Schema, step5Schema];

function CreateMemorial() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<MemorialFormData>({
    mode: "onTouched",
    defaultValues: {
      subject_type: "person",
      full_name: "",
      nickname: "",
      birth_date: "",
      passing_date: "",
      portrait_url: "",
      hometown: "",
      location: "",
      occupation: "",
      spoken_languages: "",
      personality_words: "",
      loves: "",
      strongest_memory: "",
      insider_detail: "",
      catchphrase: "",
      music_links: [],
      creator_relationship: "",
      miss_most: "",
      want_people_to_know: "",
      named_people: "",
      language: "en",
      theme: "classic",
      creator_email: "",
      confirm_passed: false as unknown as true,
      confirm_public: false as unknown as true,
    },
  });

  async function next() {
    const schema = STEP_SCHEMAS[step - 1];
    const values = form.getValues();
    const result = schema.safeParse(values);
    if (!result.success) {
      // Set field-level errors
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof MemorialFormData;
        form.setError(path, { type: "manual", message: issue.message });
      });
      return;
    }
    if (step < 5) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      await submit();
    }
  }

  function back() {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function submit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const v = form.getValues();
      const memorialId = generateMemorialId();
      const { error } = await supabase.from("memorials").insert({
        memorial_id: memorialId,
        status: "generating",
        subject_type: v.subject_type,
        full_name: v.full_name,
        nickname: v.nickname || null,
        birth_date: v.birth_date || null,
        passing_date: v.passing_date || null,
        hometown: v.hometown || null,
        location: v.location || null,
        occupation: v.occupation || null,
        personality_words: v.personality_words || null,
        loves: v.loves || null,
        strongest_memory: v.strongest_memory || null,
        insider_detail: v.insider_detail || null,
        catchphrase: v.catchphrase || null,
        music_links: v.music_links && v.music_links.length > 0 ? v.music_links : null,
        named_people: v.named_people || null,
        creator_relationship: v.creator_relationship || null,
        miss_most: v.miss_most || null,
        want_people_to_know: v.want_people_to_know || null,
        language: v.language,
        theme: v.theme,
        portrait_url: v.portrait_url || null,
        creator_email: v.creator_email,
      });
      if (error) throw error;
      // Fire-and-forget the AI + QR pipeline. The memorial page polls until status=active.
      void fetch("/api/process-memorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memorialId }),
      }).catch((err) => console.error("process trigger failed", err));
      void navigate({ to: "/remember/$memorialId", params: { memorialId } });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-candlelight">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12">
        <Progress step={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-10"
          >
            {step === 1 && <Step1 form={form} />}
            {step === 2 && <Step2 form={form} />}
            {step === 3 && <Step3 form={form} />}
            {step === 4 && <Step4 form={form} />}
            {step === 5 && <Step5 form={form} />}
          </motion.div>
        </AnimatePresence>

        {submitError && (
          <p className="mt-6 text-sm text-destructive text-center">{submitError}</p>
        )}

        <div className="mt-12 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 1 || submitting}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-3 text-sm font-medium shadow-warm hover:opacity-90 disabled:opacity-60 transition"
          >
            {submitting ? "Creating memorial…" : step === 5 ? "Generate memorial" : "Continue"}
            {!submitting && <span aria-hidden>→</span>}
          </button>
        </div>
      </main>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s) => (
        <div key={s.n} className="flex-1">
          <div
            className={`h-1 rounded-full transition-colors ${
              s.n <= step ? "bg-accent" : "bg-border"
            }`}
          />
          <div
            className={`mt-2 text-[10px] tracking-widest uppercase ${
              s.n === step ? "text-accent" : "text-muted-foreground"
            }`}
          >
            {s.n.toString().padStart(2, "0")} · {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function StepHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-10">
      <div className="text-xs tracking-[0.3em] uppercase text-accent mb-3">{eyebrow}</div>
      <h1 className="font-display text-4xl md:text-5xl leading-tight">{title}</h1>
      {sub && <p className="mt-3 text-muted-foreground font-serif">{sub}</p>}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>}
      <div className="mt-2">{children}</div>
      {error && <span className="block text-xs text-destructive mt-1.5">{error}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition";

const textareaCls = inputCls + " min-h-[120px] resize-y font-serif leading-relaxed";

type FormProp = { form: UseFormReturn<MemorialFormData> };

function Step1({ form }: FormProp) {
  const { register, watch, setValue, formState: { errors } } = form;
  const subject = watch("subject_type");
  const portrait = watch("portrait_url");
  return (
    <div className="space-y-7">
      <StepHeader
        eyebrow="Step 01"
        title="Who are we remembering?"
        sub="Begin with the simple things — name, dates, a portrait."
      />

      <div className="grid grid-cols-2 gap-3">
        {(["person", "pet"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setValue("subject_type", t, { shouldValidate: true })}
            className={`rounded-xl border-2 px-5 py-4 text-left transition ${
              subject === t
                ? "border-accent bg-accent/10"
                : "border-border bg-card hover:border-accent/40"
            }`}
          >
            <div className="font-display text-xl capitalize">{t}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t === "person" ? "A loved one" : "A beloved companion"}
            </div>
          </button>
        ))}
      </div>

      <PortraitUpload value={portrait} onChange={(url) => setValue("portrait_url", url)} />

      <Field label="Full name" error={errors.full_name?.message}>
        <input type="text" {...register("full_name")} className={inputCls} placeholder="Marco Tamarín" />
      </Field>

      <Field label="Nickname" hint="What everyone called them" error={errors.nickname?.message}>
        <input type="text" {...register("nickname")} className={inputCls} placeholder="Marquito" />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date of birth" error={errors.birth_date?.message}>
          <input type="date" {...register("birth_date")} className={inputCls} />
        </Field>
        <Field label="Date of passing" error={errors.passing_date?.message}>
          <input type="date" {...register("passing_date")} className={inputCls} />
        </Field>
      </div>
    </div>
  );
}

function Step2({ form }: FormProp) {
  const { register, formState: { errors } } = form;
  return (
    <div className="space-y-6">
      <StepHeader
        eyebrow="Step 02"
        title="Their world."
        sub="Where they came from, where they spent their days."
      />
      <Field label="Where were they from?" hint="Hometown or where they grew up" error={errors.hometown?.message}>
        <input type="text" {...register("hometown")} className={inputCls} placeholder="Tijuana, Mexico" />
      </Field>
      <Field label="Where did they spend most of their life?" error={errors.location?.message}>
        <input type="text" {...register("location")} className={inputCls} placeholder="San Diego, California" />
      </Field>
      <Field
        label="What did they do?"
        hint="Job, school, career — for pets, breed and rescue story"
        error={errors.occupation?.message}
      >
        <textarea {...register("occupation")} className={textareaCls} placeholder="Engineering student, helped his father at the family shop on weekends." />
      </Field>
      <Field label="Languages they spoke" error={errors.spoken_languages?.message}>
        <input type="text" {...register("spoken_languages")} className={inputCls} placeholder="Spanish, English" />
      </Field>
    </div>
  );
}

function detectPlatform(url: string): "youtube" | "spotify" | "apple-music" | "soundcloud" | "other" {
  try {
    const { hostname } = new URL(url);
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
    if (hostname.includes("spotify.com")) return "spotify";
    if (hostname.includes("music.apple.com")) return "apple-music";
    if (hostname.includes("soundcloud.com")) return "soundcloud";
  } catch {}
  return "other";
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  "apple-music": "Apple Music",
  soundcloud: "SoundCloud",
  other: "Link",
};

function Step3({ form }: FormProp) {
  const { register, control, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "music_links" });

  return (
    <div className="space-y-6">
      <StepHeader
        eyebrow="Step 03"
        title="Memories & personality."
        sub="The small, specific things — these become the heart of their story."
      />
      <Field
        label="Three words that describe their personality"
        error={errors.personality_words?.message}
      >
        <input type="text" {...register("personality_words")} className={inputCls} placeholder="Curious, stubborn, kind" />
      </Field>
      <Field label="What did they love most?" hint="Hobbies, food, places, music" error={errors.loves?.message}>
        <textarea {...register("loves")} className={textareaCls} placeholder="Soccer on Sundays, his abuela's mole, summer trips to Cabo." />
      </Field>
      <Field
        label="Your strongest memory with them"
        hint="2–3 sentences"
        error={errors.strongest_memory?.message}
      >
        <textarea {...register("strongest_memory")} className={textareaCls} placeholder="The night we drove to the coast and stayed up watching the lights on the water…" />
      </Field>
      <Field
        label="Something only people close to them would know"
        error={errors.insider_detail?.message}
      >
        <textarea {...register("insider_detail")} className={textareaCls} placeholder="He always saved the last bite of dessert for someone else." />
      </Field>
      <Field
        label="A phrase or saying they always used"
        error={errors.catchphrase?.message}
      >
        <input type="text" {...register("catchphrase")} className={inputCls} placeholder="Ya merito" />
      </Field>

      {/* Music links */}
      <div>
        <div className="text-sm font-medium text-foreground mb-0.5">Their favourite music</div>
        <div className="text-xs text-muted-foreground mb-3">
          Paste a YouTube, Spotify, Apple Music, or SoundCloud link — up to 5 songs or playlists.
        </div>

        <div className="space-y-3">
          {fields.map((field, i) => {
            const url = form.watch(`music_links.${i}.url`) ?? "";
            const platform = detectPlatform(url);
            return (
              <div key={field.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-widest uppercase text-accent">
                    {url ? PLATFORM_LABELS[platform] : `Song ${i + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs text-muted-foreground hover:text-destructive transition"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="url"
                  {...register(`music_links.${i}.url`)}
                  className={inputCls}
                  placeholder="https://open.spotify.com/track/…"
                />
                {errors.music_links?.[i]?.url && (
                  <span className="block text-xs text-destructive">
                    {errors.music_links[i]?.url?.message}
                  </span>
                )}
                <input
                  type="text"
                  {...register(`music_links.${i}.title`)}
                  className={inputCls}
                  placeholder="Song or playlist name (optional)"
                />
              </div>
            );
          })}
        </div>

        {fields.length < 5 && (
          <button
            type="button"
            onClick={() => append({ url: "", title: "" })}
            className="mt-3 w-full rounded-xl border-2 border-dashed border-border hover:border-accent/50 py-3 text-sm text-muted-foreground hover:text-foreground transition"
          >
            + Add a song or playlist
          </button>
        )}
      </div>
    </div>
  );
}

function Step4({ form }: FormProp) {
  const { register, formState: { errors } } = form;
  return (
    <div className="space-y-6">
      <StepHeader
        eyebrow="Step 04"
        title="Your relationship."
        sub="Tell us about you, and what you carry with you."
      />
      <Field
        label="Who are you to them?"
        hint="Spouse, child, sibling, friend, owner"
        error={errors.creator_relationship?.message}
      >
        <input type="text" {...register("creator_relationship")} className={inputCls} placeholder="His uncle" />
      </Field>
      <Field label="What do you miss most?" error={errors.miss_most?.message}>
        <textarea {...register("miss_most")} className={textareaCls} placeholder="The way he laughed at his own jokes before finishing them." />
      </Field>
      <Field
        label="What would they want people who scan this to know?"
        error={errors.want_people_to_know?.message}
      >
        <textarea {...register("want_people_to_know")} className={textareaCls} placeholder="That love is the only thing worth working hard for." />
      </Field>
      <Field
        label="Anyone else to mention by name in their story?"
        hint='e.g. "my wife Maria", "my dog Toby"'
        error={errors.named_people?.message}
      >
        <input type="text" {...register("named_people")} className={inputCls} placeholder="My mother Lucía, my best friend Diego" />
      </Field>
    </div>
  );
}

function Step5({ form }: FormProp) {
  const { register, watch, setValue, formState: { errors } } = form;
  const language = watch("language");
  const theme = watch("theme");
  return (
    <div className="space-y-7">
      <StepHeader
        eyebrow="Step 05"
        title="Confirm & generate."
        sub="A few last choices, then we'll begin."
      />

      <Field label="Memorial page language">
        <div className="grid grid-cols-3 gap-2">
          {(["en", "es", "both"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setValue("language", l)}
              className={`rounded-xl border-2 px-4 py-3 text-sm transition ${
                language === l
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/40"
              }`}
            >
              {l === "en" ? "English" : l === "es" ? "Spanish" : "Both"}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Theme">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: "classic", label: "Classic Cream", premium: false },
              { v: "slate", label: "Dark Slate", premium: false },
              { v: "garden", label: "Garden", premium: true },
              { v: "starry", label: "Starry Night", premium: true },
            ] as const
          ).map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setValue("theme", t.v)}
              className={`rounded-xl border-2 px-4 py-3 text-sm text-left transition ${
                theme === t.v
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/40"
              }`}
            >
              <div className="font-medium">{t.label}</div>
              {t.premium && (
                <div className="text-[10px] tracking-widest uppercase text-accent mt-0.5">
                  Premium
                </div>
              )}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Your email" hint="We'll send the QR card here" error={errors.creator_email?.message}>
        <input type="email" {...register("creator_email")} className={inputCls} placeholder="you@example.com" />
      </Field>

      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            {...register("confirm_passed")}
            className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
          />
          <span className="text-foreground">
            I confirm this memorial is for someone who has passed.
            {errors.confirm_passed?.message && (
              <span className="block text-xs text-destructive mt-1">{errors.confirm_passed.message}</span>
            )}
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            {...register("confirm_public")}
            className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
          />
          <span className="text-foreground">
            I understand this page is public and scannable by anyone with the QR code.
            {errors.confirm_public?.message && (
              <span className="block text-xs text-destructive mt-1">{errors.confirm_public.message}</span>
            )}
          </span>
        </label>
      </div>
    </div>
  );
}

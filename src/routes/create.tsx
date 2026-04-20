import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  step1Schema,
  step2Schema,
  step3Schema,
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
      { name: "description", content: "A short, gentle form. We'll write their story in their voice." },
    ],
  }),
  component: CreateMemorial,
});

const STEPS = [
  { n: 1, label: "Who" },
  { n: 2, label: "Their story" },
  { n: 3, label: "Finish" },
];
const STEP_SCHEMAS = [step1Schema, step2Schema, step3Schema];

// ─── MultiChoice ─────────────────────────────────────────────────────────────

function MultiChoice({
  options,
  value,
  onChange,
  placeholder = "Describe it…",
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isPreset = options.includes(value);
  const [otherMode, setOtherMode] = useState(!isPreset && value !== "");

  function selectPreset(opt: string) {
    setOtherMode(false);
    onChange(opt);
  }

  function activateOther() {
    setOtherMode(true);
    if (isPreset) onChange("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => selectPreset(opt)}
            className={`rounded-full px-4 py-2 text-sm border-2 transition-all duration-150 ${
              value === opt && !otherMode
                ? "border-accent bg-accent/15 text-foreground font-medium shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
        <button
          type="button"
          onClick={activateOther}
          className={`rounded-full px-4 py-2 text-sm border-2 transition-all duration-150 ${
            otherMode
              ? "border-accent bg-accent/15 text-foreground font-medium shadow-sm"
              : "border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground"
          }`}
        >
          Other — I'll describe it
        </button>
      </div>
      {otherMode && (
        <motion.input
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          type="text"
          value={otherMode ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          placeholder={placeholder}
          autoFocus
        />
      )}
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function LivePreview({ form }: { form: UseFormReturn<MemorialFormData> }) {
  const v = form.watch();
  const isPet = v.subject_type === "pet";
  const display = v.full_name
    ? v.nickname
      ? `${v.full_name} "${v.nickname}"`
      : v.full_name
    : null;
  const years = [v.birth_date?.split("-")[0], v.passing_date?.split("-")[0]]
    .filter(Boolean)
    .join(" — ");
  const personalityChips = v.personality_words
    ? v.personality_words.split(/[,·\-]/).map((s) => s.trim()).filter(Boolean)
    : [];
  const lovesChips = v.loves
    ? v.loves.split(/[,·\-]/).map((s) => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <div className="hidden lg:block">
      <div className="sticky top-8">
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Preview</div>
        <div className="rounded-2xl border border-border bg-card shadow-warm overflow-hidden">
          {/* Portrait */}
          <div className="bg-candlelight px-8 pt-8 pb-6 text-center">
            {v.portrait_url ? (
              <div className="mx-auto w-28 h-28 rounded-full overflow-hidden portrait-vignette shadow-warm">
                <img src={v.portrait_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="mx-auto w-28 h-28 rounded-full bg-muted/60 border-2 border-dashed border-border flex items-center justify-center">
                <span className="text-2xl text-muted-foreground/40">{isPet ? "🐾" : "✦"}</span>
              </div>
            )}
            <div className="mt-5">
              <div className="text-[9px] tracking-[0.35em] uppercase text-accent">
                {isPet ? "Forever in our hearts" : "In loving memory"}
              </div>
              {display ? (
                <div className="mt-1 font-display text-xl leading-tight">
                  {isPet && <span className="mr-1 text-base">🐾</span>}
                  {display}
                </div>
              ) : (
                <div className="mt-1 h-6 w-40 mx-auto rounded bg-muted/60 animate-pulse" />
              )}
              {years ? (
                <div className="mt-1 text-xs text-muted-foreground font-serif">{years}</div>
              ) : (
                <div className="mt-1 h-4 w-24 mx-auto rounded bg-muted/40" />
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="px-6 py-5 space-y-3 border-t border-border">
            {personalityChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {personalityChips.map((c) => (
                  <span key={c} className="rounded-full bg-accent/10 text-accent text-[10px] px-2.5 py-0.5 font-medium">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {v.aura && (
              <div className="space-y-0.5">
                <div className="text-[9px] tracking-widest uppercase text-muted-foreground">Their energy</div>
                <div className="text-xs text-foreground font-serif italic">"{v.aura.split(" — ")[0]}"</div>
              </div>
            )}
            {lovesChips.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[9px] tracking-widest uppercase text-muted-foreground">Loved</div>
                <div className="text-xs text-foreground font-serif">{lovesChips.join(" · ")}</div>
              </div>
            )}
            {v.catchphrase && (
              <div className="text-xs text-foreground/70 font-serif italic border-t border-border pt-3">
                "{v.catchphrase}"
              </div>
            )}
            {!display && !personalityChips.length && (
              <p className="text-[11px] text-muted-foreground text-center py-2 font-serif italic">
                Your memorial will take shape as you fill in the form.
              </p>
            )}
          </div>

          {/* Story placeholder */}
          <div className="px-6 pb-6 border-t border-border pt-4">
            <div className="text-[9px] tracking-widest uppercase text-muted-foreground mb-2">Their story</div>
            <div className="space-y-1.5">
              {[100, 85, 92, 70].map((w, i) => (
                <div
                  key={i}
                  className="h-2.5 rounded-full bg-muted/70 animate-pulse"
                  style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <div className="mt-3 text-[10px] text-muted-foreground text-center font-serif italic">
              Written in their voice after you submit.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function CreateMemorial() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<MemorialFormData>({
    mode: "onTouched",
    resolver: zodResolver(step1Schema.merge(step2Schema).merge(step3Schema) as never),
    defaultValues: {
      subject_type: "person",
      full_name: "",
      nickname: "",
      birth_date: "",
      passing_date: "",
      portrait_url: "",
      occupation: "",
      personality_words: "",
      aura: "",
      loves: "",
      catchphrase: "",
      strongest_memory: "",
      want_people_to_know: "",
      music_links: [],
      hometown: "",
      creator_relationship: "",
      miss_most: "",
      language: "en",
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
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof MemorialFormData;
        form.setError(path, { type: "manual", message: issue.message });
      });
      return;
    }
    if (step < 3) {
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
        occupation: v.occupation || null,
        personality_words: v.personality_words || null,
        aura: v.aura || null,
        loves: v.loves || null,
        strongest_memory: v.strongest_memory || null,
        catchphrase: v.catchphrase || null,
        want_people_to_know: v.want_people_to_know || null,
        creator_relationship: v.creator_relationship || null,
        miss_most: v.miss_most || null,
        language: v.language,
        theme: "classic",
        portrait_url: v.portrait_url || null,
        creator_email: v.creator_email,
        music_links: v.music_links && v.music_links.length > 0 ? v.music_links : null,
      });
      if (error) throw error;

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
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        <Progress step={step} />

        <div className="mt-10 grid lg:grid-cols-[1fr_360px] gap-12 items-start">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {step === 1 && <Step1 form={form} />}
                {step === 2 && <Step2 form={form} />}
                {step === 3 && <Step3 form={form} />}
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
                {submitting
                  ? "Creating memorial…"
                  : step === 3
                    ? "Generate memorial"
                    : "Continue"}
                {!submitting && <span aria-hidden>→</span>}
              </button>
            </div>
          </div>

          <LivePreview form={form} />
        </div>
      </main>
    </div>
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3">
      {STEPS.map((s) => (
        <div key={s.n} className="flex-1 flex items-center gap-2">
          <div className="flex-1">
            <div className={`h-1 rounded-full transition-all duration-500 ${s.n <= step ? "bg-accent" : "bg-border"}`} />
            <div className={`mt-1.5 text-[10px] tracking-widest uppercase ${s.n === step ? "text-accent" : "text-muted-foreground"}`}>
              {s.n.toString().padStart(2, "0")} · {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

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

// ─── Step 1: Who ──────────────────────────────────────────────────────────────

function Step1({ form }: FormProp) {
  const { register, watch, setValue, formState: { errors } } = form;
  const subject = watch("subject_type");
  const portrait = watch("portrait_url");

  return (
    <div className="space-y-7">
      <StepHeader eyebrow="Step 01" title="Who are we remembering?" sub="Start with the simple things." />

      <div className="grid grid-cols-2 gap-3">
        {(["person", "pet"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setValue("subject_type", t, { shouldValidate: true })}
            className={`rounded-xl border-2 px-5 py-4 text-left transition ${
              subject === t ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/40"
            }`}
          >
            <div className="font-display text-xl capitalize">
              {t === "pet" ? "🐾 " : ""}
              {t === "person" ? "Person" : "Pet"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t === "person" ? "A loved one" : "A beloved companion"}
            </div>
          </button>
        ))}
      </div>

      <PortraitUpload value={portrait} onChange={(url) => setValue("portrait_url", url)} />

      <Field label="Full name" error={errors.full_name?.message}>
        <input
          type="text"
          {...register("full_name")}
          className={inputCls}
          placeholder={subject === "pet" ? "Luna García" : "Marco Tamarín"}
        />
      </Field>

      <Field
        label={subject === "pet" ? "Nickname or call name" : "Nickname"}
        hint="What everyone called them"
      >
        <input
          type="text"
          {...register("nickname")}
          className={inputCls}
          placeholder={subject === "pet" ? "Lunita" : "Marquito"}
        />
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

// ─── Step 2: Their story (person) ─────────────────────────────────────────────

const PERSON_OCCUPATION_OPTIONS = [
  "Raised a family",
  "Ran a business",
  "Worked in healthcare",
  "Worked in education",
  "Artist or creative",
];
const PERSON_PERSONALITY_OPTIONS = [
  "Warm & nurturing",
  "Funny & outgoing",
  "Quiet & thoughtful",
  "Strong & determined",
];
const PERSON_AURA_OPTIONS = [
  "They lit up every room — magnetic and joyful",
  "A calming presence — everyone felt safe around them",
  "The quiet strength — steady, dependable, unshakeable",
  "Pure mischief — always laughing, always up to something",
  "A force of nature — passionate about everything they did",
];
const PERSON_LOVES_OPTIONS = [
  "Family & friends",
  "Music & arts",
  "Sports & outdoors",
  "Food & cooking",
  "Travel",
];

function PersonStep2({ form }: FormProp) {
  const { register, watch, setValue, control, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "music_links" });

  return (
    <div className="space-y-8">
      <StepHeader
        eyebrow="Step 02"
        title="Tell us their story."
        sub="Tap a choice or write your own — there are no wrong answers."
      />

      <Field label="What did they do for work or school?">
        <MultiChoice
          options={PERSON_OCCUPATION_OPTIONS}
          value={watch("occupation") ?? ""}
          onChange={(v) => setValue("occupation", v)}
          placeholder="e.g. engineering student, helped at the family shop…"
        />
      </Field>

      <Field label="How would you describe their personality?">
        <MultiChoice
          options={PERSON_PERSONALITY_OPTIONS}
          value={watch("personality_words") ?? ""}
          onChange={(v) => setValue("personality_words", v)}
          placeholder="e.g. fierce, loyal, full of life…"
        />
      </Field>

      <Field label="If you had to describe the energy they brought into a room, what was it?">
        <MultiChoice
          options={PERSON_AURA_OPTIONS}
          value={watch("aura") ?? ""}
          onChange={(v) => setValue("aura", v)}
          placeholder="Describe their energy in your own words…"
        />
      </Field>

      <Field label="What did they love most?">
        <MultiChoice
          options={PERSON_LOVES_OPTIONS}
          value={watch("loves") ?? ""}
          onChange={(v) => setValue("loves", v)}
          placeholder="e.g. long drives, cooking for everyone, quiet mornings…"
        />
      </Field>

      <Field label="A phrase or saying they always used" error={errors.catchphrase?.message}>
        <input
          type="text"
          {...register("catchphrase")}
          className={inputCls}
          placeholder="Ya merito"
        />
      </Field>

      <Field
        label="Your strongest memory with them"
        hint="2–3 sentences. This becomes the heart of their story."
        error={errors.strongest_memory?.message}
      >
        <textarea
          {...register("strongest_memory")}
          className={textareaCls}
          placeholder="The night we drove to the coast and stayed up watching the lights on the water…"
        />
      </Field>

      <Field
        label="What would they want people who scan this to know?"
        error={errors.want_people_to_know?.message}
      >
        <textarea
          {...register("want_people_to_know")}
          className={textareaCls}
          placeholder="That love is the only thing worth working hard for."
        />
      </Field>

      {/* Music */}
      <div>
        <div className="text-sm font-medium text-foreground mb-0.5">Their favourite music</div>
        <div className="text-xs text-muted-foreground mb-3">
          Paste a YouTube, Spotify, Apple Music, or SoundCloud link — up to 5.
        </div>
        <div className="space-y-3">
          {fields.map((field, i) => {
            const url = form.watch(`music_links.${i}.url`) ?? "";
            let platform = "Link";
            try {
              const { hostname } = new URL(url);
              if (hostname.includes("youtube") || hostname.includes("youtu.be")) platform = "YouTube";
              else if (hostname.includes("spotify")) platform = "Spotify";
              else if (hostname.includes("apple")) platform = "Apple Music";
              else if (hostname.includes("soundcloud")) platform = "SoundCloud";
            } catch {}
            return (
              <div key={field.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-widest uppercase text-accent">
                    {url ? platform : `Song ${i + 1}`}
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

// ─── Step 2: Their story (pet) ────────────────────────────────────────────────

const PET_ANIMAL_OPTIONS = ["Dog", "Cat", "Bird", "Rabbit"];
const PET_PERSONALITY_OPTIONS = [
  "Playful & energetic",
  "Calm & cuddly",
  "Stubborn & hilarious",
  "Gentle & sweet",
];
const PET_AURA_OPTIONS = [
  "Pure chaos and joy — never a dull moment",
  "A warm shadow — always by your side",
  "The boss — ran the whole house",
  "Gentle soul — soft, quiet, deeply comforting",
];
const PET_LOVES_OPTIONS = [
  "Cuddles",
  "Fetch & play",
  "Sunbathing",
  "Food",
  "Car rides",
];

function PetStep2({ form }: FormProp) {
  const { register, watch, setValue, formState: { errors } } = form;

  return (
    <div className="space-y-8">
      <StepHeader
        eyebrow="Step 02"
        title="Tell us about them."
        sub="Tap a choice or write your own — no wrong answers."
      />

      <Field label="What kind of animal were they?">
        <MultiChoice
          options={PET_ANIMAL_OPTIONS}
          value={watch("occupation") ?? ""}
          onChange={(v) => setValue("occupation", v)}
          placeholder="e.g. Hamster, Guinea pig, Turtle…"
        />
      </Field>

      <Field label="What was their personality like?">
        <MultiChoice
          options={PET_PERSONALITY_OPTIONS}
          value={watch("personality_words") ?? ""}
          onChange={(v) => setValue("personality_words", v)}
          placeholder="e.g. wildly dramatic, fiercely loyal…"
        />
      </Field>

      <Field label="What energy did they bring into your home?">
        <MultiChoice
          options={PET_AURA_OPTIONS}
          value={watch("aura") ?? ""}
          onChange={(v) => setValue("aura", v)}
          placeholder="Describe their vibe in your own words…"
        />
      </Field>

      <Field label="What did they love most?">
        <MultiChoice
          options={PET_LOVES_OPTIONS}
          value={watch("loves") ?? ""}
          onChange={(v) => setValue("loves", v)}
          placeholder="e.g. chasing pigeons, your socks, the window perch…"
        />
      </Field>

      <Field
        label="A funny or memorable habit only you would know"
        hint="The quirk that made them unmistakably themselves."
        error={errors.catchphrase?.message}
      >
        <input
          type="text"
          {...register("catchphrase")}
          className={inputCls}
          placeholder="Always stole the warm spot on the couch the second you got up"
        />
      </Field>

      <Field
        label="Your favorite moment together"
        hint="One specific, vivid memory."
        error={errors.strongest_memory?.message}
      >
        <textarea
          {...register("strongest_memory")}
          className={textareaCls}
          placeholder="The Sunday mornings she'd curl on my chest and we'd just breathe together…"
        />
      </Field>

      <Field
        label="What do you want people to know about them?"
        error={errors.want_people_to_know?.message}
      >
        <textarea
          {...register("want_people_to_know")}
          className={textareaCls}
          placeholder="That she chose us as much as we chose her."
        />
      </Field>
    </div>
  );
}

function Step2({ form }: FormProp) {
  const subject = form.watch("subject_type");
  return subject === "pet" ? <PetStep2 form={form} /> : <PersonStep2 form={form} />;
}

// ─── Step 3: Finish ───────────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS = [
  "Their child",
  "Their spouse / partner",
  "Their sibling",
  "Their friend",
  "Their parent",
];
const PET_RELATIONSHIP_OPTIONS = [
  "Their human",
  "Their family",
  "Their best friend",
  "Their caretaker",
];

function Step3({ form }: FormProp) {
  const { register, watch, setValue, formState: { errors } } = form;
  const language = watch("language");
  const isPet = watch("subject_type") === "pet";

  return (
    <div className="space-y-8">
      <StepHeader eyebrow="Step 03" title="You & final details." sub="Almost done." />

      <Field label={isPet ? "Who are you to them?" : "Who are you to them?"}>
        <MultiChoice
          options={isPet ? PET_RELATIONSHIP_OPTIONS : RELATIONSHIP_OPTIONS}
          value={watch("creator_relationship") ?? ""}
          onChange={(v) => setValue("creator_relationship", v)}
          placeholder={isPet ? "e.g. their forever person" : "e.g. their neighbour, their mentor…"}
        />
      </Field>

      <Field
        label={isPet ? "What do you miss most about them?" : "What do you miss most?"}
        error={errors.miss_most?.message}
      >
        <textarea
          {...register("miss_most")}
          className={textareaCls}
          placeholder={
            isPet
              ? "The sound of her paws on the floor when she heard me come home."
              : "The way he laughed at his own jokes before finishing them."
          }
        />
      </Field>

      <Field label="Memorial language">
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["en", "es", "both"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setValue("language", l)}
              className={`rounded-xl border-2 px-4 py-3 text-sm transition ${
                language === l ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/40"
              }`}
            >
              {l === "en" ? "English" : l === "es" ? "Spanish" : "Both"}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Your email"
        hint="We'll send the QR card here"
        error={errors.creator_email?.message}
      >
        <input
          type="email"
          {...register("creator_email")}
          className={inputCls}
          placeholder="you@example.com"
        />
      </Field>

      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            {...register("confirm_passed")}
            className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
          />
          <span className="text-foreground">
            I confirm this memorial is for someone who has passed.
            {errors.confirm_passed?.message && (
              <span className="block text-xs text-destructive mt-1">
                {errors.confirm_passed.message}
              </span>
            )}
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            {...register("confirm_public")}
            className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
          />
          <span className="text-foreground">
            I understand this page is public and scannable by anyone with the QR code.
            {errors.confirm_public?.message && (
              <span className="block text-xs text-destructive mt-1">
                {errors.confirm_public.message}
              </span>
            )}
          </span>
        </label>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/start-server-core";
import { useState, useEffect } from "react";
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
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkIpRateLimit } from "@/lib/rate-limit";
import { SiteHeader } from "@/components/SiteHeader";
import { PortraitUpload } from "@/components/PortraitUpload";
import { useLang } from "@/lib/language-context";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a memorial — Forever Here" },
      { name: "description", content: "A short, gentle form. We'll write their story in their voice." },
    ],
    links: [
      { rel: "canonical", href: "https://www.qrheadstone.com/create" },
    ],
  }),
  component: CreateMemorial,
});

const STEP_SCHEMAS = [step1Schema, step2Schema, step3Schema];

// ─── Server action: rate-limited insert ──────────────────────────────────────

type InsertPayload = {
  memorialId: string;
  mode: string;
  v: MemorialFormData;
};

const insertMemorial = createServerFn({ method: "POST" })
  .inputValidator((d: InsertPayload) => d)
  .handler(async ({ data }) => {
    const { v, memorialId, mode } = data;
    const ownerEmail = process.env.OWNER_EMAIL;
    const isOwner = ownerEmail && v.creator_email.trim().toLowerCase() === ownerEmail.trim().toLowerCase();

    if (!isOwner) {
      const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
      const { allowed } = await checkIpRateLimit(ip);
      if (!allowed) {
        throw new Error(
          "You've created several memorials recently — please wait an hour before creating more."
        );
      }
    }

    const { error } = await supabaseAdmin.from("memorials").insert({
      memorial_id: memorialId,
      status: "generating",
      memorial_mode: mode,
      subject_type: v.subject_type,
      full_name: v.full_name,
      nickname: v.nickname || null,
      birth_date: v.birth_date || null,
      passing_date: v.passing_date || null,
      hometown: v.hometown || null,
      occupation: v.occupation || null,
      personality_words: v.personality_words || null,
      insider_detail: v.aura || null,
      loves: v.loves || null,
      strongest_memory: v.strongest_memory || null,
      catchphrase: v.catchphrase || null,
      want_people_to_know: v.want_people_to_know || null,
      smell: v.smell || null,
      pet_sound: v.pet_sound || null,
      creator_relationship: v.creator_relationship || null,
      miss_most: v.miss_most || null,
      language: v.language,
      theme: "classic",
      portrait_url: v.portrait_url || null,
      creator_email: v.creator_email,
      music_links: v.music_links?.length ? v.music_links : null,
      legacy_links: v.legacy_links?.length ? v.legacy_links : null,
    });
    if (error) throw new Error(error.message);
    return { memorialId };
  });

// ─── MultiChoice ─────────────────────────────────────────────────────────────

function MultiChoice({
  options,
  value,
  onChange,
  placeholder = "Describe it…",
  otherLabel = "Other — I'll describe it",
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  otherLabel?: string;
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
          {otherLabel}
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

function LivePreview({ form, mode }: { form: UseFormReturn<MemorialFormData>; mode: MemorialMode }) {
  const { t } = useLang();
  const tp = t.create.preview;
  const v = form.watch();
  const isPet = v.subject_type === "pet";
  const isStory = mode === "story";
  const isAlbum = mode === "album";
  const eyebrow = isAlbum
    ? tp.eyebrowAlbum
    : isStory
      ? (isPet ? tp.eyebrowPetStory : tp.eyebrowStory)
      : (isPet ? tp.eyebrowPetMemorial : tp.eyebrowMemorial);
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
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">{tp.label}</div>
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
                {eyebrow}
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
                <div className="text-[9px] tracking-widest uppercase text-muted-foreground">{tp.theirEnergy}</div>
                <div className="text-xs text-foreground font-serif italic">"{v.aura.split(" — ")[0]}"</div>
              </div>
            )}
            {lovesChips.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[9px] tracking-widest uppercase text-muted-foreground">{tp.loved}</div>
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
                {isAlbum ? tp.placeholderAlbum : isStory ? tp.placeholderStory : tp.placeholderMemorial}
              </p>
            )}
          </div>

          {/* Story placeholder */}
          <div className="px-6 pb-6 border-t border-border pt-4">
            <div className="text-[9px] tracking-widest uppercase text-muted-foreground mb-2">
              {isAlbum ? tp.sectionAlbum : isStory ? tp.sectionStory : tp.sectionMemorial}
            </div>
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
              {tp.writtenAfter}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function ModeSelector({ onSelect }: { onSelect: (mode: MemorialMode) => void }) {
  const { t } = useLang();
  const ts = t.create.step0;
  const modes: { key: MemorialMode; label: string; sub: string }[] = [
    { key: "memorial", label: ts.memorialLabel, sub: ts.memorialSub },
    { key: "story", label: ts.storyLabel, sub: ts.storySub },
    { key: "album", label: ts.albumLabel, sub: ts.albumSub },
  ];
  return (
    <div className="min-h-screen flex flex-col bg-candlelight">
      <SiteHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-20 md:py-28 flex flex-col justify-center">
        <div className="mb-12">
          <div className="text-xs tracking-[0.3em] uppercase text-accent mb-3">{ts.eyebrow}</div>
          <h1 className="font-display text-4xl md:text-5xl leading-tight">{ts.title}</h1>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {modes.map(({ key, label, sub }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className="rounded-2xl border-2 border-border bg-card px-8 py-10 text-left hover:border-accent/60 hover:bg-accent/5 transition group"
            >
              <div className="font-display text-2xl mb-3 group-hover:text-accent transition">{label}</div>
              <div className="text-sm text-muted-foreground font-serif leading-relaxed">{sub}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function CreateMemorial() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const tc = t.create;
  const [mode, setMode] = useState<MemorialMode | null>(null);
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
      smell: "",
      pet_sound: "",
      music_links: [],
      legacy_links: [],
      hometown: "",
      creator_relationship: "",
      miss_most: "",
      language: lang,
      creator_email: "",
      confirm_passed: false as unknown as true,
      confirm_public: false as unknown as true,
    },
  });

  useEffect(() => {
    form.setValue("language", lang);
  }, [lang, form]);

  if (mode === null) return <ModeSelector onSelect={setMode} />;

  const STEPS = [
    { n: 1, label: lang === "es" ? "Quién" : "Who" },
    { n: 2, label: lang === "es" ? "Historia" : "Story" },
    { n: 3, label: lang === "es" ? "Final" : "Finish" },
  ];

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
    if (step === 1) {
      setMode(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
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

      await insertMemorial({ data: { memorialId, mode: mode!, v } });

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
        <Progress step={step} steps={STEPS} />

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
                {step === 1 && <Step1 form={form} mode={mode!} />}
                {step === 2 && <Step2 form={form} mode={mode!} />}
                {step === 3 && <Step3 form={form} mode={mode!} />}
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
                {tc.back}
              </button>
              <button
                type="button"
                onClick={next}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-3 text-sm font-medium shadow-warm hover:opacity-90 disabled:opacity-60 transition"
              >
                {submitting
                  ? tc.generating
                  : step === 3
                    ? tc.generate
                    : tc.continue}
                {!submitting && <span aria-hidden>→</span>}
              </button>
            </div>
          </div>

          <LivePreview form={form} mode={mode!} />
        </div>
      </main>
    </div>
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function Progress({ step, steps }: { step: number; steps: { n: number; label: string }[] }) {
  return (
    <div className="flex items-center gap-3">
      {steps.map((s) => (
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

type MemorialMode = "memorial" | "story" | "album";
type FormProp = { form: UseFormReturn<MemorialFormData>; mode: MemorialMode };

// ─── Step 1: Who ──────────────────────────────────────────────────────────────

function Step1({ form, mode }: FormProp) {
  const { register, watch, setValue, formState: { errors } } = form;
  const { t } = useLang();
  const ts = t.create.step1;
  const ta = t.create.step1Album;
  const tc = t.create;
  const subject = watch("subject_type");
  const portrait = watch("portrait_url");
  const isAlbum = mode === "album";

  if (isAlbum) {
    return (
      <div className="space-y-7">
        <StepHeader eyebrow={ta.eyebrow} title={ta.title} sub={ta.sub} />

        <PortraitUpload value={portrait} onChange={(url) => setValue("portrait_url", url)} />

        <Field label={ta.titleLabel} error={errors.full_name?.message}>
          <input
            type="text"
            {...register("full_name")}
            className={inputCls}
            placeholder={ta.titlePlaceholder}
          />
        </Field>

        <Field label={ta.subtitleLabel}>
          <input
            type="text"
            {...register("nickname")}
            className={inputCls}
            placeholder={ta.subtitlePlaceholder}
          />
        </Field>

        <Field label={ta.occasionLabel}>
          <MultiChoice
            options={ta.occasionOptions}
            value={watch("occupation") ?? ""}
            onChange={(v) => setValue("occupation", v)}
            placeholder={ta.occasionPlaceholder}
            otherLabel={tc.otherOption}
          />
        </Field>

        <Field label={ta.eventDateLabel} error={errors.birth_date?.message}>
          <input type="date" {...register("birth_date")} className={inputCls} />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <StepHeader eyebrow={ts.eyebrow} title={ts.title} sub={ts.sub} />

      <div className="grid grid-cols-2 gap-3">
        {(["person", "pet"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setValue("subject_type", type, { shouldValidate: true })}
            className={`rounded-xl border-2 px-5 py-4 text-left transition ${
              subject === type ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/40"
            }`}
          >
            <div className="font-display text-xl capitalize">
              {type === "pet" ? ts.petLabel : ts.personLabel}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {type === "person" ? ts.personSub : ts.petSub}
            </div>
          </button>
        ))}
      </div>

      <PortraitUpload value={portrait} onChange={(url) => setValue("portrait_url", url)} />

      <Field label={ts.fullName} error={errors.full_name?.message}>
        <input
          type="text"
          {...register("full_name")}
          className={inputCls}
          placeholder={subject === "pet" ? "Luna García" : "Marco Tamarín"}
        />
      </Field>

      <Field
        label={subject === "pet" ? ts.nicknamePet : ts.nickname}
        hint={ts.nicknameHint}
      >
        <input
          type="text"
          {...register("nickname")}
          className={inputCls}
          placeholder={subject === "pet" ? "Lunita" : "Marquito"}
        />
      </Field>

      <div className={`grid gap-4 ${mode === "memorial" ? "sm:grid-cols-2" : ""}`}>
        <Field label={ts.birthDate} error={errors.birth_date?.message}>
          <input type="date" {...register("birth_date")} className={inputCls} />
        </Field>
        {mode === "memorial" && (
          <Field label={ts.passingDate} error={errors.passing_date?.message}>
            <input type="date" {...register("passing_date")} className={inputCls} />
          </Field>
        )}
      </div>
    </div>
  );
}

// ─── Legacy Links shared field ────────────────────────────────────────────────

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

type LegacyField = { id: string };
type LegacyLinksFieldProps = {
  fields: LegacyField[];
  append: (v: { url: string; label: string }) => void;
  remove: (i: number) => void;
  register: UseFormReturn<MemorialFormData>["register"];
  errors: UseFormReturn<MemorialFormData>["formState"]["errors"];
  watch: UseFormReturn<MemorialFormData>["watch"];
  setValue: UseFormReturn<MemorialFormData>["setValue"];
  title: string;
  hint: string;
  labelOptions: string[];
  addLabel: string;
  removeLabel: string;
  urlPlaceholder: string;
  labelPlaceholder: string;
  otherLabel: string;
};

function LegacyLinksField({
  fields, append, remove, register, errors, watch,
  title, hint, labelOptions, addLabel, removeLabel, urlPlaceholder, labelPlaceholder,
}: LegacyLinksFieldProps) {
  return (
    <div>
      <div className="text-sm font-medium text-foreground mb-0.5">{title}</div>
      <div className="text-xs text-muted-foreground mb-3">{hint}</div>
      <div className="space-y-3">
        {fields.map((field, i) => {
          const currentLabel = (watch(`legacy_links.${i}.label`) as string) ?? "";
          return (
            <div key={field.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-widest uppercase text-accent">
                  {currentLabel ? `${LEGACY_EMOJI[currentLabel] ?? "🔗"} ${currentLabel}` : `Link ${i + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-xs text-muted-foreground hover:text-destructive transition"
                >
                  {removeLabel}
                </button>
              </div>
              {/* Label pills */}
              <div className="flex flex-wrap gap-1.5">
                {labelOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const el = document.querySelector<HTMLInputElement>(`[data-legacy-label="${i}"]`);
                      if (el) { el.value = opt; el.dispatchEvent(new Event("input", { bubbles: true })); }
                    }}
                    className={`rounded-full px-3 py-1 text-xs border transition-all duration-150 ${
                      currentLabel === opt
                        ? "border-accent bg-accent/15 text-foreground font-medium"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-accent/50 hover:text-foreground"
                    }`}
                  >
                    {LEGACY_EMOJI[opt] ?? "🔗"} {opt}
                  </button>
                ))}
              </div>
              <input
                type="url"
                {...register(`legacy_links.${i}.url`)}
                className={inputCls}
                placeholder={urlPlaceholder}
              />
              {errors.legacy_links?.[i]?.url && (
                <span className="block text-xs text-destructive">
                  {errors.legacy_links[i]?.url?.message}
                </span>
              )}
              <input
                type="text"
                data-legacy-label={i}
                {...register(`legacy_links.${i}.label`)}
                className={inputCls}
                placeholder={labelPlaceholder}
              />
            </div>
          );
        })}
      </div>
      {fields.length < 5 && (
        <button
          type="button"
          onClick={() => append({ url: "", label: "" })}
          className="mt-3 w-full rounded-xl border-2 border-dashed border-border hover:border-accent/50 py-3 text-sm text-muted-foreground hover:text-foreground transition"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

// ─── Step 2: Their story (person) ─────────────────────────────────────────────

function PersonStep2({ form, mode }: FormProp) {
  const { register, watch, setValue, control, formState: { errors } } = form;
  const { t } = useLang();
  const tp = t.create.step2Person;
  const tc = t.create;
  const isStory = mode === "story";
  const { fields, append, remove } = useFieldArray({ control, name: "music_links" });
  const { fields: legacyFields, append: legacyAppend, remove: legacyRemove } = useFieldArray({ control, name: "legacy_links" });

  return (
    <div className="space-y-8">
      <StepHeader eyebrow={tp.eyebrow} title={tp.title} sub={tp.sub} />

      <Field label={isStory ? tp.handsLabelStory : tp.handsLabel}>
        <MultiChoice
          options={tp.handsOptions}
          value={watch("occupation") ?? ""}
          onChange={(v) => setValue("occupation", v)}
          placeholder={tp.handsPlaceholder}
          otherLabel={tc.otherOption}
        />
      </Field>

      <Field label={tp.personalityLabel} error={errors.personality_words?.message}>
        <input
          type="text"
          {...register("personality_words")}
          className={inputCls}
          placeholder={tp.personalityPlaceholder}
        />
      </Field>

      <Field label={tp.auraLabel}>
        <MultiChoice
          options={tp.auraOptions}
          value={watch("aura") ?? ""}
          onChange={(v) => setValue("aura", v)}
          placeholder={tp.auraPlaceholder}
          otherLabel={tc.otherOption}
        />
      </Field>

      <Field label={tp.lovesLabel} error={errors.loves?.message}>
        <textarea
          {...register("loves")}
          className={textareaCls}
          placeholder={tp.lovesPlaceholder}
        />
      </Field>

      <Field label={isStory ? tp.catchphraseLabelStory : tp.catchphraseLabel} error={errors.catchphrase?.message}>
        <input
          type="text"
          {...register("catchphrase")}
          className={inputCls}
          placeholder={tp.catchphrasePlaceholder}
        />
      </Field>

      <Field
        label={isStory ? tp.smellLabelStory : tp.smellLabel}
        hint={tp.smellHint}
        error={errors.smell?.message}
      >
        <input
          type="text"
          {...register("smell")}
          className={inputCls}
          placeholder={tp.smellPlaceholder}
        />
      </Field>

      <Field
        label={tp.strongestMemoryLabel}
        hint={tp.strongestMemoryHint}
        error={errors.strongest_memory?.message}
      >
        <textarea
          {...register("strongest_memory")}
          className={textareaCls}
          placeholder={tp.strongestMemoryPlaceholder}
        />
      </Field>

      <Field
        label={tp.wantPeopleLabel}
        error={errors.want_people_to_know?.message}
      >
        <textarea
          {...register("want_people_to_know")}
          className={textareaCls}
          placeholder={tp.wantPeoplePlaceholder}
        />
      </Field>

      {/* Music */}
      <div>
        <div className="text-sm font-medium text-foreground mb-0.5">{tp.musicTitle}</div>
        <div className="text-xs text-muted-foreground mb-3">{tp.musicHint}</div>
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
                    {tp.musicRemove}
                  </button>
                </div>
                <input
                  type="url"
                  {...register(`music_links.${i}.url`)}
                  className={inputCls}
                  placeholder={tp.musicUrlPlaceholder}
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
                  placeholder={tp.musicTitlePlaceholder}
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
            {tp.musicAdd}
          </button>
        )}
      </div>

      {/* Links & Legacy */}
      <LegacyLinksField
        fields={legacyFields}
        append={legacyAppend}
        remove={legacyRemove}
        register={register}
        errors={errors}
        watch={watch}
        setValue={setValue}
        title={tp.legacyTitle}
        hint={tp.legacyHint}
        labelOptions={tp.legacyLabelOptions}
        addLabel={tp.legacyAdd}
        removeLabel={tp.legacyRemove}
        urlPlaceholder={tp.legacyUrlPlaceholder}
        labelPlaceholder={tp.legacyLabelPlaceholder}
        otherLabel={tc.otherOption}
      />
    </div>
  );
}

// ─── Step 2: Their story (pet) ────────────────────────────────────────────────

function PetStep2({ form, mode: _mode }: FormProp) {
  const { register, watch, setValue, control, formState: { errors } } = form;
  const { t } = useLang();
  const tp = t.create.step2Pet;
  const tc = t.create;
  const { fields: legacyFields, append: legacyAppend, remove: legacyRemove } = useFieldArray({ control, name: "legacy_links" });

  return (
    <div className="space-y-8">
      <StepHeader eyebrow={tp.eyebrow} title={tp.title} sub={tp.sub} />

      <Field label={tp.animalLabel}>
        <MultiChoice
          options={tp.animalOptions}
          value={watch("occupation") ?? ""}
          onChange={(v) => setValue("occupation", v)}
          placeholder={tp.animalPlaceholder}
          otherLabel={tc.otherOption}
        />
      </Field>

      <Field label={tp.personalityLabel}>
        <MultiChoice
          options={tp.personalityOptions}
          value={watch("personality_words") ?? ""}
          onChange={(v) => setValue("personality_words", v)}
          placeholder={tp.personalityPlaceholder}
          otherLabel={tc.otherOption}
        />
      </Field>

      <Field label={tp.auraLabel}>
        <MultiChoice
          options={tp.auraOptions}
          value={watch("aura") ?? ""}
          onChange={(v) => setValue("aura", v)}
          placeholder={tp.auraPlaceholder}
          otherLabel={tc.otherOption}
        />
      </Field>

      <Field label={tp.lovesLabel}>
        <MultiChoice
          options={tp.lovesOptions}
          value={watch("loves") ?? ""}
          onChange={(v) => setValue("loves", v)}
          placeholder={tp.lovesPlaceholder}
          otherLabel={tc.otherOption}
        />
      </Field>

      <Field
        label={tp.habitLabel}
        hint={tp.habitHint}
        error={errors.catchphrase?.message}
      >
        <input
          type="text"
          {...register("catchphrase")}
          className={inputCls}
          placeholder={tp.habitPlaceholder}
        />
      </Field>

      <Field
        label={tp.petSoundLabel}
        hint={tp.petSoundHint}
        error={errors.pet_sound?.message}
      >
        <input
          type="text"
          {...register("pet_sound")}
          className={inputCls}
          placeholder={tp.petSoundPlaceholder}
        />
      </Field>

      <Field label={tp.smellLabel} error={errors.smell?.message}>
        <input
          type="text"
          {...register("smell")}
          className={inputCls}
          placeholder={tp.smellPlaceholder}
        />
      </Field>

      <Field
        label={tp.momentLabel}
        hint={tp.momentHint}
        error={errors.strongest_memory?.message}
      >
        <textarea
          {...register("strongest_memory")}
          className={textareaCls}
          placeholder={tp.momentPlaceholder}
        />
      </Field>

      <Field
        label={tp.wantPeopleLabel}
        error={errors.want_people_to_know?.message}
      >
        <textarea
          {...register("want_people_to_know")}
          className={textareaCls}
          placeholder={tp.wantPeoplePlaceholder}
        />
      </Field>

      {/* Links & Legacy */}
      <LegacyLinksField
        fields={legacyFields}
        append={legacyAppend}
        remove={legacyRemove}
        register={register}
        errors={errors}
        watch={watch}
        setValue={setValue}
        title={tp.legacyTitle}
        hint={tp.legacyHint}
        labelOptions={tp.legacyLabelOptions}
        addLabel={tp.legacyAdd}
        removeLabel={tp.legacyRemove}
        urlPlaceholder={tp.legacyUrlPlaceholder}
        labelPlaceholder={tp.legacyLabelPlaceholder}
        otherLabel={tc.otherOption}
      />
    </div>
  );
}

function AlbumStep2({ form }: { form: UseFormReturn<MemorialFormData> }) {
  const { register, watch, setValue, control, formState: { errors } } = form;
  const { t } = useLang();
  const ta = t.create.step2Album;
  const tc = t.create;
  const { fields, append, remove } = useFieldArray({ control, name: "music_links" });
  const { fields: legacyFields, append: legacyAppend, remove: legacyRemove } = useFieldArray({ control, name: "legacy_links" });

  return (
    <div className="space-y-8">
      <StepHeader eyebrow={ta.eyebrow} title={ta.title} sub={ta.sub} />

      <Field label={ta.vibeLabel}>
        <MultiChoice
          options={ta.vibeOptions}
          value={watch("aura") ?? ""}
          onChange={(v) => setValue("aura", v)}
          placeholder={ta.vibePlaceholder}
          otherLabel={tc.otherOption}
        />
      </Field>

      <Field label={ta.highlightsLabel} error={errors.loves?.message}>
        <textarea {...register("loves")} className={textareaCls} placeholder={ta.highlightsPlaceholder} />
      </Field>

      <Field label={ta.storyLabel} hint={ta.storyHint} error={errors.strongest_memory?.message}>
        <textarea {...register("strongest_memory")} className={textareaCls} placeholder={ta.storyPlaceholder} />
      </Field>

      <Field label={ta.messageLabel} error={errors.want_people_to_know?.message}>
        <textarea {...register("want_people_to_know")} className={textareaCls} placeholder={ta.messagePlaceholder} />
      </Field>

      {/* Soundtrack */}
      <div>
        <div className="text-sm font-medium text-foreground mb-0.5">{ta.musicTitle}</div>
        <div className="text-xs text-muted-foreground mb-3">{ta.musicHint}</div>
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
                  <span className="text-xs tracking-widest uppercase text-accent">{url ? platform : `Song ${i + 1}`}</span>
                  <button type="button" onClick={() => remove(i)} className="text-xs text-muted-foreground hover:text-destructive transition">{ta.musicRemove}</button>
                </div>
                <input type="url" {...register(`music_links.${i}.url`)} className={inputCls} placeholder={ta.musicUrlPlaceholder} />
                {errors.music_links?.[i]?.url && <span className="block text-xs text-destructive">{errors.music_links[i]?.url?.message}</span>}
                <input type="text" {...register(`music_links.${i}.title`)} className={inputCls} placeholder={ta.musicTitlePlaceholder} />
              </div>
            );
          })}
        </div>
        {fields.length < 5 && (
          <button type="button" onClick={() => append({ url: "", title: "" })}
            className="mt-3 w-full rounded-xl border-2 border-dashed border-border hover:border-accent/50 py-3 text-sm text-muted-foreground hover:text-foreground transition">
            {ta.musicAdd}
          </button>
        )}
      </div>

      <LegacyLinksField
        fields={legacyFields} append={legacyAppend} remove={legacyRemove}
        register={register} errors={errors} watch={watch} setValue={setValue}
        title={ta.linksTitle} hint={ta.linksHint}
        labelOptions={ta.linksLabelOptions}
        addLabel={ta.linksAdd} removeLabel={ta.linksRemove}
        urlPlaceholder={ta.linksUrlPlaceholder} labelPlaceholder={ta.linksLabelPlaceholder}
        otherLabel={tc.otherOption}
      />
    </div>
  );
}

function Step2({ form, mode }: FormProp) {
  if (mode === "album") return <AlbumStep2 form={form} />;
  const subject = form.watch("subject_type");
  return subject === "pet" ? <PetStep2 form={form} mode={mode} /> : <PersonStep2 form={form} mode={mode} />;
}

// ─── Step 3: Finish ───────────────────────────────────────────────────────────

function Step3({ form, mode }: FormProp) {
  const { register, watch, setValue, formState: { errors } } = form;
  const { t } = useLang();
  const ts = t.create.step3;
  const tc = t.create;
  const language = watch("language");
  const isPet = watch("subject_type") === "pet";
  const isStory = mode === "story";
  const isAlbum = mode === "album";

  useEffect(() => {
    if (isStory || isAlbum) setValue("confirm_passed", true as unknown as true);
  }, [isStory, isAlbum, setValue]);

  const ta3 = t.create.step3Album;

  return (
    <div className="space-y-8">
      <StepHeader
        eyebrow={isAlbum ? ta3.eyebrow : ts.eyebrow}
        title={isAlbum ? ta3.title : ts.title}
        sub={isAlbum ? ta3.sub : ts.sub}
      />

      {isAlbum ? (
        <>
          <Field label={ta3.whoLabel}>
            <MultiChoice
              options={ta3.whoOptions}
              value={watch("creator_relationship") ?? ""}
              onChange={(v) => setValue("creator_relationship", v)}
              placeholder={ta3.whoPlaceholder}
              otherLabel={tc.otherOption}
            />
          </Field>
          <Field label={ta3.feelLabel} error={errors.miss_most?.message}>
            <textarea {...register("miss_most")} className={textareaCls} placeholder={ta3.feelPlaceholder} />
          </Field>
        </>
      ) : (
        <>
          <Field label={ts.relationshipLabel}>
            <MultiChoice
              options={isPet ? ts.relationshipPetOptions : ts.relationshipOptions}
              value={watch("creator_relationship") ?? ""}
              onChange={(v) => setValue("creator_relationship", v)}
              placeholder={isPet ? ts.relationshipPetPlaceholder : ts.relationshipPlaceholder}
              otherLabel={tc.otherOption}
            />
          </Field>
          <Field
            label={isPet
              ? (isStory ? ts.missPetLabelStory : ts.missPetLabel)
              : (isStory ? ts.missLabelStory : ts.missLabel)}
            error={errors.miss_most?.message}
          >
            <textarea
              {...register("miss_most")}
              className={textareaCls}
              placeholder={isPet ? ts.missPetPlaceholder : ts.missPlaceholder}
            />
          </Field>
        </>
      )}

      <Field label={ts.languageLabel}>
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
              {l === "en" ? ts.languageEn : l === "es" ? ts.languageEs : ts.languageBoth}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label={ts.emailLabel}
        hint={ts.emailHint}
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
        {!isStory && !isAlbum && (
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...register("confirm_passed")}
              className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
            />
            <span className="text-foreground">
              {ts.confirmPassedLabel}
              {errors.confirm_passed?.message && (
                <span className="block text-xs text-destructive mt-1">
                  {errors.confirm_passed.message}
                </span>
              )}
            </span>
          </label>
        )}
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            {...register("confirm_public")}
            className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
          />
          <span className="text-foreground">
            {isAlbum ? ta3.confirmPublicLabel : isStory ? ts.confirmPublicLabelStory : ts.confirmPublicLabel}
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

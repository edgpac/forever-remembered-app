import Anthropic from "@anthropic-ai/sdk";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function buildPrompt(m: Record<string, unknown>, lang: "en" | "es"): string {
  const isPet = m.subject_type === "pet";

  const langInstruction =
    lang === "es"
      ? "Write the entire narrative in natural, warm Spanish. Use Latin American idioms when natural."
      : "Write the entire narrative in natural, warm English.";

  const facts: string[] = [];
  const push = (label: string, val?: string | null) => {
    if (val && String(val).trim()) facts.push(`- ${label}: ${String(val).trim()}`);
  };

  push("Type", m.subject_type as string);
  push("Full name", m.full_name as string);
  push("Nickname", m.nickname as string);
  push("Born", m.birth_date as string);
  push("Passed", m.passing_date as string);

  if (isPet) {
    push("Kind of animal", m.occupation as string);
    push("Their personality", m.personality_words as string);
    push("The energy they brought to the home", m.insider_detail as string);
    push("What they loved most", m.loves as string);
    push("A funny or memorable habit", m.catchphrase as string);
    push("Favorite moment together", m.strongest_memory as string);
  } else {
    push("Hometown", m.hometown as string);
    push("What they did", m.occupation as string);
    push("Their personality", m.personality_words as string);
    push("The energy they brought into a room", m.insider_detail as string);
    push("What they loved most", m.loves as string);
    push("A phrase or saying they always used", m.catchphrase as string);
    push("Strongest memory the writer has of them", m.strongest_memory as string);
  }

  push("Writer's relationship to them", m.creator_relationship as string);
  push("What the writer misses most", m.miss_most as string);
  push("What they would want people to know", m.want_people_to_know as string);

  const petInstructions = isPet
    ? `If the subject is a pet, write from the pet's perspective — warm, tender, with a gentle sense of humor.
Capture the specific animal's energy (e.g., a dog's devotion, a cat's quiet dignity). Keep dignity intact throughout.`
    : "";

  return `You are writing a short memorial in the FIRST PERSON — as if the deceased themselves were speaking, looking back on their life with warmth, humor, and quiet honesty.

${langInstruction}

${petInstructions}

Tone: warm, dignified, intimate. Like a letter left behind. Use specific, sensory details from the facts below. Avoid clichés ("they were such a special soul", "gone too soon", "in a better place"). Avoid religious language unless it appears in the facts. Do not list facts as a CV — weave them into a story.

Length: 220–320 words, in 3–4 short paragraphs separated by blank lines. Start with a small, specific image or moment — never with "Hello, my name is" or "I was born in".

Use the catchphrase or habit if provided, naturally, once. Mention the writer's relationship. End with what they want people to know — turned into the speaker's own voice.

FACTS:
${facts.join("\n")}

Output ONLY the narrative paragraphs. No title, no headings, no preamble, no quotes around it.`;
}

async function generateNarrative(
  client: Anthropic,
  m: Record<string, unknown>,
  lang: "en" | "es"
): Promise<string> {
  const resp = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(m, lang) }],
  });
  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text returned from Claude");
  return block.text.trim();
}

async function generateQrPng(url: string): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 1024,
    color: { dark: "#1a1a2e", light: "#ffffff" },
  });
  return new Uint8Array(buffer);
}

async function markError(memorialId: string): Promise<void> {
  try {
    await supabaseAdmin
      .from("memorials")
      .update({ status: "error" })
      .eq("memorial_id", memorialId);
  } catch {
    // best-effort — don't throw
  }
}

export async function runMemorialPipeline(memorialId: string): Promise<{
  ok: boolean;
  alreadyProcessed?: boolean;
  qrPngUrl?: string;
  memorialUrl?: string;
  error?: string;
}> {
  const { data: memorial, error: fetchErr } = await supabaseAdmin
    .from("memorials")
    .select("*")
    .eq("memorial_id", memorialId)
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!memorial) return { ok: false, error: "Memorial not found" };

  if (memorial.status === "active" && memorial.narrative_en && memorial.qr_png_url) {
    return { ok: true, alreadyProcessed: true };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await markError(memorialId);
    return { ok: false, error: "ANTHROPIC_API_KEY not configured" };
  }
  const anthropic = new Anthropic({ apiKey });

  const wantBoth = memorial.language === "both";
  const wantEs = memorial.language === "es" || wantBoth;
  const wantEn = memorial.language === "en" || wantBoth || true;

  let narrativeEn: string | null = null;
  let narrativeEs: string | null = null;

  try {
    if (wantEn) narrativeEn = await generateNarrative(anthropic, memorial as Record<string, unknown>, "en");
    if (wantEs) narrativeEs = await generateNarrative(anthropic, memorial as Record<string, unknown>, "es");
  } catch (e) {
    console.error("Narrative generation failed", e);
    await markError(memorialId);
    return { ok: false, error: `Narrative generation failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  const origin = process.env.PUBLIC_SITE_URL || "https://foreverhere.app";
  const memorialUrl = `${origin.replace(/\/$/, "")}/remember/${memorialId}`;

  let qrPngUrl: string | null = null;
  try {
    const qrPng = await generateQrPng(memorialUrl);
    const qrPath = `${memorialId}.png`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("qr-codes")
      .upload(qrPath, qrPng, { contentType: "image/png", upsert: true });
    if (uploadErr) throw new Error(`QR upload failed: ${uploadErr.message}`);
    const { data: qrPublic } = supabaseAdmin.storage.from("qr-codes").getPublicUrl(qrPath);
    qrPngUrl = qrPublic.publicUrl;
  } catch (e) {
    console.error("QR generation failed (non-fatal)", e);
  }

  const { error: updateErr } = await supabaseAdmin
    .from("memorials")
    .update({
      narrative_en: narrativeEn,
      narrative_es: narrativeEs,
      qr_png_url: qrPngUrl,
      status: "active",
    })
    .eq("memorial_id", memorialId);

  if (updateErr) {
    await markError(memorialId);
    return { ok: false, error: updateErr.message };
  }

  return { ok: true, qrPngUrl: qrPngUrl ?? undefined, memorialUrl };
}

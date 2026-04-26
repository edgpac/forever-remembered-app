import Anthropic from "@anthropic-ai/sdk";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendMemorialEmail } from "@/lib/send-memorial-email";

function buildAlbumPrompt(m: Record<string, unknown>, lang: "en" | "es"): string {
  const langInstruction =
    lang === "es"
      ? "Write the entire narrative in natural, warm Spanish. Use Latin American idioms when natural."
      : "Write the entire narrative in natural, warm English.";

  const facts: string[] = [];
  const push = (label: string, val?: string | null) => {
    if (val && String(val).trim()) facts.push(`- ${label}: ${String(val).trim()}`);
  };

  push("Album title", m.full_name as string);
  push("Subtitle", m.nickname as string);
  push("Occasion", m.occupation as string);
  push("Event date", m.birth_date as string);
  push("The mood and feeling of the day", m.insider_detail as string);
  push("Key moments and highlights", m.loves as string);
  push("The story behind it", m.strongest_memory as string);
  push("Message to viewers", m.want_people_to_know as string);
  push("Created by", m.creator_relationship as string);
  push("What the creator wants people to feel", m.miss_most as string);

  return `You are writing the opening narrative for a PHOTO ALBUM — a short, warm, present-tense welcome that invites anyone who scans the QR code into this celebration.

${langInstruction}

THE GOAL: When someone scans the QR code at the event or sees it later on a photo, frame, or card, they feel instantly welcomed into this moment. Write as if speaking to someone walking through the door — pulling them into the atmosphere, the people, the feeling of the day.

Tone: warm, celebratory, specific. Not a press release. Not generic ("it was a beautiful day"). Something the people in the photo would read and say "yes — exactly that."

If a message to viewers is provided, weave it in naturally at the end — as a quiet welcome, not a declaration.

Length: 150–200 words, in 2–3 short paragraphs. Start with a specific sensory detail or a key moment — never with "Welcome to" or "Today we celebrate".

FACTS:
${facts.join("\n")}

Output ONLY the narrative paragraphs. No title, no headings, no preamble, no quotes around it.`;
}

function buildPrompt(m: Record<string, unknown>, lang: "en" | "es"): string {
  if (m.memorial_mode === "album") return buildAlbumPrompt(m, lang);

  const isPet = m.subject_type === "pet";
  const isStory = m.memorial_mode === "story";

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
  if (!isStory) push("Passed", m.passing_date as string);

  if (isPet) {
    push("Kind of animal", m.occupation as string);
    push("Three words that describe them", m.personality_words as string);
    push("The energy they bring to the home", m.insider_detail as string);
    push(isStory ? "What they love most" : "What they loved most", m.loves as string);
    push(isStory ? "A funny or memorable habit" : "A funny or memorable habit", m.catchphrase as string);
    push("Their sound — how they greet their person", m.pet_sound as string);
    push(isStory ? "What they smell like" : "What they smelled like", m.smell as string);
    push(isStory ? "An ordinary moment" : "An ordinary moment the writer was memorizing without knowing it", m.strongest_memory as string);
  } else {
    push("Hometown", m.hometown as string);
    push(isStory ? "What their hands look like" : "What their hands looked like", m.occupation as string);
    push("Three words those who love them would use", m.personality_words as string);
    push("The energy they bring into a room", m.insider_detail as string);
    push("A regular Tuesday at their happiest — where and what", m.loves as string);
    push(isStory ? "A phrase or word they say so often you can still hear it" : "A phrase or sound they used so often you can still hear it", m.catchphrase as string);
    push(isStory ? "What they smell like" : "What they smelled like", m.smell as string);
    push("The moment, smell, sound, or image that comes first when you close your eyes", m.strongest_memory as string);
  }

  push("Writer's relationship to them", m.creator_relationship as string);
  push(isStory ? "What the writer loves most about them" : "What the writer misses most", m.miss_most as string);
  push(isStory ? "What they'd want anyone who sees their photo to know" : "What they would whisper to everyone who stops here", m.want_people_to_know as string);

  if (isStory) {
    const petInstructions = isPet
      ? `Write from the pet's perspective — warm, tender, with a gentle sense of humor that fits their species.
If a sound is given, weave it into the opening or closing. If a smell is given, use it as a sensory anchor.`
      : "";

    return `You are writing a short personal narrative in the FIRST PERSON — as if the person themselves were speaking, in the PRESENT TENSE, describing who they are right now.

${langInstruction}

${petInstructions}

This is NOT a memorial. The subject is alive. Write entirely in present tense ("I love", "my hands are", "I find myself"). Never use past tense for describing who they are.

THE GOAL: When someone scans the QR code next to this person's photo, they meet the person in the image — in their own voice. It should feel like a warm, specific self-portrait: here's who I am, here's what I care about, here's what I'd want you to know.

Tone: warm, intimate, a little conversational. Not a resume. Not an obituary. A brief self-portrait in words.

Sensory rule: Every paragraph must contain at least one grounding sensory detail — a smell, a texture, a sound, a specific light, a physical gesture. The smell field, if provided, must appear exactly once, naturally embedded.

Length: 180–260 words, in 3 short paragraphs separated by blank lines. Start with a specific physical detail or a moment — never with "Hello, my name is" or "I am a [job title]".

Use any catchphrase or signature expression naturally, once. End with something quiet and true — what they'd want the reader to know.

FACTS:
${facts.join("\n")}

Output ONLY the narrative paragraphs. No title, no headings, no preamble, no quotes around it.`;
  }

  const petInstructions = isPet
    ? `Write from the pet's perspective — warm, tender, with a gentle sense of humor that fits their species.
If a sound is given, find a way to weave it into the opening or closing. If a smell is given, use it as a sensory anchor.
Capture the specific animal's devotion and personality. Keep dignity intact throughout.`
    : "";

  return `You are writing a short memorial in the FIRST PERSON — as if the person themselves were speaking, looking back on their life with warmth, honesty, and quiet humor.

${langInstruction}

${petInstructions}

THE GOAL: The narrative must feel like looking into a mirror. So specific and real that the family cries when they read it — not because it is sad, but because it sounds exactly like them. Generic emotional statements are failures. Sensory, particular details are the only currency.

Tone: warm, dignified, intimate. Like a letter left behind. Avoid clichés ("they were such a special soul", "gone too soon", "in a better place"). Avoid religious language unless it appears in the facts. Do not list facts as a CV — weave them into a lived moment.

Sensory rule: Every paragraph must contain at least one grounding sensory detail — a smell, a texture, a sound, a specific light, a physical gesture. The smell field and sound field, if provided, must each appear exactly once, naturally embedded.

Length: 220–320 words, in 3–4 short paragraphs separated by blank lines. Start with a small, specific physical image or moment — never with "Hello, my name is" or "I was born in".

Use the catchphrase or habit if provided, naturally, once. Mention the writer's relationship. End with the whisper — what they want people to know — turned into the speaker's own voice, not a declaration but a quiet truth.

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

export async function runMemorialPipeline(memorialId: string, siteOrigin?: string): Promise<{
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

  // Prefer explicit env var, then Vercel's auto-injected production URL,
  // then the preview deployment URL (both come without a protocol).
  const origin =
    siteOrigin ||
    process.env.PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null) ||
    "https://www.qrheadstone.com";
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

  try {
    await sendMemorialEmail({
      toEmail: memorial.creator_email,
      fullName: memorial.full_name,
      memorialUrl,
      qrPngUrl: qrPngUrl ?? null,
      mode: memorial.memorial_mode ?? "memorial",
    });
  } catch (e) {
    console.error("Email send failed (non-fatal)", e);
  }

  return { ok: true, qrPngUrl: qrPngUrl ?? undefined, memorialUrl };
}

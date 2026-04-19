import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const processInput = z.object({
  memorialId: z.string().min(6).max(64),
});

const SITE_NAME = "Forever Here";

function buildPrompt(m: any, lang: "en" | "es"): string {
  const langInstruction =
    lang === "es"
      ? "Write the entire narrative in natural, warm Spanish. Use Latin American idioms when natural."
      : "Write the entire narrative in natural, warm English.";

  const facts: string[] = [];
  const push = (label: string, val?: string | null) => {
    if (val && val.trim()) facts.push(`- ${label}: ${val.trim()}`);
  };
  push("Type", m.subject_type);
  push("Full name", m.full_name);
  push("Nickname", m.nickname);
  push("Born", m.birth_date);
  push("Passed", m.passing_date);
  push("Hometown", m.hometown);
  push("Where they spent their life", m.location);
  push("What they did (job, school, breed/rescue story)", m.occupation);
  push("Three personality words", m.personality_words);
  push("What they loved most", m.loves);
  push("Strongest memory the writer has of them", m.strongest_memory);
  push("Inside detail only people close to them know", m.insider_detail);
  push("A phrase or saying they always used", m.catchphrase);
  push("People to mention by name", m.named_people);
  push("Writer's relationship to them", m.creator_relationship);
  push("What the writer misses most", m.miss_most);
  push("What they would want people to know", m.want_people_to_know);

  return `You are writing a short memorial in the FIRST PERSON — as if the deceased themselves were speaking, looking back on their life with warmth, humor, and quiet honesty.

${langInstruction}

Tone: warm, dignified, intimate. Like a letter left behind. Use specific, sensory details from the facts below. Avoid clichés ("they were such a special soul", "gone too soon", "in a better place"). Avoid religious language unless it appears in the facts. Do not list facts as a CV — weave them into a story.

Length: 220–320 words, in 3–4 short paragraphs separated by blank lines. Start with a small, specific image or moment — never with "Hello, my name is" or "I was born in".

Use the catchphrase if provided, naturally, once. Mention the writer's relationship and the people named. End with the line about what they want people to know — turned into the speaker's own voice.

If the subject is a pet, write from the pet's perspective with warmth and a touch of gentle humor. Keep dignity intact.

FACTS:
${facts.join("\n")}

Output ONLY the narrative paragraphs. No title, no headings, no preamble, no quotes around it.`;
}

async function generateNarrative(client: Anthropic, m: any, lang: "en" | "es"): Promise<string> {
  const resp = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(m, lang) }],
  });
  const block = resp.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text returned from Claude");
  return block.text.trim();
}

async function generateQrPng(memorialUrl: string): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(memorialUrl, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 1024,
    color: { dark: "#1a1a2e", light: "#ffffff" },
  });
  return new Uint8Array(buffer);
}

export const processMemorial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => processInput.parse(input))
  .handler(async ({ data }) => {
    const { memorialId } = data;

    // Fetch memorial
    const { data: memorial, error: fetchErr } = await supabaseAdmin
      .from("memorials")
      .select("*")
      .eq("memorial_id", memorialId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!memorial) throw new Error("Memorial not found");

    // Skip if already done
    if (memorial.status === "active" && memorial.narrative_en && memorial.qr_png_url) {
      return { ok: true, alreadyProcessed: true };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    const anthropic = new Anthropic({ apiKey });

    // 1. Generate narratives
    const wantBoth = memorial.language === "both";
    const wantEs = memorial.language === "es" || wantBoth;
    const wantEn = memorial.language === "en" || wantBoth || true; // always do EN as fallback

    let narrativeEn: string | null = null;
    let narrativeEs: string | null = null;

    try {
      if (wantEn) narrativeEn = await generateNarrative(anthropic, memorial, "en");
      if (wantEs) narrativeEs = await generateNarrative(anthropic, memorial, "es");
    } catch (e) {
      console.error("Narrative generation failed", e);
      throw new Error("Failed to generate narrative");
    }

    // 2. Generate QR code pointing at the memorial URL
    const origin =
      process.env.PUBLIC_SITE_URL ||
      (process.env.SUPABASE_URL ? "" : "") ||
      "https://foreverhere.app";
    // Best-effort: prefer current request host if set
    const memorialUrl = `${origin.replace(/\/$/, "")}/remember/${memorialId}`;
    const qrPng = await generateQrPng(memorialUrl);

    const qrPath = `${memorialId}.png`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("qr-codes")
      .upload(qrPath, qrPng, {
        contentType: "image/png",
        upsert: true,
      });
    if (uploadErr) throw new Error(`QR upload failed: ${uploadErr.message}`);

    const { data: qrPublic } = supabaseAdmin.storage.from("qr-codes").getPublicUrl(qrPath);
    const qrPngUrl = qrPublic.publicUrl;

    // 3. Update DB
    const { error: updateErr } = await supabaseAdmin
      .from("memorials")
      .update({
        narrative_en: narrativeEn,
        narrative_es: narrativeEs,
        qr_png_url: qrPngUrl,
        status: "active",
      })
      .eq("memorial_id", memorialId);

    if (updateErr) throw new Error(updateErr.message);

    return { ok: true, qrPngUrl, memorialUrl };
  });

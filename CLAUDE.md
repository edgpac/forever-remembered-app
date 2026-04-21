# Forever Here — CLAUDE.md

Project context for Claude Code. Read this before making changes.

## What this is

Forever Here (brand) / QRHeadstone (domain) is a QR story platform. Users fill a short form describing a person or pet; a first-person narrative is generated and linked to a permanent QR code. The QR can be placed on headstones, urns, frames, jerseys, benches, shirts, or the back of any photo.

Two modes exist: **In Memory Of** (someone who has passed, past tense) and **Their Story** (living person or pet, present tense, no passing date).

## Tech stack

- **Framework**: TanStack Start v1 (SSR, file-based routing)
- **UI**: React + Tailwind CSS v4 + shadcn/ui components
- **Database**: Supabase (PostgreSQL + storage buckets)
- **AI**: Anthropic Claude (`claude-sonnet-4-5`) for narrative generation
- **Email**: Resend (`memories@qrheadstone.com`)
- **Hosting**: Vercel
- **Package manager**: bun

## Key files

| File | Purpose |
|------|---------|
| `src/routes/index.tsx` | Landing page — Hero, HowItWorks, Examples, Placements, CTA |
| `src/routes/create.tsx` | Multi-step create form (mode selector + 3 steps) |
| `src/routes/remember.$memorialId.tsx` | Public memorial/story page |
| `src/routes/sitemap[.]xml.ts` | Dynamic sitemap server handler |
| `src/lib/translations.ts` | All EN + ES copy — single source of truth |
| `src/lib/language-context.tsx` | `useLang()` hook for EN/ES toggle |
| `src/lib/memorial-pipeline.core.ts` | Narrative generation + QR upload + email |
| `src/lib/memorial-schemas.ts` | Zod schemas for the 3-step form |
| `src/lib/send-memorial-email.ts` | Resend email after pipeline |
| `src/components/PortraitUpload.tsx` | Image upload with crop (react-easy-crop) |
| `src/components/SiteHeader.tsx` | Global header with language toggle |
| `src/components/SiteFooter.tsx` | Global footer |
| `src/integrations/supabase/client.ts` | Supabase client (browser) |
| `src/integrations/supabase/client.server.ts` | Supabase admin client (server only) |
| `src/integrations/supabase/types.ts` | Generated DB types — update when adding columns |

## Database — memorials table (key columns)

| Column | Notes |
|--------|-------|
| `memorial_id` | Public ID, format `FH-YYYY-NNNNNN` |
| `memorial_mode` | `'memorial'` or `'story'` |
| `subject_type` | `'person'` or `'pet'` |
| `status` | `'generating'` → `'active'` (or `'error'`) |
| `narrative_en` / `narrative_es` | Generated first-person narrative |
| `qr_png_url` | Supabase storage URL for the QR image |
| `creator_email` | Used to gate narrative edits |
| `occupation` | Maps to "hands" question (person) or animal type (pet) |
| `insider_detail` | Maps to "aura" / room energy |
| `smell` / `pet_sound` | Sensory fields added via migration |
| `memorial_mode` | Added via `20260421000000_add_memorial_mode.sql` |

## Migrations to run on live DB

After pulling these commits, run in Supabase SQL editor:
- `supabase/migrations/20260419220000_add_smell_pet_sound.sql`
- `supabase/migrations/20260421000000_add_memorial_mode.sql`

## Environment variables (Vercel)

| Var | Purpose |
|-----|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key — server only |
| `ANTHROPIC_API_KEY` | Claude API key |
| `RESEND_API_KEY` | Resend email key |
| `PUBLIC_SITE_URL` | `https://www.qrheadstone.com` |

## i18n

All copy lives in `src/lib/translations.ts` under `T.en` and `T.es`. Use `useLang()` to get `{ t, lang }`. Never hardcode UI strings — add to translations first.

## Bilingual support

The language toggle is in the header. The form lets users pick EN, ES, or Both for the generated narrative. The memorial page serves the correct narrative based on toggle state.

## Style conventions

- Colors: `text-accent` = gold, `text-primary` = navy blue, `text-foreground` = dark ink
- Font: `font-display` = serif display, `font-serif` = body serif
- Background: `bg-candlelight` = warm cream, `bg-card` = slightly lighter card surface
- No emojis in production UI unless explicitly added
- All new sections must connect to `useLang()` — no hardcoded English strings

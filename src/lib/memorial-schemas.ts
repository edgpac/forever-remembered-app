import { z } from "zod";

export const step1Schema = z.object({
  subject_type: z.enum(["person", "pet"]),
  full_name: z.string().min(1, "Name is required").max(200),
  nickname: z.string().max(100).optional().or(z.literal("")),
  birth_date: z.string().max(20).optional().or(z.literal("")),
  passing_date: z.string().max(20).optional().or(z.literal("")),
  portrait_url: z.string().url().optional().or(z.literal("")),
});

export const step2Schema = z.object({
  hometown: z.string().max(200).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  occupation: z.string().max(300).optional().or(z.literal("")),
  spoken_languages: z.string().max(200).optional().or(z.literal("")),
});

const musicLinkSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  title: z.string().max(200).optional().or(z.literal("")),
});

export const step3Schema = z.object({
  personality_words: z.string().max(200).optional().or(z.literal("")),
  loves: z.string().max(500).optional().or(z.literal("")),
  strongest_memory: z.string().max(1000).optional().or(z.literal("")),
  insider_detail: z.string().max(500).optional().or(z.literal("")),
  catchphrase: z.string().max(200).optional().or(z.literal("")),
  music_links: z.array(musicLinkSchema).max(5).default([]),
});

export const step4Schema = z.object({
  creator_relationship: z.string().max(100).optional().or(z.literal("")),
  miss_most: z.string().max(500).optional().or(z.literal("")),
  want_people_to_know: z.string().max(500).optional().or(z.literal("")),
  named_people: z.string().max(300).optional().or(z.literal("")),
});

export const step5Schema = z.object({
  language: z.enum(["en", "es", "both"]),
  theme: z.enum(["classic", "slate", "garden", "starry"]),
  creator_email: z.string().email("Please enter a valid email").max(320),
  confirm_passed: z.literal(true, {
    message: "Please confirm",
  }),
  confirm_public: z.literal(true, {
    message: "Please confirm",
  }),
});

export const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema);

export type MemorialFormData = z.infer<typeof fullSchema>;

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runMemorialPipeline } from "@/lib/memorial-pipeline.core";

const processInput = z.object({
  memorialId: z.string().min(6).max(64),
});

export const processMemorial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => processInput.parse(input))
  .handler(async ({ data }) => runMemorialPipeline(data.memorialId));

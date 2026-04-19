import { createFileRoute } from "@tanstack/react-router";
import { processMemorial } from "@/lib/memorial-pipeline.functions";

export const Route = createFileRoute("/api/process-memorial")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { memorialId?: string };
          if (!body?.memorialId) {
            return Response.json({ error: "memorialId required" }, { status: 400 });
          }
          const result = await processMemorial({ data: { memorialId: body.memorialId } });
          return Response.json(result);
        } catch (e) {
          console.error("process-memorial error", e);
          return Response.json(
            { error: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
          );
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { runMemorialPipeline } from "@/lib/memorial-pipeline.core";

export const Route = createFileRoute("/api/process-memorial")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { memorialId?: string };
          if (!body?.memorialId) {
            return Response.json({ error: "memorialId required" }, { status: 400 });
          }
          const requestOrigin = new URL(request.url).origin;
          const result = await runMemorialPipeline(body.memorialId, requestOrigin);
          if (!result.ok && result.error) {
            console.error("Memorial pipeline error:", result.error);
            return Response.json({ error: result.error }, { status: 500 });
          }
          return Response.json(result);
        } catch (e) {
          console.error("process-memorial unhandled error", e);
          return Response.json(
            { error: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
          );
        }
      },
    },
  },
});

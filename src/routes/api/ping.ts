import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/ping")({
  server: {
    handlers: {
      GET: async () => {
        await supabaseAdmin.from("memorials").select("memorial_id").limit(1);
        return Response.json({ ok: true });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SITE = "https://www.qrheadstone.com";

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
};

export const Route = createFileRoute("/sitemap[.]xml" as never)({
  server: {
    handlers: {
      GET: async () => {
        const { data: memorials } = await supabaseAdmin
          .from("memorials")
          .select("memorial_id, updated_at")
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(50000);

        const staticUrls: SitemapUrl[] = [
          { loc: `${SITE}/`, changefreq: "weekly", priority: "1.0" },
          { loc: `${SITE}/create`, changefreq: "monthly", priority: "0.8" },
        ];

        const memorialUrls: SitemapUrl[] = (memorials ?? []).map((m) => ({
          loc: `${SITE}/remember/${m.memorial_id}`,
          lastmod: m.updated_at?.split("T")[0],
          changefreq: "monthly",
          priority: "0.6",
        }));

        const all = [...staticUrls, ...memorialUrls];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

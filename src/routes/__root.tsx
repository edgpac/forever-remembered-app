import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { LanguageProvider } from "@/lib/language-context";

import appCss from "../styles.css?url";

const SITE_URL = "https://www.qrheadstone.com";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Forever Here",
  url: SITE_URL,
  description:
    "A QR memorial platform. Fill out a short form and we write a first-person story in the voice of your loved one, then generate a QR code for any headstone, ash vase, or shrine.",
  sameAs: [SITE_URL],
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Forever Here — A QR memorial for someone you love" },
      { name: "description", content: "Fill out a short form. We write their story in their own voice and generate a QR code for any headstone, ash vase, or shrine. Forever Here keeps memory close." },
      { name: "author", content: "Forever Here" },
      { property: "og:title", content: "Forever Here — A QR memorial for someone you love" },
      { property: "og:description", content: "A short form. A first-person story. A QR code for the headstone, frame, or shrine." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Forever Here" },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico?v=4" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png?v=4" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png?v=4" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=4" },
      { rel: "manifest", href: "/site.webmanifest?v=4" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(organizationJsonLd),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <LanguageProvider>
      <Outlet />
    </LanguageProvider>
  );
}

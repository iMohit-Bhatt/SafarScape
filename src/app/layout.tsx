import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Safarscape — trips planned by people who pick up the phone", template: "%s · Safarscape" },
  description:
    "Honeymoons, family holidays, pilgrimages and treks across India and abroad, planned around you. Tell us where you'd like to go and an advisor will call you back.",
  openGraph: { siteName: "Safarscape", type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = { themeColor: "#0E3B43", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

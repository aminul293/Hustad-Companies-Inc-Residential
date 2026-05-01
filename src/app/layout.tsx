import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hustad Residential | Storm Inspection Platform",
  description: "Tablet-first storm inspection to sale platform",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="font-body bg-hustad-cream">
        {children}
      </body>
    </html>
  );
}

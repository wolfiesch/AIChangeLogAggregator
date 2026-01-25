import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Changelog Aggregator",
  description:
    "One-stop-shop for tracking all changelog updates from Frontier AI providers",
  openGraph: {
    title: "AI Changelog Aggregator",
    description:
      "Track changelogs from OpenAI, Anthropic, Google, xAI, Mistral, and more",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

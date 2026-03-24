import { NextRequest } from "next/server";
import { getRecentEntries } from "@/lib/queries";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://changelog.wolfgangschoenberger.com")
  .trim()
  .replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const providerSlug = searchParams.get("provider") ?? undefined;

  const entries = await getRecentEntries(50);

  // Filter by provider if specified
  const filteredEntries = providerSlug
    ? entries.filter(
        (e) => e.source?.product?.provider?.slug === providerSlug
      )
    : entries;

  const feedTitle = providerSlug
    ? `AI Changelog - ${providerSlug}`
    : "AI Changelog Aggregator";

  const feedDescription = providerSlug
    ? `Changelog updates from ${providerSlug}`
    : "All changelog updates from Frontier AI providers";

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/rss${providerSlug ? `?provider=${providerSlug}` : ""}" rel="self" type="application/rss+xml"/>
    ${filteredEntries
      .map(
        (entry) => `
    <item>
      <title>${escapeXml(entry.title || "Changelog Update")}</title>
      <link>${SITE_URL}/entry/${entry.id}</link>
      <guid isPermaLink="true">${SITE_URL}/entry/${entry.id}</guid>
      <pubDate>${
        entry.publishedDate
          ? new Date(entry.publishedDate).toUTCString()
          : new Date(entry.createdAt!).toUTCString()
      }</pubDate>
      <description>${escapeXml(truncateContent(entry.content, 500))}</description>
      ${
        entry.source?.product?.provider
          ? `<category>${escapeXml(entry.source.product.provider.name)}</category>`
          : ""
      }
      ${
        entry.source?.product
          ? `<category>${escapeXml(entry.source.product.name)}</category>`
          : ""
      }
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
}

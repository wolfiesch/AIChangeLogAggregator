import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Calendar, Tag } from "lucide-react";
import { getEntryById } from "@/lib/queries";

// Force dynamic rendering - database queries at runtime
export const dynamic = "force-dynamic";
import { formatDate, getProductTypeColor, getProductTypeLabel } from "@/lib/utils";
import { Header } from "@/components/header";
import { SafeHtml } from "@/components/safe-html";
import { getCurrentSubscriberId } from "@/lib/auth";
import { getFollowedProductIds } from "@/lib/follows";
import { FollowButton } from "@/components/follow-button";

interface EntryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EntryPage({ params }: EntryPageProps) {
  const subscriberIdPromise = getCurrentSubscriberId();
  const { id } = await params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId)) {
    notFound();
  }

  const entry = await getEntryById(entryId);

  if (!entry) {
    notFound();
  }

  const provider = entry.source?.product?.provider;
  const product = entry.source?.product;
  const displayDate = entry.publishedDate ?? entry.createdAt;

  const subscriberId = await subscriberIdPromise;
  const followedIds = subscriberId ? await getFollowedProductIds(subscriberId) : [];
  const isFollowing = product?.id ? followedIds.includes(product.id) : false;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to feed
        </Link>

        <article>
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold mb-3">
              {entry.title || "Changelog Update"}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {/* Date */}
              {displayDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(displayDate)}
                </div>
              )}

              {/* Provider & Product */}
              {provider && (
                <Link
                  href={`/?provider=${provider.slug}`}
                  className="hover:text-primary"
                >
                  {provider.name}
                </Link>
              )}
              {product && (
                <>
                  <span>/</span>
                  <Link
                    href={`/?product=${product.slug}`}
                    className="hover:text-primary"
                  >
                    {product.name}
                  </Link>
                </>
              )}

              {/* Product type badge */}
              {product?.type && (
                <span
                  className={`px-2 py-0.5 rounded text-xs uppercase font-medium ${getProductTypeColor(
                    product.type
                  )}`}
                >
                  {getProductTypeLabel(product.type)}
                </span>
              )}

              {/* Version */}
              {entry.version && (
                <span className="bg-secondary px-2 py-0.5 rounded">
                  v{entry.version}
                </span>
              )}

              {product?.id && (
                <FollowButton
                  productId={product.id}
                  initialFollowing={isFollowing}
                />
              )}
            </div>

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-secondary text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External link */}
            {entry.url && (
              <div className="mt-3">
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View original
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </header>

          {/* Content - sanitized HTML or plain text */}
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {entry.contentHtml ? (
              <SafeHtml html={entry.contentHtml} />
            ) : (
              <div className="whitespace-pre-wrap">{entry.content}</div>
            )}
          </div>
        </article>

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-border">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to feed
          </Link>
        </div>
      </main>
    </div>
  );
}

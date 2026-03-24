import Link from "next/link";
import { eq } from "drizzle-orm";
import { ChevronDown } from "lucide-react";

import { Header } from "@/components/header";
import { FilterSidebar } from "@/components/filter-sidebar";
import { Pagination } from "@/components/pagination";
import { SearchForm } from "@/components/search-form";
import { db } from "@/lib/db";
import { getCurrentSubscriberId } from "@/lib/auth";
import { getFollowedProductIds, getFollowedProducts } from "@/lib/follows";
import { getEntries, getEntriesCount, getProviders } from "@/lib/queries";
import { emailSubscribers } from "@/db/schema";
import {
  formatRelativeDate,
  truncate,
  getProductTypeColor,
  getProductTypeLabel,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SearchParams {
  provider?: string;
  product?: string;
  type?: string;
  search?: string;
  page?: string;
}

const ITEMS_PER_PAGE = 30;

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const subscriberId = await getCurrentSubscriberId();
  if (!subscriberId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <main className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold mb-2">Following</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to follow products and see a personalized feed.
          </p>
          <Link
            href="/signin?next=/following"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  const followedProductIds = await getFollowedProductIds(subscriberId);
  const followedProducts = await getFollowedProducts(subscriberId);

  const subscriber = await db.query.emailSubscribers.findFirst({
    where: eq(emailSubscribers.id, subscriberId),
  });
  const lastSeenAt = subscriber?.lastSeenAt ?? null;

  if (followedProductIds.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <main className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold mb-2">Following</h1>
          <p className="text-muted-foreground mb-6">
            You’re not following any products yet.
          </p>
          <Link
            href="/providers"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
          >
            Browse providers
          </Link>
        </main>
      </div>
    );
  }

  const providers = await getProviders();

  const selectedProviderName = params.provider
    ? providers.find((p) => p.slug === params.provider)?.name ?? params.provider
    : null;

  const followedProductBySlug = new Map<
    string,
    { name: string; providerName?: string }
  >();
  for (const f of followedProducts) {
    const product = f.product;
    if (!product?.slug) continue;
    followedProductBySlug.set(product.slug, {
      name: product.name,
      providerName: product.provider?.name ?? undefined,
    });
  }

  const selectedProductDisplay = params.product
    ? followedProductBySlug.get(params.product)?.name ?? params.product
    : null;

  const createUrl = (updates: Record<string, string | null | undefined>) => {
    const p = new URLSearchParams();
    (Object.entries(params) as Array<[string, string | undefined]>).forEach(
      ([key, value]) => {
        if (!value) return;
        if (key === "page") return;
        p.set(key, value);
      }
    );

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        p.delete(key);
        return;
      }
      if (typeof value === "string") {
        p.set(key, value);
      }
    });

    const query = p.toString();
    return query ? `/following?${query}` : "/following";
  };

  const [entries, totalCount] = await Promise.all([
    getEntries({
      limit: ITEMS_PER_PAGE,
      offset,
      productIds: followedProductIds,
      providerSlug: params.provider,
      productSlug: params.product,
      type: params.type,
      search: params.search,
    }),
    getEntriesCount({
      productIds: followedProductIds,
      providerSlug: params.provider,
      productSlug: params.product,
      type: params.type,
      search: params.search,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Mark feed as seen (best-effort)
  try {
    await db
      .update(emailSubscribers)
      .set({ lastSeenAt: new Date() })
      .where(eq(emailSubscribers.id, subscriberId));
  } catch (error) {
    console.error("Failed to update lastSeenAt:", error);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="hidden md:block w-48 flex-shrink-0">
            <FilterSidebar
              providers={providers}
              baseUrl="/following"
              showSubscribe={false}
              searchParams={params as Record<string, string | undefined>}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold">Following</h1>
                <div className="text-sm text-muted-foreground mt-1">
                  {totalCount.toLocaleString()} {totalCount === 1 ? "entry" : "entries"}
                  {page > 1 && ` (page ${page} of ${totalPages})`}
                </div>
              </div>
              <Link href="/providers" className="text-sm hover:underline">
                Manage follows
              </Link>
            </div>

            <div className="mb-4">
              <SearchForm baseUrl="/following" defaultValue={params.search} />
            </div>

            <div className="mb-4 md:hidden">
              <details className="group border border-border rounded">
                <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer select-none text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span>Filters</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-3 py-3 border-t border-border">
                  <FilterSidebar
                    providers={providers}
                    baseUrl="/following"
                    showSubscribe={false}
                    searchParams={params as Record<string, string | undefined>}
                  />
                </div>
              </details>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Link
                href={createUrl({ product: null })}
                className={
                  params.product
                    ? "px-2 py-1 rounded border border-border text-xs hover:bg-secondary"
                    : "px-2 py-1 rounded border border-primary bg-primary text-primary-foreground text-xs"
                }
              >
                All followed
              </Link>
              {followedProducts
                .map((f) => f.product)
                .filter(Boolean)
                .sort((a, b) => {
                  const ap = a.provider?.name ?? "";
                  const bp = b.provider?.name ?? "";
                  if (ap !== bp) return ap.localeCompare(bp);
                  return a.name.localeCompare(b.name);
                })
                .map((product) => (
                  <Link
                    key={product.id}
                    href={createUrl({ product: product.slug, provider: null, type: null })}
                    className={
                      params.product === product.slug
                        ? "px-2 py-1 rounded border border-primary bg-primary text-primary-foreground text-xs"
                        : "px-2 py-1 rounded border border-border text-xs hover:bg-secondary"
                    }
                    title={
                      product.provider
                        ? `${product.provider.name} / ${product.name}`
                        : product.name
                    }
                  >
                    {product.name}
                  </Link>
                ))}
            </div>

            {(params.provider || params.product || params.type || params.search) && (
              <div className="mb-4 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Filters:</span>
                {params.provider && (
                  <span className="bg-secondary px-2 py-0.5 rounded">
                    {selectedProviderName}
                  </span>
                )}
                {params.product && (
                  <span className="bg-secondary px-2 py-0.5 rounded">
                    {selectedProductDisplay}
                  </span>
                )}
                {params.type && (
                  <span className="bg-secondary px-2 py-0.5 rounded">
                    {getProductTypeLabel(params.type)}
                  </span>
                )}
                {params.search && (
                  <span className="bg-secondary px-2 py-0.5 rounded">
                    "{params.search}"
                  </span>
                )}
                <Link href="/following" className="text-primary hover:underline">
                  Clear all
                </Link>
              </div>
            )}

            <div className="space-y-1">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No entries found.</p>
                  {params.search && (
                    <p className="mt-2">
                      <Link
                        href={createUrl({ search: null })}
                        className="text-primary hover:underline"
                      >
                        Clear search
                      </Link>
                    </p>
                  )}
                </div>
              ) : (
                entries.map((entry, index) => (
                  <article
                    key={entry.id}
                    className="py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-muted-foreground text-sm w-6 text-right flex-shrink-0 pt-0.5">
                        {offset + index + 1}.
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/entry/${entry.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {entry.title || truncate(entry.content, 80)}
                          </Link>
                          {entry.url && (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary"
                            >
                              ({new URL(entry.url).hostname})
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {(() => {
                            const entryDate = entry.publishedDate ?? entry.createdAt;
                            const d =
                              typeof entryDate === "string"
                                ? new Date(entryDate)
                                : entryDate;
                            const seen =
                              lastSeenAt &&
                              (typeof lastSeenAt === "string"
                                ? new Date(lastSeenAt)
                                : lastSeenAt);
                            const isNew = Boolean(seen && d && d > seen);

                            return (
                              <>
                                <span>{formatRelativeDate(entryDate)}</span>
                                {isNew && (
                                  <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-semibold uppercase">
                                    New
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          <span>|</span>
                          {entry.source?.product?.provider && (
                            <Link
                              href={
                                createUrl({
                                  provider: entry.source.product.provider.slug,
                                  product: null,
                                })
                              }
                              className="hover:text-primary"
                            >
                              {entry.source.product.provider.name}
                            </Link>
                          )}
                          {entry.source?.product && (
                            <>
                              <span>/</span>
                              <Link
                                href={createUrl({ product: entry.source.product.slug })}
                                className="hover:text-primary"
                              >
                                {entry.source.product.name}
                              </Link>
                            </>
                          )}
                          {entry.source?.product?.type && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium ${getProductTypeColor(
                                entry.source.product.type
                              )}`}
                            >
                              {getProductTypeLabel(entry.source.product.type)}
                            </span>
                          )}
                          {entry.version && (
                            <span className="bg-secondary px-1.5 py-0.5 rounded">
                              v{entry.version}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  baseUrl="/following"
                  searchParams={params as Record<string, string | undefined>}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

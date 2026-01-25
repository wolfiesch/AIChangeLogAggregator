import { Suspense } from "react";
import Link from "next/link";
import { getEntries, getProviders, getEntriesCount } from "@/lib/queries";

// Force dynamic rendering - database queries at runtime
export const dynamic = "force-dynamic";
import { formatRelativeDate, truncate, getProductTypeColor, getProductTypeLabel } from "@/lib/utils";
import { Header } from "@/components/header";
import { FilterSidebar } from "@/components/filter-sidebar";
import { SearchForm } from "@/components/search-form";
import { Pagination } from "@/components/pagination";

interface SearchParams {
  provider?: string;
  product?: string;
  search?: string;
  page?: string;
}

const ITEMS_PER_PAGE = 30;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const [entries, providers, totalCount] = await Promise.all([
    getEntries({
      limit: ITEMS_PER_PAGE,
      offset,
      providerSlug: params.provider,
      productSlug: params.product,
      search: params.search,
    }),
    getProviders(),
    getEntriesCount({
      providerSlug: params.provider,
      productSlug: params.product,
      search: params.search,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-48 flex-shrink-0">
            <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
              <FilterSidebar
                providers={providers}
                selectedProvider={params.provider}
                selectedProduct={params.product}
              />
            </Suspense>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search */}
            <div className="mb-4">
              <SearchForm defaultValue={params.search} />
            </div>

            {/* Active filters */}
            {(params.provider || params.product || params.search) && (
              <div className="mb-4 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Filters:</span>
                {params.provider && (
                  <span className="bg-secondary px-2 py-0.5 rounded">
                    {params.provider}
                  </span>
                )}
                {params.product && (
                  <span className="bg-secondary px-2 py-0.5 rounded">
                    {params.product}
                  </span>
                )}
                {params.search && (
                  <span className="bg-secondary px-2 py-0.5 rounded">
                    "{params.search}"
                  </span>
                )}
                <Link
                  href="/"
                  className="text-primary hover:underline ml-2"
                >
                  Clear all
                </Link>
              </div>
            )}

            {/* Results count */}
            <div className="text-sm text-muted-foreground mb-4">
              {totalCount} {totalCount === 1 ? "entry" : "entries"}
              {page > 1 && ` (page ${page} of ${totalPages})`}
            </div>

            {/* Entries list */}
            <div className="space-y-1">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No changelog entries found.</p>
                  {(params.provider || params.product || params.search) && (
                    <p className="mt-2">
                      <Link href="/" className="text-primary hover:underline">
                        Clear filters
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
                      {/* Index number (HN style) */}
                      <span className="text-muted-foreground text-sm w-6 text-right flex-shrink-0 pt-0.5">
                        {offset + index + 1}.
                      </span>

                      <div className="flex-1 min-w-0">
                        {/* Title row */}
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

                        {/* Meta row */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span>
                            {formatRelativeDate(entry.publishedDate)}
                          </span>
                          <span>|</span>
                          {entry.source?.product?.provider && (
                            <Link
                              href={`/?provider=${entry.source.product.provider.slug}`}
                              className="hover:text-primary"
                            >
                              {entry.source.product.provider.name}
                            </Link>
                          )}
                          {entry.source?.product && (
                            <>
                              <span>/</span>
                              <Link
                                href={`/?product=${entry.source.product.slug}`}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  baseUrl="/"
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

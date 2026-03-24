"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FollowButton } from "@/components/follow-button";
import { getProductTypeColor, getProductTypeLabel } from "@/lib/utils";

type Product = {
  id: number;
  name: string;
  slug: string;
  type: string | null;
};

type Provider = {
  id: number;
  name: string;
  slug: string;
  websiteUrl: string | null;
  products: Product[];
};

export function ProvidersBrowser({
  providers,
  followedIds,
}: {
  providers: Provider[];
  followedIds: number[];
}) {
  const [query, setQuery] = useState("");
  const followedSet = useMemo(() => new Set(followedIds), [followedIds]);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return providers;

    return providers
      .map((provider) => {
        const providerMatches = provider.name
          .toLowerCase()
          .includes(normalizedQuery);

        if (providerMatches) {
          return provider;
        }

        const products = provider.products.filter((p) => {
          const hay = `${p.name} ${p.slug} ${p.type ?? ""}`.toLowerCase();
          return hay.includes(normalizedQuery);
        });

        if (products.length === 0) return null;
        return { ...provider, products };
      })
      .filter(Boolean) as Provider[];
  }, [providers, normalizedQuery]);

  const counts = useMemo(() => {
    const providerCount = filtered.length;
    const productCount = filtered.reduce((acc, p) => acc + p.products.length, 0);
    return { providerCount, productCount };
  }, [filtered]);

  return (
    <div>
      <div className="mb-6">
        <input
          type="search"
          placeholder="Search providers or products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 text-base border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-2 text-xs text-muted-foreground">
          Showing {counts.providerCount} providers • {counts.productCount} products
        </div>
      </div>

      <div className="space-y-8">
        {filtered.map((provider) => (
          <section key={provider.id} className="border-b border-border pb-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold">
                <Link
                  href={`/?provider=${provider.slug}`}
                  className="hover:text-primary"
                >
                  {provider.name}
                </Link>
              </h2>
              {provider.websiteUrl && (
                <a
                  href={provider.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  ({new URL(provider.websiteUrl).hostname})
                </a>
              )}
            </div>

            {provider.products.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {provider.products.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-secondary"
                  >
                    <Link
                      href={`/?product=${product.slug}`}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <span className="truncate">{product.name}</span>
                      {product.type && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium ${getProductTypeColor(
                            product.type
                          )}`}
                        >
                          {getProductTypeLabel(product.type)}
                        </span>
                      )}
                    </Link>
                    <FollowButton
                      productId={product.id}
                      initialFollowing={followedSet.has(product.id)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No products configured yet.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

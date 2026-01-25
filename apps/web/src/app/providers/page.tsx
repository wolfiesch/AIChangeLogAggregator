import Link from "next/link";
import { getProviders, getProductsByProvider } from "@/lib/queries";

// Force dynamic rendering - database queries at runtime
export const dynamic = "force-dynamic";
import { Header } from "@/components/header";
import { getProductTypeColor, getProductTypeLabel } from "@/lib/utils";

export const metadata = {
  title: "Providers | AI Changelog Aggregator",
  description: "All AI providers tracked by AI Changelog Aggregator",
};

export default async function ProvidersPage() {
  const providers = await getProviders();

  // Get products for each provider
  const providersWithProducts = await Promise.all(
    providers.map(async (provider) => ({
      ...provider,
      products: await getProductsByProvider(provider.slug),
    }))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">AI Providers</h1>

        <p className="text-muted-foreground mb-8">
          We track changelog updates from {providers.length} AI providers across{" "}
          {providersWithProducts.reduce((acc, p) => acc + p.products.length, 0)}{" "}
          products.
        </p>

        <div className="space-y-8">
          {providersWithProducts.map((provider) => (
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
                    <li key={product.id}>
                      <Link
                        href={`/?product=${product.slug}`}
                        className="flex items-center gap-2 p-2 rounded hover:bg-secondary"
                      >
                        <span>{product.name}</span>
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
      </main>
    </div>
  );
}

import { getProviders, getProductsByProvider } from "@/lib/queries";

// Force dynamic rendering - database queries at runtime
export const dynamic = "force-dynamic";
import { Header } from "@/components/header";
import { getCurrentSubscriberId } from "@/lib/auth";
import { getFollowedProductIds } from "@/lib/follows";
import { ProvidersBrowser } from "@/components/providers-browser";

export const metadata = {
  title: "Providers | AI Changelog Aggregator",
  description: "All AI providers tracked by AI Changelog Aggregator",
};

export default async function ProvidersPage() {
  const providers = await getProviders();

  const subscriberId = await getCurrentSubscriberId();
  const followedIds = subscriberId ? await getFollowedProductIds(subscriberId) : [];

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

        <ProvidersBrowser providers={providersWithProducts} followedIds={followedIds} />
      </main>
    </div>
  );
}

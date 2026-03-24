import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Provider } from "@/db/schema";

interface FilterSidebarProps {
  providers: Provider[];
  searchParams: Record<string, string | undefined>;
  baseUrl?: string;
  showSubscribe?: boolean;
}

export function FilterSidebar({
  providers,
  searchParams,
  baseUrl = "/",
  showSubscribe = true,
}: FilterSidebarProps) {
  const selectedProvider = searchParams.provider;
  const selectedType = searchParams.type;

  const createUrl = (updates: Record<string, string | null | undefined>) => {
    const base = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
    const params = new URLSearchParams();

    // Preserve existing params except page.
    Object.entries(searchParams).forEach(([key, value]) => {
      if (!value) return;
      if (key === "page") return;
      params.set(key, value);
    });

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
        return;
      }
      if (typeof value === "string") {
        params.set(key, value);
      }
    });

    const query = params.toString();
    return query ? `${base}?${query}` : base;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm mb-2">Providers</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <Link
              href={createUrl({ provider: null, product: null })}
              className={cn(
                "hover:text-primary",
                !selectedProvider && "text-primary font-medium"
              )}
            >
              All providers
            </Link>
          </li>
          {providers.map((provider) => (
            <li key={provider.id}>
              <Link
                href={createUrl({ provider: provider.slug, product: null })}
                className={cn(
                  "hover:text-primary",
                  selectedProvider === provider.slug && "text-primary font-medium"
                )}
              >
                {provider.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="font-semibold text-sm mb-2">Product Types</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <Link
              href={createUrl({ type: null })}
              className={cn(
                "hover:text-primary",
                !selectedType && "text-primary font-medium"
              )}
            >
              All types
            </Link>
          </li>
          <li>
            <Link
              href={createUrl({ type: "api" })}
              className={cn(
                "hover:text-primary",
                selectedType === "api" && "text-primary font-medium"
              )}
            >
              APIs
            </Link>
          </li>
          <li>
            <Link
              href={createUrl({ type: "chat" })}
              className={cn(
                "hover:text-primary",
                selectedType === "chat" && "text-primary font-medium"
              )}
            >
              Chat Apps
            </Link>
          </li>
          <li>
            <Link
              href={createUrl({ type: "cli" })}
              className={cn(
                "hover:text-primary",
                selectedType === "cli" && "text-primary font-medium"
              )}
            >
              CLI Tools
            </Link>
          </li>
          <li>
            <Link
              href={createUrl({ type: "ide" })}
              className={cn(
                "hover:text-primary",
                selectedType === "ide" && "text-primary font-medium"
              )}
            >
              IDE Extensions
            </Link>
          </li>
          <li>
            <Link
              href={createUrl({ type: "desktop" })}
              className={cn(
                "hover:text-primary",
                selectedType === "desktop" && "text-primary font-medium"
              )}
            >
              Desktop Apps
            </Link>
          </li>
        </ul>
      </div>

      {showSubscribe && (
        <div className="pt-4 border-t border-border">
          <h3 className="font-semibold text-sm mb-2">Subscribe</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <a
                href="/api/rss"
                className="hover:text-primary flex items-center gap-1"
              >
                RSS Feed
              </a>
            </li>
            <li>
              <Link href="/subscribe" className="hover:text-primary">
                Email Digest
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Provider } from "@/db/schema";

interface FilterSidebarProps {
  providers: Provider[];
  selectedProvider?: string;
  selectedProduct?: string;
}

export function FilterSidebar({
  providers,
  selectedProvider,
}: FilterSidebarProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm mb-2">Providers</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <Link
              href="/"
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
                href={`/?provider=${provider.slug}`}
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
            <Link href="/?type=api" className="hover:text-primary">
              APIs
            </Link>
          </li>
          <li>
            <Link href="/?type=chat" className="hover:text-primary">
              Chat Apps
            </Link>
          </li>
          <li>
            <Link href="/?type=cli" className="hover:text-primary">
              CLI Tools
            </Link>
          </li>
          <li>
            <Link href="/?type=ide" className="hover:text-primary">
              IDE Extensions
            </Link>
          </li>
          <li>
            <Link href="/?type=desktop" className="hover:text-primary">
              Desktop Apps
            </Link>
          </li>
        </ul>
      </div>

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
    </div>
  );
}

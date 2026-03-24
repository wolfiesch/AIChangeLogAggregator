import Link from "next/link";
import { Rss } from "lucide-react";
import { AuthNav } from "@/components/auth-nav";

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo & Nav */}
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-lg">
              AI Changelog
            </Link>
            <nav className="hidden sm:flex items-center gap-3 text-sm">
              <Link href="/" className="hover:underline">
                new
              </Link>
              <span className="opacity-50">|</span>
              <Link href="/following" className="hover:underline">
                following
              </Link>
              <span className="opacity-50">|</span>
              <Link href="/providers" className="hover:underline">
                providers
              </Link>
              <span className="opacity-50">|</span>
              <Link href="/about" className="hover:underline">
                about
              </Link>
            </nav>
          </div>

          {/* RSS */}
          <div className="flex items-center gap-3">
            <AuthNav />
            <a
              href="/api/rss"
              className="flex items-center gap-1 text-sm hover:underline"
              title="RSS Feed"
            >
              <Rss className="w-4 h-4" />
              <span className="hidden sm:inline">RSS</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

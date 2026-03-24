import Link from "next/link";

import { Header } from "@/components/header";
import { SignInForm } from "@/components/signin-form";

export const metadata = {
  title: "Sign in | AI Changelog Aggregator",
  description: "Sign in to follow products and personalize your feed",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Sign in</h1>
          <p className="text-muted-foreground">
            Get a magic link to follow products and see a personalized feed.
          </p>
        </div>

        <SignInForm />

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Want the weekly email digest? <Link href="/subscribe" className="text-primary hover:underline">Subscribe here</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}

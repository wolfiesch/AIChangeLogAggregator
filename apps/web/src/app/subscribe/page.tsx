import { Header } from "@/components/header";
import { SubscribeForm } from "@/components/subscribe-form";

export const metadata = {
  title: "Subscribe | AI Changelog Aggregator",
  description: "Subscribe to weekly AI changelog digest emails",
};

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Weekly Digest</h1>
          <p className="text-muted-foreground">
            Get a summary of all AI changelog updates delivered to your inbox
            every Monday morning.
          </p>
        </div>

        <SubscribeForm />

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>No spam, ever. Unsubscribe anytime.</p>
        </div>
      </main>
    </div>
  );
}

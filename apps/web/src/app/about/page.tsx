import Link from "next/link";
import { Rss, Mail, Github } from "lucide-react";
import { Header } from "@/components/header";

export const metadata = {
  title: "About | AI Changelog Aggregator",
  description: "About AI Changelog Aggregator - tracking AI provider updates",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">About AI Changelog</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p>
            <strong>AI Changelog Aggregator</strong> is your one-stop-shop for
            tracking all changelog updates from Frontier AI providers. We
            aggregate release notes, changelogs, and updates from APIs, chat
            interfaces, mobile apps, desktop apps, CLI tools, and AI-powered
            code editors.
          </p>

          <h2>Providers We Track</h2>
          <ul>
            <li>
              <strong>OpenAI</strong> - ChatGPT, GPT API, Codex CLI
            </li>
            <li>
              <strong>Anthropic</strong> - Claude, Claude Code
            </li>
            <li>
              <strong>Google</strong> - Gemini API, Gemini Apps, Vertex AI
            </li>
            <li>
              <strong>xAI</strong> - Grok
            </li>
            <li>
              <strong>Mistral AI</strong> - Mistral API
            </li>
            <li>
              <strong>Cohere</strong> - Cohere API
            </li>
            <li>
              <strong>Meta</strong> - Llama models, llama.cpp
            </li>
            <li>
              <strong>DeepSeek</strong> - DeepSeek API
            </li>
            <li>
              <strong>Perplexity</strong> - Perplexity API and App
            </li>
            <li>
              <strong>And more...</strong> Including AI code editors like
              Cursor, Windsurf, Aider, GitHub Copilot, and Continue.dev
            </li>
          </ul>

          <h2>Stay Updated</h2>
          <p>There are several ways to stay up-to-date:</p>

          <div className="flex flex-col gap-4 not-prose mt-4 mb-6">
            <a
              href="/api/rss"
              className="flex items-center gap-3 p-4 border border-border rounded hover:bg-secondary"
            >
              <Rss className="w-6 h-6 text-primary" />
              <div>
                <div className="font-medium">RSS Feed</div>
                <div className="text-sm text-muted-foreground">
                  Subscribe in your favorite RSS reader
                </div>
              </div>
            </a>

            <Link
              href="/subscribe"
              className="flex items-center gap-3 p-4 border border-border rounded hover:bg-secondary"
            >
              <Mail className="w-6 h-6 text-primary" />
              <div>
                <div className="font-medium">Weekly Digest</div>
                <div className="text-sm text-muted-foreground">
                  Get a summary every Monday morning
                </div>
              </div>
            </Link>
          </div>

          <h2>How It Works</h2>
          <p>
            We scrape changelog pages from all major AI providers every 6 hours.
            Our scraper uses a combination of:
          </p>
          <ul>
            <li>
              <strong>Static HTML parsing</strong> for simple changelog pages
            </li>
            <li>
              <strong>GitHub API</strong> for release notes and markdown files
            </li>
            <li>
              <strong>Headless browser</strong> for JavaScript-rendered content
            </li>
          </ul>
          <p>
            New entries are detected using content hashing to avoid duplicates,
            and the feed is updated automatically.
          </p>

          <h2>Open Source</h2>
          <p>
            This project is open source. Check out the code on GitHub:
          </p>
          <a
            href="https://github.com/yourusername/ai-changelog-aggregator"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Github className="w-4 h-4" />
            AI Changelog Aggregator on GitHub
          </a>
        </div>
      </main>
    </div>
  );
}

# AI Changelog Aggregator

A one-stop-shop for tracking all changelog updates from Frontier AI providers. Aggregates changelogs from APIs, chat interfaces, mobile apps, desktop apps, CLI tools, and AI-powered code editors.

## Features

- **63+ changelog sources** from 22 AI providers
- **RSS feed** for real-time updates
- **Weekly email digest** (optional)
- **Full-text search** across all changelogs
- **Filter by provider, product, or date**
- **Minimal, fast UI** (Hacker News-inspired)

## Providers Tracked

| Provider | Products |
|----------|----------|
| OpenAI | ChatGPT, API, Codex CLI, macOS/Windows apps |
| Anthropic | Claude API, Claude Code, Claude Apps |
| Google | Gemini API, Gemini Apps, Gemini CLI, Vertex AI |
| xAI | Grok, xAI API |
| Mistral AI | Mistral API, mistral-common |
| Cohere | Cohere API |
| Meta | Llama models, llama.cpp |
| DeepSeek | DeepSeek API |
| Perplexity | Perplexity API and App |
| Amazon | Bedrock, Amazon Q |
| Groq | Groq API |
| Together AI | Together API |
| Replicate | Replicate Platform, JS SDK |
| AI21 Labs | AI21 API |
| Stability AI | Stability Platform |
| **Code Editors** | Cursor, Windsurf, Aider, GitHub Copilot, Continue.dev, Tabnine, Sourcegraph Cody |

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Hono.js on Fly.io
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Scraping**: Cheerio (static), Octokit (GitHub), Playwright (JS-rendered)

## Project Structure

```
AIChangeLogAggregator/
├── apps/
│   ├── web/         # Next.js frontend (Vercel)
│   └── scraper/     # Hono.js scraper backend (Fly.io)
├── packages/
│   └── db/          # Shared Drizzle schema
└── package.json     # pnpm workspace root
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Neon PostgreSQL database

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/ai-changelog-aggregator
cd ai-changelog-aggregator

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Run database migrations
pnpm db:migrate

# Seed the database with providers/products/sources
pnpm db:seed

# Start the development server
pnpm dev
```

### Running the Scraper

```bash
# Run a full scrape locally
cd apps/scraper
pnpm scrape
```

## Deployment

### Frontend (Vercel)

```bash
# Deploy to Vercel
vercel
```

### Scraper (Fly.io)

```bash
cd apps/scraper

# Create Fly.io app
fly launch

# Set secrets
fly secrets set DATABASE_URL="your-neon-url"
fly secrets set GITHUB_TOKEN="your-github-token"
fly secrets set SCRAPER_API_KEY="your-api-key"

# Deploy
fly deploy
```

## Scrape Schedule

The scraper runs every 6 hours via Fly.io scheduled tasks:
- 12:00 AM UTC
- 6:00 AM UTC
- 12:00 PM UTC
- 6:00 PM UTC

## API Endpoints

### Frontend (Next.js)

| Endpoint | Description |
|----------|-------------|
| `GET /api/entries` | List changelog entries with filters |
| `GET /api/providers` | List all providers |
| `GET /api/rss` | RSS feed (supports `?provider=slug` filter) |
| `POST /api/subscribe` | Subscribe to email digest |

### Scraper (Hono.js)

| Endpoint | Description |
|----------|-------------|
| `GET /` | Health check |
| `GET /status` | Scraper status and recent runs |
| `POST /scrape` | Trigger full scrape (API key required) |
| `POST /scrape/:sourceId` | Scrape single source (API key required) |

## License

MIT

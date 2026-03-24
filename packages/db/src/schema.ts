import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  date,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// Providers (OpenAI, Anthropic, Google, xAI, etc.)
// ============================================================================
export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).unique().notNull(),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const providersRelations = relations(providers, ({ many }) => ({
  products: many(products),
}));

// ============================================================================
// Products (ChatGPT, Claude Code, Gemini API, etc.)
// ============================================================================
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => providers.id),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  type: varchar("type", { length: 50 }), // 'api', 'chat', 'mobile', 'desktop', 'cli', 'ide'
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  provider: one(providers, {
    fields: [products.providerId],
    references: [providers.id],
  }),
  sources: many(sources),
}));

// ============================================================================
// Sources (specific changelog URLs)
// ============================================================================
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  url: text("url").notNull(),
  scrapeMethod: varchar("scrape_method", { length: 50 }).notNull(), // 'static', 'github_api', 'playwright'
  selectorConfig: jsonb("selector_config"), // CSS selectors, XPath, parsing rules
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  product: one(products, {
    fields: [sources.productId],
    references: [products.id],
  }),
  entries: many(changelogEntries),
  scrapeRuns: many(scrapeRuns),
}));

// ============================================================================
// Changelog Entries
// ============================================================================
export const changelogEntries = pgTable(
  "changelog_entries",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id").references(() => sources.id),
    externalId: varchar("external_id", { length: 255 }), // For deduplication
    publishedDate: date("published_date"),
    title: text("title"),
    content: text("content").notNull(),
    contentHtml: text("content_html"),
    contentHash: varchar("content_hash", { length: 64 }).unique(), // SHA-256 for deduplication
    url: text("url"), // Deep link to specific entry
    version: varchar("version", { length: 255 }), // If applicable (increased from 50 for long version tags)
    tags: text("tags").array(), // 'feature', 'fix', 'deprecation', etc.
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_changelog_entries_published").on(table.publishedDate),
    index("idx_changelog_entries_source").on(table.sourceId),
    uniqueIndex("idx_changelog_entries_hash").on(table.contentHash),
  ]
);

export const changelogEntriesRelations = relations(
  changelogEntries,
  ({ one }) => ({
    source: one(sources, {
      fields: [changelogEntries.sourceId],
      references: [sources.id],
    }),
  })
);

// ============================================================================
// Scrape Runs (history of scraping attempts)
// ============================================================================
export const scrapeRuns = pgTable(
  "scrape_runs",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id").references(() => sources.id),
    status: varchar("status", { length: 20 }).notNull(), // 'running', 'success', 'failed'
    entriesFound: integer("entries_found").default(0),
    entriesNew: integer("entries_new").default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [index("idx_scrape_runs_source").on(table.sourceId, table.startedAt)]
);

export const scrapeRunsRelations = relations(scrapeRuns, ({ one }) => ({
  source: one(sources, {
    fields: [scrapeRuns.sourceId],
    references: [sources.id],
  }),
}));

// ============================================================================
// Email Subscribers (for weekly digest)
// ============================================================================
export const emailSubscribers = pgTable("email_subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  verified: boolean("verified").default(false),
  verificationToken: varchar("verification_token", { length: 64 }),
  unsubscribeToken: varchar("unsubscribe_token", { length: 64 }).notNull(),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

// ==========================================================================
// Auth Magic Links (passwordless sign-in)
// ==========================================================================
export const authMagicLinks = pgTable(
  "auth_magic_links",
  {
    id: serial("id").primaryKey(),
    subscriberId: integer("subscriber_id")
      .references(() => emailSubscribers.id)
      .notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_auth_magic_links_subscriber").on(table.subscriberId),
    uniqueIndex("idx_auth_magic_links_token").on(table.tokenHash),
  ]
);

export const authMagicLinksRelations = relations(authMagicLinks, ({ one }) => ({
  subscriber: one(emailSubscribers, {
    fields: [authMagicLinks.subscriberId],
    references: [emailSubscribers.id],
  }),
}));

// ==========================================================================
// Auth Sessions (cookie-backed)
// ==========================================================================
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: serial("id").primaryKey(),
    subscriberId: integer("subscriber_id")
      .references(() => emailSubscribers.id)
      .notNull(),
    sessionTokenHash: varchar("session_token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_auth_sessions_subscriber").on(table.subscriberId, table.createdAt),
    uniqueIndex("idx_auth_sessions_token").on(table.sessionTokenHash),
  ]
);

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  subscriber: one(emailSubscribers, {
    fields: [authSessions.subscriberId],
    references: [emailSubscribers.id],
  }),
}));

// ==========================================================================
// User Follows (favorite products)
// ==========================================================================
export const userFollows = pgTable(
  "user_follows",
  {
    id: serial("id").primaryKey(),
    subscriberId: integer("subscriber_id")
      .references(() => emailSubscribers.id)
      .notNull(),
    productId: integer("product_id")
      .references(() => products.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_user_follows_subscriber").on(table.subscriberId),
    uniqueIndex("idx_user_follows_unique").on(table.subscriberId, table.productId),
  ]
);

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  subscriber: one(emailSubscribers, {
    fields: [userFollows.subscriberId],
    references: [emailSubscribers.id],
  }),
  product: one(products, {
    fields: [userFollows.productId],
    references: [products.id],
  }),
}));

export const emailSubscribersRelations = relations(
  emailSubscribers,
  ({ many }) => ({
    sessions: many(authSessions),
    magicLinks: many(authMagicLinks),
    follows: many(userFollows),
  })
);

// ============================================================================
// Type exports for use in application code
// ============================================================================
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

export type ChangelogEntry = typeof changelogEntries.$inferSelect;
export type NewChangelogEntry = typeof changelogEntries.$inferInsert;

export type ScrapeRun = typeof scrapeRuns.$inferSelect;
export type NewScrapeRun = typeof scrapeRuns.$inferInsert;

export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type NewEmailSubscriber = typeof emailSubscribers.$inferInsert;

export type AuthMagicLink = typeof authMagicLinks.$inferSelect;
export type NewAuthMagicLink = typeof authMagicLinks.$inferInsert;

export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;

export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;

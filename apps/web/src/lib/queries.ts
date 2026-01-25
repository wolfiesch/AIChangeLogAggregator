import { db } from "./db";
import {
  providers,
  products,
  sources,
  changelogEntries,
} from "@/db/schema";
import { desc, eq, and, gte, lte, sql, ilike, or } from "drizzle-orm";

// ============================================================================
// Provider Queries
// ============================================================================

export async function getProviders() {
  return db.query.providers.findMany({
    orderBy: [providers.name],
  });
}

export async function getProviderBySlug(slug: string) {
  return db.query.providers.findFirst({
    where: eq(providers.slug, slug),
    with: {
      products: true,
    },
  });
}

// ============================================================================
// Product Queries
// ============================================================================

export async function getProducts() {
  return db.query.products.findMany({
    orderBy: [products.name],
    with: {
      provider: true,
    },
  });
}

export async function getProductBySlug(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      provider: true,
      sources: true,
    },
  });
}

export async function getProductsByProvider(providerSlug: string) {
  const provider = await db.query.providers.findFirst({
    where: eq(providers.slug, providerSlug),
  });

  if (!provider) return [];

  return db.query.products.findMany({
    where: eq(products.providerId, provider.id),
    orderBy: [products.name],
  });
}

// ============================================================================
// Changelog Entry Queries
// ============================================================================

export interface GetEntriesOptions {
  limit?: number;
  offset?: number;
  providerSlug?: string;
  productSlug?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  tags?: string[];
}

export async function getEntries(options: GetEntriesOptions = {}) {
  const {
    limit = 50,
    offset = 0,
    providerSlug,
    productSlug,
    startDate,
    endDate,
    search,
  } = options;

  // Build where conditions
  const conditions: ReturnType<typeof eq>[] = [];

  // Filter by provider
  if (providerSlug) {
    const provider = await db.query.providers.findFirst({
      where: eq(providers.slug, providerSlug),
    });
    if (provider) {
      const productIds = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.providerId, provider.id));

      const sourceIds = await db
        .select({ id: sources.id })
        .from(sources)
        .where(
          sql`${sources.productId} IN (${sql.join(
            productIds.map((p) => sql`${p.id}`),
            sql`, `
          )})`
        );

      if (sourceIds.length > 0) {
        conditions.push(
          sql`${changelogEntries.sourceId} IN (${sql.join(
            sourceIds.map((s) => sql`${s.id}`),
            sql`, `
          )})`
        );
      }
    }
  }

  // Filter by product
  if (productSlug) {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, productSlug),
    });
    if (product) {
      const sourceIds = await db
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.productId, product.id));

      if (sourceIds.length > 0) {
        conditions.push(
          sql`${changelogEntries.sourceId} IN (${sql.join(
            sourceIds.map((s) => sql`${s.id}`),
            sql`, `
          )})`
        );
      }
    }
  }

  // Filter by date range
  if (startDate) {
    conditions.push(gte(changelogEntries.publishedDate, startDate.toISOString().split("T")[0]));
  }
  if (endDate) {
    conditions.push(lte(changelogEntries.publishedDate, endDate.toISOString().split("T")[0]));
  }

  // Search filter
  if (search) {
    conditions.push(
      or(
        ilike(changelogEntries.title, `%${search}%`),
        ilike(changelogEntries.content, `%${search}%`)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const entries = await db.query.changelogEntries.findMany({
    where: whereClause,
    orderBy: [desc(changelogEntries.publishedDate), desc(changelogEntries.createdAt)],
    limit,
    offset,
    with: {
      source: {
        with: {
          product: {
            with: {
              provider: true,
            },
          },
        },
      },
    },
  });

  return entries;
}

export async function getEntryById(id: number) {
  return db.query.changelogEntries.findFirst({
    where: eq(changelogEntries.id, id),
    with: {
      source: {
        with: {
          product: {
            with: {
              provider: true,
            },
          },
        },
      },
    },
  });
}

export async function getEntriesCount(options: Omit<GetEntriesOptions, "limit" | "offset"> = {}) {
  const { providerSlug, productSlug, startDate, endDate, search } = options;

  // Build where conditions (same as getEntries)
  const conditions: ReturnType<typeof eq>[] = [];

  if (providerSlug) {
    const provider = await db.query.providers.findFirst({
      where: eq(providers.slug, providerSlug),
    });
    if (provider) {
      const productIds = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.providerId, provider.id));

      const sourceIds = await db
        .select({ id: sources.id })
        .from(sources)
        .where(
          sql`${sources.productId} IN (${sql.join(
            productIds.map((p) => sql`${p.id}`),
            sql`, `
          )})`
        );

      if (sourceIds.length > 0) {
        conditions.push(
          sql`${changelogEntries.sourceId} IN (${sql.join(
            sourceIds.map((s) => sql`${s.id}`),
            sql`, `
          )})`
        );
      }
    }
  }

  if (productSlug) {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, productSlug),
    });
    if (product) {
      const sourceIds = await db
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.productId, product.id));

      if (sourceIds.length > 0) {
        conditions.push(
          sql`${changelogEntries.sourceId} IN (${sql.join(
            sourceIds.map((s) => sql`${s.id}`),
            sql`, `
          )})`
        );
      }
    }
  }

  if (startDate) {
    conditions.push(gte(changelogEntries.publishedDate, startDate.toISOString().split("T")[0]));
  }
  if (endDate) {
    conditions.push(lte(changelogEntries.publishedDate, endDate.toISOString().split("T")[0]));
  }

  if (search) {
    conditions.push(
      or(
        ilike(changelogEntries.title, `%${search}%`),
        ilike(changelogEntries.content, `%${search}%`)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(changelogEntries)
    .where(whereClause);

  return Number(result[0]?.count ?? 0);
}

// ============================================================================
// Recent Entries (for RSS feed and homepage)
// ============================================================================

export async function getRecentEntries(limit = 30) {
  return getEntries({ limit });
}

export async function getEntriesSince(since: Date, limit = 100) {
  return getEntries({ startDate: since, limit });
}

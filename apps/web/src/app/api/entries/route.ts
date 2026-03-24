import { NextRequest, NextResponse } from "next/server";
import { getEntries, getEntriesCount } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const providerSlug = searchParams.get("provider") ?? undefined;
  const productSlug = searchParams.get("product") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const startDate = searchParams.get("startDate")
    ? new Date(searchParams.get("startDate")!)
    : undefined;
  const endDate = searchParams.get("endDate")
    ? new Date(searchParams.get("endDate")!)
    : undefined;

  const [entries, total] = await Promise.all([
    getEntries({
      limit,
      offset,
      providerSlug,
      productSlug,
      type,
      search,
      startDate,
      endDate,
    }),
    getEntriesCount({
      providerSlug,
      productSlug,
      type,
      search,
      startDate,
      endDate,
    }),
  ]);

  return NextResponse.json({
    entries,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + entries.length < total,
    },
  });
}

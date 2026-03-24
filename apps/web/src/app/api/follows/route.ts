import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userFollows } from "@/db/schema";
import { getCurrentSubscriberId } from "@/lib/auth";
import { getFollowedProducts } from "@/lib/follows";

export async function GET() {
  const subscriberId = await getCurrentSubscriberId();
  if (!subscriberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const follows = await getFollowedProducts(subscriberId);

  return NextResponse.json({
    follows: follows.map((f) => ({
      productId: f.productId,
      createdAt: f.createdAt,
      product: f.product,
    })),
  });
}

export async function POST(request: NextRequest) {
  const subscriberId = await getCurrentSubscriberId();
  if (!subscriberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const productId = Number(body?.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    await db
      .insert(userFollows)
      .values({ subscriberId, productId })
      .onConflictDoNothing({
        target: [userFollows.subscriberId, userFollows.productId],
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const subscriberId = await getCurrentSubscriberId();
  if (!subscriberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productId = Number(request.nextUrl.searchParams.get("productId"));
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  try {
    await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.subscriberId, subscriberId),
          eq(userFollows.productId, productId)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

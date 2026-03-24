import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userFollows } from "@/db/schema";

export async function getFollowedProducts(subscriberId: number) {
  return db.query.userFollows.findMany({
    where: eq(userFollows.subscriberId, subscriberId),
    with: {
      product: {
        with: {
          provider: true,
        },
      },
    },
  });
}

export async function getFollowedProductIds(subscriberId: number): Promise<number[]> {
  const follows = await getFollowedProducts(subscriberId);
  return follows.map((f) => f.productId);
}

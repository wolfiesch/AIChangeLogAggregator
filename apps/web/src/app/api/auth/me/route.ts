import { NextResponse } from "next/server";

import { getCurrentSubscriber } from "@/lib/auth";

export async function GET() {
  const subscriber = await getCurrentSubscriber();

  if (!subscriber) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    subscriber: {
      id: subscriber.id,
      email: subscriber.email,
      verified: subscriber.verified,
      unsubscribedAt: subscriber.unsubscribedAt,
    },
  });
}

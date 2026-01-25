import { NextResponse } from "next/server";
import { getProviders } from "@/lib/queries";

export async function GET() {
  const providers = await getProviders();
  return NextResponse.json({ providers });
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    count: 0,
    totalCount: 0,
    applications: [],
  });
}

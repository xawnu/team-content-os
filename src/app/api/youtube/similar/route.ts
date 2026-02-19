import { NextRequest, NextResponse } from "next/server";
import { findSimilarChannels } from "@/lib/youtube/similar";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId") || searchParams.get("seed") || "";

    if (!channelId) {
      return NextResponse.json(
        { ok: false, error: "channelId/seed is required" },
        { status: 400 },
      );
    }

    const data = await findSimilarChannels(channelId);

    return NextResponse.json({
      ok: true,
      ...data,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

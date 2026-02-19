import { NextRequest, NextResponse } from "next/server";
import { discoverFastGrowingChannels } from "@/lib/youtube/discovery";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q") || "homestead";
    const regionCode = searchParams.get("region") || "US";
    const language = searchParams.get("lang") || "en";
    const days = Number(searchParams.get("days") || 7);
    const maxResults = Number(searchParams.get("maxResults") || 50);
    const minDurationSec = Number(searchParams.get("minDurationSec") || 240);

    const data = await discoverFastGrowingChannels({
      query,
      regionCode,
      language,
      days,
      maxResults,
      minDurationSec,
    });

    return NextResponse.json({
      ok: true,
      query,
      regionCode,
      language,
      days,
      maxResults,
      minDurationSec,
      ...data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

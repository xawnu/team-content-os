import { NextRequest, NextResponse } from "next/server";
import { findSimilarChannels } from "@/lib/youtube/similar";
import { prisma } from "@/lib/prisma";

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

    const persist = searchParams.get("persist") !== "0";
    const data = await findSimilarChannels(channelId);

    let runId: string | null = null;

    if (persist) {
      const run = await prisma.similarRun.create({
        data: {
          seedInput: data.seedInput,
          seedChannelId: data.seedChannelId,
          query: data.query,
          seedTerms: data.seedTerms,
          items: {
            create: data.items.map((i) => ({
              channelId: i.channelId,
              channelTitle: i.channelTitle,
              channelUrl: i.channelUrl,
              similarity: i.similarity,
              matchedTerms: i.matchedTerms,
            })),
          },
        },
      });
      runId = run.id;
    }

    return NextResponse.json({
      ok: true,
      persist,
      runId,
      ...data,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("quotaExceeded") || msg.includes("YouTube API 403")) {
      return NextResponse.json(
        {
          ok: false,
          error: "YouTube API 今日配额已用尽，请更换 API Key 或等待配额重置（通常按太平洋时间每日重置）。",
          code: "YT_QUOTA_EXCEEDED",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 },
    );
  }
}

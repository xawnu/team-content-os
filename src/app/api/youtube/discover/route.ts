import { NextRequest, NextResponse } from "next/server";
import { discoverFastGrowingChannels } from "@/lib/youtube/discovery";
import { prisma } from "@/lib/prisma";
import { getNichePreset } from "@/lib/niche-config";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const niche = searchParams.get("niche");
    const preset = await getNichePreset(niche);

    const query = searchParams.get("q") || preset?.primaryQuery || "homestead";
    const regionCode = searchParams.get("region") || "US";
    const language = searchParams.get("lang") || "en";
    const days = Number(searchParams.get("days") || preset?.windowDays || 7);
    const maxResults = Number(searchParams.get("maxResults") || preset?.maxResults || 50);
    const minDurationSec = Number(
      searchParams.get("minDurationSec") || preset?.minDurationSec || 240,
    );

    const persist = searchParams.get("persist") !== "0";

    const data = await discoverFastGrowingChannels({
      query,
      regionCode,
      language,
      days,
      maxResults,
      minDurationSec,
      weights: preset?.weights,
    });

    let runId: string | null = null;

    if (persist) {
      const run = await prisma.discoverRun.create({
        data: {
          query,
          regionCode,
          language,
          days,
          maxResults,
          minDurationSec,
          fetchedVideos: data.fetchedVideos,
          filteredVideos: data.filteredVideos,
          candidates: {
            create: data.channels.map((c) => ({
              channelId: c.channelId,
              channelTitle: c.channelTitle,
              channelUrl: c.channelUrl,
              videoCount7d: c.videoCount7d,
              viewsSum7d: c.viewsSum7d,
              viewsMedian7d: c.viewsMedian7d,
              score: c.score,
              sampleTitles: c.sampleTitles,
            })),
          },
        },
      });

      runId = run.id;
    }

    return NextResponse.json({
      ok: true,
      query,
      regionCode,
      language,
      days,
      maxResults,
      minDurationSec,
      niche: preset?.slug ?? null,
      persist,
      runId,
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

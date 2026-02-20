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
    const forceRefresh = searchParams.get("refresh") === "1";
    // 默认关闭缓存，优先效果；显式 cache=1 才启用24h缓存
    const useCache = searchParams.get("cache") === "1" && !forceRefresh;

    if (useCache) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [cached, latestDiscoverRun] = await Promise.all([
        prisma.similarRun.findFirst({
          where: {
            seedInput: channelId,
            createdAt: { gte: since },
          },
          include: { items: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.discoverRun.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      ]);

      const hasNewDiscoverData = Boolean(
        cached && latestDiscoverRun?.createdAt && latestDiscoverRun.createdAt > cached.createdAt,
      );

      if (cached && !hasNewDiscoverData) {
        return NextResponse.json({
          ok: true,
          cached: true,
          persist: false,
          runId: cached.id,
          seedInput: cached.seedInput,
          seedChannelId: cached.seedChannelId,
          query: cached.query,
          seedTerms: Array.isArray(cached.seedTerms) ? cached.seedTerms : [],
          items: cached.items.map((i: (typeof cached.items)[number]) => ({
            channelId: i.channelId,
            channelTitle: i.channelTitle,
            channelUrl: i.channelUrl,
            similarity: i.similarity,
            matchedTerms: Array.isArray(i.matchedTerms) ? i.matchedTerms : [],
          })),
        });
      }
    }

    const localCandidatesRaw = await prisma.discoverCandidate.findMany({
      select: { channelId: true, channelTitle: true, channelUrl: true },
      distinct: ["channelId"],
      orderBy: { createdAt: "desc" },
      take: 160,
    });

    if (!localCandidatesRaw.length) {
      return NextResponse.json(
        { ok: false, error: "本地候选频道为空。请先在【增长频道发现】跑一次数据，再来找同类。" },
        { status: 400 },
      );
    }

    const data = await findSimilarChannels(channelId, localCandidatesRaw.slice(0, 120));

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

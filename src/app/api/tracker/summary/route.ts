import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function GET() {
  try {
    const episodes = await prisma.episodePlan.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { metrics: true },
    });

    const own = episodes.map((e: (typeof episodes)[number]) => ({
      id: e.id,
      topic: e.topic,
      targetKeyword: e.targetKeyword,
      plannedDate: e.plannedDate,
      ctr: e.metrics?.ctr ?? null,
      retention30s: e.metrics?.retention30s ?? null,
      views7d: e.metrics?.views7d ?? null,
      winOrFail: e.metrics?.winOrFail ?? null,
    }));

    const ctrs = own.map((e: (typeof own)[number]) => e.ctr).filter((v: unknown): v is number => typeof v === "number");
    const retention = own.map((e: (typeof own)[number]) => e.retention30s).filter((v: unknown): v is number => typeof v === "number");
    const views = own.map((e: (typeof own)[number]) => e.views7d).filter((v: unknown): v is number => typeof v === "number");

    const recentCandidates = await prisma.discoverCandidate.findMany({
      where: {
        run: {
          createdAt: {
            gte: new Date(Date.now() - 14 * 24 * 3600 * 1000),
          },
        },
      },
      include: { run: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const trendMap = new Map<string, { keyword: string; scoreSum: number; count: number }>();

    for (const c of recentCandidates) {
      const keyword = (c.run.query || "unknown").toLowerCase();
      if (!trendMap.has(keyword)) trendMap.set(keyword, { keyword, scoreSum: 0, count: 0 });
      const row = trendMap.get(keyword)!;
      row.scoreSum += c.score;
      row.count += 1;
    }

    const competitorTrends = [...trendMap.values()]
      .map((t) => ({ keyword: t.keyword, avgScore: Number((t.scoreSum / Math.max(t.count, 1)).toFixed(2)), sampleCount: t.count }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    const recommendation = {
      ownFocus:
        avg(ctrs) < 5
          ? "优先优化标题与封面（CTR偏低）"
          : avg(retention) < 55
            ? "优先优化前30秒结构（留存偏低）"
            : "维持当前结构，扩大高表现主题产能",
      marketSignal:
        competitorTrends[0]
          ? `近期外部热度最高关键词：${competitorTrends[0].keyword}`
          : "暂无外部趋势数据",
    };

    return NextResponse.json({
      ok: true,
      ownSummary: {
        avgCtr: Number(avg(ctrs).toFixed(2)),
        avgRetention30s: Number(avg(retention).toFixed(2)),
        avgViews7d: Number(avg(views).toFixed(0)),
        measuredCount: ctrs.length,
      },
      ownEpisodes: own,
      competitorTrends,
      recommendation,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

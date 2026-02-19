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
      include: { metrics: true },
      orderBy: { createdAt: "desc" },
      take: 120,
    });

    const byKeyword = new Map<string, { ctr: number[]; retention: number[]; views: number[]; count: number }>();

    for (const e of episodes) {
      const k = (e.targetKeyword || "unknown").toLowerCase();
      if (!byKeyword.has(k)) byKeyword.set(k, { ctr: [], retention: [], views: [], count: 0 });
      const row = byKeyword.get(k)!;
      row.count += 1;
      if (typeof e.metrics?.ctr === "number") row.ctr.push(e.metrics.ctr);
      if (typeof e.metrics?.retention30s === "number") row.retention.push(e.metrics.retention30s);
      if (typeof e.metrics?.views7d === "number") row.views.push(e.metrics.views7d);
    }

    const keywordScores = [...byKeyword.entries()]
      .map(([keyword, v]) => ({
        keyword,
        count: v.count,
        avgCtr: Number(avg(v.ctr).toFixed(2)),
        avgRetention: Number(avg(v.retention).toFixed(2)),
        avgViews: Number(avg(v.views).toFixed(0)),
        score: Number((0.45 * avg(v.ctr) + 0.35 * avg(v.retention) + 0.2 * Math.log(avg(v.views) + 1)).toFixed(2)),
      }))
      .filter((x) => x.keyword !== "unknown")
      .sort((a, b) => b.score - a.score);

    const keep = keywordScores.slice(0, 3).map((x) => x.keyword);
    const pause = keywordScores.slice(-3).map((x) => x.keyword).filter(Boolean);

    const nextActions = [
      `下周加码关键词：${keep.join(" / ") || "暂无"}`,
      `下周降权关键词：${pause.join(" / ") || "暂无"}`,
      "发布节奏建议：必做3条 + 备选4条 + 实验3条",
      "封面策略：高分关键词优先使用数字+结果式文案",
    ];

    return NextResponse.json({ ok: true, keywordScores, nextActions });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function GET() {
  try {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const episodes = await prisma.episodePlan.findMany({
      where: { createdAt: { gte: since } },
      include: { metrics: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const measured = episodes.filter((e) => e.metrics && (e.metrics.ctr != null || e.metrics.retention30s != null || e.metrics.views7d != null));

    const byKeyword = new Map<string, { ctr: number[]; retention: number[]; views: number[]; count: number }>();
    for (const e of measured) {
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

    const top3 = keywordScores.slice(0, 3);
    const bottom3 = keywordScores.slice(-3).filter((x) => x.keyword);

    const report = {
      period: {
        from: since.toISOString(),
        to: new Date().toISOString(),
      },
      summary: {
        createdEpisodes: episodes.length,
        measuredEpisodes: measured.length,
        avgCtr: Number(avg(measured.map((e) => e.metrics?.ctr ?? 0).filter((n) => n > 0)).toFixed(2)),
        avgRetention30s: Number(avg(measured.map((e) => e.metrics?.retention30s ?? 0).filter((n) => n > 0)).toFixed(2)),
      },
      winners: top3,
      losers: bottom3,
      nextWeekPlan: {
        mustDo: top3.map((x) => x.keyword),
        backup: keywordScores.slice(3, 7).map((x) => x.keyword),
        experiments: ["new-angle", "new-thumbnail-style", "short-vs-long-title"],
      },
      recommendations: [
        top3.length
          ? `加码关键词：${top3.map((x) => x.keyword).join(" / ")}`
          : "本周有效样本不足，先补齐指标回填",
        bottom3.length
          ? `降权关键词：${bottom3.map((x) => x.keyword).join(" / ")}`
          : "暂无明显降权关键词",
        "下周执行结构：必做3条 + 备选4条 + 实验3条",
      ],
    };

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Summary = {
  ownSummary: {
    avgCtr: number;
    avgRetention30s: number;
    avgViews7d: number;
    measuredCount: number;
  };
  ownEpisodes: Array<{
    id: string;
    topic: string;
    targetKeyword?: string | null;
    ctr?: number | null;
    retention30s?: number | null;
    views7d?: number | null;
    winOrFail?: string | null;
  }>;
  competitorTrends: Array<{ keyword: string; avgScore: number; sampleCount: number }>;
  recommendation: { ownFocus: string; marketSignal: string };
};

export default function TrackerPage() {
  const [data, setData] = useState<Summary | null>(null);

  async function load() {
    const res = await fetch("/api/tracker/summary");
    const json = await res.json();
    if (res.ok && json.ok) setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tracker</h1>
            <p className="text-sm text-zinc-600">我方表现（主） + 竞品趋势（辅）</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/planner" className="rounded border border-zinc-300 px-3 py-1 text-sm">规划器</Link>
            <Link href="/discover" className="rounded border border-zinc-300 px-3 py-1 text-sm">发现页</Link>
          </div>
        </header>

        {data ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">平均CTR</p><p className="text-2xl font-semibold">{data.ownSummary.avgCtr}%</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">平均30秒留存</p><p className="text-2xl font-semibold">{data.ownSummary.avgRetention30s}%</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">平均7天播放</p><p className="text-2xl font-semibold">{data.ownSummary.avgViews7d}</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">已测内容数</p><p className="text-2xl font-semibold">{data.ownSummary.measuredCount}</p></div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">综合建议</h2>
              <p className="mt-2 text-sm text-zinc-700">主优化：{data.recommendation.ownFocus}</p>
              <p className="mt-1 text-sm text-zinc-700">外部信号：{data.recommendation.marketSignal}</p>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold">我方内容表现（主决策）</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-100 text-zinc-600">
                      <tr><th className="px-3 py-2 text-left">主题</th><th className="px-3 py-2 text-right">CTR</th><th className="px-3 py-2 text-right">30s</th><th className="px-3 py-2 text-right">7d</th></tr>
                    </thead>
                    <tbody>
                      {data.ownEpisodes.slice(0, 12).map((e) => (
                        <tr key={e.id} className="border-t border-zinc-100">
                          <td className="px-3 py-2">{e.topic}</td>
                          <td className="px-3 py-2 text-right">{e.ctr ?? "-"}</td>
                          <td className="px-3 py-2 text-right">{e.retention30s ?? "-"}</td>
                          <td className="px-3 py-2 text-right">{e.views7d ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold">竞品趋势（辅助信号）</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-100 text-zinc-600">
                      <tr><th className="px-3 py-2 text-left">关键词</th><th className="px-3 py-2 text-right">平均分</th><th className="px-3 py-2 text-right">样本数</th></tr>
                    </thead>
                    <tbody>
                      {data.competitorTrends.map((t) => (
                        <tr key={t.keyword} className="border-t border-zinc-100">
                          <td className="px-3 py-2">{t.keyword}</td>
                          <td className="px-3 py-2 text-right">{t.avgScore}</td>
                          <td className="px-3 py-2 text-right">{t.sampleCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : (
          <p className="text-sm text-zinc-600">加载中...</p>
        )}
      </div>
    </main>
  );
}

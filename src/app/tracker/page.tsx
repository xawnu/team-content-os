"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type EpisodeRow = {
  id: string;
  topic: string;
  targetKeyword?: string | null;
  ctr?: number | null;
  retention30s?: number | null;
  views7d?: number | null;
  winOrFail?: string | null;
};

type Summary = {
  ownSummary: {
    avgCtr: number;
    avgRetention30s: number;
    avgViews7d: number;
    measuredCount: number;
  };
  ownEpisodes: EpisodeRow[];
  competitorTrends: Array<{ keyword: string; avgScore: number; sampleCount: number }>;
  recommendation: { ownFocus: string; marketSignal: string };
};

type NextActions = {
  keywordScores: Array<{ keyword: string; count: number; avgCtr: number; avgRetention: number; avgViews: number; score: number }>;
  nextActions: string[];
};

export default function TrackerPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [actions, setActions] = useState<NextActions | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const [s, a] = await Promise.all([fetch("/api/tracker/summary"), fetch("/api/tracker/next-actions")]);
    const sj = await s.json();
    const aj = await a.json();
    if (s.ok && sj.ok) setData(sj);
    if (a.ok && aj.ok) setActions(aj);
  }

  async function saveMetric(episodeId: string, payload: { ctr?: number; retention30s?: number; views7d?: number }) {
    setSavingId(episodeId);
    await fetch("/api/planner/episodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeId, ...payload }),
    });
    await load();
    setSavingId(null);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tracker v2</h1>
            <p className="text-sm text-zinc-600">我方表现（主） + 竞品趋势（辅） + 下周动作建议</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/planner" className="rounded border border-zinc-300 px-3 py-1 text-sm">规划器</Link>
            <Link href="/discover" className="rounded border border-zinc-300 px-3 py-1 text-sm">发现页</Link>
            <Link href="/reports" className="rounded border border-zinc-300 px-3 py-1 text-sm">周报</Link>
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
              {actions?.nextActions?.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                  {actions.nextActions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ) : null}
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

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">指标回填（闭环）</h2>
              <div className="space-y-2">
                {data.ownEpisodes.slice(0, 8).map((e) => (
                  <MetricRow key={e.id} episode={e} onSave={saveMetric} saving={savingId === e.id} />
                ))}
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

function MetricRow({
  episode,
  onSave,
  saving,
}: {
  episode: EpisodeRow;
  onSave: (id: string, payload: { ctr?: number; retention30s?: number; views7d?: number }) => Promise<void>;
  saving: boolean;
}) {
  const [ctr, setCtr] = useState<string>(episode.ctr?.toString() ?? "");
  const [retention30s, setRetention30s] = useState<string>(episode.retention30s?.toString() ?? "");
  const [views7d, setViews7d] = useState<string>(episode.views7d?.toString() ?? "");

  return (
    <div className="grid gap-2 rounded border border-zinc-200 p-2 md:grid-cols-12">
      <div className="md:col-span-5 text-sm">{episode.topic}</div>
      <input value={ctr} onChange={(e) => setCtr(e.target.value)} placeholder="CTR" className="rounded border px-2 py-1 text-sm md:col-span-2" />
      <input value={retention30s} onChange={(e) => setRetention30s(e.target.value)} placeholder="30s留存" className="rounded border px-2 py-1 text-sm md:col-span-2" />
      <input value={views7d} onChange={(e) => setViews7d(e.target.value)} placeholder="7d播放" className="rounded border px-2 py-1 text-sm md:col-span-2" />
      <button
        onClick={() => onSave(episode.id, { ctr: Number(ctr), retention30s: Number(retention30s), views7d: Number(views7d) })}
        disabled={saving}
        className="rounded bg-zinc-900 px-2 py-1 text-xs text-white md:col-span-1 disabled:opacity-50"
      >
        {saving ? "保存中" : "保存"}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Episode = {
  id: string;
  topic: string;
  targetKeyword?: string | null;
  plannedDate?: string | null;
  titleOptions: string[];
  metrics?: {
    ctr?: number | null;
    retention30s?: number | null;
    avgWatchTimeSec?: number | null;
    views7d?: number | null;
  } | null;
};

export default function PlannerPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadEpisodes() {
    const res = await fetch("/api/planner/episodes");
    const json = await res.json();
    if (res.ok && json.ok) setEpisodes(json.episodes ?? []);
  }

  async function generatePlan() {
    setLoading(true);
    await fetch("/api/planner/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 10, briefs: 3 }),
    });
    await loadEpisodes();
    setLoading(false);
  }

  useEffect(() => {
    loadEpisodes();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Planner v1</h1>
            <p className="text-sm text-zinc-600">自动生成周计划 + 查看内容执行清单</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/discover" className="rounded border border-zinc-300 px-3 py-1 text-sm">返回发现页</Link>
            <button
              onClick={generatePlan}
              disabled={loading}
              className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {loading ? "生成中..." : "生成周计划(10条)"}
            </button>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-100 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">主题</th>
                  <th className="px-3 py-2 text-left">关键词</th>
                  <th className="px-3 py-2 text-left">计划日期</th>
                  <th className="px-3 py-2 text-left">标题候选</th>
                  <th className="px-3 py-2 text-left">指标</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((e) => (
                  <tr key={e.id} className="border-t border-zinc-100 align-top">
                    <td className="px-3 py-2 font-medium">{e.topic}</td>
                    <td className="px-3 py-2">{e.targetKeyword || "-"}</td>
                    <td className="px-3 py-2">{e.plannedDate ? new Date(e.plannedDate).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2 text-zinc-600">{(e.titleOptions || []).slice(0, 2).join(" / ")}</td>
                    <td className="px-3 py-2 text-xs text-zinc-600">
                      CTR: {e.metrics?.ctr ?? "-"} | 30s: {e.metrics?.retention30s ?? "-"} | 7d: {e.metrics?.views7d ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SimilarRow = {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  similarity: number;
  matchedTerms: string[];
};

type SimilarRunRow = {
  id: string;
  seedInput: string;
  query: string;
  createdAt: string;
  _count: { items: number };
};

type SimilarRunDetail = {
  id: string;
  seedInput: string;
  query: string;
  createdAt: string;
  items: SimilarRow[];
};

export default function SimilarPage() {
  const [seedChannelId, setSeedChannelId] = useState("");
  const [similarItems, setSimilarItems] = useState<SimilarRow[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarRuns, setSimilarRuns] = useState<SimilarRunRow[]>([]);
  const [similarHistoryPage, setSimilarHistoryPage] = useState(1);
  const [similarHistoryTotalPages, setSimilarHistoryTotalPages] = useState(1);
  const [similarHistoryLoading, setSimilarHistoryLoading] = useState(false);
  const [selectedSimilarRunId, setSelectedSimilarRunId] = useState<string | null>(null);
  const [selectedSimilarRun, setSelectedSimilarRun] = useState<SimilarRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);

  async function loadSimilarHistory(page = similarHistoryPage) {
    setSimilarHistoryLoading(true);
    try {
      const res = await fetch(`/api/youtube/similar/history?page=${page}&pageSize=10`);
      const json = await res.json();
      if (res.ok && json?.ok) {
        setSimilarRuns(json.runs ?? []);
        setSimilarHistoryPage(json.page ?? page);
        setSimilarHistoryTotalPages(json.totalPages ?? 1);
      }
    } finally {
      setSimilarHistoryLoading(false);
    }
  }

  async function loadSimilarRunDetail(runId: string) {
    setSelectedSimilarRunId(runId);
    const res = await fetch(`/api/youtube/similar/history?runId=${encodeURIComponent(runId)}`);
    const json = await res.json();
    if (res.ok && json?.ok && json?.run) {
      setSelectedSimilarRun({
        id: json.run.id,
        seedInput: json.run.seedInput,
        query: json.run.query,
        createdAt: json.run.createdAt,
        items: json.run.items ?? [],
      });
    }
  }

  async function runSimilar() {
    if (!seedChannelId.trim()) return;
    setSimilarLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/similar?seed=${encodeURIComponent(seedChannelId.trim())}&persist=1${forceRefresh ? "&refresh=1" : ""}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "相似频道请求失败");
      setSimilarItems(json.items ?? []);
      loadSimilarHistory(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
      setSimilarItems([]);
    } finally {
      setSimilarLoading(false);
    }
  }

  useEffect(() => {
    loadSimilarHistory();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">种子频道找同类</h1>
            <p className="text-sm text-zinc-600">输入 channelId / @handle / 频道链接，快速找同类频道</p>
          </div>
          <div className="text-xs text-zinc-500">使用顶部统一导航切换模块</div>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="space-y-1 text-sm md:col-span-4">
              <span className="text-zinc-600">输入 channelId / @handle / 频道链接</span>
              <input
                value={seedChannelId}
                onChange={(e) => setSeedChannelId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                placeholder="@homesteadrootss 或 https://www.youtube.com/@homesteadrootss"
              />
            </label>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-1 text-xs text-zinc-600">
                <input type="checkbox" checked={forceRefresh} onChange={(e) => setForceRefresh(e.target.checked)} />
                强制刷新
              </label>
              <button
                onClick={runSimilar}
                disabled={similarLoading}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {similarLoading ? "匹配中..." : "找相似频道"}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-lg bg-rose-100 p-3 text-sm text-rose-700">{error}</div>}

        {!!similarItems.length && (
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-700">本次匹配结果</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">频道</th>
                    <th className="px-3 py-2 text-right">相似度</th>
                    <th className="px-3 py-2 text-left">匹配词</th>
                  </tr>
                </thead>
                <tbody>
                  {similarItems.map((row) => (
                    <tr key={row.channelId} className="border-t border-zinc-100">
                      <td className="px-3 py-2 font-medium">
                        <a href={row.channelUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                          {row.channelTitle}
                        </a>
                      </td>
                      <td className="px-3 py-2 text-right">{row.similarity}%</td>
                      <td className="px-3 py-2 text-zinc-600">{row.matchedTerms.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">同类匹配历史</h2>
            <button onClick={() => loadSimilarHistory(similarHistoryPage)} className="text-xs text-zinc-600 underline">刷新</button>
          </div>

          {similarHistoryLoading ? (
            <p className="text-sm text-zinc-500">加载中...</p>
          ) : similarRuns.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">时间</th>
                    <th className="px-3 py-2 text-left">种子输入</th>
                    <th className="px-3 py-2 text-left">检索词</th>
                    <th className="px-3 py-2 text-right">结果数</th>
                    <th className="px-3 py-2 text-left">Run ID</th>
                  </tr>
                </thead>
                <tbody>
                  {similarRuns.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t border-zinc-100 cursor-pointer hover:bg-zinc-50 ${selectedSimilarRunId === r.id ? "bg-zinc-50" : ""}`}
                      onClick={() => loadSimilarRunDetail(r.id)}
                    >
                      <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">{r.seedInput}</td>
                      <td className="px-3 py-2">{r.query}</td>
                      <td className="px-3 py-2 text-right">{r._count.items}</td>
                      <td className="px-3 py-2 text-xs text-zinc-500">{r.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">暂无历史记录。</p>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
            <span>第 {similarHistoryPage} / {similarHistoryTotalPages} 页</span>
            <div className="flex gap-2">
              <button onClick={() => loadSimilarHistory(Math.max(1, similarHistoryPage - 1))} disabled={similarHistoryPage <= 1 || similarHistoryLoading} className="rounded border border-zinc-300 px-2 py-1 disabled:opacity-40">上一页</button>
              <button onClick={() => loadSimilarHistory(Math.min(similarHistoryTotalPages, similarHistoryPage + 1))} disabled={similarHistoryPage >= similarHistoryTotalPages || similarHistoryLoading} className="rounded border border-zinc-300 px-2 py-1 disabled:opacity-40">下一页</button>
            </div>
          </div>

          {selectedSimilarRun && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
              <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                历史详情：{selectedSimilarRun.seedInput} · {new Date(selectedSimilarRun.createdAt).toLocaleString()}
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">频道</th>
                    <th className="px-3 py-2 text-right">相似度</th>
                    <th className="px-3 py-2 text-left">匹配词</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSimilarRun.items.map((i) => (
                    <tr key={`${selectedSimilarRun.id}-${i.channelId}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2">
                        <a href={i.channelUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{i.channelTitle}</a>
                      </td>
                      <td className="px-3 py-2 text-right">{i.similarity}%</td>
                      <td className="px-3 py-2 text-zinc-600">{i.matchedTerms.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

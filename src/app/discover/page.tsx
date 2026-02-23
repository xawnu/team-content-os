"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AddToPoolButton from "@/components/AddToPoolButton";

type ChannelRow = {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  videoCount7d: number;
  viewsSum7d: number;
  viewsMedian7d: number;
  score: number;
  sampleTitles: string[];
  subscriberCount?: number;
  channelAgeDays?: number;
  viewSubRatio?: number;
};

type DiscoverResponse = {
  ok: boolean;
  query: string;
  channels: ChannelRow[];
  fetchedVideos: number;
  filteredVideos: number;
  runId?: string | null;
  error?: string;
};

type NichePreset = {
  slug: string;
  name: string;
  primaryQuery: string;
  minDurationSec: number;
  windowDays: number;
};

type RunRow = {
  id: string;
  query: string;
  days: number;
  fetchedVideos: number;
  filteredVideos: number;
  createdAt: string;
  _count: { candidates: number };
};

type RunDetail = {
  id: string;
  query: string;
  createdAt: string;
  candidates: ChannelRow[];
};

type AnalyzeResult = {
  runId: string;
  query: string;
  topPatterns: { pattern: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  riskHits: { word: string; count: number }[];
};

function num(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("homestead");
  const [days, setDays] = useState(7);
  const [minDurationSec, setMinDurationSec] = useState(240);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiscoverResponse | null>(null);
  const [minSubscribers, setMinSubscribers] = useState(1000);
  const [maxSubscribers, setMaxSubscribers] = useState(2000);
  const [maxChannelAgeDays, setMaxChannelAgeDays] = useState(0);
  const [minViewSubRatio, setMinViewSubRatio] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [niches, setNiches] = useState<NichePreset[]>([]);
  const [selectedNiche, setSelectedNiche] = useState("homestead");

  const [runs, setRuns] = useState<RunRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);

  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisProvider, setAnalysisProvider] = useState<string>("rules");
  const [useAiAnalysis, setUseAiAnalysis] = useState(true);
  const [marks, setMarks] = useState<Record<string, { channelTitle?: string; marked?: boolean; priority?: boolean }>>({});
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [onlyPriority, setOnlyPriority] = useState(false);
  const [discoverMode, setDiscoverMode] = useState<"keyword" | "radar">("keyword");

  const top = useMemo(() => data?.channels?.[0], [data]);

  async function loadHistory(page = historyPage) {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/youtube/discover/history?page=${page}&pageSize=10`);
      const json = await res.json();
      if (res.ok && json?.ok) {
        setRuns(json.runs ?? []);
        setHistoryPage(json.page ?? page);
        setHistoryTotalPages(json.totalPages ?? 1);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadRunDetail(runId: string) {
    setSelectedRunId(runId);
    const res = await fetch(`/api/youtube/discover/history?runId=${encodeURIComponent(runId)}`);
    const json = await res.json();
    if (res.ok && json?.ok && json?.run) {
      setSelectedRun({
        id: json.run.id,
        query: json.run.query,
        createdAt: json.run.createdAt,
        candidates: json.run.candidates ?? [],
      });
    }
    loadAnalysis(runId);
  }

  async function deleteRun(runId: string) {
    const ok = window.confirm("确认删除这条历史抓取记录吗？删除后不可恢复。");
    if (!ok) return;

    const res = await fetch("/api/youtube/discover/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    });
    const json = await res.json();
    if (res.ok && json?.ok) {
      if (selectedRunId === runId) {
        setSelectedRunId(null);
        setSelectedRun(null);
      }
      await loadHistory(historyPage);
    } else {
      alert(json?.error || "删除失败");
    }
  }

  async function loadAnalysis(runId?: string) {
    setAnalysisLoading(true);
    try {
      const base = runId ? `/api/youtube/analyze?runId=${encodeURIComponent(runId)}` : "/api/youtube/analyze";
      const url = `${base}${base.includes("?") ? "&" : "?"}ai=${useAiAnalysis ? "1" : "0"}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json?.ok) {
        setAnalysisProvider(json.provider ?? "rules");
        setAnalysis({
          runId: json.runId,
          query: json.query,
          topPatterns: json.topPatterns ?? [],
          topKeywords: json.topKeywords ?? [],
          riskHits: json.riskHits ?? [],
        });
      }
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function loadMarks() {
    const res = await fetch("/api/channel-marks");
    const json = await res.json();
    if (res.ok && json?.ok) setMarks(json.marks ?? {});
  }

  async function toggleMarked(row: ChannelRow) {
    const current = marks[row.channelId];
    const nextMarked = !(current?.marked ?? Boolean(current));
    const nextPriority = current?.priority ?? false;

    if (!nextMarked && !nextPriority) {
      const res = await fetch("/api/channel-marks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: row.channelId }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) setMarks(json.marks ?? {});
      return;
    }

    const res = await fetch("/api/channel-marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: row.channelId,
        channelTitle: row.channelTitle,
        marked: nextMarked,
        priority: nextPriority,
      }),
    });
    const json = await res.json();
    if (res.ok && json?.ok) setMarks(json.marks ?? {});
  }

  async function togglePriority(row: ChannelRow) {
    const current = marks[row.channelId];
    const nextPriority = !(current?.priority ?? false);
    const nextMarked = current?.marked ?? true;

    if (!nextMarked && !nextPriority) {
      const res = await fetch("/api/channel-marks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: row.channelId }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) setMarks(json.marks ?? {});
      return;
    }

    const res = await fetch("/api/channel-marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: row.channelId,
        channelTitle: row.channelTitle,
        marked: nextMarked,
        priority: nextPriority,
      }),
    });
    const json = await res.json();
    if (res.ok && json?.ok) setMarks(json.marks ?? {});
  }

  useEffect(() => {
    async function loadNiches() {
      const res = await fetch("/api/niches");
      const json = await res.json();
      if (res.ok && json?.ok && Array.isArray(json.items)) {
        setNiches(json.items);
      }
    }

    loadNiches();
    loadHistory();
    loadAnalysis();
    loadMarks();
  }, []);

  useEffect(() => {
    const niche = niches.find((n) => n.slug === selectedNiche);
    if (!niche) return;
    setQuery(niche.primaryQuery);
    setDays(niche.windowDays);
    setMinDurationSec(niche.minDurationSec);
  }, [selectedNiche, niches]);

  useEffect(() => {
    if (discoverMode === "radar") {
      setMinSubscribers(500);
      setMaxSubscribers(20000);
      setMaxChannelAgeDays(0);
      setMinViewSubRatio(0);
    } else {
      setMinSubscribers(1000);
      setMaxSubscribers(2000);
      setMaxChannelAgeDays(0);
      setMinViewSubRatio(0);
    }
  }, [discoverMode]);

  function addToReferencePool(row: ChannelRow) {
    try {
      // 使用频道 URL 作为参考
      const channelUrl = row.channelUrl;
      const old = typeof window !== "undefined" ? window.localStorage.getItem("tcos_reference_videos") : null;
      const existing = old ? (JSON.parse(old) as string[]) : [];
      
      // 检查是否已存在
      if (existing.includes(channelUrl)) {
        alert(`频道 "${row.channelTitle}" 已在参考池中`);
        return;
      }
      
      // 添加频道 URL
      const merged = [...existing, channelUrl];
      window.localStorage.setItem("tcos_reference_videos", JSON.stringify(merged));
      
      // 显示成功提示
      alert(`✓ 已添加 "${row.channelTitle}" 到参考池\n当前参考池：${merged.length} 个频道`);
    } catch (error) {
      console.error('添加到参考池失败:', error);
      alert('添加失败，请重试');
    }
  }

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const effectiveQuery = discoverMode === "radar" ? (query || "how to") : query;
      const params = new URLSearchParams({
        q: effectiveQuery,
        niche: selectedNiche,
        days: String(days),
        minDurationSec: String(minDurationSec),
        maxResults: "50",
        region: "US",
        lang: "en",
        persist: "1",
      });
      if (discoverMode === "radar") {
        params.set("minSubscribers", String(minSubscribers));
        params.set("maxSubscribers", String(maxSubscribers));
        params.set("maxChannelAgeDays", String(maxChannelAgeDays));
        params.set("minViewSubRatio", String(minViewSubRatio));
      }
      const res = await fetch(`/api/youtube/discover?${params.toString()}`);
      const json = (await res.json()) as DiscoverResponse;
      if (!res.ok || !json.ok) throw new Error(json.error || "请求失败");
      setData(json);
      loadHistory(1);
      if (json.runId) loadAnalysis(json.runId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">增长频道发现</h1>
            <p className="text-sm text-zinc-600">可视化查看 YouTube 快增长频道候选池</p>
          </div>
          <div className="text-xs text-zinc-500">历史记录在下方，可直接下滑查看</div>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={() => setDiscoverMode("keyword")}
              className={`rounded px-3 py-1 text-xs ${discoverMode === "keyword" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700"}`}
            >
              关键词模式
            </button>
            <button
              onClick={() => setDiscoverMode("radar")}
              className={`rounded px-3 py-1 text-xs ${discoverMode === "radar" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700"}`}
            >
              全站雷达模式
            </button>
            <span className="text-xs text-zinc-500 self-center">
              {discoverMode === "keyword" ? "按赛道关键词精准抓取" : "宽筛探索，用于发现新机会"}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-9">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">赛道模板</span>
              <select value={selectedNiche} onChange={(e) => setSelectedNiche(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2">
                {!niches.length && <option value="homestead">Homestead / Off-grid</option>}
                {niches.map((n) => (
                  <option key={n.slug} value={n.slug}>{n.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">关键词</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">窗口天数</span>
              <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value) || 7)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">最小时长(秒)</span>
              <input type="number" value={minDurationSec} onChange={(e) => setMinDurationSec(Number(e.target.value) || 240)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">最小粉丝</span>
              <input type="number" value={minSubscribers} onChange={(e) => setMinSubscribers(Number(e.target.value) || 0)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">最大粉丝</span>
              <input type="number" value={maxSubscribers} onChange={(e) => setMaxSubscribers(Number(e.target.value) || 0)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">最大频道年龄(天)</span>
              <input type="number" value={maxChannelAgeDays} onChange={(e) => setMaxChannelAgeDays(Number(e.target.value) || 0)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 inline-flex items-center gap-1">
                最小播粉比
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 text-[10px] text-zinc-500 cursor-help"
                  title="播粉比 = 中位播放量 ÷ 订阅数
例子：中位播放 8,000，订阅 2,000，播粉比 = 4.0。
值越高，通常代表内容“超粉丝圈”传播能力更强。"
                >
                  ?
                </span>
              </span>
              <input type="number" step="0.1" value={minViewSubRatio} onChange={(e) => setMinViewSubRatio(Number(e.target.value) || 0)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <div className="flex items-end gap-2 md:col-span-9">
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1 text-xs text-zinc-600">
                  <input type="checkbox" checked={onlyMarked} onChange={(e) => setOnlyMarked(e.target.checked)} />
                  只看已标记
                </label>
                <label className="flex items-center gap-1 text-xs text-zinc-600">
                  <input type="checkbox" checked={onlyPriority} onChange={(e) => setOnlyPriority(e.target.checked)} />
                  只看重点关注
                </label>
              </div>
              <button onClick={run} disabled={loading} className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
                {loading ? "抓取中..." : "运行分析"}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-lg bg-rose-100 p-3 text-sm text-rose-700">{error}</div>}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-5">
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">候选频道</p><p className="mt-1 text-2xl font-semibold">{data.channels.length}</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">拉取视频</p><p className="mt-1 text-2xl font-semibold">{num(data.fetchedVideos)}</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">过滤后视频</p><p className="mt-1 text-2xl font-semibold">{num(data.filteredVideos)}</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">Top1</p><p className="mt-1 text-sm font-semibold">{top?.channelTitle ?? "-"}</p></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">入库批次</p><p className="mt-1 truncate text-sm font-semibold">{data.runId ?? "-"}</p></div>
            </section>

            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-100 text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 text-left">频道</th>
                      <th className="px-3 py-2 text-right">Score</th>
                      <th className="px-3 py-2 text-right">7天视频数</th>
                      <th className="px-3 py-2 text-right">7天总播放</th>
                      <th className="px-3 py-2 text-right">中位播放</th>
                      <th className="px-3 py-2 text-right">粉丝</th>
                      <th className="px-3 py-2 text-right">频道年龄</th>
                      <th className="px-3 py-2 text-right">播粉比</th>
                      <th className="px-3 py-2 text-left">样例标题</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.channels
                      .filter((row) => !onlyMarked || Boolean(marks[row.channelId]?.marked ?? marks[row.channelId]))
                      .filter((row) => !onlyPriority || Boolean(marks[row.channelId]?.priority))
                      .map((row) => (
                      <tr key={row.channelId} className="border-t border-zinc-100 align-top">
                        <td className="px-3 py-2 font-medium">
                          <div className="flex items-center gap-2">
                            <a href={row.channelUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{row.channelTitle}</a>
                            {marks[row.channelId]?.marked ? <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700">标记</span> : null}
                            {marks[row.channelId]?.priority ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">重点</span> : null}
                            <button onClick={() => toggleMarked(row)} className="rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-50">{marks[row.channelId]?.marked ? "取消标记" : "标记"}</button>
                            <button onClick={() => togglePriority(row)} className="rounded border border-amber-300 px-1.5 py-0.5 text-[10px] text-amber-700 hover:bg-amber-50">{marks[row.channelId]?.priority ? "取消重点" : "重点关注"}</button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{row.score}</td>
                        <td className="px-3 py-2 text-right">{num(row.videoCount7d)}</td>
                        <td className="px-3 py-2 text-right">{num(row.viewsSum7d)}</td>
                        <td className="px-3 py-2 text-right">{num(row.viewsMedian7d)}</td>
                        <td className="px-3 py-2 text-right">{row.subscriberCount ? num(row.subscriberCount) : "-"}</td>
                        <td className="px-3 py-2 text-right">{row.channelAgeDays != null ? `${row.channelAgeDays}d` : "-"}</td>
                        <td className="px-3 py-2 text-right">{row.viewSubRatio != null ? row.viewSubRatio.toFixed(2) : "-"}</td>
                        <td className="px-3 py-2 text-zinc-600">
                          <div className="space-y-1">
                            <div className="text-xs">{row.sampleTitles.join(" / ")}</div>
                            <button
                              onClick={() => addToReferencePool(row)}
                              className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors"
                            >
                              + 添加到参考池
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <section id="history" className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">历史抓取记录</h2>
            <button onClick={() => loadHistory(historyPage)} className="text-xs text-zinc-600 underline">刷新</button>
          </div>
          {historyLoading ? (
            <p className="text-sm text-zinc-500">加载中...</p>
          ) : runs.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-600"><tr><th className="px-3 py-2 text-left">时间</th><th className="px-3 py-2 text-left">关键词</th><th className="px-3 py-2 text-right">窗口</th><th className="px-3 py-2 text-right">候选频道</th><th className="px-3 py-2 text-right">过滤视频</th><th className="px-3 py-2 text-left">Run ID</th><th className="px-3 py-2 text-right">操作</th></tr></thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className={`border-t border-zinc-100 cursor-pointer hover:bg-zinc-50 ${selectedRunId === r.id ? "bg-zinc-50" : ""}`} onClick={() => loadRunDetail(r.id)}>
                      <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td><td className="px-3 py-2">{r.query}</td><td className="px-3 py-2 text-right">{r.days}d</td><td className="px-3 py-2 text-right">{r._count.candidates}</td><td className="px-3 py-2 text-right">{r.filteredVideos}</td><td className="px-3 py-2 text-xs text-zinc-500">{r.id}</td><td className="px-3 py-2 text-right"><button onClick={(e) => { e.stopPropagation(); deleteRun(r.id); }} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">删除</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">暂无历史记录，先运行一次分析。</p>
          )}
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
            <span>第 {historyPage} / {historyTotalPages} 页</span>
            <div className="flex gap-2">
              <button onClick={() => loadHistory(Math.max(1, historyPage - 1))} disabled={historyPage <= 1 || historyLoading} className="rounded border border-zinc-300 px-2 py-1 disabled:opacity-40">上一页</button>
              <button onClick={() => loadHistory(Math.min(historyTotalPages, historyPage + 1))} disabled={historyPage >= historyTotalPages || historyLoading} className="rounded border border-zinc-300 px-2 py-1 disabled:opacity-40">下一页</button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Analyzer v1（标题模式/关键词/风险词）</h2>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1 text-zinc-600"><input type="checkbox" checked={useAiAnalysis} onChange={(e) => setUseAiAnalysis(e.target.checked)} />AI增强</label>
              <button onClick={() => loadAnalysis(selectedRunId ?? undefined)} className="text-zinc-600 underline">重新分析</button>
            </div>
          </div>
          {analysisLoading ? (
            <p className="text-sm text-zinc-500">分析中...</p>
          ) : analysis ? (
            <>
              <p className="mb-2 text-xs text-zinc-500">分析来源：{analysisProvider}</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div><p className="mb-2 text-xs text-zinc-500">Top 标题模式</p><ul className="space-y-1 text-sm text-zinc-700">{analysis.topPatterns.slice(0, 6).map((p, i) => <li key={`${p.pattern}-${i}`}>• {p.pattern} ({p.count})</li>)}</ul></div>
                <div><p className="mb-2 text-xs text-zinc-500">Top 关键词</p><ul className="space-y-1 text-sm text-zinc-700">{analysis.topKeywords.slice(0, 10).map((k) => <li key={k.keyword}>• {k.keyword} ({k.count})</li>)}</ul></div>
                <div><p className="mb-2 text-xs text-zinc-500">风险词命中</p><ul className="space-y-1 text-sm text-zinc-700">{analysis.riskHits.length ? analysis.riskHits.map((r) => <li key={r.word}>• {r.word} ({r.count})</li>) : <li>• 暂无明显风险词</li>}</ul></div>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500">暂无可分析数据，请先运行一次增长发现。</p>
          )}
        </section>

        {selectedRun && (
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-700">历史批次详情：{selectedRun.query} · {new Date(selectedRun.createdAt).toLocaleString()}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-600"><tr><th className="px-3 py-2 text-left">频道</th><th className="px-3 py-2 text-right">Score</th><th className="px-3 py-2 text-right">7天视频数</th><th className="px-3 py-2 text-right">7天总播放</th><th className="px-3 py-2 text-right">中位播放</th></tr></thead>
                <tbody>
                  {selectedRun.candidates.map((row) => (
                    <tr key={`${selectedRun.id}-${row.channelId}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2 font-medium">
                        <div className="flex items-center gap-2">
                          <a href={row.channelUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{row.channelTitle}</a>
                          {marks[row.channelId]?.marked ? <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700">标记</span> : null}
                          {marks[row.channelId]?.priority ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">重点</span> : null}
                          <button onClick={() => toggleMarked(row)} className="rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-50">{marks[row.channelId]?.marked ? "取消标记" : "标记"}</button>
                          <button onClick={() => togglePriority(row)} className="rounded border border-amber-300 px-1.5 py-0.5 text-[10px] text-amber-700 hover:bg-amber-50">{marks[row.channelId]?.priority ? "取消重点" : "重点关注"}</button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{row.score}</td>
                      <td className="px-3 py-2 text-right">{num(row.videoCount7d)}</td>
                      <td className="px-3 py-2 text-right">{num(row.viewsSum7d)}</td>
                      <td className="px-3 py-2 text-right">{num(row.viewsMedian7d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

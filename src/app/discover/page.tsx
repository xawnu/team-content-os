"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ChannelRow = {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  videoCount7d: number;
  viewsSum7d: number;
  viewsMedian7d: number;
  score: number;
  sampleTitles: string[];
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

type SimilarRow = {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  similarity: number;
  matchedTerms: string[];
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
  const [error, setError] = useState<string | null>(null);
  const [niches, setNiches] = useState<NichePreset[]>([]);
  const [selectedNiche, setSelectedNiche] = useState("homestead");
  const [seedChannelId, setSeedChannelId] = useState("");
  const [similarItems, setSimilarItems] = useState<SimilarRow[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const top = useMemo(() => data?.channels?.[0], [data]);

  useEffect(() => {
    async function loadNiches() {
      const res = await fetch("/api/niches");
      const json = await res.json();
      if (res.ok && json?.ok && Array.isArray(json.items)) {
        setNiches(json.items);
      }
    }

    loadNiches();
  }, []);

  useEffect(() => {
    const niche = niches.find((n) => n.slug === selectedNiche);
    if (!niche) return;
    setQuery(niche.primaryQuery);
    setDays(niche.windowDays);
    setMinDurationSec(niche.minDurationSec);
  }, [selectedNiche, niches]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: query,
        niche: selectedNiche,
        days: String(days),
        minDurationSec: String(minDurationSec),
        maxResults: "50",
        region: "US",
        lang: "en",
        persist: "1",
      });
      const res = await fetch(`/api/youtube/discover?${params.toString()}`);
      const json = (await res.json()) as DiscoverResponse;
      if (!res.ok || !json.ok) throw new Error(json.error || "请求失败");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function runSimilar() {
    if (!seedChannelId.trim()) return;
    setSimilarLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/similar?channelId=${encodeURIComponent(seedChannelId.trim())}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "相似频道请求失败");
      setSimilarItems(json.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
      setSimilarItems([]);
    } finally {
      setSimilarLoading(false);
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
          <Link href="/" className="text-sm text-zinc-600 underline">
            返回首页
          </Link>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">赛道模板</span>
              <select
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              >
                {!niches.length && <option value="homestead">Homestead / Off-grid</option>}
                {niches.map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">关键词</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">窗口天数</span>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 7)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600">最小时长(秒)</span>
              <input
                type="number"
                value={minDurationSec}
                onChange={(e) => setMinDurationSec(Number(e.target.value) || 240)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <div className="flex items-end">
              <button
                onClick={run}
                disabled={loading}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {loading ? "抓取中..." : "运行分析"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">种子频道找同类</h2>
          <div className="grid gap-3 md:grid-cols-5">
            <label className="space-y-1 text-sm md:col-span-4">
              <span className="text-zinc-600">输入 channelId（例如 UCxxxxxxxx）</span>
              <input
                value={seedChannelId}
                onChange={(e) => setSeedChannelId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                placeholder="UCUdlMZ02XYLVeknNEY8F4vw"
              />
            </label>
            <div className="flex items-end">
              <button
                onClick={runSimilar}
                disabled={similarLoading}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {similarLoading ? "匹配中..." : "找相似频道"}
              </button>
            </div>
          </div>

          {!!similarItems.length && (
            <div className="mt-4 overflow-x-auto">
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
          )}
        </section>

        {error && <div className="rounded-lg bg-rose-100 p-3 text-sm text-rose-700">{error}</div>}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-5">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-zinc-500">候选频道</p>
                <p className="mt-1 text-2xl font-semibold">{data.channels.length}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-zinc-500">拉取视频</p>
                <p className="mt-1 text-2xl font-semibold">{num(data.fetchedVideos)}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-zinc-500">过滤后视频</p>
                <p className="mt-1 text-2xl font-semibold">{num(data.filteredVideos)}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-zinc-500">Top1</p>
                <p className="mt-1 text-sm font-semibold">{top?.channelTitle ?? "-"}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-zinc-500">入库批次</p>
                <p className="mt-1 truncate text-sm font-semibold">{data.runId ?? "-"}</p>
              </div>
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
                      <th className="px-3 py-2 text-left">样例标题</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.channels.map((row) => (
                      <tr key={row.channelId} className="border-t border-zinc-100 align-top">
                        <td className="px-3 py-2 font-medium">
                          <a
                            href={row.channelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 hover:underline"
                          >
                            {row.channelTitle}
                          </a>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{row.score}</td>
                        <td className="px-3 py-2 text-right">{num(row.videoCount7d)}</td>
                        <td className="px-3 py-2 text-right">{num(row.viewsSum7d)}</td>
                        <td className="px-3 py-2 text-right">{num(row.viewsMedian7d)}</td>
                        <td className="px-3 py-2 text-zinc-600">{row.sampleTitles.join(" / ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

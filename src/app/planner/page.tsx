"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Episode = {
  id: string;
  topic: string;
  targetKeyword?: string | null;
  plannedDate?: string | null;
  titleOptions: string[];
};

type DetailedScript = {
  topic: string;
  title: string;
  thumbnailCopy: string;
  opening15s: string[];
  timeline: Array<{ time: string; segment: string; voiceover: string; visuals: string }>;
  contentItems: string[];
  cta: string;
  publishCopy: string;
  tags: string[];
  differentiation: string[];
  provider: "ai" | "template";
};

export default function PlannerPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [seedText, setSeedText] = useState("@homesteadrootss");
  const [direction, setDirection] = useState("同类型视频详细文案");
  const [topicLock, setTopicLock] = useState("rain sounds");
  const [bannedWords, setBannedWords] = useState("植物,甲醛,净化空气");
  const [referenceVideosText, setReferenceVideosText] = useState("");
  const [script, setScript] = useState<DetailedScript | null>(null);
  const [error, setError] = useState<string>("");

  async function loadEpisodes() {
    const res = await fetch("/api/planner/episodes");
    const json = await res.json();
    if (res.ok && json.ok) setEpisodes(json.episodes ?? []);
  }

  async function generateOneScript() {
    const referenceVideos = referenceVideosText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (!referenceVideos.length) {
      setError("请先在参考视频池里放入1-3条视频再生成");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/planner/script-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedText, direction, topicLock, bannedWords, referenceVideos, language: "zh" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "生成失败");
      setScript(json.script);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteEpisode(episodeId: string) {
    const ok = window.confirm("确认删除这条历史文案/选题吗？删除后不可恢复。");
    if (!ok) return;

    const res = await fetch("/api/planner/episodes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeId }),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) {
      alert(json?.error || "删除失败");
      return;
    }
    await loadEpisodes();
  }

  useEffect(() => {
    loadEpisodes();
    const cached = typeof window !== "undefined" ? window.localStorage.getItem("tcos_reference_videos") : null;
    if (cached) {
      try {
        const arr = JSON.parse(cached) as string[];
        if (Array.isArray(arr) && arr.length) setReferenceVideosText(arr.slice(0, 3).join("\n"));
      } catch {
        // ignore bad cache
      }
    }
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">文案生成器</h1>
              <p className="text-sm text-zinc-600">根据参考频道，生成 1 篇同类型视频详细文案</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/discover" className="rounded border border-zinc-300 px-3 py-1 text-sm">发现页</Link>
              <Link href="/similar" className="rounded border border-zinc-300 px-3 py-1 text-sm">种子找同类</Link>
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-6">
            <label className="space-y-1 md:col-span-3">
              <span className="text-xs text-zinc-500">参考频道（支持 @handle/链接，多行或逗号分隔）</span>
              <textarea
                value={seedText}
                onChange={(e) => setSeedText(e.target.value)}
                className="min-h-20 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="space-y-1 md:col-span-1">
              <span className="text-xs text-zinc-500">输出方向</span>
              <input
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="space-y-1 md:col-span-1">
              <span className="text-xs text-zinc-500">主题锁定（防跑偏）</span>
              <input
                value={topicLock}
                onChange={(e) => setTopicLock(e.target.value)}
                className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                placeholder="例如：rain sounds"
              />
            </label>
            <label className="space-y-1 md:col-span-1">
              <span className="text-xs text-zinc-500">禁用词（逗号分隔）</span>
              <input
                value={bannedWords}
                onChange={(e) => setBannedWords(e.target.value)}
                className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                placeholder="例如：植物,甲醛"
              />
            </label>
            <label className="space-y-1 md:col-span-6">
              <span className="text-xs text-zinc-500">参考视频池（每行1条，先从发现页加入，最多3条）</span>
              <textarea
                value={referenceVideosText}
                onChange={(e) => setReferenceVideosText(e.target.value)}
                className="min-h-20 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                placeholder="示例：Rain Sounds for Sleep - https://youtube.com/..."
              />
            </label>
            <div className="flex items-end md:col-span-6">
              <button
                onClick={generateOneScript}
                disabled={loading}
                className="w-full rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {loading ? "生成中..." : "基于参考频道生成详细文案（1篇）"}
              </button>
            </div>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </header>

        {script ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">生成结果（{script.provider === "ai" ? "AI" : "模板"}）</h2>
              <p className="text-xs text-zinc-500">仅生成 1 篇，可直接拍摄</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border border-zinc-200 p-3"><p className="text-xs text-zinc-500">主题</p><p className="font-medium">{script.topic}</p></div>
              <div className="rounded border border-zinc-200 p-3"><p className="text-xs text-zinc-500">标题</p><p className="font-medium">{script.title}</p></div>
            </div>

            <div className="rounded border border-zinc-200 p-3">
              <p className="text-xs text-zinc-500">封面文案</p>
              <p className="font-medium">{script.thumbnailCopy}</p>
            </div>

            <div className="rounded border border-zinc-200 p-3">
              <p className="mb-2 text-xs text-zinc-500">开场前15秒逐句口播</p>
              <ul className="space-y-1 text-sm">{script.opening15s.map((line, i) => <li key={i}>• {line}</li>)}</ul>
            </div>

            {script.contentItems?.length ? (
              <div className="rounded border border-zinc-200 p-3">
                <p className="mb-2 text-xs text-zinc-500">正文要点清单（数字承诺对齐）</p>
                <ul className="grid gap-1 text-sm md:grid-cols-2">
                  {script.contentItems.map((item, i) => <li key={i}>• {i + 1}. {item}</li>)}
                </ul>
              </div>
            ) : null}

            <div className="rounded border border-zinc-200 p-3">
              <p className="mb-2 text-xs text-zinc-500">时间轴分镜脚本</p>
              <div className="space-y-2 text-sm">
                {script.timeline.map((t, i) => (
                  <div key={i} className="rounded bg-zinc-50 p-2">
                    <p><span className="font-medium">{t.time}</span> · {t.segment}</p>
                    <p className="text-zinc-700">口播：{t.voiceover}</p>
                    <p className="text-zinc-600">画面：{t.visuals}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border border-zinc-200 p-3"><p className="text-xs text-zinc-500">收尾 CTA</p><p>{script.cta}</p></div>
              <div className="rounded border border-zinc-200 p-3"><p className="text-xs text-zinc-500">发布文案</p><p>{script.publishCopy}</p></div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border border-zinc-200 p-3"><p className="text-xs text-zinc-500">标签</p><p>{script.tags.join(" / ")}</p></div>
              <div className="rounded border border-zinc-200 p-3"><p className="text-xs text-zinc-500">差异化点（防抄袭）</p><ul className="text-sm space-y-1">{script.differentiation.map((d, i) => <li key={i}>• {d}</li>)}</ul></div>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">历史选题（可作为补充灵感）</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-100 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">主题</th>
                  <th className="px-3 py-2 text-left">关键词</th>
                  <th className="px-3 py-2 text-left">计划日期</th>
                  <th className="px-3 py-2 text-left">标题候选</th>
                  <th className="px-3 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((e) => (
                  <tr key={e.id} className="border-t border-zinc-100 align-top">
                    <td className="px-3 py-2 font-medium">{e.topic}</td>
                    <td className="px-3 py-2">{e.targetKeyword || "-"}</td>
                    <td className="px-3 py-2">{e.plannedDate ? new Date(e.plannedDate).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2 text-zinc-600">{(e.titleOptions || []).slice(0, 2).join(" / ")}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => deleteEpisode(e.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        删除
                      </button>
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

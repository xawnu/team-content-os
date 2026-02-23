"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReferenceVideoPool from "@/components/ReferenceVideoPool";
import QualityScoreCard from "@/components/QualityScoreCard";
import VersionHistory from "@/components/VersionHistory";
import VersionCompare from "@/components/VersionCompare";
import { evaluateScriptQuality } from "@/lib/script-quality";
type Episode = {
  id: string;
  topic: string;
  targetKeyword?: string | null;
  plannedDate?: string | null;
  titleOptions: string[];
  scriptOutline?: string | null;
  createdAt?: string;
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

type VideoInfo = {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
  url: string;
};

export default function PlannerPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [seedText, setSeedText] = useState("@homesteadrootss");
  const [direction, setDirection] = useState("同类型视频详细文案");
  const [topicLock, setTopicLock] = useState("");
  const [bannedWords, setBannedWords] = useState("");
  const [contentGoal, setContentGoal] = useState("拉新破圈");
  const [narrativeStructure, setNarrativeStructure] = useState("问题→方案→结果");
  const [toneStyle, setToneStyle] = useState<string[]>(["专业理性"]);
  const [paceLevel, setPaceLevel] = useState("中");
  const [referenceVideos, setReferenceVideos] = useState<VideoInfo[]>([]);
  const [poolTopic, setPoolTopic] = useState("default");
  const [script, setScript] = useState<DetailedScript | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [error, setError] = useState<string>("");
  const [lastGenerateConfig, setLastGenerateConfig] = useState<any>(null);
  const [qualityScore, setQualityScore] = useState<any>(null);
  
  // 版本历史
  const [scriptVersions, setScriptVersions] = useState<any[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [compareVersions, setCompareVersions] = useState<any[] | null>(null);
  
  // 历史记录筛选和分页
  const [filterTopic, setFilterTopic] = useState("");
  const [filterGoal, setFilterGoal] = useState("");
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const pageSize = 20;

  async function loadEpisodes(page = 1) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    
    if (filterTopic) params.append("topic", filterTopic);
    if (filterGoal) params.append("status", filterGoal);
    
    const res = await fetch(`/api/planner/episodes?${params}`);
    const json = await res.json();
    if (res.ok && json.ok) {
      setEpisodes(json.episodes ?? []);
      if (json.pagination) {
        setCurrentPage(json.pagination.page);
        setTotalPages(json.pagination.totalPages);
        setTotalEpisodes(json.pagination.total);
      }
    }
  }

  function toggleTone(tone: string) {
    setToneStyle((prev) => (prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone]));
  }

  async function generateOneScript(useLastConfig = false) {
    const referenceVideoUrls = referenceVideos.map((v) => v.url);

    if (!referenceVideoUrls.length) {
      setError("请先在参考视频池里添加1-3条视频再生成");
      return;
    }

    setLoading(true);
    setError("");
    
    const config = useLastConfig && lastGenerateConfig ? lastGenerateConfig : {
      seedText,
      direction,
      topicLock,
      bannedWords,
      contentGoal,
      narrativeStructure,
      toneStyle,
      paceLevel,
      referenceVideos: referenceVideoUrls,
      language: "zh",
    };
    
    try {
      const res = await fetch("/api/planner/script-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          variationNonce: Date.now(), // 每次生成使用新的 nonce
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "生成失败");
      setScript(json.script);
      
      // 计算质量评分
      const score = evaluateScriptQuality(json.script);
      setQualityScore(score);
      
      // 保存到版本历史
      const newVersion = {
        id: Date.now().toString(),
        topic: json.script.topic || '未命名主题',
        title: json.script.title || '未命名标题',
        createdAt: new Date().toISOString(),
        score: score.overall,
        scriptOutline: config,
        detailedScript: json.script,
        config: {
          contentGoal,
          narrativeStructure,
          toneStyle,
        },
      };
      
      setScriptVersions(prev => [newVersion, ...prev].slice(0, 10)); // 最多保留 10 个版本
      
      // 保存配置供"再来一版"使用
      if (!useLastConfig) {
        setLastGenerateConfig(config);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }
  
  async function regenerateScript() {
    if (!lastGenerateConfig) {
      setError("没有可用的生成配置");
      return;
    }
    await generateOneScript(true);
  }
  
  function restoreVersion(version: any) {
    setScript(version.detailedScript);
    setQualityScore({ overall: version.score });
    
    // 恢复配置
    if (version.config) {
      if (version.config.contentGoal) setContentGoal(version.config.contentGoal);
      if (version.config.narrativeStructure) setNarrativeStructure(version.config.narrativeStructure);
      if (version.config.toneStyle) setToneStyle(version.config.toneStyle);
    }
    
    setShowVersionHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  function handleCompareVersions(versionIds: string[]) {
    const versions = versionIds.map(id => scriptVersions.find(v => v.id === id)).filter(Boolean);
    if (versions.length === 2) {
      setCompareVersions(versions as any[]);
    }
  }
  
  function reuseEpisodeConfig(episode: Episode) {
    try {
      const outline = episode.scriptOutline ? JSON.parse(episode.scriptOutline) : {};
      
      // 恢复配置
      if (outline.contentGoal) setContentGoal(outline.contentGoal);
      if (outline.narrativeStructure) setNarrativeStructure(outline.narrativeStructure);
      if (outline.toneStyle) setToneStyle(outline.toneStyle);
      if (outline.paceLevel) setPaceLevel(outline.paceLevel);
      if (outline.topicLock) setTopicLock(outline.topicLock);
      if (outline.bannedWords) setBannedWords(outline.bannedWords);
      if (outline.seedText) setSeedText(outline.seedText);
      if (outline.direction) setDirection(outline.direction);
      
      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      alert('配置已复用！请检查参数并重新生成。');
    } catch (e) {
      setError('复用配置失败：' + (e instanceof Error ? e.message : '未知错误'));
    }
  }
  
  function toggleEpisodeSelection(id: string) {
    const newSelected = new Set(selectedEpisodes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEpisodes(newSelected);
  }
  
  function selectAllEpisodes() {
    setSelectedEpisodes(new Set(episodes.map(e => e.id)));
  }
  
  function clearSelection() {
    setSelectedEpisodes(new Set());
  }
  
  async function batchDeleteEpisodes() {
    if (selectedEpisodes.size === 0) {
      alert('请先选择要删除的记录');
      return;
    }
    
    const ok = window.confirm(`确认删除选中的 ${selectedEpisodes.size} 条记录吗？删除后不可恢复。`);
    if (!ok) return;
    
    try {
      for (const id of selectedEpisodes) {
        await fetch("/api/planner/episodes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episodeId: id }),
        });
      }
      clearSelection();
      await loadEpisodes(currentPage);
      alert('批量删除成功！');
    } catch (e) {
      alert('批量删除失败：' + (e instanceof Error ? e.message : '未知错误'));
    }
  }
  
  function exportEpisodes() {
    const data = episodes.map(e => {
      try {
        const outline = e.scriptOutline ? JSON.parse(e.scriptOutline) : {};
        return {
          主题: e.topic,
          关键词: e.targetKeyword || '',
          计划日期: e.plannedDate || '',
          标题: e.titleOptions?.join(' / ') || '',
          创建时间: e.createdAt || '',
          配置: outline,
        };
      } catch {
        return {
          主题: e.topic,
          关键词: e.targetKeyword || '',
          计划日期: e.plannedDate || '',
          标题: e.titleOptions?.join(' / ') || '',
          创建时间: e.createdAt || '',
        };
      }
    });
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `episodes-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
    if (selectedEpisode?.id === episodeId) setSelectedEpisode(null);
    await loadEpisodes();
  }

  async function openEpisodeDetail(episodeId: string) {
    const res = await fetch(`/api/planner/episodes?episodeId=${encodeURIComponent(episodeId)}`);
    const json = await res.json();
    if (res.ok && json?.ok && json?.episode) setSelectedEpisode(json.episode as Episode);
  }

  function savePoolByTopic() {
    const key = poolTopic.trim() || "default";
    const raw = window.localStorage.getItem("tcos_reference_pools");
    const map = raw ? (JSON.parse(raw) as Record<string, VideoInfo[]>) : {};
    map[key] = referenceVideos;
    window.localStorage.setItem("tcos_reference_pools", JSON.stringify(map));
    alert(`已保存主题参考池：${key}`);
  }

  function loadPoolByTopic() {
    const key = poolTopic.trim() || "default";
    const raw = window.localStorage.getItem("tcos_reference_pools");
    const map = raw ? (JSON.parse(raw) as Record<string, VideoInfo[]>) : {};
    setReferenceVideos(map[key] || []);
  }

  function clearPool() {
    setReferenceVideos([]);
    window.localStorage.removeItem("tcos_reference_videos");
  }

  useEffect(() => {
    loadEpisodes();
    const cached = typeof window !== "undefined" ? window.localStorage.getItem("tcos_reference_videos") : null;
    if (cached) {
      try {
        const arr = JSON.parse(cached) as VideoInfo[];
        if (Array.isArray(arr) && arr.length) setReferenceVideos(arr.slice(0, 3));
      } catch {
        // ignore bad cache
      }
    }
  }, []);

  // 自动保存参考视频池到 localStorage
  useEffect(() => {
    if (referenceVideos.length > 0) {
      window.localStorage.setItem("tcos_reference_videos", JSON.stringify(referenceVideos));
    }
  }, [referenceVideos]);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">文案生成器</h1>
              <p className="text-sm text-zinc-600">根据参考频道，生成 1 篇同类型视频详细文案</p>
            </div>
            <div className="text-xs text-zinc-500">使用顶部统一导航切换模块</div>
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
              <span className="text-xs text-zinc-500">主题锁定（可选，不填则按参考视频自动）</span>
              <input
                value={topicLock}
                onChange={(e) => setTopicLock(e.target.value)}
                className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                placeholder="例如：homestead chicken coop（可留空）"
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
            <label className="space-y-1 md:col-span-1">
              <span className="text-xs text-zinc-500">内容目的</span>
              <select value={contentGoal} onChange={(e) => setContentGoal(e.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1 text-sm">
                <option value="拉新破圈">拉新破圈</option>
                <option value="提升完播">提升完播</option>
                <option value="提升互动">提升互动</option>
                <option value="承接转化">承接转化</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-1">
              <span className="text-xs text-zinc-500">叙事结构</span>
              <select value={narrativeStructure} onChange={(e) => setNarrativeStructure(e.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1 text-sm">
                <option value="问题→方案→结果">问题→方案→结果</option>
                <option value="清单计数">清单计数</option>
                <option value="对比实验">对比实验</option>
                <option value="误区纠错">误区纠错</option>
                <option value="挑战复盘">挑战复盘</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-1">
              <span className="text-xs text-zinc-500">节奏强度</span>
              <select value={paceLevel} onChange={(e) => setPaceLevel(e.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1 text-sm">
                <option value="慢">慢</option>
                <option value="中">中</option>
                <option value="快">快</option>
              </select>
            </label>
            
            <div className="md:col-span-6">
              <ReferenceVideoPool videos={referenceVideos} onChange={setReferenceVideos} maxVideos={3} />
            </div>
            <div className="md:col-span-6 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-500">表达语气：</span>
              {[
                "专业理性",
                "朋友口语",
                "情绪张力",
                "冷静克制",
              ].map((tone) => (
                <label key={tone} className="flex items-center gap-1">
                  <input type="checkbox" checked={toneStyle.includes(tone)} onChange={() => toggleTone(tone)} />
                  {tone}
                </label>
              ))}
            </div>
            <div className="md:col-span-6 flex flex-wrap items-center gap-2 text-xs">
              <input
                value={poolTopic}
                onChange={(e) => setPoolTopic(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
                placeholder="主题名：如 homestead"
              />
              <button onClick={savePoolByTopic} className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50">保存该主题参考池</button>
              <button onClick={loadPoolByTopic} className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50">加载该主题参考池</button>
              <button onClick={clearPool} className="rounded border border-rose-300 px-2 py-1 text-rose-700 hover:bg-rose-50">清空参考池</button>
            </div>
            <div className="flex items-end md:col-span-6">
              <button
                onClick={() => generateOneScript(false)}
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
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">生成结果（{script.provider === "ai" ? "AI" : "模板"}）</h2>
                <button
                  onClick={regenerateScript}
                  disabled={loading}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="使用相同配置生成不同版本"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? "生成中..." : "再来一版"}
                </button>
                {scriptVersions.length > 0 && (
                  <button
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="rounded bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 flex items-center gap-1"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    版本历史 ({scriptVersions.length})
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500">仅生成 1 篇，可直接拍摄</p>
            </div>
            
            {lastGenerateConfig && (
              <div className="rounded bg-blue-50 border border-blue-200 p-3 text-xs">
                <p className="font-medium text-blue-900 mb-1">📋 当前配置</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-blue-700">
                  <div><span className="text-blue-500">内容目的：</span>{lastGenerateConfig.contentGoal}</div>
                  <div><span className="text-blue-500">叙事结构：</span>{lastGenerateConfig.narrativeStructure}</div>
                  <div><span className="text-blue-500">表达语气：</span>{lastGenerateConfig.toneStyle?.join("、")}</div>
                  <div><span className="text-blue-500">节奏强度：</span>{lastGenerateConfig.paceLevel}</div>
                  {lastGenerateConfig.topicLock && (
                    <div className="col-span-2"><span className="text-blue-500">主题锁定：</span>{lastGenerateConfig.topicLock}</div>
                  )}
                  {lastGenerateConfig.bannedWords && (
                    <div className="col-span-2"><span className="text-blue-500">禁用词：</span>{lastGenerateConfig.bannedWords}</div>
                  )}
                </div>
                <p className="mt-2 text-blue-600">💡 点击"再来一版"将使用相同配置生成不同版本的文案</p>
              </div>
            )}

            {/* 质量评分卡片 */}
            {qualityScore && <QualityScoreCard score={qualityScore} />}

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
          <div className="border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-700">历史选题（可作为补充灵感）</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportEpisodes}
                  className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  📥 导出 JSON
                </button>
                {selectedEpisodes.size > 0 && (
                  <button
                    onClick={batchDeleteEpisodes}
                    className="rounded border border-rose-300 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50"
                  >
                    🗑️ 批量删除 ({selectedEpisodes.size})
                  </button>
                )}
              </div>
            </div>
            
            {/* 筛选器 */}
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                placeholder="按主题筛选..."
                className="rounded border border-zinc-300 px-2 py-1 text-xs flex-1 min-w-[150px]"
              />
              <select
                value={filterGoal}
                onChange={(e) => setFilterGoal(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="">全部目的</option>
                <option value="拉新破圈">拉新破圈</option>
                <option value="提升完播">提升完播</option>
                <option value="提升互动">提升互动</option>
                <option value="承接转化">承接转化</option>
              </select>
              <button
                onClick={() => { 
                  setFilterTopic(''); 
                  setFilterGoal(''); 
                  loadEpisodes(1);
                }}
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                清除筛选
              </button>
              <button
                onClick={() => loadEpisodes(1)}
                className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
              >
                应用筛选
              </button>
              {episodes.length > 0 && (
                <>
                  <button
                    onClick={selectAllEpisodes}
                    className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                  >
                    全选
                  </button>
                  {selectedEpisodes.size > 0 && (
                    <button
                      onClick={clearSelection}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                      取消选择
                    </button>
                  )}
                </>
              )}
            </div>
            
            <p className="text-xs text-zinc-500 mt-2">
              共 {totalEpisodes} 条记录，当前页 {episodes.length} 条
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-100 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedEpisodes.size > 0 && selectedEpisodes.size === episodes.length}
                      onChange={(e) => e.target.checked ? selectAllEpisodes() : clearSelection()}
                    />
                  </th>
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
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedEpisodes.has(e.id)}
                        onChange={() => toggleEpisodeSelection(e.id)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{e.topic}</td>
                    <td className="px-3 py-2">{e.targetKeyword || "-"}</td>
                    <td className="px-3 py-2">{e.plannedDate ? new Date(e.plannedDate).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2 text-zinc-600">{(e.titleOptions || []).slice(0, 2).join(" / ")}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        onClick={() => reuseEpisodeConfig(e)}
                        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                        title="复用此配置"
                      >
                        复用
                      </button>
                      <button
                        onClick={() => openEpisodeDetail(e.id)}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                      >
                        查看
                      </button>
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
          
          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="border-t border-zinc-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-600">
                  共 {totalEpisodes} 条记录，第 {currentPage} / {totalPages} 页
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadEpisodes(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => loadEpisodes(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {selectedEpisode ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-700">历史详情：{selectedEpisode.topic}</h3>
              <button onClick={() => setSelectedEpisode(null)} className="text-xs text-zinc-500 underline">收起</button>
            </div>
            {(() => {
              let outline: Record<string, unknown> = {};
              try {
                outline = selectedEpisode.scriptOutline ? JSON.parse(selectedEpisode.scriptOutline) : {};
              } catch {
                outline = {};
              }
              const opening = Array.isArray(outline.opening15s) ? outline.opening15s as string[] : [];
              const timeline = Array.isArray(outline.timeline)
                ? outline.timeline as Array<{ time?: string; segment?: string; voiceover?: string; visuals?: string }>
                : [];
              const refs = Array.isArray(outline.referenceVideos) ? outline.referenceVideos as string[] : [];
              const items = Array.isArray(outline.contentItems) ? outline.contentItems as string[] : [];

              return (
                <div className="space-y-3 text-sm">
                  <p><span className="text-zinc-500">标题：</span>{selectedEpisode.titleOptions?.[0] || "-"}</p>
                  {refs.length ? <p><span className="text-zinc-500">参考视频：</span>{refs.join(" | ")}</p> : null}
                  {items.length ? (
                    <div>
                      <p className="mb-1 text-zinc-500">具体内容清单</p>
                      <ul className="grid gap-1 md:grid-cols-2">{items.map((x, i) => <li key={i}>• {i + 1}. {x}</li>)}</ul>
                    </div>
                  ) : (
                    <p className="text-amber-700">这条历史是旧记录，当时未保存“具体内容清单”。</p>
                  )}
                  {opening.length ? (
                    <div>
                      <p className="mb-1 text-zinc-500">开场口播</p>
                      <ul className="space-y-1">{opening.map((x, i) => <li key={i}>• {x}</li>)}</ul>
                    </div>
                  ) : null}
                  {timeline.length ? (
                    <div>
                      <p className="mb-1 text-zinc-500">分镜详情</p>
                      <div className="space-y-2">
                        {timeline.map((t, i) => (
                          <div key={i} className="rounded bg-zinc-50 p-2">
                            <p>{t.time || "-"} · {t.segment || "-"}</p>
                            <p className="text-zinc-700">口播：{t.voiceover || "-"}</p>
                            <p className="text-zinc-600">画面：{t.visuals || "-"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </section>
        ) : null}
        
        {/* 版本历史弹窗 */}
        {showVersionHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">版本历史</h2>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="rounded-full p-2 hover:bg-zinc-100"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <VersionHistory
                versions={scriptVersions}
                onRestore={restoreVersion}
                onCompare={handleCompareVersions}
              />
            </div>
          </div>
        )}
        
        {/* 版本对比弹窗 */}
        {compareVersions && compareVersions.length === 2 && (
          <VersionCompare
            versions={compareVersions as [any, any]}
            onClose={() => setCompareVersions(null)}
          />
        )}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendChart, PieChart, QuickAction } from "@/components/DashboardCharts";

type DashboardData = {
  stats: {
    totalEpisodes: number;
    totalChannels: number;
    totalRuns: number;
    recentCount: number;
  };
  trends: {
    generation: Array<{ date: string; count: number }>;
    goals: Array<{ label: string; value: number }>;
    structures: Array<{ label: string; value: number }>;
  };
  recentBest: Array<{
    id: string;
    topic: string;
    title: string;
    createdAt: string;
  }>;
};

function MetricCard({ label, value, hint, trend }: { label: string; value: number; hint: string; trend?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="text-3xl font-semibold text-zinc-900">{value.toLocaleString()}</p>
        {trend && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
            {trend}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch (error) {
      console.error('加载 Dashboard 数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const goalColors = [
    { label: '拉新破圈', color: 'bg-blue-500' },
    { label: '提升完播', color: 'bg-green-500' },
    { label: '提升互动', color: 'bg-yellow-500' },
    { label: '承接转化', color: 'bg-purple-500' },
    { label: '未分类', color: 'bg-gray-400' },
  ];

  const structureColors = [
    { label: '问题→方案→结果', color: 'bg-indigo-500' },
    { label: '清单计数', color: 'bg-pink-500' },
    { label: '对比实验', color: 'bg-orange-500' },
    { label: '误区纠错', color: 'bg-teal-500' },
    { label: '挑战复盘', color: 'bg-red-500' },
    { label: '未分类', color: 'bg-gray-400' },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-zinc-500">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Team Content OS
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                YouTube 对标情报、文案生成、执行追踪的一体化数据台
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                系统在线
              </div>
            </div>
          </div>
        </header>

        {/* Metrics */}
        {data && (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="文案总数"
              value={data.stats.totalEpisodes}
              hint="累计生成文案"
              trend={data.stats.recentCount > 0 ? `+${data.stats.recentCount} 本周` : undefined}
            />
            <MetricCard
              label="对标频道"
              value={data.stats.totalChannels}
              hint="频道池规模"
            />
            <MetricCard
              label="数据批次"
              value={data.stats.totalRuns}
              hint="抓取任务数"
            />
            <MetricCard
              label="本周生成"
              value={data.stats.recentCount}
              hint="最近7天"
            />
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">🚀 快捷入口</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <QuickAction
              icon="✨"
              title="生成新文案"
              description="基于参考视频快速生成可拍摄脚本"
              href="/planner"
              badge="推荐"
            />
            <QuickAction
              icon="🔍"
              title="发现增长频道"
              description="跑赛道关键词，找高增长候选"
              href="/discover"
            />
            <QuickAction
              icon="📊"
              title="数据追踪"
              description="回填指标，输出优化建议"
              href="/tracker"
            />
          </div>
        </section>

        {/* Charts */}
        {data && (
          <section className="grid gap-4 lg:grid-cols-3">
            <TrendChart
              data={data.trends.generation}
              title="📈 最近7天生成趋势"
              color="bg-blue-500"
            />
            <PieChart
              data={data.trends.goals.map(g => ({
                ...g,
                color: goalColors.find(c => c.label === g.label)?.color || 'bg-gray-400',
              }))}
              title="🎯 内容目的分布"
            />
            <PieChart
              data={data.trends.structures.map(s => ({
                ...s,
                color: structureColors.find(c => c.label === s.label)?.color || 'bg-gray-400',
              }))}
              title="📝 叙事结构分布"
            />
          </section>
        )}

        {/* Recent Best */}
        {data && data.recentBest.length > 0 && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">⭐ 最近生成的文案</h2>
            <div className="space-y-2">
              {data.recentBest.map((item) => (
                <Link
                  key={item.id}
                  href={`/planner`}
                  className="block rounded-lg border border-zinc-200 p-3 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Navigation */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">🧭 所有模块</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/discover" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 transition-colors">
              发现页
            </Link>
            <Link href="/similar" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 transition-colors">
              种子找同类
            </Link>
            <Link href="/planner" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 transition-colors">
              文案生成
            </Link>
            <Link href="/tracker" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 transition-colors">
              数据追踪
            </Link>
            <Link href="/reports" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 transition-colors">
              自动周报
            </Link>
            <Link href="/version" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 transition-colors">
              版本介绍
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

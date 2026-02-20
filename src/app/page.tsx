import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  try {
    const [teams, users, projects, channels, episodes, discoverRuns] = await Promise.all([
      prisma.team.count(),
      prisma.user.count(),
      prisma.project.count(),
      prisma.competitorChannel.count(),
      prisma.episodePlan.count(),
      prisma.discoverRun.count(),
    ]);

    return { teams, users, projects, channels, episodes, discoverRuns, dbConnected: true };
  } catch {
    return {
      teams: 0,
      users: 0,
      projects: 0,
      channels: 0,
      episodes: 0,
      discoverRuns: 0,
      dbConnected: false,
    };
  }
}

function MetricCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">SaaS Analytics Dashboard · team-content-os</h1>
              <p className="mt-1 text-sm text-zinc-600">YouTube 对标情报、文案生成、执行追踪的一体化数据台</p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                stats.dbConnected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {stats.dbConnected ? "数据库在线" : "数据库离线"}
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Teams" value={stats.teams} hint="协作组织" />
          <MetricCard label="Users" value={stats.users} hint="账号总数" />
          <MetricCard label="Projects" value={stats.projects} hint="频道项目" />
          <MetricCard label="Channels" value={stats.channels} hint="对标频道池" />
          <MetricCard label="Episodes" value={stats.episodes} hint="文案/选题资产" />
          <MetricCard label="Discover Runs" value={stats.discoverRuns} hint="数据抓取批次" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Link href="/discover" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300">
            <p className="text-sm font-semibold">增长频道发现</p>
            <p className="mt-1 text-sm text-zinc-600">跑赛道关键词、看候选频道分数、加入参考视频池。</p>
            <p className="mt-4 text-xs text-blue-700">进入模块 →</p>
          </Link>
          <Link href="/planner" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300">
            <p className="text-sm font-semibold">文案生成器</p>
            <p className="mt-1 text-sm text-zinc-600">基于选中的参考视频，生成1篇详细可拍摄脚本。</p>
            <p className="mt-4 text-xs text-blue-700">进入模块 →</p>
          </Link>
          <Link href="/tracker" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300">
            <p className="text-sm font-semibold">追踪与复盘</p>
            <p className="mt-1 text-sm text-zinc-600">回填CTR/留存/播放，输出下周动作建议。</p>
            <p className="mt-4 text-xs text-blue-700">进入模块 →</p>
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">导航快捷入口</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/discover" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50">发现页</Link>
            <Link href="/similar" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50">种子找同类</Link>
            <Link href="/planner" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50">文案生成</Link>
            <Link href="/tracker" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50">数据追踪</Link>
            <Link href="/reports" className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50">自动周报</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

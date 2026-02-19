import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  try {
    const [teams, users, projects, channels, episodes] = await Promise.all([
      prisma.team.count(),
      prisma.user.count(),
      prisma.project.count(),
      prisma.competitorChannel.count(),
      prisma.episodePlan.count(),
    ]);

    return { teams, users, projects, channels, episodes, dbConnected: true };
  } catch {
    return {
      teams: 0,
      users: 0,
      projects: 0,
      channels: 0,
      episodes: 0,
      dbConnected: false,
    };
  }
}

const modules = [
  {
    title: "1) 频道情报库",
    desc: "采集竞品频道和视频元数据，沉淀统一可检索文本资产。",
  },
  {
    title: "2) 模式分析器",
    desc: "提炼爆款标题模板、内容主题簇、风险词和差异化机会。",
  },
  {
    title: "3) 选题规划器",
    desc: "自动生成周计划、单期 Brief、脚本骨架和素材清单。",
  },
  {
    title: "4) 复盘追踪器",
    desc: "发布后回填 CTR/留存/完播，自动给出下期优化建议。",
  },
];

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <main className="min-h-screen bg-zinc-50 p-8 text-zinc-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">youtube.9180.net</h1>
          <p className="text-zinc-600">
            多人协作的 YouTube 对标情报 + 结构化内容规划系统（Next.js + PostgreSQL + Prisma）
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                stats.dbConnected
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {stats.dbConnected ? "数据库已连接" : "数据库未连接（请配置 DATABASE_URL 并迁移）"}
            </div>
            <Link
              href="/discover"
              className="inline-flex rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              打开增长频道榜单
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            ["Teams", stats.teams],
            ["Users", stats.users],
            ["Projects", stats.projects],
            ["Channels", stats.channels],
            ["Episodes", stats.episodes],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{Number(value)}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">系统模块</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {modules.map((item) => (
              <article key={item.title} className="rounded-xl border border-zinc-200 bg-white p-4">
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-600">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-xl font-semibold">下一步</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-zinc-700">
            <li>复制 .env 为 .env.local 并填入 PostgreSQL 连接串</li>
            <li>运行 prisma migrate dev 初始化数据表</li>
            <li>创建 Team / User / Project 作为团队试跑数据</li>
            <li>接入频道采集任务（API/脚本）</li>
          </ol>
        </section>
      </div>
    </main>
  );
}

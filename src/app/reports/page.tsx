"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Report = {
  period: { from: string; to: string };
  summary: { createdEpisodes: number; measuredEpisodes: number; avgCtr: number; avgRetention30s: number };
  winners: Array<{ keyword: string; score: number }>;
  losers: Array<{ keyword: string; score: number }>;
  nextWeekPlan: { mustDo: string[]; backup: string[]; experiments: string[] };
  recommendations: string[];
};

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);

  async function load() {
    const res = await fetch("/api/reports/weekly");
    const json = await res.json();
    if (res.ok && json.ok) setReport(json.report);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Weekly Report</h1>
            <p className="text-sm text-zinc-600">自动周报：表现总结 + 下周策略</p>
          </div>
          <div className="flex gap-2">
            <Link href="/tracker" className="rounded border border-zinc-300 px-3 py-1 text-sm">追踪器</Link>
            <button onClick={load} className="rounded border border-zinc-300 px-3 py-1 text-sm">刷新</button>
          </div>
        </header>

        {report ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Card label="本周新建内容" value={String(report.summary.createdEpisodes)} />
              <Card label="有指标内容" value={String(report.summary.measuredEpisodes)} />
              <Card label="平均CTR" value={`${report.summary.avgCtr}%`} />
              <Card label="平均30秒留存" value={`${report.summary.avgRetention30s}%`} />
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">建议动作</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                {report.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <Box title="本周高分关键词">
                {report.winners.map((w) => (
                  <p key={w.keyword} className="text-sm">• {w.keyword} ({w.score})</p>
                ))}
              </Box>
              <Box title="本周低分关键词">
                {report.losers.map((w) => (
                  <p key={w.keyword} className="text-sm">• {w.keyword} ({w.score})</p>
                ))}
              </Box>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">下周执行结构（3+4+3）</h2>
              <p className="mt-2 text-sm text-zinc-700">必做3条：{report.nextWeekPlan.mustDo.join(" / ") || "-"}</p>
              <p className="mt-1 text-sm text-zinc-700">备选4条：{report.nextWeekPlan.backup.join(" / ") || "-"}</p>
              <p className="mt-1 text-sm text-zinc-700">实验3条：{report.nextWeekPlan.experiments.join(" / ")}</p>
            </section>
          </>
        ) : (
          <p className="text-sm text-zinc-600">加载中...</p>
        )}
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

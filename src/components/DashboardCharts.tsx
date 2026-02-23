"use client";

import { useEffect, useState } from "react";

type TrendData = {
  date: string;
  count: number;
};

type ChartProps = {
  data: TrendData[];
  title: string;
  color: string;
};

export function TrendChart({ data, title, color }: ChartProps) {
  const [maxValue, setMaxValue] = useState(0);

  useEffect(() => {
    const max = Math.max(...data.map(d => d.count), 1);
    setMaxValue(max);
  }, [data]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-700 mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map((item, i) => {
          const percentage = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-16">{item.date}</span>
              <div className="flex-1 h-6 bg-zinc-100 rounded overflow-hidden">
                <div
                  className={`h-full ${color} transition-all duration-500 flex items-center justify-end pr-2`}
                  style={{ width: `${percentage}%` }}
                >
                  {item.count > 0 && (
                    <span className="text-xs font-medium text-white">{item.count}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PieChartProps = {
  data: Array<{ label: string; value: number; color: string }>;
  title: string;
};

export function PieChart({ data, title }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-700 mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map((item, i) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${item.color}`} />
                  <span className="text-zinc-700">{item.label}</span>
                </div>
                <span className="font-medium text-zinc-900">
                  {item.value} ({percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-zinc-100 rounded overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type QuickActionProps = {
  icon: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
};

export function QuickAction({ icon, title, description, href, badge }: QuickActionProps) {
  return (
    <a
      href={href}
      className="group relative rounded-lg border border-zinc-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600">
              {title}
            </h4>
            {badge && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-600 mt-1">{description}</p>
        </div>
        <svg
          className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
}

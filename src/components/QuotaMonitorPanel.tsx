"use client";

import { useEffect, useState } from "react";
import { getKeyStats, checkQuotaWarning, setupDailyReset } from "@/lib/youtube-key-manager";

type KeyStats = {
  keys: Array<{
    keyPrefix: string;
    quotaUsed: number;
    quotaLimit: number;
    quotaRemaining: number;
    lastUsed: number;
    errorCount: number;
    status: 'active' | 'limited' | 'exhausted' | 'error';
  }>;
  totalQuotaUsed: number;
  totalQuotaLimit: number;
  totalQuotaRemaining: number;
  healthyKeyCount: number;
  lastUpdated: number;
};

export default function QuotaMonitorPanel() {
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [warning, setWarning] = useState<{ warning: boolean; message: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // 初始化
    loadStats();
    setupDailyReset();
    
    // 每分钟更新一次
    const interval = setInterval(loadStats, 60000);
    
    return () => clearInterval(interval);
  }, []);

  function loadStats() {
    const keyStats = getKeyStats();
    const warningInfo = checkQuotaWarning();
    
    setStats(keyStats);
    setWarning(warningInfo);
  }

  if (!stats) return null;

  const usageRate = stats.totalQuotaUsed / stats.totalQuotaLimit;
  const usagePercent = Math.round(usageRate * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'limited': return 'text-yellow-600 bg-yellow-50';
      case 'exhausted': return 'text-red-600 bg-red-50';
      case 'error': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '正常';
      case 'limited': return '受限';
      case 'exhausted': return '耗尽';
      case 'error': return '错误';
      default: return '未知';
    }
  };

  const getProgressColor = () => {
    if (usageRate >= 0.9) return 'bg-red-500';
    if (usageRate >= 0.8) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-700">📊 YouTube API 配额监控</h3>
          {warning?.warning && (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
              {warning.message}
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:underline"
        >
          {expanded ? '收起' : '展开详情'}
        </button>
      </div>

      {/* 总体配额 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600">总配额使用</span>
          <span className="font-medium">
            {stats.totalQuotaUsed.toLocaleString()} / {stats.totalQuotaLimit.toLocaleString()} ({usagePercent}%)
          </span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>剩余：{stats.totalQuotaRemaining.toLocaleString()}</span>
          <span>健康 Key：{stats.healthyKeyCount} / {stats.keys.length}</span>
        </div>
      </div>

      {/* 详细信息 */}
      {expanded && (
        <div className="mt-4 space-y-2 border-t border-zinc-200 pt-3">
          <p className="text-xs font-medium text-zinc-600 mb-2">各 Key 详情：</p>
          {stats.keys.map((key, i) => (
            <div key={i} className="rounded border border-zinc-200 p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-600">{key.keyPrefix}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(key.status)}`}>
                  {getStatusText(key.status)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>已用：{key.quotaUsed.toLocaleString()}</span>
                <span>剩余：{key.quotaRemaining.toLocaleString()}</span>
              </div>
              <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${key.status === 'active' ? 'bg-green-500' : key.status === 'limited' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(key.quotaUsed / key.quotaLimit) * 100}%` }}
                />
              </div>
              {key.lastUsed > 0 && (
                <p className="text-xs text-zinc-400">
                  最后使用：{new Date(key.lastUsed).toLocaleTimeString()}
                </p>
              )}
              {key.errorCount > 0 && (
                <p className="text-xs text-red-600">
                  错误次数：{key.errorCount}
                </p>
              )}
            </div>
          ))}
          
          <p className="text-xs text-zinc-400 mt-3">
            💡 提示：配额每天凌晨自动重置。建议配置多个 API Key 以提高可用性。
          </p>
        </div>
      )}
    </div>
  );
}

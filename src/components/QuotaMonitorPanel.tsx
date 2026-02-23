"use client";

import { useEffect, useState } from "react";

type KeyInfo = {
  id: string;
  keyPrefix: string;
  quotaUsed: number;
  quotaLimit: number;
  quotaRemaining: number;
  lastUsed: number;
  errorCount: number;
  status: 'active' | 'limited' | 'exhausted' | 'error';
};

const QUOTA_WARNING_THRESHOLD = 0.8;
const KEY_STORAGE_KEY = 'youtube_api_key_stats';

export default function QuotaMonitorPanel() {
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKeys();
    setupDailyReset();
    
    // 每分钟更新一次
    const interval = setInterval(() => {
      updateStats();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadKeys() {
    try {
      // 从服务端获取 Key 列表
      const res = await fetch('/api/youtube/keys');
      const data = await res.json();
      
      if (!data.ok || !data.keys) {
        setLoading(false);
        return;
      }
      
      // 从 localStorage 加载使用统计
      const savedStats = loadSavedStats();
      
      // 合并服务端 Key 信息和本地统计
      const mergedKeys = data.keys.map((key: any) => {
        const saved = savedStats.get(key.id);
        return {
          id: key.id,
          keyPrefix: key.keyPrefix,
          quotaUsed: saved?.quotaUsed || 0,
          quotaLimit: key.quotaLimit,
          quotaRemaining: key.quotaLimit - (saved?.quotaUsed || 0),
          lastUsed: saved?.lastUsed || 0,
          errorCount: saved?.errorCount || 0,
          status: calculateStatus(saved?.quotaUsed || 0, key.quotaLimit, saved?.errorCount || 0),
        };
      });
      
      setKeys(mergedKeys);
      setLoading(false);
    } catch (error) {
      console.error('加载 Key 信息失败:', error);
      setLoading(false);
    }
  }

  function loadSavedStats(): Map<string, any> {
    try {
      const data = localStorage.getItem(KEY_STORAGE_KEY);
      if (!data) return new Map();
      
      const stats = JSON.parse(data);
      return new Map(Object.entries(stats));
    } catch {
      return new Map();
    }
  }

  function calculateStatus(quotaUsed: number, quotaLimit: number, errorCount: number): KeyInfo['status'] {
    if (errorCount >= 3) return 'error';
    
    const remaining = quotaLimit - quotaUsed;
    if (remaining === 0) return 'exhausted';
    if (remaining < quotaLimit * (1 - QUOTA_WARNING_THRESHOLD)) return 'limited';
    return 'active';
  }

  function updateStats() {
    const savedStats = loadSavedStats();
    
    setKeys(prevKeys => prevKeys.map(key => {
      const saved = savedStats.get(key.id);
      return {
        ...key,
        quotaUsed: saved?.quotaUsed || key.quotaUsed,
        quotaRemaining: key.quotaLimit - (saved?.quotaUsed || key.quotaUsed),
        lastUsed: saved?.lastUsed || key.lastUsed,
        errorCount: saved?.errorCount || key.errorCount,
        status: calculateStatus(saved?.quotaUsed || key.quotaUsed, key.quotaLimit, saved?.errorCount || key.errorCount),
      };
    }));
  }

  function setupDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      // 重置配额
      localStorage.removeItem(KEY_STORAGE_KEY);
      loadKeys();
      
      // 设置每24小时重置一次
      setInterval(() => {
        localStorage.removeItem(KEY_STORAGE_KEY);
        loadKeys();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-500">加载配额信息...</p>
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
        <p className="text-sm text-yellow-800">
          ⚠️ 未配置 YouTube API Key。请在 .env.local 中配置 YOUTUBE_API_KEY 或 YOUTUBE_API_KEYS
        </p>
      </div>
    );
  }

  const totalQuotaUsed = keys.reduce((sum, k) => sum + k.quotaUsed, 0);
  const totalQuotaLimit = keys.reduce((sum, k) => sum + k.quotaLimit, 0);
  const totalQuotaRemaining = keys.reduce((sum, k) => sum + k.quotaRemaining, 0);
  const healthyKeyCount = keys.filter(k => k.status === 'active').length;
  
  const usageRate = totalQuotaLimit > 0 ? totalQuotaUsed / totalQuotaLimit : 0;
  const usagePercent = Math.round(usageRate * 100);

  const warning = checkWarning(usageRate, healthyKeyCount, keys.length);

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

  function checkWarning(rate: number, healthy: number, total: number) {
    if (rate >= 0.9) {
      return { warning: true, message: `⚠️ 配额即将耗尽！已使用 ${Math.round(rate * 100)}%` };
    }
    if (rate >= QUOTA_WARNING_THRESHOLD) {
      return { warning: true, message: `⚠️ 配额使用较高，已使用 ${Math.round(rate * 100)}%` };
    }
    if (healthy === 0) {
      return { warning: true, message: '⚠️ 所有 API Key 均不可用！' };
    }
    if (healthy <= 1 && total > 1) {
      return { warning: true, message: `⚠️ 仅剩 ${healthy} 个可用 Key` };
    }
    return { warning: false, message: '✓ 配额充足' };
  }

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
            {totalQuotaUsed.toLocaleString()} / {totalQuotaLimit.toLocaleString()} ({usagePercent}%)
          </span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>剩余：{totalQuotaRemaining.toLocaleString()}</span>
          <span>健康 Key：{healthyKeyCount} / {keys.length}</span>
        </div>
      </div>

      {/* 详细信息 */}
      {expanded && (
        <div className="mt-4 space-y-2 border-t border-zinc-200 pt-3">
          <p className="text-xs font-medium text-zinc-600 mb-2">各 Key 详情：</p>
          {keys.map((key) => (
            <div key={key.id} className="rounded border border-zinc-200 p-2 space-y-1">
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

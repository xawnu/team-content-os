/**
 * YouTube API Key 管理和配额监控
 */

type KeyStatus = {
  key: string;
  keyPrefix: string; // 只显示前8位
  quotaUsed: number;
  quotaLimit: number;
  quotaRemaining: number;
  lastUsed: number; // 时间戳
  errorCount: number;
  status: 'active' | 'limited' | 'exhausted' | 'error';
};

type KeyStats = {
  keys: KeyStatus[];
  totalQuotaUsed: number;
  totalQuotaLimit: number;
  totalQuotaRemaining: number;
  healthyKeyCount: number;
  lastUpdated: number;
};

const QUOTA_LIMIT_PER_KEY = 10000; // YouTube API 每日配额
const QUOTA_WARNING_THRESHOLD = 0.8; // 80% 时预警
const KEY_STORAGE_KEY = 'youtube_api_key_stats';

/**
 * 获取所有 API Key
 */
export function getAPIKeys(): string[] {
  const keys = (process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
  
  return keys;
}

/**
 * 从 localStorage 加载 Key 统计信息
 */
function loadKeyStats(): Map<string, KeyStatus> {
  if (typeof window === 'undefined') return new Map();
  
  try {
    const data = localStorage.getItem(KEY_STORAGE_KEY);
    if (!data) return new Map();
    
    const stats = JSON.parse(data) as KeyStatus[];
    return new Map(stats.map(s => [s.key, s]));
  } catch {
    return new Map();
  }
}

/**
 * 保存 Key 统计信息到 localStorage
 */
function saveKeyStats(stats: Map<string, KeyStatus>) {
  if (typeof window === 'undefined') return;
  
  try {
    const data = Array.from(stats.values());
    localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('保存 Key 统计信息失败:', e);
  }
}

/**
 * 初始化 Key 状态
 */
function initKeyStatus(key: string): KeyStatus {
  return {
    key,
    keyPrefix: key.slice(0, 8) + '...',
    quotaUsed: 0,
    quotaLimit: QUOTA_LIMIT_PER_KEY,
    quotaRemaining: QUOTA_LIMIT_PER_KEY,
    lastUsed: 0,
    errorCount: 0,
    status: 'active',
  };
}

/**
 * 更新 Key 状态
 */
export function updateKeyStatus(key: string, success: boolean, quotaCost: number = 1) {
  const stats = loadKeyStats();
  const status = stats.get(key) || initKeyStatus(key);
  
  status.lastUsed = Date.now();
  
  if (success) {
    status.quotaUsed += quotaCost;
    status.quotaRemaining = Math.max(0, status.quotaLimit - status.quotaUsed);
    status.errorCount = 0;
    
    // 更新状态
    if (status.quotaRemaining === 0) {
      status.status = 'exhausted';
    } else if (status.quotaRemaining < status.quotaLimit * (1 - QUOTA_WARNING_THRESHOLD)) {
      status.status = 'limited';
    } else {
      status.status = 'active';
    }
  } else {
    status.errorCount++;
    if (status.errorCount >= 3) {
      status.status = 'error';
    }
  }
  
  stats.set(key, status);
  saveKeyStats(stats);
}

/**
 * 重置每日配额（每天凌晨调用）
 */
export function resetDailyQuota() {
  const stats = loadKeyStats();
  
  stats.forEach(status => {
    status.quotaUsed = 0;
    status.quotaRemaining = status.quotaLimit;
    status.errorCount = 0;
    status.status = 'active';
  });
  
  saveKeyStats(stats);
}

/**
 * 获取最佳可用 Key（智能分配）
 */
export function getBestAvailableKey(): string | null {
  const keys = getAPIKeys();
  if (keys.length === 0) return null;
  
  const stats = loadKeyStats();
  
  // 初始化未记录的 Key
  keys.forEach(key => {
    if (!stats.has(key)) {
      stats.set(key, initKeyStatus(key));
    }
  });
  
  // 过滤出可用的 Key
  const availableKeys = keys
    .map(key => stats.get(key)!)
    .filter(s => s.status === 'active' || s.status === 'limited')
    .sort((a, b) => {
      // 优先级：配额剩余多的 > 最近使用时间早的
      if (a.quotaRemaining !== b.quotaRemaining) {
        return b.quotaRemaining - a.quotaRemaining;
      }
      return a.lastUsed - b.lastUsed;
    });
  
  if (availableKeys.length === 0) {
    // 所有 Key 都不可用，返回第一个（可能会失败，但至少尝试）
    return keys[0];
  }
  
  return availableKeys[0].key;
}

/**
 * 获取所有 Key 的统计信息
 */
export function getKeyStats(): KeyStats {
  const keys = getAPIKeys();
  const stats = loadKeyStats();
  
  // 初始化未记录的 Key
  keys.forEach(key => {
    if (!stats.has(key)) {
      stats.set(key, initKeyStatus(key));
    }
  });
  
  const keyStatuses = keys.map(key => stats.get(key)!);
  
  return {
    keys: keyStatuses,
    totalQuotaUsed: keyStatuses.reduce((sum, s) => sum + s.quotaUsed, 0),
    totalQuotaLimit: keyStatuses.reduce((sum, s) => sum + s.quotaLimit, 0),
    totalQuotaRemaining: keyStatuses.reduce((sum, s) => sum + s.quotaRemaining, 0),
    healthyKeyCount: keyStatuses.filter(s => s.status === 'active').length,
    lastUpdated: Date.now(),
  };
}

/**
 * 检查是否需要预警
 */
export function checkQuotaWarning(): { warning: boolean; message: string } {
  const stats = getKeyStats();
  
  const usageRate = stats.totalQuotaUsed / stats.totalQuotaLimit;
  
  if (usageRate >= 0.9) {
    return {
      warning: true,
      message: `⚠️ 配额即将耗尽！已使用 ${Math.round(usageRate * 100)}%`,
    };
  }
  
  if (usageRate >= QUOTA_WARNING_THRESHOLD) {
    return {
      warning: true,
      message: `⚠️ 配额使用较高，已使用 ${Math.round(usageRate * 100)}%`,
    };
  }
  
  if (stats.healthyKeyCount === 0) {
    return {
      warning: true,
      message: '⚠️ 所有 API Key 均不可用！',
    };
  }
  
  if (stats.healthyKeyCount <= 1 && stats.keys.length > 1) {
    return {
      warning: true,
      message: `⚠️ 仅剩 ${stats.healthyKeyCount} 个可用 Key`,
    };
  }
  
  return {
    warning: false,
    message: '✓ 配额充足',
  };
}

/**
 * 自动检查并重置配额（每天凌晨执行）
 */
export function setupDailyReset() {
  if (typeof window === 'undefined') return;
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    resetDailyQuota();
    console.log('YouTube API 配额已重置');
    
    // 设置每24小时重置一次
    setInterval(() => {
      resetDailyQuota();
      console.log('YouTube API 配额已重置');
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

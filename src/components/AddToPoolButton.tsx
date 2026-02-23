"use client";

import { useState } from "react";

type AddToPoolButtonProps = {
  channelUrl: string;
  channelTitle: string;
  videoCount?: number;
  onSuccess?: () => void;
};

export default function AddToPoolButton({ 
  channelUrl, 
  channelTitle, 
  videoCount,
  onSuccess 
}: AddToPoolButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    setLoading(true);
    try {
      // 从频道 URL 提取频道 ID 或 handle
      const channelIdentifier = extractChannelIdentifier(channelUrl);
      
      // 获取频道的热门视频
      const res = await fetch(`/api/youtube/discover?query=${encodeURIComponent(channelIdentifier)}&days=30&minDurationSec=60`);
      const data = await res.json();
      
      if (!data.ok || !data.channels || data.channels.length === 0) {
        throw new Error('无法获取频道视频');
      }

      // 提取视频 ID（从 sampleTitles 中提取）
      const channel = data.channels[0];
      const videoIds: string[] = [];
      
      // 这里需要从频道获取实际的视频 ID
      // 暂时使用频道 URL 作为标识
      const poolKey = 'planner_reference_pool';
      const existingPool = localStorage.getItem(poolKey);
      const pool = existingPool ? JSON.parse(existingPool) : [];
      
      // 添加频道信息到参考池
      const newEntry = {
        type: 'channel',
        channelUrl,
        channelTitle,
        addedAt: Date.now(),
      };
      
      // 检查是否已存在
      const exists = pool.some((item: any) => 
        item.channelUrl === channelUrl
      );
      
      if (!exists) {
        pool.push(newEntry);
        localStorage.setItem(poolKey, JSON.stringify(pool));
        setAdded(true);
        
        // 触发成功回调
        if (onSuccess) {
          onSuccess();
        }
        
        // 3秒后重置状态
        setTimeout(() => setAdded(false), 3000);
      } else {
        alert('该频道已在参考池中');
      }
    } catch (error) {
      console.error('添加到参考池失败:', error);
      alert('添加失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  function extractChannelIdentifier(url: string): string {
    // 从 URL 中提取频道 ID 或 handle
    const match = url.match(/youtube\.com\/(channel\/|@|c\/)?([^/?]+)/);
    return match ? match[2] : url;
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading || added}
      className={`
        px-3 py-1.5 rounded text-xs font-medium transition-all
        ${added 
          ? 'bg-green-100 text-green-700 cursor-default' 
          : loading
          ? 'bg-zinc-100 text-zinc-400 cursor-wait'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }
      `}
    >
      {added ? '✓ 已添加' : loading ? '添加中...' : '+ 添加到参考池'}
    </button>
  );
}

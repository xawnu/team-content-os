"use client";

import { useEffect, useState } from "react";

type PoolItem = {
  url: string;
  title?: string;
  channelTitle?: string;
  thumbnail?: string;
  addedAt: number;
};

type ReferencePoolManagerProps = {
  onSelect?: (urls: string[]) => void;
};

export default function ReferencePoolManager({ onSelect }: ReferencePoolManagerProps) {
  const [pool, setPool] = useState<PoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPool();
  }, []);

  function loadPool() {
    try {
      const data = localStorage.getItem('tcos_reference_videos');
      if (!data) {
        setPool([]);
        setLoading(false);
        return;
      }

      const urls = JSON.parse(data) as string[];
      
      // 转换为 PoolItem 格式
      const items: PoolItem[] = urls.map(url => ({
        url,
        addedAt: Date.now(),
      }));

      setPool(items);
      
      // 异步加载视频信息
      loadVideoInfo(items);
    } catch (error) {
      console.error('加载参考池失败:', error);
      setPool([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadVideoInfo(items: PoolItem[]) {
    // 批量获取视频信息
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        try {
          // 提取视频 ID
          const videoId = extractVideoId(item.url);
          if (!videoId) return item;

          const res = await fetch(`/api/youtube/video-info?videoId=${videoId}`);
          const data = await res.json();

          if (data.ok && data.video) {
            return {
              ...item,
              title: data.video.title,
              channelTitle: data.video.channelTitle,
              thumbnail: data.video.thumbnail,
            };
          }
        } catch (error) {
          console.error('获取视频信息失败:', error);
        }
        return item;
      })
    );

    setPool(updatedItems);
  }

  function extractVideoId(url: string): string | null {
    // 支持多种 YouTube URL 格式
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^&\s]+)/,
      /youtube\.com\/v\/([^&\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    // 如果是频道 URL，返回 null
    if (url.includes('youtube.com/channel/') || url.includes('youtube.com/@')) {
      return null;
    }

    return null;
  }

  function removeItem(url: string) {
    const updated = pool.filter(item => item.url !== url);
    setPool(updated);
    savePool(updated);
  }

  function clearPool() {
    if (!confirm('确定要清空参考池吗？')) return;
    setPool([]);
    localStorage.removeItem('tcos_reference_videos');
  }

  function savePool(items: PoolItem[]) {
    const urls = items.map(item => item.url);
    localStorage.setItem('tcos_reference_videos', JSON.stringify(urls));
  }

  function toggleSelect(url: string) {
    const newSelected = new Set(selectedUrls);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedUrls(newSelected);
  }

  function selectAll() {
    if (selectedUrls.size === pool.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(pool.map(item => item.url)));
    }
  }

  function removeSelected() {
    if (selectedUrls.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedUrls.size} 个项目吗？`)) return;
    
    const updated = pool.filter(item => !selectedUrls.has(item.url));
    setPool(updated);
    savePool(updated);
    setSelectedUrls(new Set());
  }

  function useSelected() {
    if (selectedUrls.size === 0) {
      alert('请先选择要使用的项目');
      return;
    }
    
    const urls = Array.from(selectedUrls);
    if (onSelect) {
      onSelect(urls);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">加载参考池...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-zinc-200 p-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            📚 参考池管理
          </h3>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {pool.length} 项
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pool.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-blue-600 hover:underline"
              >
                {expanded ? '收起' : '展开'}
              </button>
              <button
                onClick={clearPool}
                className="text-xs text-red-600 hover:underline"
              >
                清空
              </button>
            </>
          )}
          <button
            onClick={loadPool}
            className="text-xs text-zinc-600 hover:underline"
          >
            刷新
          </button>
        </div>
      </div>

      {/* 内容 */}
      {pool.length === 0 ? (
        <div className="p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="mt-2 text-sm text-zinc-600">参考池为空</p>
          <p className="mt-1 text-xs text-zinc-500">
            从发现页或同类页添加频道到参考池
          </p>
        </div>
      ) : (
        <>
          {/* 批量操作栏 */}
          {expanded && (
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      checked={selectedUrls.size === pool.length && pool.length > 0}
                      onChange={selectAll}
                      className="rounded"
                    />
                    全选
                  </label>
                  {selectedUrls.size > 0 && (
                    <span className="text-xs text-zinc-600">
                      已选 {selectedUrls.size} 项
                    </span>
                  )}
                </div>
                {selectedUrls.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={useSelected}
                      className="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                    >
                      使用选中项
                    </button>
                    <button
                      onClick={removeSelected}
                      className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                    >
                      删除选中
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 列表 */}
          <div className={`${expanded ? 'max-h-96 overflow-y-auto' : 'max-h-32 overflow-hidden'} transition-all`}>
            <div className="divide-y divide-zinc-100">
              {pool.map((item, index) => (
                <div
                  key={item.url}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-50 transition-colors"
                >
                  {expanded && (
                    <input
                      type="checkbox"
                      checked={selectedUrls.has(item.url)}
                      onChange={() => toggleSelect(item.url)}
                      className="rounded"
                    />
                  )}
                  
                  <div className="flex-shrink-0 text-xs text-zinc-400 w-6">
                    #{index + 1}
                  </div>

                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt={item.title || ''}
                      className="h-12 w-20 flex-shrink-0 rounded object-cover"
                    />
                  )}

                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {item.title || item.url}
                    </p>
                    {item.channelTitle && (
                      <p className="truncate text-xs text-zinc-500">
                        {item.channelTitle}
                      </p>
                    )}
                  </div>

                  {expanded && (
                    <div className="flex items-center gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        查看
                      </a>
                      <button
                        onClick={() => removeItem(item.url)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

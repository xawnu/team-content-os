"use client";

import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type VideoInfo = {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
  url: string;
};

type ReferenceVideoPoolProps = {
  videos: VideoInfo[];
  onChange: (videos: VideoInfo[]) => void;
  maxVideos?: number;
};

function SortableVideoCard({ video, onRemove }: { video: VideoInfo; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative flex gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      {/* 拖拽手柄 */}
      <div {...attributes} {...listeners} className="flex cursor-grab items-center text-zinc-400 hover:text-zinc-600 active:cursor-grabbing">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* 缩略图 */}
      <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-xs text-white">{video.duration}</div>
      </div>

      {/* 视频信息 */}
      <div className="flex-1 space-y-1 overflow-hidden">
        <h3 className="line-clamp-2 text-sm font-medium text-zinc-900">{video.title}</h3>
        <p className="text-xs text-zinc-500">{video.channelTitle}</p>
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-blue-600 hover:underline">
          在 YouTube 查看 →
        </a>
      </div>

      {/* 删除按钮 */}
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
        title="删除"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function ReferenceVideoPool({ videos, onChange, maxVideos = 3 }: ReferenceVideoPoolProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function addVideo() {
    if (!inputUrl.trim()) {
      setError("请输入 YouTube 视频链接");
      return;
    }

    if (videos.length >= maxVideos) {
      setError(`最多只能添加 ${maxVideos} 个视频`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/youtube/video-info?url=${encodeURIComponent(inputUrl.trim())}`);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "获取视频信息失败");
      }

      const newVideo = { ...json.video, url: inputUrl.trim() };

      // 检查是否已存在
      if (videos.some((v) => v.id === newVideo.id)) {
        setError("该视频已在参考池中");
        return;
      }

      onChange([...videos, newVideo]);
      setInputUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = videos.findIndex((v) => v.id === active.id);
      const newIndex = videos.findIndex((v) => v.id === over.id);
      onChange(arrayMove(videos, oldIndex, newIndex));
    }
  }

  function removeVideo(id: string) {
    onChange(videos.filter((v) => v.id !== id));
  }

  return (
    <div className="space-y-4">
      {/* 添加视频输入框 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">
          参考视频池（{videos.length}/{maxVideos}）
          <span className="ml-2 text-xs font-normal text-zinc-500">拖拽调整顺序，顺序影响生成权重</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addVideo()}
            placeholder="粘贴 YouTube 视频链接（支持 youtu.be / watch?v= / embed）"
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={loading || videos.length >= maxVideos}
          />
          <button
            onClick={addVideo}
            disabled={loading || videos.length >= maxVideos}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {loading ? "加载中..." : "添加"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* 视频卡片列表 */}
      {videos.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={videos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {videos.map((video) => (
                <SortableVideoCard key={video.id} video={video} onRemove={() => removeVideo(video.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm text-zinc-600">还没有添加参考视频</p>
          <p className="text-xs text-zinc-500">至少添加 1 个视频才能生成文案</p>
        </div>
      )}
    </div>
  );
}

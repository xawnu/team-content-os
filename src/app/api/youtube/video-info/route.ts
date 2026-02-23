import { NextRequest, NextResponse } from "next/server";

const YOUTUBE_API_KEYS = (process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

type VideoInfo = {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
};

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  
  // 直接是 video ID (11 字符)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  
  // youtube.com/watch?v=...
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  
  // youtu.be/...
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  
  // youtube.com/embed/...
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  
  return null;
}

function formatDuration(iso8601: string): string {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function fetchVideoInfo(videoId: string, apiKey: string): Promise<VideoInfo | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);
  
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  
  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;
  
  const item = data.items[0];
  const snippet = item.snippet || {};
  const contentDetails = item.contentDetails || {};
  
  return {
    id: videoId,
    title: snippet.title || "未知标题",
    thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "",
    duration: formatDuration(contentDetails.duration || "PT0S"),
    channelTitle: snippet.channelTitle || "未知频道",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  
  if (!url) {
    return NextResponse.json({ ok: false, error: "缺少 url 参数" }, { status: 400 });
  }
  
  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ ok: false, error: "无法解析视频 ID" }, { status: 400 });
  }
  
  if (YOUTUBE_API_KEYS.length === 0) {
    return NextResponse.json({ ok: false, error: "未配置 YouTube API Key" }, { status: 500 });
  }
  
  // 尝试所有可用的 API Key
  for (const apiKey of YOUTUBE_API_KEYS) {
    try {
      const info = await fetchVideoInfo(videoId, apiKey);
      if (info) {
        return NextResponse.json({ ok: true, video: info });
      }
    } catch (error) {
      console.error(`API Key ${apiKey.slice(0, 8)}... 失败:`, error);
      continue;
    }
  }
  
  return NextResponse.json({ ok: false, error: "所有 API Key 均失败" }, { status: 500 });
}

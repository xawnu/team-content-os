import { getYouTubeKeys, isQuotaExceeded } from "@/lib/youtube/keypool";

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
    publishedAt?: string;
  };
};

type VideosItem = {
  id: string;
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
    publishedAt?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
};

export type DiscoverInput = {
  query: string;
  regionCode?: string;
  language?: string;
  days?: number;
  maxResults?: number;
  minDurationSec?: number;
  weights?: {
    viewSum: number;
    medianView: number;
    upload: number;
  };
};

export type ChannelScore = {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  videoCount7d: number;
  viewsSum7d: number;
  viewsMedian7d: number;
  score: number;
  sampleTitles: string[];
};

const YT_API = "https://www.googleapis.com/youtube/v3";

function isoDurationToSec(duration?: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = Number(match[1] ?? 0);
  const m = Number(match[2] ?? 0);
  const s = Number(match[3] ?? 0);
  return h * 3600 + m * 60 + s;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calcScore(
  viewsSum: number,
  viewsMedian: number,
  videoCount: number,
  weights: { viewSum: number; medianView: number; upload: number },
): number {
  const score =
    weights.viewSum * Math.log(viewsSum + 1) +
    weights.medianView * Math.log(viewsMedian + 1) +
    weights.upload * Math.min(videoCount, 7);
  return Number((score * 10).toFixed(2));
}

async function ytFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const keys = getYouTubeKeys();
  if (!keys.length) throw new Error("YOUTUBE_API_KEY(S) is missing");

  let lastError = "";

  for (const key of keys) {
    const searchParams = new URLSearchParams();
    Object.entries({ ...params, key }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") searchParams.set(k, String(v));
    });

    const res = await fetch(`${YT_API}${path}?${searchParams.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (res.ok) return res.json() as Promise<T>;

    const text = await res.text();
    lastError = `YouTube API error ${res.status}: ${text}`;

    if (!(res.status === 403 && isQuotaExceeded(text))) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError || "YouTube API quota exceeded on all keys");
}

export async function discoverFastGrowingChannels(input: DiscoverInput): Promise<{
  channels: ChannelScore[];
  fetchedVideos: number;
  filteredVideos: number;
}> {
  const now = Date.now();
  const days = input.days ?? 7;
  const publishedAfter = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  const maxResults = Math.min(input.maxResults ?? 50, 50);
  const minDurationSec = input.minDurationSec ?? 240;
  const weights = input.weights ?? { viewSum: 0.45, medianView: 0.3, upload: 0.25 };

  const searchRes = await ytFetch<{ items: SearchItem[] }>("/search", {
    part: "snippet",
    type: "video",
    order: "viewCount",
    q: input.query,
    maxResults,
    publishedAfter,
    regionCode: input.regionCode ?? "US",
    relevanceLanguage: input.language ?? "en",
  });

  const videoIds = [...new Set((searchRes.items ?? []).map((i) => i.id?.videoId).filter(Boolean))] as string[];

  if (!videoIds.length) {
    return { channels: [], fetchedVideos: 0, filteredVideos: 0 };
  }

  const videoRes = await ytFetch<{ items: VideosItem[] }>("/videos", {
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(","),
    maxResults: 50,
  });

  const filtered = (videoRes.items ?? []).filter((v) => {
    const durationSec = isoDurationToSec(v.contentDetails?.duration);
    return durationSec >= minDurationSec;
  });

  const channelMap = new Map<
    string,
    { channelTitle: string; views: number[]; titles: string[]; count: number }
  >();

  for (const v of filtered) {
    const channelId = v.snippet?.channelId;
    if (!channelId) continue;

    const views = Number(v.statistics?.viewCount ?? 0);
    const title = v.snippet?.title ?? "";
    const channelTitle = v.snippet?.channelTitle ?? "Unknown";

    if (!channelMap.has(channelId)) {
      channelMap.set(channelId, {
        channelTitle,
        views: [],
        titles: [],
        count: 0,
      });
    }

    const row = channelMap.get(channelId)!;
    row.views.push(views);
    row.count += 1;
    if (row.titles.length < 3) row.titles.push(title);
  }

  const channels: ChannelScore[] = [...channelMap.entries()]
    .map(([channelId, row]) => {
      const viewsSum7d = row.views.reduce((a, b) => a + b, 0);
      const viewsMedian7d = median(row.views);
      const videoCount7d = row.count;
      const score = calcScore(viewsSum7d, viewsMedian7d, videoCount7d, weights);

      return {
        channelId,
        channelTitle: row.channelTitle,
        channelUrl: `https://www.youtube.com/channel/${channelId}`,
        videoCount7d,
        viewsSum7d,
        viewsMedian7d,
        score,
        sampleTitles: row.titles,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return {
    channels,
    fetchedVideos: videoRes.items?.length ?? 0,
    filteredVideos: filtered.length,
  };
}

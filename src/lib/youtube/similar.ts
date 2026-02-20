import { getYouTubeKeys, isQuotaExceeded } from "@/lib/youtube/keypool";

type VideosItem = {
  id: string;
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
  };
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
};

type ChannelItem = {
  id: string;
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
};

type SearchItem = {
  id?: { channelId?: string };
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
  };
};

type CandidateChannel = {
  channelId: string;
  channelTitle?: string;
  channelUrl?: string;
};

const YT_API = "https://www.googleapis.com/youtube/v3";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .slice(0, 40);
}

function topTerms(titles: string[]): string[] {
  const stop = new Set(["this", "that", "with", "from", "your", "have", "will", "what", "when", "where", "about", "into", "over", "under", "after", "before"]);
  const count = new Map<string, number>();

  for (const t of titles) {
    for (const w of tokenize(t)) {
      if (stop.has(w)) continue;
      count.set(w, (count.get(w) ?? 0) + 1);
    }
  }

  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
}

function overlapScore(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return inter / union;
}

async function ytFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const keys = getYouTubeKeys();
  if (!keys.length) throw new Error("YOUTUBE_API_KEY(S) is missing");

  let lastError = "";

  for (const key of keys) {
    const q = new URLSearchParams();
    Object.entries({ ...params, key }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });

    const res = await fetch(`${YT_API}${path}?${q.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (res.ok) return res.json() as Promise<T>;

    const text = await res.text();
    lastError = `YouTube API ${res.status}: ${text}`;
    if (!(res.status === 403 && isQuotaExceeded(text))) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError || "YouTube API quota exceeded on all keys");
}

export async function resolveChannelId(input: string): Promise<string> {
  const raw = input.trim();
  if (!raw) throw new Error("channel input is required");

  if (/^UC[\w-]{20,}$/.test(raw)) return raw;

  let handleOrQuery = raw;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1]) return parts[1];
    if (parts[0]?.startsWith("@")) handleOrQuery = parts[0];
    else handleOrQuery = parts.join(" ");
  }

  if (handleOrQuery.startsWith("@")) {
    const handle = handleOrQuery.slice(1);
    const byHandle = await ytFetch<{ items: ChannelItem[] }>("/channels", {
      part: "id",
      forHandle: handle,
      maxResults: 1,
    });
    const channelId = byHandle.items?.[0]?.id;
    if (channelId) return channelId;
  }

  // legacy username fallback (1 unit)
  const byUsername = await ytFetch<{ items: ChannelItem[] }>("/channels", {
    part: "id",
    forUsername: handleOrQuery.replace(/^@/, ""),
    maxResults: 1,
  });
  const channelId = byUsername.items?.[0]?.id;
  if (!channelId) throw new Error("Unable to resolve channelId from input (请优先使用 UC... 或 @handle)");

  return channelId;
}

export async function getRecentTitles(channelId: string): Promise<string[]> {
  const channel = await ytFetch<{ items: ChannelItem[] }>("/channels", {
    part: "contentDetails",
    id: channelId,
    maxResults: 1,
  });

  const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];

  const playlist = await ytFetch<{ items: { contentDetails?: { videoId?: string } }[] }>("/playlistItems", {
    part: "contentDetails",
    playlistId: uploads,
    maxResults: 12,
  });

  const ids = (playlist.items ?? []).map((x) => x.contentDetails?.videoId).filter(Boolean) as string[];
  if (!ids.length) return [];

  const videos = await ytFetch<{ items: VideosItem[] }>("/videos", {
    part: "snippet",
    id: ids.join(","),
  });

  return (videos.items ?? []).map((v) => v.snippet?.title ?? "").filter(Boolean);
}

export async function findSimilarChannels(seedInput: string, candidateChannels: CandidateChannel[] = []) {
  const seedChannelId = await resolveChannelId(seedInput);
  const seedTitles = await getRecentTitles(seedChannelId);
  const seedTerms = topTerms(seedTitles);
  const query = seedTerms.slice(0, 4).join(" ") || "homestead";

  let candidates = candidateChannels;

  // 高召回补充：即使有本地库，也补一轮搜索候选（成本更高，效果更好）
  const search = await ytFetch<{ items: SearchItem[] }>("/search", {
    part: "snippet",
    type: "channel",
    q: query,
    maxResults: 20,
    order: "relevance",
  });

  const fromSearch: CandidateChannel[] = (search.items ?? [])
    .filter((i): i is SearchItem => Boolean(i?.snippet?.channelId))
    .map((i) => ({
      channelId: i.snippet!.channelId!,
      channelTitle: i.snippet?.channelTitle,
      channelUrl: i.snippet?.channelId ? `https://www.youtube.com/channel/${i.snippet.channelId}` : undefined,
    }));

  const merged = new Map<string, CandidateChannel>();
  for (const c of [...candidates, ...fromSearch]) merged.set(c.channelId, c);
  candidates = [...merged.values()];

  const rows = [] as {
    channelId: string;
    channelTitle: string;
    channelUrl: string;
    similarity: number;
    matchedTerms: string[];
  }[];

  for (const c of candidates) {
    const channelId = c.channelId;
    if (!channelId || channelId === seedChannelId) continue;

    const titles = await getRecentTitles(channelId);
    const terms = topTerms(titles);
    const similarity = overlapScore(seedTerms, terms);
    if (similarity <= 0) continue;

    const matchedTerms = seedTerms.filter((t) => terms.includes(t));

    rows.push({
      channelId,
      channelTitle: c.channelTitle ?? "Unknown",
      channelUrl: c.channelUrl ?? `https://www.youtube.com/channel/${channelId}`,
      similarity: Number((similarity * 100).toFixed(2)),
      matchedTerms,
    });
  }

  rows.sort((a, b) => b.similarity - a.similarity);

  return {
    seedInput,
    seedChannelId,
    query,
    seedTerms,
    items: rows.slice(0, 15),
  };
}

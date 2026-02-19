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

type SearchItem = {
  id?: { channelId?: string };
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
  };
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
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is missing");

  const q = new URLSearchParams();
  Object.entries({ ...params, key }).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });

  const res = await fetch(`${YT_API}${path}?${q.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function getRecentTitles(channelId: string): Promise<string[]> {
  const search = await ytFetch<{ items: { id?: { videoId?: string } }[] }>("/search", {
    part: "id",
    channelId,
    type: "video",
    order: "date",
    maxResults: 12,
  });

  const ids = (search.items ?? []).map((x) => x.id?.videoId).filter(Boolean) as string[];
  if (!ids.length) return [];

  const videos = await ytFetch<{ items: VideosItem[] }>("/videos", {
    part: "snippet",
    id: ids.join(","),
  });

  return (videos.items ?? []).map((v) => v.snippet?.title ?? "").filter(Boolean);
}

export async function findSimilarChannels(seedChannelId: string) {
  const seedTitles = await getRecentTitles(seedChannelId);
  const seedTerms = topTerms(seedTitles);
  const query = seedTerms.slice(0, 4).join(" ") || "homestead";

  const search = await ytFetch<{ items: SearchItem[] }>("/search", {
    part: "snippet",
    type: "channel",
    q: query,
    maxResults: 20,
    order: "relevance",
  });

  const candidates = [...new Map((search.items ?? [])
    .map((i) => [i.snippet?.channelId, i])
    .filter(([id]) => Boolean(id))).values()];

  const rows = [] as {
    channelId: string;
    channelTitle: string;
    channelUrl: string;
    similarity: number;
    matchedTerms: string[];
  }[];

  for (const c of candidates) {
    const channelId = c.snippet?.channelId;
    if (!channelId || channelId === seedChannelId) continue;

    const titles = await getRecentTitles(channelId);
    const terms = topTerms(titles);
    const similarity = overlapScore(seedTerms, terms);
    if (similarity <= 0) continue;

    const matchedTerms = seedTerms.filter((t) => terms.includes(t));

    rows.push({
      channelId,
      channelTitle: c.snippet?.channelTitle ?? "Unknown",
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      similarity: Number((similarity * 100).toFixed(2)),
      matchedTerms,
    });
  }

  rows.sort((a, b) => b.similarity - a.similarity);

  return {
    seedChannelId,
    query,
    seedTerms,
    items: rows.slice(0, 15),
  };
}

export function getYouTubeKeys(): string[] {
  const many = (process.env.YOUTUBE_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (many.length) return many;

  const single = (process.env.YOUTUBE_API_KEY || "").trim();
  return single ? [single] : [];
}

export function isQuotaExceeded(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("quota") && (m.includes("exceeded") || m.includes("quotaexceeded"));
}

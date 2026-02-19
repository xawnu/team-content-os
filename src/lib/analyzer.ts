const RISK_WORDS = [
  "instantly",
  "miracle",
  "guaranteed",
  "ban",
  "banned",
  "cure",
  "reverse aging",
  "secret",
  "shocking",
  "urgent",
  "warning",
];

function normalizePattern(title: string): string {
  return title
    .toLowerCase()
    .replace(/\d+/g, "{n}")
    .replace(/[“”"'`]/g, "")
    .replace(/[^a-z0-9{}\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(title: string): string[] {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "your",
    "that",
    "this",
    "from",
    "into",
    "over",
    "under",
    "what",
    "when",
    "where",
    "how",
  ]);

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));
}

export function analyzeTitles(titles: string[]) {
  const patterns = new Map<string, number>();
  const words = new Map<string, number>();
  const risks = new Map<string, number>();

  for (const title of titles) {
    const p = normalizePattern(title);
    patterns.set(p, (patterns.get(p) ?? 0) + 1);

    for (const w of tokenize(title)) {
      words.set(w, (words.get(w) ?? 0) + 1);
    }

    const lower = title.toLowerCase();
    for (const r of RISK_WORDS) {
      if (lower.includes(r)) risks.set(r, (risks.get(r) ?? 0) + 1);
    }
  }

  return {
    totalTitles: titles.length,
    topPatterns: [...patterns.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count })),
    topKeywords: [...words.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count })),
    riskHits: [...risks.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([word, count]) => ({ word, count })),
  };
}

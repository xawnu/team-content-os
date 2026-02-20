import { prisma } from "@/lib/prisma";

export type NichePreset = {
  slug: string;
  name: string;
  primaryQuery: string;
  keywordSet: string[];
  minDurationSec: number;
  windowDays: number;
  maxResults: number;
  weights: { viewSum: number; medianView: number; upload: number };
  riskWords: string[];
};

export const DEFAULT_NICHE_PRESETS: NichePreset[] = [
  {
    slug: "homestead",
    name: "Homestead / Off-grid",
    primaryQuery: "homestead",
    keywordSet: ["homestead", "off grid", "self sufficient", "backyard farming"],
    minDurationSec: 240,
    windowDays: 7,
    maxResults: 50,
    weights: { viewSum: 0.45, medianView: 0.3, upload: 0.25 },
    riskWords: ["instantly", "miracle cure", "FDA banned"],
  },
  {
    slug: "ai-tools",
    name: "AI Tools",
    primaryQuery: "ai tools",
    keywordSet: ["ai tools", "chatgpt tutorial", "automation", "no code ai"],
    minDurationSec: 120,
    windowDays: 7,
    maxResults: 50,
    weights: { viewSum: 0.5, medianView: 0.25, upload: 0.25 },
    riskWords: ["make money fast", "guaranteed income"],
  },
  {
    slug: "fitness",
    name: "Fitness",
    primaryQuery: "fitness",
    keywordSet: ["fitness", "workout", "fat loss", "muscle gain"],
    minDurationSec: 60,
    windowDays: 14,
    maxResults: 50,
    weights: { viewSum: 0.4, medianView: 0.35, upload: 0.25 },
    riskWords: ["lose 10kg in 3 days", "instant body transformation"],
  },
];

export async function listNichePresets(): Promise<NichePreset[]> {
  const rows = await prisma.nicheConfig.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  if (!rows.length) return DEFAULT_NICHE_PRESETS;

  return rows.map((row: (typeof rows)[number]) => ({
    slug: row.slug,
    name: row.name,
    primaryQuery: row.primaryQuery,
    keywordSet: Array.isArray(row.keywordSet) ? (row.keywordSet as string[]) : [],
    minDurationSec: row.minDurationSec,
    windowDays: row.windowDays,
    maxResults: row.maxResults,
    weights: {
      viewSum: row.viewSumWeight,
      medianView: row.medianViewWeight,
      upload: row.uploadWeight,
    },
    riskWords: Array.isArray(row.riskWords) ? (row.riskWords as string[]) : [],
  }));
}

export async function getNichePreset(slug?: string | null): Promise<NichePreset | null> {
  if (!slug) return null;

  const fromDb = await prisma.nicheConfig.findUnique({ where: { slug } });
  if (fromDb) {
    return {
      slug: fromDb.slug,
      name: fromDb.name,
      primaryQuery: fromDb.primaryQuery,
      keywordSet: Array.isArray(fromDb.keywordSet) ? (fromDb.keywordSet as string[]) : [],
      minDurationSec: fromDb.minDurationSec,
      windowDays: fromDb.windowDays,
      maxResults: fromDb.maxResults,
      weights: {
        viewSum: fromDb.viewSumWeight,
        medianView: fromDb.medianViewWeight,
        upload: fromDb.uploadWeight,
      },
      riskWords: Array.isArray(fromDb.riskWords) ? (fromDb.riskWords as string[]) : [],
    };
  }

  return DEFAULT_NICHE_PRESETS.find((p) => p.slug === slug) ?? null;
}

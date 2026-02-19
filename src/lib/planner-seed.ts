import { prisma } from "@/lib/prisma";
import { resolveChannelId, getRecentTitles } from "@/lib/youtube/similar";
import { openRouterJson } from "@/lib/openrouter";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

function inferScene(titles: string[]): { scene: string; alternatives: string[] } {
  const joined = titles.join(" ").toLowerCase();
  const rules: Array<{ scene: string; keys: string[] }> = [
    { scene: "balcony", keys: ["balcony", "apartment", "small space", "pots", "container"] },
    { scene: "backyard", keys: ["backyard", "yard", "garden bed", "raised bed"] },
    { scene: "indoor", keys: ["indoor", "houseplant", "inside", "kitchen"] },
    { scene: "off-grid", keys: ["off grid", "cabin", "homestead", "wilderness"] },
    { scene: "farm", keys: ["farm", "livestock", "barn", "acre", "pasture"] },
  ];

  const scores = rules.map((r) => ({
    scene: r.scene,
    score: r.keys.reduce((acc, k) => acc + (joined.includes(k) ? 1 : 0), 0),
  }));

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0]?.score ? scores[0].scene : "general";
  const alternatives = scores.filter((s) => s.score > 0 && s.scene !== top).map((s) => s.scene).slice(0, 2);

  return { scene: top, alternatives };
}

function topKeywords(titles: string[], limit = 20): string[] {
  const stop = new Set(["this", "that", "with", "from", "your", "have", "will", "what", "when", "where"]);
  const map = new Map<string, number>();
  for (const t of titles) {
    for (const w of tokenize(t)) {
      if (stop.has(w)) continue;
      map.set(w, (map.get(w) ?? 0) + 1);
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
}

async function ensureDefaultProject(niche: string) {
  let project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (project) return project;
  const team = await prisma.team.create({ data: { name: "Default Team" } });
  const user = await prisma.user.create({ data: { email: "owner@local", name: "Owner", role: "admin", teamId: team.id } });
  return prisma.project.create({
    data: { teamId: team.id, ownerId: user.id, name: "Default Project", niche, language: "en", positioning: "Seed planner" },
  });
}

export async function generateSeedDrivenPlan(input: {
  seeds: string[];
  count?: number;
  language?: string;
  scene?: string;
  autoScene?: boolean;
  ai?: boolean;
}) {
  const seeds = input.seeds.filter(Boolean);
  if (!seeds.length) throw new Error("At least one seed channel is required");

  const resolved = await Promise.all(seeds.map((s) => resolveChannelId(s)));
  const uniqueChannels = [...new Set(resolved)];

  const titleGroups = await Promise.all(uniqueChannels.map((id) => getRecentTitles(id)));
  const titles = titleGroups.flat();
  let keywords = topKeywords(titles, 18);

  const sceneGuess = inferScene(titles);
  const finalScene = input.autoScene !== false ? sceneGuess.scene : input.scene || sceneGuess.scene;

  if (input.ai) {
    try {
      const ai = await openRouterJson<{ keywords?: string[] }>([
        { role: "system", content: "Extract practical content keywords for a YouTube weekly plan. Return JSON only." },
        {
          role: "user",
          content: JSON.stringify({ seeds, titles: titles.slice(0, 80), output: { keywords: ["string"] } }),
        },
      ]);
      if (Array.isArray(ai.keywords) && ai.keywords.length) keywords = ai.keywords.slice(0, 18);
    } catch {
      // fallback to local keywords
    }
  }

  if (!keywords.length) keywords = ["beginner", "guide", "setup", "mistakes", "results"];

  const project = await ensureDefaultProject("seed-driven");
  const count = Math.min(Math.max(input.count ?? 10, 3), 20);

  const generated = [] as Array<{ id: string; topic: string; bucket: string; titleOptions: string[] }>;
  const buckets = ["必做", "必做", "必做", "备选", "备选", "备选", "备选", "实验", "实验", "实验"];

  for (let i = 0; i < count; i++) {
    const k = keywords[i % keywords.length];
    const bucket = buckets[i] ?? "备选";
    const n = [5, 7, 10, 12, 15][i % 5];
    const topic = `${k} - ${bucket} #${i + 1}`;
    const titleOptions = [
      `${n} practical ${k} ideas you can apply this week`,
      `${k} mistakes beginners make (and how to fix fast)`,
      `I tested ${k} for 7 days: what actually worked`,
    ];

    const ep = await prisma.episodePlan.create({
      data: {
        projectId: project.id,
        topic,
        targetKeyword: k,
        plannedDate: new Date(Date.now() + i * 86400000),
        titleOptions,
        thumbnailCopy: `${n} ${k} tips`,
        scriptOutline: `Scene=${finalScene}; Language=${input.language || "zh"}; Hook->3 points->CTA`,
        shotList: "A-roll intro / process b-roll / before-after / close",
        voiceoverOutline: "clear, practical, no hype",
        assetsNeeded: "thumbnail, subtitles, b-roll",
      },
    });

    generated.push({ id: ep.id, topic, bucket, titleOptions });
  }

  return {
    seeds,
    channelIds: uniqueChannels,
    keywordPool: keywords,
    inferredScene: sceneGuess.scene,
    sceneAlternatives: sceneGuess.alternatives,
    finalScene,
    generated,
  };
}

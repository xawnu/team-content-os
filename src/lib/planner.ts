import { prisma } from "@/lib/prisma";
import { openRouterJson } from "@/lib/openrouter";

type GeneratePlanInput = {
  runId?: string;
  count?: number;
  briefs?: number;
};

function tokenize(text: string): string[] {
  const stop = new Set([
    "this",
    "that",
    "with",
    "from",
    "your",
    "have",
    "will",
    "what",
    "when",
    "where",
    "about",
    "into",
    "over",
    "under",
    "after",
    "before",
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));
}

function topKeywords(titles: string[], limit = 12): string[] {
  const map = new Map<string, number>();
  for (const t of titles) {
    for (const w of tokenize(t)) map.set(w, (map.get(w) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

function nextDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d;
}

async function ensureDefaultProject(niche: string) {
  let project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (project) return project;

  const team = await prisma.team.create({ data: { name: "Default Team" } });
  const user = await prisma.user.create({
    data: {
      email: "owner@local",
      name: "Owner",
      role: "admin",
      teamId: team.id,
    },
  });
  project = await prisma.project.create({
    data: {
      teamId: team.id,
      ownerId: user.id,
      name: "Default Project",
      niche,
      language: "en",
      positioning: "Auto-generated project for planner",
    },
  });
  return project;
}

function formatResult(runId: string, query: string, created: Array<{ id: string; topic: string; titleOptions: string[]; plannedDate: Date | null }>, briefs: number) {
  return {
    runId,
    query,
    generated: created,
    briefs: created.slice(0, briefs).map((e) => ({
      episodeId: e.id,
      topic: e.topic,
      titleOptions: e.titleOptions.slice(0, 3),
      brief: {
        hook: `In 30 seconds: why ${e.topic} matters now`,
        body: ["Step 1: setup", "Step 2: execution", "Step 3: avoid common pitfall"],
        cta: "Comment your biggest blocker for next episode",
      },
    })),
  };
}

export async function generateWeeklyPlan(input: GeneratePlanInput) {
  const count = Math.min(Math.max(input.count ?? 10, 3), 20);
  const briefs = Math.min(Math.max(input.briefs ?? 3, 1), 10);

  const run = input.runId
    ? await prisma.discoverRun.findUnique({ where: { id: input.runId }, include: { candidates: true } })
    : await prisma.discoverRun.findFirst({ orderBy: { createdAt: "desc" }, include: { candidates: true } });

  if (!run) throw new Error("No discover run found. Please run discovery first.");

  const titles = run.candidates.flatMap((c: (typeof run.candidates)[number]) =>
    Array.isArray(c.sampleTitles) ? (c.sampleTitles as string[]) : [],
  );
  const keywords = topKeywords(titles);
  const pivot = keywords.length ? keywords : [run.query, "beginner", "guide", "tips", "mistakes"];

  const templates = [
    "{n} practical {k} ideas for beginners",
    "Top {n} {k} mistakes and how to fix them",
    "{n}-day {k} challenge: what actually works",
    "Beginner-friendly {k} setup under budget",
    "{n} proven {k} methods compared",
  ];

  const project = await ensureDefaultProject(run.query);
  const created = [] as { id: string; topic: string; titleOptions: string[]; plannedDate: Date | null }[];

  for (let i = 0; i < count; i++) {
    const k = pivot[i % pivot.length];
    const n = [5, 7, 10, 12, 15, 20][i % 6];
    const topic = `${k} content test #${i + 1}`;
    const titleOptions = templates.map((t) => t.replaceAll("{k}", k).replaceAll("{n}", String(n)));

    const episode = await prisma.episodePlan.create({
      data: {
        projectId: project.id,
        plannedDate: nextDate(i),
        topic,
        targetKeyword: k,
        titleOptions,
        thumbnailCopy: `${n} ${k} tips`,
        scriptOutline: "Hook -> Problem -> 3 actionable steps -> proof -> CTA",
        shotList: "A-roll intro, B-roll process, comparison shot, result shot",
        voiceoverOutline: "calm, practical, evidence-first",
        assetsNeeded: "thumbnail, b-roll, captions",
      },
    });

    created.push({ id: episode.id, topic, titleOptions, plannedDate: episode.plannedDate });
  }

  return formatResult(run.id, run.query, created, briefs);
}

export async function generateWeeklyPlanV2(input: GeneratePlanInput & { ai?: boolean }) {
  const count = Math.min(Math.max(input.count ?? 10, 3), 20);
  const briefs = Math.min(Math.max(input.briefs ?? 3, 1), 10);

  const run = input.runId
    ? await prisma.discoverRun.findUnique({ where: { id: input.runId }, include: { candidates: true } })
    : await prisma.discoverRun.findFirst({ orderBy: { createdAt: "desc" }, include: { candidates: true } });

  if (!run) throw new Error("No discover run found. Please run discovery first.");

  const titles = run.candidates.flatMap((c: (typeof run.candidates)[number]) =>
    Array.isArray(c.sampleTitles) ? (c.sampleTitles as string[]) : [],
  );
  const similar = await prisma.similarRun.findFirst({ orderBy: { createdAt: "desc" }, include: { items: true } });
  const similarItems = similar?.items ?? [];
  const similarWords = similarItems
    .flatMap((i: (typeof similarItems)[number]) => (Array.isArray(i.matchedTerms) ? (i.matchedTerms as string[]) : []))
    .slice(0, 12);

  let pivot = Array.from(new Set([...topKeywords(titles, 20), ...similarWords])).slice(0, 15);
  if (!pivot.length) pivot = [run.query, "beginner", "guide", "mistakes", "budget"];

  const project = await ensureDefaultProject(run.query);

  if (input.ai) {
    try {
      const ai = await openRouterJson<{ keywords?: string[] }>([
        {
          role: "system",
          content:
            "You are a YouTube planner. Return JSON only. Extract 12 practical keywords for next-week content tests.",
        },
        {
          role: "user",
          content: JSON.stringify({ query: run.query, titles: titles.slice(0, 60), similarWords, output: { keywords: ["string"] } }),
        },
      ]);
      if (Array.isArray(ai.keywords) && ai.keywords.length) {
        pivot = Array.from(new Set(ai.keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean))).slice(0, 15);
      }
    } catch {
      // fallback to rules pivot
    }
  }

  const templates = [
    "{n} practical ways to improve {k}",
    "Beginner guide: {k} step-by-step",
    "{k} mistakes that kill your results ({n} fixes)",
    "I tested {k} for {n} days: what worked",
    "Low-budget {k} setup that still performs",
  ];

  const created = [] as { id: string; topic: string; titleOptions: string[]; plannedDate: Date | null }[];

  for (let i = 0; i < count; i++) {
    const k = pivot[i % pivot.length];
    const n = [5, 7, 10, 14, 20][i % 5];
    const topic = `${k} weekly plan #${i + 1}`;
    const titleOptions = templates.map((t) => t.replaceAll("{k}", k).replaceAll("{n}", String(n)));

    const episode = await prisma.episodePlan.create({
      data: {
        projectId: project.id,
        plannedDate: nextDate(i),
        topic,
        targetKeyword: k,
        titleOptions,
        thumbnailCopy: `${n} ${k} fixes`,
        scriptOutline: "Hook -> context -> 3 practical actions -> mini-proof -> CTA",
        shotList: "Intro face-cam, 3 proof shots, before/after compare, recap",
        voiceoverOutline: "energetic, clear, no fluff",
        assetsNeeded: "thumbnail variants, b-roll set A/B, subtitles",
      },
    });

    created.push({ id: episode.id, topic, titleOptions, plannedDate: episode.plannedDate });
  }

  return {
    ...formatResult(run.id, run.query, created, briefs),
    provider: input.ai ? "v2-ai" : "v2-rules",
  };
}

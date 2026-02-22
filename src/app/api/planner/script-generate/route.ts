import { NextRequest, NextResponse } from "next/server";
import { generateDetailedScriptFromSeeds } from "@/lib/planner-script";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function ensureDefaultProject() {
  let project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (project) return project;

  const team = await prisma.team.create({ data: { name: "Default Team" } });
  const user = await prisma.user.create({
    data: { email: "owner@local", name: "Owner", role: "admin", teamId: team.id },
  });

  project = await prisma.project.create({
    data: {
      teamId: team.id,
      ownerId: user.id,
      name: "Default Project",
      niche: "script-generator",
      language: "zh",
      positioning: "Reference-channel script generation",
    },
  });

  return project;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const seedText = String(body.seedText || "");
    const language = body.language === "en" ? "en" : "zh";
    const direction = String(body.direction || "同类型视频详细文案");
    const topicLock = String(body.topicLock || "").trim();
    const bannedWords = String(body.bannedWords || "")
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const referenceVideos = Array.isArray(body.referenceVideos)
      ? body.referenceVideos.map((x: unknown) => String(x).trim()).filter(Boolean)
      : String(body.referenceVideos || "").split(/\n/).map((x) => x.trim()).filter(Boolean);
    const contentGoal = String(body.contentGoal || "拉新破圈");
    const narrativeStructure = String(body.narrativeStructure || "问题→方案→结果");
    const toneStyle = Array.isArray(body.toneStyle)
      ? body.toneStyle.map((x: unknown) => String(x)).filter(Boolean)
      : String(body.toneStyle || "专业理性").split(/,|\n/).map((s) => s.trim()).filter(Boolean);
    const paceLevel = String(body.paceLevel || "中");
    const variationNonce = String(body.variationNonce || Date.now());

    const raw = await generateDetailedScriptFromSeeds({
      seedText,
      language,
      direction,
      topicLock,
      bannedWords,
      referenceVideos,
      contentGoal,
      narrativeStructure,
      toneStyle,
      paceLevel,
      variationNonce,
    });
    const normalized = (raw as Record<string, unknown>)?.["0"] && typeof (raw as Record<string, unknown>)["0"] === "object"
      ? { ...(raw as Record<string, unknown>)["0"] as Record<string, unknown>, references: (raw as Record<string, unknown>).references, provider: (raw as Record<string, unknown>).provider }
      : (raw as Record<string, unknown>);

    const script = {
      topic: String(normalized.topic ?? ""),
      title: String(normalized.title ?? ""),
      thumbnailCopy: String(normalized.thumbnailCopy ?? ""),
      opening15s: Array.isArray(normalized.opening15s) ? normalized.opening15s.map(String) : [],
      timeline: Array.isArray(normalized.timeline) ? normalized.timeline : [],
      contentItems: Array.isArray(normalized.contentItems) ? normalized.contentItems.map(String) : [],
      cta: String(normalized.cta ?? ""),
      publishCopy: String(normalized.publishCopy ?? ""),
      tags: Array.isArray(normalized.tags) ? normalized.tags.map(String) : [],
      differentiation: Array.isArray(normalized.differentiation) ? normalized.differentiation.map(String) : [],
      provider: normalized.provider === "template" ? "template" : "ai",
    };

    const project = await ensureDefaultProject();
    const episode = await prisma.episodePlan.create({
      data: {
        projectId: project.id,
        topic: script.topic || "未命名文案",
        targetKeyword: direction,
        titleOptions: [script.title].filter(Boolean),
        thumbnailCopy: script.thumbnailCopy,
        scriptOutline: JSON.stringify({
          opening15s: script.opening15s,
          timeline: script.timeline,
          contentItems: script.contentItems,
          cta: script.cta,
          publishCopy: script.publishCopy,
          differentiation: script.differentiation,
          provider: script.provider,
          seedText,
          referenceVideos,
          contentGoal,
          narrativeStructure,
          toneStyle,
          paceLevel,
          variationNonce,
        }),
        voiceoverOutline: script.opening15s.join("\n"),
        assetsNeeded: script.tags.join(", "),
      },
    });

    return NextResponse.json({ ok: true, script, episodeId: episode.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

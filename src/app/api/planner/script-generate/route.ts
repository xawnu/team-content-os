import { NextRequest, NextResponse } from "next/server";
import { generateDetailedScriptFromSeeds } from "@/lib/planner-script";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const seedText = String(body.seedText || "");
    const language = body.language === "en" ? "en" : "zh";
    const direction = String(body.direction || "同类型视频详细文案");

    const raw = await generateDetailedScriptFromSeeds({ seedText, language, direction });
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

    return NextResponse.json({ ok: true, script });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { generateSeedDrivenPlan } from "@/lib/planner-seed";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const seedText = String(body.seedText || "");
    const seeds = Array.isArray(body.seeds)
      ? body.seeds.map(String)
      : seedText
          .split(/\n|,/) 
          .map((s: string) => s.trim())
          .filter(Boolean);

    const data = await generateSeedDrivenPlan({
      seeds,
      count: Number(body.count || 10),
      language: String(body.language || "zh"),
      scene: String(body.scene || "general"),
      autoScene: body.autoScene !== false,
      ai: body.ai !== false,
    });

    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyPlan, generateWeeklyPlanV2 } from "@/lib/planner";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "v2" ? "v2" : "v1";
    const data =
      mode === "v2"
        ? await generateWeeklyPlanV2({
            runId: body.runId,
            count: body.count,
            briefs: body.briefs,
            ai: body.ai !== false,
          })
        : await generateWeeklyPlan({
            runId: body.runId,
            count: body.count,
            briefs: body.briefs,
          });

    return NextResponse.json({ ok: true, mode, ...data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

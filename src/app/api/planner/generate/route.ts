import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyPlan } from "@/lib/planner";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await generateWeeklyPlan({
      runId: body.runId,
      count: body.count,
      briefs: body.briefs,
    });

    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

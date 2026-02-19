import { NextRequest, NextResponse } from "next/server";
import { generateDetailedScriptFromSeeds } from "@/lib/planner-script";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const seedText = String(body.seedText || "");
    const language = body.language === "en" ? "en" : "zh";
    const direction = String(body.direction || "同类型视频详细文案");

    const script = await generateDetailedScriptFromSeeds({ seedText, language, direction });
    return NextResponse.json({ ok: true, script });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

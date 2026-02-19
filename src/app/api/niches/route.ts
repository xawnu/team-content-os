import { NextResponse } from "next/server";
import { listNichePresets } from "@/lib/niche-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await listNichePresets();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

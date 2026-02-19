import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeTitles } from "@/lib/analyzer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    const run = runId
      ? await prisma.discoverRun.findUnique({
          where: { id: runId },
          include: { candidates: true },
        })
      : await prisma.discoverRun.findFirst({
          orderBy: { createdAt: "desc" },
          include: { candidates: true },
        });

    if (!run) {
      return NextResponse.json({ ok: false, error: "No discover runs found" }, { status: 404 });
    }

    const titles = run.candidates.flatMap((c) => {
      const v = c.sampleTitles as unknown;
      return Array.isArray(v) ? (v as string[]) : [];
    });

    const analysis = analyzeTitles(titles);

    return NextResponse.json({
      ok: true,
      runId: run.id,
      query: run.query,
      createdAt: run.createdAt,
      ...analysis,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

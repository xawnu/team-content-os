import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const episodes = await prisma.episodePlan.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { metrics: true },
    });
    return NextResponse.json({ ok: true, episodes });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const episodeId = String(body.episodeId || "");
    if (!episodeId) return NextResponse.json({ ok: false, error: "episodeId required" }, { status: 400 });

    const metrics = await prisma.episodeMetrics.upsert({
      where: { episodeId },
      update: {
        ctr: body.ctr,
        retention30s: body.retention30s,
        avgWatchTimeSec: body.avgWatchTimeSec,
        views7d: body.views7d,
        commentsSummary: body.commentsSummary,
        winOrFail: body.winOrFail,
        optimizationNote: body.optimizationNote,
      },
      create: {
        episodeId,
        ctr: body.ctr,
        retention30s: body.retention30s,
        avgWatchTimeSec: body.avgWatchTimeSec,
        views7d: body.views7d,
        commentsSummary: body.commentsSummary,
        winOrFail: body.winOrFail,
        optimizationNote: body.optimizationNote,
      },
    });

    return NextResponse.json({ ok: true, metrics });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const episodeId = String(body.episodeId || "").trim();
    if (!episodeId) {
      return NextResponse.json({ ok: false, error: "episodeId required" }, { status: 400 });
    }

    await prisma.episodePlan.delete({ where: { id: episodeId } });
    return NextResponse.json({ ok: true, deletedId: episodeId });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

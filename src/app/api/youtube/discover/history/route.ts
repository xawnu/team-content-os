import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (runId) {
      const run = await prisma.discoverRun.findUnique({
        where: { id: runId },
        include: {
          candidates: {
            orderBy: { score: "desc" },
            take: 50,
          },
        },
      });

      if (!run) {
        return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, run });
    }

    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const [total, runs] = await Promise.all([
      prisma.discoverRun.count(),
      prisma.discoverRun.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { candidates: true },
          },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, runs, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
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
    const runId = String(body.runId || "").trim();

    if (!runId) {
      return NextResponse.json({ ok: false, error: "runId required" }, { status: 400 });
    }

    await prisma.discoverRun.delete({ where: { id: runId } });
    return NextResponse.json({ ok: true, deletedId: runId });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

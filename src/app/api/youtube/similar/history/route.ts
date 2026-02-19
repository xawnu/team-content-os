import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (runId) {
      const run = await prisma.similarRun.findUnique({
        where: { id: runId },
        include: {
          items: { orderBy: { similarity: "desc" }, take: 30 },
        },
      });

      if (!run) return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
      return NextResponse.json({ ok: true, run });
    }

    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const [total, runs] = await Promise.all([
      prisma.similarRun.count(),
      prisma.similarRun.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: { _count: { select: { items: true } } },
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

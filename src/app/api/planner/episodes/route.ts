import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = String(searchParams.get("episodeId") || "").trim();

    if (episodeId) {
      const episode = await prisma.episodePlan.findUnique({
        where: { id: episodeId },
        include: { metrics: true },
      });
      return NextResponse.json({ ok: true, episode });
    }

    // 分页参数
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const skip = (page - 1) * pageSize;

    // 筛选参数
    const topic = searchParams.get("topic") || "";
    const status = searchParams.get("status") || "";

    // 构建查询条件
    const where: any = {};
    if (topic) {
      where.topic = { contains: topic, mode: "insensitive" };
    }
    if (status) {
      where.status = status;
    }

    // 获取总数
    const total = await prisma.episodePlan.count({ where });

    // 获取分页数据
    const episodes = await prisma.episodePlan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { metrics: true },
    });

    return NextResponse.json({
      ok: true,
      episodes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
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

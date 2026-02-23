import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 获取最近7天的文案生成趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentEpisodes = await prisma.episodePlan.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        createdAt: true,
        scriptOutline: true,
      },
    });

    // 按日期分组统计
    const trendByDate = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
      trendByDate.set(dateStr, 0);
    }

    recentEpisodes.forEach(ep => {
      const dateStr = new Date(ep.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
      trendByDate.set(dateStr, (trendByDate.get(dateStr) || 0) + 1);
    });

    const generationTrend = Array.from(trendByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // 统计内容目的分布
    const goalDistribution = new Map<string, number>();
    recentEpisodes.forEach(ep => {
      try {
        const outline = ep.scriptOutline ? JSON.parse(ep.scriptOutline) : {};
        const goal = outline.contentGoal || '未分类';
        goalDistribution.set(goal, (goalDistribution.get(goal) || 0) + 1);
      } catch {
        goalDistribution.set('未分类', (goalDistribution.get('未分类') || 0) + 1);
      }
    });

    const goalData = Array.from(goalDistribution.entries()).map(([label, value]) => ({
      label,
      value,
    }));

    // 统计叙事结构分布
    const structureDistribution = new Map<string, number>();
    recentEpisodes.forEach(ep => {
      try {
        const outline = ep.scriptOutline ? JSON.parse(ep.scriptOutline) : {};
        const structure = outline.narrativeStructure || '未分类';
        structureDistribution.set(structure, (structureDistribution.get(structure) || 0) + 1);
      } catch {
        structureDistribution.set('未分类', (structureDistribution.get('未分类') || 0) + 1);
      }
    });

    const structureData = Array.from(structureDistribution.entries()).map(([label, value]) => ({
      label,
      value,
    }));

    // 获取最近的优质文案（假设有评分字段）
    const recentBest = await prisma.episodePlan.findMany({
      take: 3,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        topic: true,
        titleOptions: true,
        createdAt: true,
      },
    });

    // 总体统计
    const [totalEpisodes, totalChannels, totalRuns] = await Promise.all([
      prisma.episodePlan.count(),
      prisma.competitorChannel.count(),
      prisma.discoverRun.count(),
    ]);

    return NextResponse.json({
      ok: true,
      stats: {
        totalEpisodes,
        totalChannels,
        totalRuns,
        recentCount: recentEpisodes.length,
      },
      trends: {
        generation: generationTrend,
        goals: goalData,
        structures: structureData,
      },
      recentBest: recentBest.map(ep => ({
        id: ep.id,
        topic: ep.topic,
        title: (Array.isArray(ep.titleOptions) && ep.titleOptions.length > 0) 
          ? String(ep.titleOptions[0]) 
          : ep.topic,
        createdAt: ep.createdAt,
      })),
    });
  } catch (error) {
    console.error('获取 Dashboard 数据失败:', error);
    return NextResponse.json({
      ok: false,
      error: '获取数据失败',
    }, { status: 500 });
  }
}

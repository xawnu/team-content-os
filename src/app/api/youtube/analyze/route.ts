import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeTitles } from "@/lib/analyzer";
import { openRouterJson } from "@/lib/openrouter";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");
    const ai = searchParams.get("ai") === "1";

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

    const titles = run.candidates.flatMap((c: (typeof run.candidates)[number]) => {
      const v = c.sampleTitles as unknown;
      return Array.isArray(v) ? (v as string[]) : [];
    });

    let analysis = analyzeTitles(titles);
    let provider = "rules";

    if (ai && titles.length) {
      try {
        const prompt = {
          task: "Analyze YouTube titles for reusable patterns, top keywords, and risky words",
          titles,
          outputSchema: {
            topPatterns: [{ pattern: "string", count: 0 }],
            topKeywords: [{ keyword: "string", count: 0 }],
            riskHits: [{ word: "string", count: 0 }],
          },
        };

        const aiResult = await openRouterJson<{
          topPatterns?: Array<{ pattern: string; count: number }>;
          topKeywords?: Array<{ keyword: string; count: number }>;
          riskHits?: Array<{ word: string; count: number }>;
        }>([
          {
            role: "system",
            content:
              "You are a strict YouTube content analyst. Return valid JSON only. Keep it concise and structured.",
          },
          {
            role: "user",
            content: JSON.stringify(prompt),
          },
        ]);

        analysis = {
          totalTitles: titles.length,
          topPatterns: aiResult.topPatterns ?? analysis.topPatterns,
          topKeywords: aiResult.topKeywords ?? analysis.topKeywords,
          riskHits: aiResult.riskHits ?? analysis.riskHits,
        };
        provider = "openrouter";
      } catch {
        provider = "rules-fallback";
      }
    }

    return NextResponse.json({
      ok: true,
      provider,
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

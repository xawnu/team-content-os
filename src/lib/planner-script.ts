import { getRecentTitles, resolveChannelId } from "@/lib/youtube/similar";
import { openRouterJson } from "@/lib/openrouter";

export type DetailedScriptResult = {
  topic: string;
  title: string;
  thumbnailCopy: string;
  opening15s: string[];
  timeline: Array<{ time: string; segment: string; voiceover: string; visuals: string }>;
  contentItems: string[];
  cta: string;
  publishCopy: string;
  tags: string[];
  differentiation: string[];
  references: { seeds: string[]; sampledTitles: string[]; referenceVideos: string[] };
  provider: "ai" | "template";
};

function buildFallbackTimeline(items: string[], narrativeStructure: string, paceLevel: string) {
  const base = items.length ? items : ["核心要点1", "核心要点2", "核心要点3", "核心要点4", "核心要点5", "核心要点6", "核心要点7", "核心要点8"];
  const chunkSize = Math.max(1, Math.ceil(base.length / 8));
  const parts: string[][] = [];
  for (let i = 0; i < base.length; i += chunkSize) parts.push(base.slice(i, i + chunkSize));
  while (parts.length < 8) parts.push([`补充要点${parts.length + 1}`]);

  return parts.slice(0, 8).map((group, idx) => {
    const start = idx * chunkSize + 1;
    const end = Math.min(start + group.length - 1, base.length);
    return {
      time: `${String(idx).padStart(2, "0")}:00-${String(idx).padStart(2, "0")}:45`,
      segment: `第${idx + 1}段 [要点${start}${end > start ? `-${end}` : ""}]`,
      voiceover: `本段按${narrativeStructure}结构展开，围绕${group.join("、")}做具体讲解。节奏设定为${paceLevel}，先给结论再给动作步骤，补上边界条件与执行提醒，保证观众听完就能照做。`,
      visuals: `画面使用近景+中景+特写交替机位，并加入推镜与转场。先展示关键对象，再切换操作细节，最后用结果对比镜头和字幕强化记忆。`,
    };
  });
}

function parseRequiredCount(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*(种|个|条|items?)/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0 || n > 50) return null;
  return n;
}

export async function generateDetailedScriptFromSeeds(input: {
  seedText: string;
  language?: "zh" | "en";
  direction?: string;
  topicLock?: string;
  bannedWords?: string[];
  referenceVideos?: string[];
  contentGoal?: string;
  narrativeStructure?: string;
  toneStyle?: string[];
  paceLevel?: string;
  variationNonce?: string;
}) {
  const seeds = input.seedText
    .split(/\n|,/) 
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!seeds.length) throw new Error("请先输入至少一个参考频道");

  const channelIds = await Promise.all(seeds.map((s) => resolveChannelId(s)));
  const titleGroups = await Promise.all(channelIds.map((id) => getRecentTitles(id)));
  const sampledTitles = titleGroups.flat().slice(0, 24);

  const requiredCount = parseRequiredCount(input.direction || "");
  const topicLock = (input.topicLock || "").trim();
  const bannedWords = (input.bannedWords || []).map((w) => w.trim()).filter(Boolean);
  const referenceVideos = (input.referenceVideos || []).map((x) => x.trim()).filter(Boolean).slice(0, 10);
  if (!referenceVideos.length) throw new Error("请先选择1-3条参考视频再生成");
  const contentGoal = input.contentGoal || "拉新破圈";
  const narrativeStructure = input.narrativeStructure || "问题→方案→结果";
  const toneStyle = (input.toneStyle || ["专业理性"]).filter(Boolean);
  const paceLevel = input.paceLevel || "中";

  try {
    const ai = await openRouterJson<Omit<DetailedScriptResult, "provider">>([
      {
        role: "system",
        content:
          "你是YouTube内容策划。请基于参考频道风格，产出1篇可直接拍摄的详细文案。仅学习结构和节奏，禁止复用原句。禁止编造数字承诺；如果提到N种/个/条，contentItems必须严格给出N条。必须输出JSON。",
      },
      {
        role: "user",
        content: JSON.stringify({
          language: input.language || "zh",
          direction: input.direction || "同类型视频",
          topicLock,
          bannedWords,
          requiredCount,
          contentGoal,
          narrativeStructure,
          toneStyle,
          paceLevel,
          variationNonce: input.variationNonce || "v0",
          requirement: {
            count: 1,
            outputFields: [
              "topic",
              "title",
              "thumbnailCopy",
              "opening15s",
              "timeline",
              "contentItems",
              "cta",
              "publishCopy",
              "tags",
              "differentiation",
            ],
            timelineFormat: "[{time,segment,voiceover,visuals}]",
            constraints: [
              "不要照抄参考标题和原句",
              "至少给出3条差异化点",
              "风格贴近参考频道但更适合实操拍摄",
              "如果requiredCount存在，contentItems长度必须===requiredCount",
              "如果topicLock存在，topic/title/contentItems必须明显围绕topicLock",
              "如果bannedWords存在，输出中不能出现这些词",
              "timeline每段segment必须标注覆盖的要点编号，如[要点1]、[要点2-4]",
              "若requiredCount=20，timeline必须覆盖要点1到要点20，不能遗漏",
              "timeline至少8段；每段voiceover>=60字，visuals>=40字，禁止泛化描述",
              "每段必须给出具体镜头动作（机位/景别/转场之一）",
              "严格遵循contentGoal/narrativeStructure/toneStyle/paceLevel",
              "variationNonce代表本次版本号，本次输出必须与常见模板明显不同",
            ],
          },
          references: { seeds, sampledTitles, referenceVideos },
        }),
      },
    ]);

    const contentItems = Array.isArray(ai.contentItems) ? ai.contentItems.map(String) : [];
    const timeline = Array.isArray(ai.timeline) && ai.timeline.length
      ? ai.timeline
      : buildFallbackTimeline(contentItems, narrativeStructure, paceLevel);

    if (requiredCount && contentItems.length !== requiredCount) {
      throw new Error(`数字承诺不一致: 要求${requiredCount}，返回${contentItems.length}`);
    }
    if (contentItems.some((x) => String(x).trim().length < 4)) {
      throw new Error("正文要点过于空泛");
    }

    if (timeline.length < 8) {
      throw new Error(`分镜段数不足：当前${timeline.length}段，至少需要8段`);
    }

    const shotKeywords = ["近景", "远景", "中景", "特写", "俯拍", "跟拍", "推镜", "拉镜", "转场", "机位", "镜头"];
    for (let i = 0; i < timeline.length; i++) {
      const seg = timeline[i] as { voiceover?: string; visuals?: string; segment?: string };
      const voiceover = String(seg.voiceover || "").trim();
      const visuals = String(seg.visuals || "").trim();
      if (voiceover.length < 60) throw new Error(`第${i + 1}段口播过短，需至少60字`);
      if (visuals.length < 40) throw new Error(`第${i + 1}段画面描述过短，需至少40字`);
      if (!shotKeywords.some((k) => visuals.includes(k))) {
        throw new Error(`第${i + 1}段缺少具体镜头动作（机位/景别/转场）`);
      }
    }

    if (requiredCount) {
      const covered = new Set<number>();
      for (const seg of timeline) {
        const text = String((seg as { segment?: string }).segment || "");
        const re = /要点\s*(\d+)(?:\s*[-~到]\s*(\d+))?/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
          const start = Number(m[1]);
          const end = Number(m[2] || m[1]);
          for (let i = start; i <= end; i++) covered.add(i);
        }
      }
      for (let i = 1; i <= requiredCount; i++) {
        if (!covered.has(i)) throw new Error(`分镜脚本未覆盖要点${i}`);
      }
    }

    const textBlob = [ai.topic, ai.title, ...contentItems].join(" ").toLowerCase();
    if (topicLock && !textBlob.includes(topicLock.toLowerCase())) {
      throw new Error(`生成偏题：未围绕「${topicLock}」`);
    }
    if (bannedWords.length) {
      const hit = bannedWords.find((w) => textBlob.includes(w.toLowerCase()));
      if (hit) throw new Error(`命中禁用词：${hit}`);
    }

    return {
      ...ai,
      contentItems,
      timeline,
      references: { seeds, sampledTitles, referenceVideos },
      provider: "ai" as const,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? `文案质量校验未通过：${error.message}` : "文案质量校验未通过，请重试");
  }
}

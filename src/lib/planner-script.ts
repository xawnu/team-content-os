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
  references: { seeds: string[]; sampledTitles: string[] };
  provider: "ai" | "template";
};

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
            ],
          },
          references: { seeds, sampledTitles },
        }),
      },
    ]);

    const contentItems = Array.isArray(ai.contentItems) ? ai.contentItems.map(String) : [];
    if (requiredCount && contentItems.length !== requiredCount) {
      throw new Error(`数字承诺不一致: 要求${requiredCount}，返回${contentItems.length}`);
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
      references: { seeds, sampledTitles },
      provider: "ai" as const,
    };
  } catch {
    const first = sampledTitles[0] || "参考频道同类主题";
    return {
      topic: "参考频道同类型实操视频",
      title: `我按${first.slice(0, 24)}的方法实测7天，结果如何？`,
      thumbnailCopy: "实测7天 结果公开",
      opening15s: ["我选了参考频道常见的一种做法。", "这次我不抄答案，直接实测7天。", "今天给你看真实过程和结果。"],
      timeline: [
        { time: "00:00", segment: "开场钩子", voiceover: "先说目标和结果预期。", visuals: "结果先行画面+字幕" },
        { time: "00:20", segment: "方法拆解", voiceover: "拆成3步并解释为什么这么做。", visuals: "手绘流程/实操镜头" },
        { time: "01:20", segment: "执行过程", voiceover: "展示关键动作和踩坑。", visuals: "前后对比+B-roll" },
        { time: "02:40", segment: "结果与复盘", voiceover: "给出可量化结果和失败点。", visuals: "数据卡+对比图" },
      ],
      contentItems: requiredCount
        ? Array.from({ length: requiredCount }, (_, i) => `要点${i + 1}`)
        : ["核心要点1", "核心要点2", "核心要点3"],
      cta: "如果你要我继续做第2期，评论区打‘继续’。",
      publishCopy: "这期按参考频道常见打法做了完整实测，但我们做了3处关键改造，结果比预期更稳。",
      tags: ["实测", "教程", "复盘", "同类型选题"],
      differentiation: ["把泛化建议改成可执行步骤", "增加失败样本和纠错过程", "加入量化对比结果"],
      references: { seeds, sampledTitles },
      provider: "template" as const,
    };
  }
}

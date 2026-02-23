/**
 * 增强版文案质量评分系统
 * 新增维度：创意性、情感共鸣、节奏感
 * 支持自定义权重
 */

import { evaluateScriptQuality as evaluateBasic } from './script-quality';

type DetailedScript = {
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
};

type EnhancedScriptQualityScore = {
  overall: number;
  structure: { score: number; details: string[] };
  shootability: { score: number; details: string[] };
  concreteness: { score: number; details: string[] };
  creativity: { score: number; details: string[] };
  emotion: { score: number; details: string[] };
  rhythm: { score: number; details: string[] };
  grade: "优秀" | "良好" | "及格" | "待改进";
  weights: ScoreWeights;
};

type ScoreWeights = {
  structure: number;
  shootability: number;
  concreteness: number;
  creativity: number;
  emotion: number;
  rhythm: number;
};

const DEFAULT_WEIGHTS: ScoreWeights = {
  structure: 0.20,
  shootability: 0.25,
  concreteness: 0.20,
  creativity: 0.15,
  emotion: 0.10,
  rhythm: 0.10,
};

/**
 * 评估创意性（优化版 - 更宽松的标准）
 */
function evaluateCreativity(script: DetailedScript): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 70; // 基础分从 100 改为 70

  // 1. 差异化点数量（20分）- 降低权重
  if (script.differentiation && script.differentiation.length >= 2) { // 从 3 降低到 2
    score += 20;
    details.push(`✓ 差异化点充足（${script.differentiation.length}个）`);
  } else if (script.differentiation && script.differentiation.length >= 1) {
    score += 10;
    details.push(`△ 差异化点一般（${script.differentiation.length}个）`);
  } else {
    details.push('△ 差异化点较少');
  }

  // 2. 标题新颖性（15分）- 降低权重
  const title = script.title || '';
  const commonPatterns = ['如何', '怎么', '方法', '技巧', '教程', '攻略'];
  const hasCommonPattern = commonPatterns.some(p => title.includes(p));
  
  if (!hasCommonPattern && title.length > 0) {
    score += 15;
    details.push('✓ 标题避开常见套路');
  } else if (hasCommonPattern) {
    score += 5;
    details.push('△ 标题使用常见套路');
  } else {
    details.push('△ 标题缺失');
  }

  // 3. 开场钩子创意（10分）- 降低权重
  if (script.opening15s && script.opening15s.length > 0) {
    const opening = script.opening15s.join('');
    const hasQuestion = /[？?]/.test(opening);
    const hasContrast = /(但是|然而|其实|实际上|事实上)/.test(opening);
    const hasNumber = /\d+/.test(opening);
    
    if (hasQuestion || hasContrast || hasNumber) {
      score += 10;
      details.push('✓ 开场钩子有吸引力');
    } else {
      score += 3;
      details.push('△ 开场钩子一般');
    }
  } else {
    details.push('△ 缺少开场钩子');
  }

  // 4. 内容角度独特性（5分）- 降低权重
  const contentText = script.contentItems?.join('') || '';
  const uniqueKeywords = ['误区', '真相', '秘密', '内幕', '揭秘', '对比', '实验', '测试'];
  const hasUniqueAngle = uniqueKeywords.some(k => contentText.includes(k));
  
  if (hasUniqueAngle) {
    score += 5;
    details.push('✓ 内容角度独特');
  } else {
    details.push('△ 内容角度常规');
  }

  return { score: Math.min(score, 100), details };
}

/**
 * 评估情感共鸣（优化版 - 更宽松的标准）
 */
function evaluateEmotion(script: DetailedScript): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 70; // 基础分从 100 改为 70，更容易得高分

  const allText = [
    script.title,
    script.thumbnailCopy,
    ...(script.opening15s || []),
    ...(script.contentItems || []),
    script.cta,
  ].join('');

  // 1. 情感词汇密度（20分）- 降低权重
  const emotionWords = [
    '惊讶', '震惊', '意外', '没想到', '居然', '竟然',
    '担心', '焦虑', '害怕', '恐惧', '紧张',
    '开心', '高兴', '兴奋', '激动', '满意',
    '失望', '遗憾', '可惜', '后悔',
    '愤怒', '生气', '不满',
    '喜欢', '爱', '讨厌', '恨', '感动', '温暖', // 增加更多常用词
  ];
  
  const emotionCount = emotionWords.filter(w => allText.includes(w)).length;
  
  if (emotionCount >= 2) { // 从 3 降低到 2
    score += 20;
    details.push(`✓ 情感词汇丰富（${emotionCount}个）`);
  } else if (emotionCount >= 1) {
    score += 10;
    details.push(`△ 情感词汇一般（${emotionCount}个）`);
  } else {
    details.push('△ 情感词汇较少');
  }

  // 2. 用户痛点触达（20分）- 降低权重，扩大词库
  const painPoints = [
    '浪费', '损失', '错过', '后悔', '失败',
    '困扰', '问题', '难题', '挑战', '障碍',
    '省钱', '省时', '省力', '避免', '防止',
    '麻烦', '烦恼', '头疼', '纠结', '犹豫', // 增加更多常用词
    '简单', '容易', '方便', '快速', '高效', // 正面词汇也算
  ];
  
  const painPointCount = painPoints.filter(p => allText.includes(p)).length;
  
  if (painPointCount >= 1) { // 从 2 降低到 1
    score += 20;
    details.push(`✓ 触达用户痛点（${painPointCount}个）`);
  } else {
    score += 5;
    details.push('△ 痛点触达较少');
  }

  // 3. 共鸣场景描述（10分）- 降低权重，扩大词库
  const sceneWords = [
    '你是否', '有没有', '是不是', '想不想', '会不会',
    '你', '我们', '大家', '很多人', '经常', // 增加更多常用词
  ];
  const hasSceneDescription = sceneWords.some(w => allText.includes(w));
  
  if (hasSceneDescription) {
    score += 10;
    details.push('✓ 包含共鸣场景描述');
  } else {
    details.push('△ 可增加共鸣场景');
  }

  return { score: Math.min(score, 100), details }; // 确保不超过 100
}

/**
 * 评估节奏感
 */
function evaluateRhythm(script: DetailedScript): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 75;

  if (script.timeline && script.timeline.length > 0) {
    score += 15;
    details.push("✓ 包含分镜时间轴");
  } else {
    details.push("△ 缺少分镜时间轴");
  }

  if (script.opening15s && script.opening15s.length >= 3) {
    score += 10;
    details.push("✓ 开场句子数量充足");
  } else {
    score += 3;
    details.push("△ 开场句子偏少");
  }

  const contentText = [...(script.opening15s || []), ...(script.contentItems || [])].join("");
  if (contentText.length > 0) {
    details.push("✓ 包含内容信息");
  }

  return { score: Math.min(score, 100), details };
}

/**
 * 增强版综合评分
 */
export function evaluateScriptQualityEnhanced(
  script: DetailedScript,
  customWeights?: Partial<ScoreWeights>
): EnhancedScriptQualityScore {
  // 获取基础评分
  const basic = evaluateBasic(script);
  
  // 获取新维度评分
  const creativity = evaluateCreativity(script);
  const emotion = evaluateEmotion(script);
  const rhythm = evaluateRhythm(script);
  
  // 合并权重
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };
  
  // 计算加权总分
  const overall = Math.round(
    basic.structure.score * weights.structure +
    basic.shootability.score * weights.shootability +
    basic.concreteness.score * weights.concreteness +
    creativity.score * weights.creativity +
    emotion.score * weights.emotion +
    rhythm.score * weights.rhythm
  );
  
  let grade: "优秀" | "良好" | "及格" | "待改进";
  if (overall >= 85) grade = "优秀";
  else if (overall >= 70) grade = "良好";
  else if (overall >= 60) grade = "及格";
  else grade = "待改进";
  
  return {
    overall,
    structure: basic.structure,
    shootability: basic.shootability,
    concreteness: basic.concreteness,
    creativity,
    emotion,
    rhythm,
    grade,
    weights,
  };
}

/**
 * 获取默认权重
 */
export function getDefaultWeights(): ScoreWeights {
  return { ...DEFAULT_WEIGHTS };
}

/**
 * 验证权重总和是否为 1
 */
export function validateWeights(weights: ScoreWeights): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.01;
}

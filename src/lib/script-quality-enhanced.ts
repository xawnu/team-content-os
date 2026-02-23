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
 * 评估创意性
 */
function evaluateCreativity(script: DetailedScript): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 100;

  // 1. 差异化点数量（30分）
  if (script.differentiation && script.differentiation.length >= 3) {
    details.push(`✓ 差异化点充足（${script.differentiation.length}个）`);
  } else if (script.differentiation && script.differentiation.length >= 2) {
    score -= 10;
    details.push(`△ 差异化点一般（${script.differentiation.length}个，建议≥3个）`);
  } else {
    score -= 30;
    details.push(`✗ 差异化点不足（${script.differentiation?.length || 0}个）`);
  }

  // 2. 标题新颖性（20分）
  const title = script.title || '';
  const commonPatterns = ['如何', '怎么', '方法', '技巧', '教程', '攻略'];
  const hasCommonPattern = commonPatterns.some(p => title.includes(p));
  
  if (!hasCommonPattern && title.length > 0) {
    details.push('✓ 标题避开常见套路');
  } else if (hasCommonPattern) {
    score -= 15;
    details.push('△ 标题使用常见套路（建议更新颖）');
  } else {
    score -= 20;
    details.push('✗ 标题缺失');
  }

  // 3. 开场钩子创意（25分）
  if (script.opening15s && script.opening15s.length > 0) {
    const opening = script.opening15s.join('');
    const hasQuestion = /[？?]/.test(opening);
    const hasContrast = /(但是|然而|其实|实际上|事实上)/.test(opening);
    const hasNumber = /\d+/.test(opening);
    
    let hookScore = 0;
    if (hasQuestion) hookScore += 8;
    if (hasContrast) hookScore += 8;
    if (hasNumber) hookScore += 9;
    
    if (hookScore >= 16) {
      details.push('✓ 开场钩子多样化');
    } else if (hookScore >= 8) {
      score -= 10;
      details.push('△ 开场钩子单一（建议增加疑问/对比/数据）');
    } else {
      score -= 25;
      details.push('✗ 开场钩子缺乏吸引力');
    }
  } else {
    score -= 25;
    details.push('✗ 缺少开场钩子');
  }

  // 4. 内容角度独特性（25分）
  const contentText = script.contentItems?.join('') || '';
  const uniqueKeywords = ['误区', '真相', '秘密', '内幕', '揭秘', '对比', '实验', '测试'];
  const hasUniqueAngle = uniqueKeywords.some(k => contentText.includes(k));
  
  if (hasUniqueAngle) {
    details.push('✓ 内容角度独特');
  } else {
    score -= 20;
    details.push('△ 内容角度常规（建议增加独特视角）');
  }

  return { score: Math.max(score, 0), details };
}

/**
 * 评估情感共鸣
 */
function evaluateEmotion(script: DetailedScript): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 100;

  const allText = [
    script.title,
    script.thumbnailCopy,
    ...(script.opening15s || []),
    ...(script.contentItems || []),
    script.cta,
  ].join('');

  // 1. 情感词汇密度（30分）
  const emotionWords = [
    '惊讶', '震惊', '意外', '没想到', '居然', '竟然',
    '担心', '焦虑', '害怕', '恐惧', '紧张',
    '开心', '高兴', '兴奋', '激动', '满意',
    '失望', '遗憾', '可惜', '后悔',
    '愤怒', '生气', '不满',
  ];
  
  const emotionCount = emotionWords.filter(w => allText.includes(w)).length;
  
  if (emotionCount >= 3) {
    details.push(`✓ 情感词汇丰富（${emotionCount}个）`);
  } else if (emotionCount >= 1) {
    score -= 15;
    details.push(`△ 情感词汇偏少（${emotionCount}个，建议≥3个）`);
  } else {
    score -= 30;
    details.push('✗ 缺乏情感词汇');
  }

  // 2. 用户痛点触达（35分）
  const painPoints = [
    '浪费', '损失', '错过', '后悔', '失败',
    '困扰', '问题', '难题', '挑战', '障碍',
    '省钱', '省时', '省力', '避免', '防止',
  ];
  
  const painPointCount = painPoints.filter(p => allText.includes(p)).length;
  
  if (painPointCount >= 2) {
    details.push(`✓ 触达用户痛点（${painPointCount}个）`);
  } else if (painPointCount >= 1) {
    score -= 15;
    details.push(`△ 痛点触达不足（${painPointCount}个，建议≥2个）`);
  } else {
    score -= 35;
    details.push('✗ 未触达用户痛点');
  }

  // 3. 共鸣场景描述（35分）
  const sceneWords = ['你是否', '有没有', '是不是', '想不想', '会不会'];
  const hasSceneDescription = sceneWords.some(w => allText.includes(w));
  
  if (hasSceneDescription) {
    details.push('✓ 包含共鸣场景描述');
  } else {
    score -= 30;
    details.push('△ 缺少共鸣场景（建议增加"你是否..."等描述）');
  }

  return { score: Math.max(score, 0), details };
}

/**
 * 评估节奏感
 */
function evaluateRhythm(script: DetailedScript): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 100;

  // 1. 分镜时长分布（40分）
  if (script.timeline && script.timeline.length > 0) {
    const durations = script.timeline.map(t => {
      const match = t.time.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    
    const shortCount = durations.filter(d => d <= 15).length;
    const mediumCount = durations.filter(d => d > 15 && d <= 30).length;
    const longCount = durations.filter(d => d > 30).length;
    
    const hasVariety = shortCount > 0 && mediumCount > 0;
    
    if (hasVariety) {
      details.push('✓ 分镜时长分布合理（快慢结合）');
    } else if (longCount > script.timeline.length * 0.7) {
      score -= 25;
      details.push('△ 分镜过长（建议增加快节奏片段）');
    } else {
      score -= 15;
      details.push('△ 分镜节奏单一');
    }
  } else {
    score -= 40;
    details.push('✗ 缺少分镜时间轴');
  }

  // 2. 句子长度变化（30分）
  if (script.opening15s && script.opening15s.length > 0) {
    const lengths = script.opening15s.map(s => s.length);
    const hasVariety = Math.max(...lengths) - Math.min(...lengths) > 10;
    
    if (hasVariety) {
      details.push('✓ 句子长度有变化');
    } else {
      score -= 20;
      details.push('△ 句子长度过于统一（建议长短结合）');
    }
  } else {
    score -= 30;
    details.push('✗ 缺少开场口播');
  }

  // 3. 内容密度适中（30分）
  if (script.contentItems && script.contentItems.length > 0) {
    const avgLength = script.contentItems.reduce((sum, item) => sum + item.length, 0) / script.contentItems.length;
    
    if (avgLength >= 20 && avgLength <= 50) {
      details.push('✓ 内容密度适中');
    } else if (avgLength > 50) {
      score -= 20;
      details.push('△ 内容过于密集（建议拆分）');
    } else {
      score -= 15;
      details.push('△ 内容过于简略（建议补充细节）');
    }
  } else {
    score -= 30;
    details.push('✗ 缺少内容要点');
  }

  return { score: Math.max(score, 0), details };
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

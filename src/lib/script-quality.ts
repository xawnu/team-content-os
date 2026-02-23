/**
 * 文案质量评分系统
 * 评估维度：结构完整度、可拍摄性、去空话指数
 */

type ScriptQualityScore = {
  overall: number; // 总分 0-100
  structure: {
    score: number; // 结构完整度 0-100
    details: string[];
  };
  shootability: {
    score: number; // 可拍摄性 0-100
    details: string[];
  };
  concreteness: {
    score: number; // 去空话指数 0-100
    details: string[];
  };
  grade: "优秀" | "良好" | "及格" | "待改进";
};

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

/**
 * 评估结构完整度
 */
function evaluateStructure(script: DetailedScript): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 0;

  // 1. 开场是否完整（15分）
  if (script.opening15s && script.opening15s.length >= 3) {
    score += 15;
    details.push("✓ 开场口播完整（≥3句）");
  } else {
    details.push("✗ 开场口播不足3句");
  }

  // 2. 时间轴分镜是否充足（25分）
  if (script.timeline && script.timeline.length >= 8) {
    score += 25;
    details.push(`✓ 分镜段数充足（${script.timeline.length}段）`);
  } else if (script.timeline && script.timeline.length >= 5) {
    score += 15;
    details.push(`△ 分镜段数偏少（${script.timeline.length}段，建议≥8段）`);
  } else {
    details.push(`✗ 分镜段数严重不足（${script.timeline?.length || 0}段）`);
  }

  // 3. 内容要点是否清晰（20分）
  if (script.contentItems && script.contentItems.length >= 5) {
    score += 20;
    details.push(`✓ 内容要点清晰（${script.contentItems.length}条）`);
  } else if (script.contentItems && script.contentItems.length >= 3) {
    score += 10;
    details.push(`△ 内容要点偏少（${script.contentItems.length}条，建议≥5条）`);
  } else {
    details.push(`✗ 内容要点不足（${script.contentItems?.length || 0}条）`);
  }

  // 4. 分镜段落平衡性（20分）
  if (script.timeline && script.timeline.length > 0) {
    const lengths = script.timeline.map((t) => (t.voiceover || "").length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avg; // 变异系数

    if (cv < 0.3) {
      score += 20;
      details.push("✓ 分镜段落长度均衡");
    } else if (cv < 0.5) {
      score += 10;
      details.push("△ 分镜段落长度略有不均");
    } else {
      details.push("✗ 分镜段落长度差异过大");
    }
  }

  // 5. 差异化点是否充分（20分）
  if (script.differentiation && script.differentiation.length >= 3) {
    score += 20;
    details.push(`✓ 差异化点充分（${script.differentiation.length}条）`);
  } else if (script.differentiation && script.differentiation.length >= 2) {
    score += 10;
    details.push(`△ 差异化点偏少（${script.differentiation.length}条，建议≥3条）`);
  } else {
    details.push(`✗ 差异化点不足（${script.differentiation?.length || 0}条）`);
  }

  return { score: Math.min(score, 100), details };
}

/**
 * 评估可拍摄性
 */
function evaluateShootability(script: DetailedScript): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 0;

  if (!script.timeline || script.timeline.length === 0) {
    return { score: 0, details: ["✗ 缺少分镜脚本"] };
  }

  // 镜头动作关键词
  const shotKeywords = ["近景", "远景", "中景", "特写", "俯拍", "仰拍", "跟拍", "推镜", "拉镜", "转场", "机位", "镜头", "切换"];
  const sceneKeywords = ["室内", "室外", "桌面", "手持", "固定", "移动", "背景", "前景"];

  let totalShotKeywords = 0;
  let totalSceneKeywords = 0;
  let segmentsWithShots = 0;
  let segmentsWithScenes = 0;

  script.timeline.forEach((segment) => {
    const visuals = segment.visuals || "";
    const voiceover = segment.voiceover || "";

    // 1. 检查镜头动作
    const shotCount = shotKeywords.filter((kw) => visuals.includes(kw)).length;
    if (shotCount > 0) {
      segmentsWithShots++;
      totalShotKeywords += shotCount;
    }

    // 2. 检查场景描述
    const sceneCount = sceneKeywords.filter((kw) => visuals.includes(kw)).length;
    if (sceneCount > 0) {
      segmentsWithScenes++;
      totalSceneKeywords += sceneCount;
    }

    // 3. 检查画面描述长度
    if (visuals.length < 30) {
      details.push(`✗ 第${script.timeline.indexOf(segment) + 1}段画面描述过短（${visuals.length}字）`);
    }

    // 4. 检查口播长度
    if (voiceover.length < 50) {
      details.push(`✗ 第${script.timeline.indexOf(segment) + 1}段口播过短（${voiceover.length}字）`);
    }
  });

  // 评分：镜头动作覆盖率（40分）
  const shotCoverage = segmentsWithShots / script.timeline.length;
  if (shotCoverage >= 0.8) {
    score += 40;
    details.push(`✓ 镜头动作覆盖率高（${Math.round(shotCoverage * 100)}%）`);
  } else if (shotCoverage >= 0.5) {
    score += 25;
    details.push(`△ 镜头动作覆盖率中等（${Math.round(shotCoverage * 100)}%）`);
  } else {
    details.push(`✗ 镜头动作覆盖率低（${Math.round(shotCoverage * 100)}%）`);
  }

  // 评分：场景描述覆盖率（30分）
  const sceneCoverage = segmentsWithScenes / script.timeline.length;
  if (sceneCoverage >= 0.6) {
    score += 30;
    details.push(`✓ 场景描述充分（${Math.round(sceneCoverage * 100)}%）`);
  } else if (sceneCoverage >= 0.3) {
    score += 15;
    details.push(`△ 场景描述一般（${Math.round(sceneCoverage * 100)}%）`);
  } else {
    details.push(`✗ 场景描述不足（${Math.round(sceneCoverage * 100)}%）`);
  }

  // 评分：平均镜头动作密度（30分）
  const avgShotDensity = totalShotKeywords / script.timeline.length;
  if (avgShotDensity >= 2) {
    score += 30;
    details.push(`✓ 镜头动作密度高（平均${avgShotDensity.toFixed(1)}个/段）`);
  } else if (avgShotDensity >= 1) {
    score += 15;
    details.push(`△ 镜头动作密度中等（平均${avgShotDensity.toFixed(1)}个/段）`);
  } else {
    details.push(`✗ 镜头动作密度低（平均${avgShotDensity.toFixed(1)}个/段）`);
  }

  return { score: Math.min(score, 100), details: details.slice(0, 5) }; // 只保留前5条
}

/**
 * 评估去空话指数（具体性）
 */
function evaluateConcreteness(script: DetailedScript): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 100; // 从满分开始扣分

  // 空话词汇列表
  const vagueWords = [
    "非常", "很", "特别", "十分", "极其", "相当",
    "可能", "也许", "大概", "基本上", "一般来说",
    "等等", "之类", "什么的",
    "比较", "还是", "应该", "可以说",
  ];

  const allText = [
    script.topic,
    script.title,
    script.thumbnailCopy,
    ...script.opening15s,
    ...(script.timeline || []).map((t) => t.voiceover + t.visuals),
    ...(script.contentItems || []),
    script.cta,
  ].join(" ");

  // 1. 检查空话词汇密度（-30分）
  let vagueCount = 0;
  vagueWords.forEach((word) => {
    const regex = new RegExp(word, "g");
    const matches = allText.match(regex);
    if (matches) vagueCount += matches.length;
  });

  const vagueRatio = vagueCount / (allText.length / 100); // 每100字的空话词数
  if (vagueRatio > 3) {
    score -= 30;
    details.push(`✗ 空话词汇过多（${vagueCount}个，密度${vagueRatio.toFixed(1)}/100字）`);
  } else if (vagueRatio > 1.5) {
    score -= 15;
    details.push(`△ 空话词汇偏多（${vagueCount}个，密度${vagueRatio.toFixed(1)}/100字）`);
  } else {
    details.push(`✓ 空话词汇控制良好（${vagueCount}个）`);
  }

  // 2. 检查数字/数据密度（+20分）
  const numberRegex = /\d+(\.\d+)?[%个条种项天分钟小时元块]/g;
  const numbers = allText.match(numberRegex) || [];
  const numberDensity = numbers.length / (allText.length / 100);

  if (numberDensity >= 2) {
    details.push(`✓ 数字数据充足（${numbers.length}个，密度${numberDensity.toFixed(1)}/100字）`);
  } else if (numberDensity >= 1) {
    score -= 10;
    details.push(`△ 数字数据偏少（${numbers.length}个，建议增加具体数据）`);
  } else {
    score -= 20;
    details.push(`✗ 数字数据严重不足（${numbers.length}个）`);
  }

  // 3. 检查具体案例/例子（+20分）
  const exampleKeywords = ["例如", "比如", "举例", "案例", "实验", "研究", "数据显示", "事实上"];
  let exampleCount = 0;
  exampleKeywords.forEach((kw) => {
    if (allText.includes(kw)) exampleCount++;
  });

  if (exampleCount >= 3) {
    details.push(`✓ 案例引用充分（${exampleCount}处）`);
  } else if (exampleCount >= 1) {
    score -= 10;
    details.push(`△ 案例引用偏少（${exampleCount}处，建议≥3处）`);
  } else {
    score -= 20;
    details.push(`✗ 缺少具体案例引用`);
  }

  // 4. 检查动词具体性（+30分）
  const vagueVerbs = ["做", "搞", "弄", "处理", "进行", "实施", "开展"];
  const concreteVerbs = ["切", "拌", "煮", "炒", "烤", "测量", "调整", "安装", "固定", "连接"];
  
  let vagueVerbCount = 0;
  let concreteVerbCount = 0;
  
  vagueVerbs.forEach((v) => {
    const regex = new RegExp(v, "g");
    const matches = allText.match(regex);
    if (matches) vagueVerbCount += matches.length;
  });
  
  concreteVerbs.forEach((v) => {
    const regex = new RegExp(v, "g");
    const matches = allText.match(regex);
    if (matches) concreteVerbCount += matches.length;
  });

  if (concreteVerbCount > vagueVerbCount * 2) {
    details.push(`✓ 动词具体性强（具体动词${concreteVerbCount}个 vs 泛化动词${vagueVerbCount}个）`);
  } else if (concreteVerbCount > vagueVerbCount) {
    score -= 15;
    details.push(`△ 动词具体性一般（建议多用具体动作动词）`);
  } else {
    score -= 30;
    details.push(`✗ 动词过于泛化（泛化动词${vagueVerbCount}个 > 具体动词${concreteVerbCount}个）`);
  }

  return { score: Math.max(score, 0), details };
}

/**
 * 综合评分
 */
export function evaluateScriptQuality(script: DetailedScript): ScriptQualityScore {
  const structure = evaluateStructure(script);
  const shootability = evaluateShootability(script);
  const concreteness = evaluateConcreteness(script);

  // 加权平均：结构30% + 可拍摄性40% + 具体性30%
  const overall = Math.round(
    structure.score * 0.3 + shootability.score * 0.4 + concreteness.score * 0.3
  );

  let grade: "优秀" | "良好" | "及格" | "待改进";
  if (overall >= 85) grade = "优秀";
  else if (overall >= 70) grade = "良好";
  else if (overall >= 60) grade = "及格";
  else grade = "待改进";

  return {
    overall,
    structure,
    shootability,
    concreteness,
    grade,
  };
}

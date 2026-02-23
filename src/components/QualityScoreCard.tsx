"use client";

type ScriptQualityScore = {
  overall: number;
  structure: {
    score: number;
    details: string[];
  };
  shootability: {
    score: number;
    details: string[];
  };
  concreteness: {
    score: number;
    details: string[];
  };
  grade: "优秀" | "良好" | "及格" | "待改进";
};

type QualityScoreCardProps = {
  score: ScriptQualityScore;
};

export default function QualityScoreCard({ score }: QualityScoreCardProps) {
  const gradeColors = {
    优秀: "bg-green-50 border-green-200 text-green-900",
    良好: "bg-blue-50 border-blue-200 text-blue-900",
    及格: "bg-yellow-50 border-yellow-200 text-yellow-900",
    待改进: "bg-red-50 border-red-200 text-red-900",
  };

  const gradeEmojis = {
    优秀: "🌟",
    良好: "👍",
    及格: "✓",
    待改进: "⚠️",
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-blue-600";
    if (s >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-blue-500";
    if (s >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="rounded-xl border-2 border-zinc-200 bg-white p-4 shadow-sm space-y-4">
      {/* 总分 */}
      <div className={`rounded-lg border-2 p-4 ${gradeColors[score.grade]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-75">文案质量评分</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold">{score.overall}</span>
              <span className="text-lg opacity-75">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl mb-1">{gradeEmojis[score.grade]}</div>
            <div className="text-lg font-bold">{score.grade}</div>
          </div>
        </div>
      </div>

      {/* 三个维度 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 结构完整度 */}
        <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">📐 结构完整度</span>
            <span className={`text-lg font-bold ${getScoreColor(score.structure.score)}`}>
              {score.structure.score}
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(score.structure.score)} transition-all duration-500`}
              style={{ width: `${score.structure.score}%` }}
            />
          </div>
          <ul className="text-xs text-zinc-600 space-y-1 mt-2">
            {score.structure.details.slice(0, 3).map((detail, i) => (
              <li key={i} className="leading-tight">{detail}</li>
            ))}
          </ul>
        </div>

        {/* 可拍摄性 */}
        <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">🎬 可拍摄性</span>
            <span className={`text-lg font-bold ${getScoreColor(score.shootability.score)}`}>
              {score.shootability.score}
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(score.shootability.score)} transition-all duration-500`}
              style={{ width: `${score.shootability.score}%` }}
            />
          </div>
          <ul className="text-xs text-zinc-600 space-y-1 mt-2">
            {score.shootability.details.slice(0, 3).map((detail, i) => (
              <li key={i} className="leading-tight">{detail}</li>
            ))}
          </ul>
        </div>

        {/* 去空话指数 */}
        <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">💎 去空话指数</span>
            <span className={`text-lg font-bold ${getScoreColor(score.concreteness.score)}`}>
              {score.concreteness.score}
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(score.concreteness.score)} transition-all duration-500`}
              style={{ width: `${score.concreteness.score}%` }}
            />
          </div>
          <ul className="text-xs text-zinc-600 space-y-1 mt-2">
            {score.concreteness.details.slice(0, 3).map((detail, i) => (
              <li key={i} className="leading-tight">{detail}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 评分说明 */}
      <div className="text-xs text-zinc-500 border-t border-zinc-200 pt-3">
        <p className="font-medium mb-1">评分标准：</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><span className="text-green-600">●</span> 优秀 (80-100)</div>
          <div><span className="text-blue-600">●</span> 良好 (60-79)</div>
          <div><span className="text-yellow-600">●</span> 及格 (40-59)</div>
          <div><span className="text-red-600">●</span> 待改进 (&lt;40)</div>
        </div>
      </div>
    </div>
  );
}

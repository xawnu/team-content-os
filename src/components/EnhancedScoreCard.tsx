"use client";

type EnhancedScoreCardProps = {
  score: {
    overall: number;
    structure: { score: number; details: string[] };
    shootability: { score: number; details: string[] };
    concreteness: { score: number; details: string[] };
    creativity: { score: number; details: string[] };
    emotion: { score: number; details: string[] };
    rhythm: { score: number; details: string[] };
    grade: string;
    weights: any;
  };
};

const DIMENSION_LABELS: Record<string, string> = {
  structure: "结构完整度",
  shootability: "可拍摄性",
  concreteness: "去空话指数",
  creativity: "创意性",
  emotion: "情感共鸣",
  rhythm: "节奏感",
};

const DIMENSION_ICONS: Record<string, string> = {
  structure: "📐",
  shootability: "🎬",
  concreteness: "💎",
  creativity: "💡",
  emotion: "❤️",
  rhythm: "🎵",
};

export default function EnhancedScoreCard({ score }: EnhancedScoreCardProps) {
  function getScoreColor(s: number) {
    if (s >= 85) return "text-green-600";
    if (s >= 70) return "text-yellow-600";
    if (s >= 60) return "text-orange-600";
    return "text-red-600";
  }

  function getGradeColor(grade: string) {
    if (grade === "优秀") return "bg-green-100 text-green-700";
    if (grade === "良好") return "bg-yellow-100 text-yellow-700";
    if (grade === "及格") return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  }

  function getProgressColor(s: number) {
    if (s >= 85) return "bg-green-500";
    if (s >= 70) return "bg-yellow-500";
    if (s >= 60) return "bg-orange-500";
    return "bg-red-500";
  }

  const dimensions = ['structure', 'shootability', 'concreteness', 'creativity', 'emotion', 'rhythm'];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
      {/* 总分 */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3">
          <span className={`text-5xl font-bold ${getScoreColor(score.overall)}`}>
            {score.overall}
          </span>
          <div className="text-left">
            <p className="text-xs text-zinc-500">综合评分</p>
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getGradeColor(score.grade)}`}>
              {score.grade}
            </span>
          </div>
        </div>
      </div>

      {/* 各维度评分 */}
      <div className="grid gap-3 md:grid-cols-2">
        {dimensions.map((dim) => {
          const dimension = score[dim as keyof typeof score] as { score: number; details: string[] };
          if (!dimension) return null;
          
          return (
            <div key={dim} className="rounded border border-zinc-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{DIMENSION_ICONS[dim]}</span>
                  <span className="text-sm font-medium text-zinc-700">
                    {DIMENSION_LABELS[dim]}
                  </span>
                </div>
                <span className={`text-lg font-semibold ${getScoreColor(dimension.score)}`}>
                  {dimension.score}
                </span>
              </div>
              
              {/* 进度条 */}
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full ${getProgressColor(dimension.score)} transition-all duration-500`}
                  style={{ width: `${dimension.score}%` }}
                />
              </div>

              {/* 详情 */}
              <div className="space-y-1">
                {dimension.details.slice(0, 3).map((detail, i) => (
                  <p key={i} className="text-xs text-zinc-600">
                    {detail}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 权重说明 */}
      {score.weights && (
        <div className="border-t border-zinc-200 pt-3">
          <p className="text-xs text-zinc-500 mb-2">当前权重配置：</p>
          <div className="flex flex-wrap gap-2">
            {dimensions.map((dim) => (
              <span key={dim} className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                {DIMENSION_LABELS[dim]}: {Math.round((score.weights[dim] || 0) * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

type ScriptVersion = {
  id: string;
  topic: string;
  title: string;
  createdAt: string;
  score?: number;
  scriptOutline?: any;
  detailedScript?: any;
  config?: {
    contentGoal?: string;
    narrativeStructure?: string;
    toneStyle?: string[];
  };
};

type VersionCompareProps = {
  versions: [ScriptVersion, ScriptVersion];
  onClose: () => void;
};

export default function VersionCompare({ versions, onClose }: VersionCompareProps) {
  const [v1, v2] = versions;

  function renderField(label: string, value1: any, value2: any) {
    const isDifferent = JSON.stringify(value1) !== JSON.stringify(value2);
    
    return (
      <div className="border-b border-zinc-200 py-3">
        <p className="mb-2 text-xs font-medium text-zinc-500">{label}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className={`rounded p-2 text-sm ${isDifferent ? 'bg-yellow-50 border border-yellow-200' : 'bg-zinc-50'}`}>
            {renderValue(value1)}
          </div>
          <div className={`rounded p-2 text-sm ${isDifferent ? 'bg-yellow-50 border border-yellow-200' : 'bg-zinc-50'}`}>
            {renderValue(value2)}
          </div>
        </div>
      </div>
    );
  }

  function renderValue(value: any): React.ReactNode {
    if (value === null || value === undefined) {
      return <span className="text-zinc-400">-</span>;
    }
    if (Array.isArray(value)) {
      return (
        <ul className="space-y-1">
          {value.map((item, i) => (
            <li key={i}>• {String(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') {
      return <pre className="text-xs overflow-auto">{JSON.stringify(value, null, 2)}</pre>;
    }
    return <span>{String(value)}</span>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-xl bg-white shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">版本对比</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-zinc-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 版本标题 */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                  版本 A
                </span>
                {v1.score && (
                  <span className="text-xs text-blue-700">
                    评分: {v1.score}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-zinc-900">{v1.title}</p>
              <p className="text-xs text-zinc-600 mt-1">
                {new Date(v1.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-purple-600 px-2 py-0.5 text-xs font-medium text-white">
                  版本 B
                </span>
                {v2.score && (
                  <span className="text-xs text-purple-700">
                    评分: {v2.score}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-zinc-900">{v2.title}</p>
              <p className="text-xs text-zinc-600 mt-1">
                {new Date(v2.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
        </div>

        {/* 对比内容 */}
        <div className="p-6 space-y-4">
          {/* 基本信息 */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700">基本信息</h3>
            {renderField('主题', v1.topic, v2.topic)}
            {renderField('标题', v1.title, v2.title)}
            {renderField('内容目的', v1.config?.contentGoal, v2.config?.contentGoal)}
            {renderField('叙事结构', v1.config?.narrativeStructure, v2.config?.narrativeStructure)}
            {renderField('表达语气', v1.config?.toneStyle, v2.config?.toneStyle)}
          </div>

          {/* 详细脚本对比 */}
          {v1.detailedScript && v2.detailedScript && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-700">详细脚本</h3>
              {renderField('缩略图文案', v1.detailedScript.thumbnailCopy, v2.detailedScript.thumbnailCopy)}
              {renderField('开场 15 秒', v1.detailedScript.opening15s, v2.detailedScript.opening15s)}
              {renderField('内容要点', v1.detailedScript.contentItems, v2.detailedScript.contentItems)}
              {renderField('CTA', v1.detailedScript.cta, v2.detailedScript.cta)}
              {renderField('发布文案', v1.detailedScript.publishCopy, v2.detailedScript.publishCopy)}
              {renderField('标签', v1.detailedScript.tags, v2.detailedScript.tags)}
              {renderField('差异化点', v1.detailedScript.differentiation, v2.detailedScript.differentiation)}
            </div>
          )}

          {/* 评分对比 */}
          {(v1.score || v2.score) && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-700">质量评分</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${v1.score && v1.score >= 80 ? 'text-green-600' : v1.score && v1.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {v1.score || '-'}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">版本 A 评分</p>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${v2.score && v2.score >= 80 ? 'text-green-600' : v2.score && v2.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {v2.score || '-'}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">版本 B 评分</p>
                </div>
              </div>
              {v1.score && v2.score && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-zinc-600">
                    {v1.score > v2.score ? '版本 A' : v1.score < v2.score ? '版本 B' : '两个版本'} 
                    {v1.score !== v2.score && ` 评分更高 (相差 ${Math.abs(v1.score - v2.score)} 分)`}
                    {v1.score === v2.score && ' 评分相同'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="sticky bottom-0 border-t border-zinc-200 bg-white px-6 py-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

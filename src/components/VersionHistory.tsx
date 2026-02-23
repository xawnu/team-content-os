"use client";

import { useState } from "react";

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

type VersionHistoryProps = {
  versions: ScriptVersion[];
  onRestore?: (version: ScriptVersion) => void;
  onCompare?: (versionIds: string[]) => void;
};

export default function VersionHistory({ versions, onRestore, onCompare }: VersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedVersions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (newSelected.size >= 2) {
        alert('最多只能选择 2 个版本进行对比');
        return;
      }
      newSelected.add(id);
    }
    setSelectedVersions(newSelected);
  }

  function handleCompare() {
    if (selectedVersions.size !== 2) {
      alert('请选择 2 个版本进行对比');
      return;
    }
    if (onCompare) {
      onCompare(Array.from(selectedVersions));
    }
  }

  function getScoreColor(score?: number) {
    if (!score) return 'text-zinc-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getScoreBadge(score?: number) {
    if (!score) return 'bg-zinc-100 text-zinc-600';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
        <p className="text-sm text-zinc-500">暂无历史版本</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 操作栏 */}
      {selectedVersions.size > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              已选择 {selectedVersions.size} 个版本
            </span>
            <div className="flex gap-2">
              {selectedVersions.size === 2 && (
                <button
                  onClick={handleCompare}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  对比版本
                </button>
              )}
              <button
                onClick={() => setSelectedVersions(new Set())}
                className="rounded bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 版本列表 */}
      <div className="space-y-2">
        {versions.map((version, index) => (
          <div
            key={version.id}
            className={`rounded-lg border ${
              selectedVersions.has(version.id)
                ? 'border-blue-400 bg-blue-50'
                : 'border-zinc-200 bg-white'
            } p-4 shadow-sm transition-all hover:shadow-md`}
          >
            <div className="flex items-start gap-3">
              {/* 选择框 */}
              <input
                type="checkbox"
                checked={selectedVersions.has(version.id)}
                onChange={() => toggleSelect(version.id)}
                className="mt-1 rounded"
              />

              {/* 版本信息 */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        版本 {versions.length - index}
                      </span>
                      {index === 0 && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          最新
                        </span>
                      )}
                      {version.score && (
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${getScoreBadge(version.score)}`}>
                          评分: {version.score}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-zinc-900">
                      {version.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-600">
                      主题: {version.topic}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      生成时间: {new Date(version.createdAt).toLocaleString('zh-CN')}
                    </p>

                    {/* 配置信息 */}
                    {version.config && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {version.config.contentGoal && (
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                            {version.config.contentGoal}
                          </span>
                        )}
                        {version.config.narrativeStructure && (
                          <span className="rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                            {version.config.narrativeStructure}
                          </span>
                        )}
                        {version.config.toneStyle && version.config.toneStyle.length > 0 && (
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            {version.config.toneStyle.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedVersion(expandedVersion === version.id ? null : version.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {expandedVersion === version.id ? '收起' : '展开'}
                    </button>
                    {onRestore && (
                      <button
                        onClick={() => onRestore(version)}
                        className="text-xs text-green-600 hover:underline"
                      >
                        恢复此版本
                      </button>
                    )}
                  </div>
                </div>

                {/* 展开内容 */}
                {expandedVersion === version.id && version.scriptOutline && (
                  <div className="mt-3 space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3">
                    <div>
                      <p className="text-xs font-medium text-zinc-700">内容目的:</p>
                      <p className="text-xs text-zinc-600">{version.scriptOutline.contentGoal || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-700">叙事结构:</p>
                      <p className="text-xs text-zinc-600">{version.scriptOutline.narrativeStructure || '-'}</p>
                    </div>
                    {version.scriptOutline.keyPoints && version.scriptOutline.keyPoints.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-700">关键要点:</p>
                        <ul className="mt-1 space-y-1 text-xs text-zinc-600">
                          {version.scriptOutline.keyPoints.map((point: string, i: number) => (
                            <li key={i}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

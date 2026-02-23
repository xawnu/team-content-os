"use client";

import { useState } from "react";

type ScoreWeights = {
  structure: number;
  shootability: number;
  concreteness: number;
  creativity: number;
  emotion: number;
  rhythm: number;
};

type WeightConfigProps = {
  weights: ScoreWeights;
  onChange: (weights: ScoreWeights) => void;
  onReset: () => void;
};

const DIMENSION_LABELS = {
  structure: "结构完整度",
  shootability: "可拍摄性",
  concreteness: "去空话指数",
  creativity: "创意性",
  emotion: "情感共鸣",
  rhythm: "节奏感",
};

const DIMENSION_DESCRIPTIONS = {
  structure: "开场、分镜、要点的完整性",
  shootability: "画面可视化程度",
  concreteness: "具体性、避免空话",
  creativity: "差异化、新颖性",
  emotion: "情感词汇、痛点触达",
  rhythm: "节奏变化、信息密度",
};

export default function WeightConfig({ weights, onChange, onReset }: WeightConfigProps) {
  const [expanded, setExpanded] = useState(false);

  function handleWeightChange(dimension: keyof ScoreWeights, value: number) {
    const newWeights = { ...weights, [dimension]: value / 100 };
    
    // 确保总和为 1
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(total - 1) > 0.01) {
      // 自动调整其他维度
      const others = Object.keys(newWeights).filter(k => k !== dimension) as (keyof ScoreWeights)[];
      const adjustment = (1 - newWeights[dimension]) / others.length;
      others.forEach(k => {
        newWeights[k] = Math.max(0, Math.min(1, adjustment));
      });
    }
    
    onChange(newWeights);
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const isValid = Math.abs(totalWeight - 1) < 0.01;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">⚖️ 评分权重配置</h3>
          {!isValid && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
              权重总和需为 100%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-xs text-zinc-600 hover:underline"
          >
            恢复默认
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:underline"
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <p className="text-xs text-zinc-600">
            调整各评分维度的权重，总和必须为 100%。权重越高，该维度对总分的影响越大。
          </p>

          {(Object.keys(weights) as (keyof ScoreWeights)[]).map((dimension) => (
            <div key={dimension} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-zinc-900">
                    {DIMENSION_LABELS[dimension]}
                  </span>
                  <p className="text-xs text-zinc-500">
                    {DIMENSION_DESCRIPTIONS[dimension]}
                  </p>
                </div>
                <span className="text-sm font-semibold text-zinc-900">
                  {Math.round(weights[dimension] * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(weights[dimension] * 100)}
                onChange={(e) => handleWeightChange(dimension, parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          ))}

          <div className="border-t border-zinc-200 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-700">总计</span>
              <span className={`font-semibold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                {Math.round(totalWeight * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

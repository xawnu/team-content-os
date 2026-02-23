/**
 * AI 调用稳定性增强
 * 支持重试、模型切换、降级策略
 */

type AICallOptions = {
  maxRetries?: number;
  retryDelay?: number;
  fallbackModels?: string[];
  timeout?: number;
};

type AIResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  model?: string;
  retries?: number;
};

/**
 * 指数退避延迟
 */
function exponentialBackoff(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 10000);
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的 AI 调用
 */
export async function callAIWithRetry<T>(
  apiCall: () => Promise<T>,
  options: AICallOptions = {}
): Promise<AIResponse<T>> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 60000,
  } = options;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI 调用超时')), timeout);
      });
      
      const result = await Promise.race([
        apiCall(),
        timeoutPromise,
      ]);
      
      return {
        success: true,
        data: result,
        retries: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`AI 调用失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`, lastError.message);
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        const waitTime = exponentialBackoff(attempt, retryDelay);
        console.log(`等待 ${waitTime}ms 后重试...`);
        await delay(waitTime);
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message || '未知错误',
    retries: maxRetries,
  };
}

/**
 * 带模型切换的 AI 调用
 */
export async function callAIWithFallback<T>(
  apiCallFactory: (model: string) => Promise<T>,
  models: string[],
  options: AICallOptions = {}
): Promise<AIResponse<T>> {
  if (models.length === 0) {
    return {
      success: false,
      error: '没有可用的模型',
    };
  }
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    console.log(`尝试使用模型: ${model}`);
    
    const result = await callAIWithRetry(
      () => apiCallFactory(model),
      { ...options, maxRetries: i === models.length - 1 ? 3 : 1 } // 最后一个模型多重试几次
    );
    
    if (result.success) {
      return {
        ...result,
        model,
      };
    }
    
    console.error(`模型 ${model} 调用失败:`, result.error);
    
    // 如果不是最后一个模型，继续尝试下一个
    if (i < models.length - 1) {
      console.log(`切换到备用模型...`);
    }
  }
  
  return {
    success: false,
    error: '所有模型均调用失败',
  };
}

/**
 * 本地模板库（降级策略）
 */
export const localTemplates = {
  /**
   * 生成基础文案模板
   */
  generateBasicScript(params: {
    topic: string;
    contentItems: string[];
    narrativeStructure: string;
    paceLevel: string;
  }) {
    const { topic, contentItems, narrativeStructure, paceLevel } = params;
    
    return {
      topic,
      title: `${topic} - 完整指南`,
      thumbnailCopy: `${topic}的${contentItems.length}个关键要点`,
      opening15s: [
        `大家好，今天我们来聊聊${topic}。`,
        `很多人在${topic}上遇到困难，其实掌握这几个要点就够了。`,
        `接下来我会分享${contentItems.length}个实用技巧，帮你快速上手。`,
      ],
      timeline: contentItems.map((item, i) => ({
        time: `${String(i).padStart(2, '0')}:00-${String(i).padStart(2, '0')}:45`,
        segment: `第${i + 1}段：${item}`,
        voiceover: `现在我们来看第${i + 1}个要点：${item}。这个方法的核心在于理解原理，然后按步骤执行。首先要注意的是前期准备，确保所有材料和工具都准备好。接下来按照标准流程操作，注意每个细节。最后验证结果，确保达到预期效果。`,
        visuals: `画面使用中景镜头展示操作过程，配合特写镜头强调关键步骤。使用推镜头引导观众注意力，转场时使用淡入淡出效果。背景保持简洁，突出主体内容。`,
      })),
      contentItems,
      cta: `如果这个视频对你有帮助，记得点赞关注，我们下期见！`,
      publishCopy: `${topic}完整教程 | ${contentItems.length}个实用技巧 | 新手必看`,
      tags: [topic, '教程', '指南', '实用技巧', '新手入门'],
      differentiation: [
        '采用循序渐进的讲解方式，适合新手',
        '每个步骤都有详细的画面展示',
        '提供常见问题的解决方案',
      ],
      provider: 'template' as const,
    };
  },
};

/**
 * 智能 AI 调用（带完整降级策略）
 */
export async function smartAICall<T>(
  primaryCall: () => Promise<T>,
  fallbackCall: () => T,
  options: AICallOptions = {}
): Promise<{ data: T; source: 'ai' | 'template' }> {
  const result = await callAIWithRetry(primaryCall, options);
  
  if (result.success && result.data) {
    return {
      data: result.data,
      source: 'ai',
    };
  }
  
  console.warn('AI 调用失败，使用本地模板降级');
  return {
    data: fallbackCall(),
    source: 'template',
  };
}

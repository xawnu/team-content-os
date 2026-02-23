-- 为 EpisodePlan 添加性能优化索引
-- 优化按主题搜索
CREATE INDEX IF NOT EXISTS "EpisodePlan_topic_idx" ON "EpisodePlan"("topic");

-- 优化按创建时间排序
CREATE INDEX IF NOT EXISTS "EpisodePlan_createdAt_idx" ON "EpisodePlan"("createdAt" DESC);

-- 优化按状态筛选
CREATE INDEX IF NOT EXISTS "EpisodePlan_status_idx" ON "EpisodePlan"("status");

-- 复合索引：项目 + 创建时间（最常用的查询组合）
CREATE INDEX IF NOT EXISTS "EpisodePlan_projectId_createdAt_idx" ON "EpisodePlan"("projectId", "createdAt" DESC);

-- 复合索引：项目 + 状态
CREATE INDEX IF NOT EXISTS "EpisodePlan_projectId_status_idx" ON "EpisodePlan"("projectId", "status");

-- 为 DiscoverRun 优化查询性能
CREATE INDEX IF NOT EXISTS "DiscoverRun_query_createdAt_idx" ON "DiscoverRun"("query", "createdAt" DESC);

-- 为 SimilarRun 优化查询性能
CREATE INDEX IF NOT EXISTS "SimilarRun_seedChannelId_createdAt_idx" ON "SimilarRun"("seedChannelId", "createdAt" DESC);

-- 为 CompetitorVideo 添加视图数索引（用于排序）
CREATE INDEX IF NOT EXISTS "CompetitorVideo_views_idx" ON "CompetitorVideo"("views" DESC NULLS LAST);

-- 为 DiscoverCandidate 添加评分索引
CREATE INDEX IF NOT EXISTS "DiscoverCandidate_score_idx" ON "DiscoverCandidate"("score" DESC);

# Team Content OS

多人协作的 YouTube 对标情报与内容规划系统。

## 技术栈

- Next.js (App Router)
- PostgreSQL
- Prisma ORM

## 快速开始

```bash
npm install
cp .env.example .env.local
# 修改 DATABASE_URL
npx prisma migrate dev --name init
npm run dev
```

打开 http://localhost:3000

## 当前数据模型

- Team / User / Project（团队、成员、频道项目）
- CompetitorChannel / CompetitorVideo（竞品频道和视频）
- ContentPattern（可复用内容模式）
- EpisodePlan / EpisodeMetrics（选题规划与复盘指标）

## YouTube 快增长频道发现 API（已接入）

配置环境变量：

```bash
YOUTUBE_API_KEY=your_key
```

本地测试：

```bash
GET /api/youtube/discover?q=homestead&niche=homestead&days=7&region=US&lang=en&maxResults=50&minDurationSec=240&persist=1
```

说明：
- 先用 `search.list(type=video, order=viewCount)` 拉近7天候选视频
- 再用 `videos.list` 补充 `viewCount + duration`
- 过滤短视频后按频道聚合，计算 GrowthScore
- `persist=1` 时会写入 `DiscoverRun / DiscoverCandidate` 表，支持后续复盘追踪
- 赛道模板接口：`GET /api/niches`
- 种子频道找同类：`GET /api/youtube/similar?seed=<UC...|@handle|url>`
- 标题/关键词分析：`GET /api/youtube/analyze?runId=<discoverRunId可选>`

## 下一步建议

1. 增加认证（NextAuth / Clerk）
2. 增加角色权限（Admin / Lead / Creator / Analyst）
3. 增加采集任务（定时抓取频道视频）
4. 增加自动周报与选题生成 API

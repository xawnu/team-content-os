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

## 下一步建议

1. 增加认证（NextAuth / Clerk）
2. 增加角色权限（Admin / Lead / Creator / Analyst）
3. 增加采集任务（定时抓取频道视频）
4. 增加自动周报与选题生成 API

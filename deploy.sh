#!/bin/bash

# Team Content OS v1.0.10 部署脚本

set -e

echo "🚀 开始部署 Team Content OS v1.0.10..."

# 1. 检查环境变量
echo "📋 检查环境变量..."
if [ ! -f .env.local ]; then
    echo "❌ 错误：.env.local 文件不存在"
    echo "请复制 .env.example 并配置："
    echo "  cp .env.example .env.local"
    echo "  然后编辑 .env.local 填入真实配置"
    exit 1
fi

if ! grep -q "YOUTUBE_API_KEY" .env.local; then
    echo "⚠️  警告：未配置 YOUTUBE_API_KEY，参考视频池功能将无法使用"
fi

# 2. 安装依赖
echo "📦 安装依赖..."
npm install

# 3. 生成 Prisma 客户端
echo "🔧 生成 Prisma 客户端..."
npx prisma generate

# 4. 构建项目
echo "🏗️  构建项目..."
npm run build

# 5. 重启服务（如果使用 PM2）
if command -v pm2 &> /dev/null; then
    echo "🔄 重启 PM2 服务..."
    pm2 restart team-content-os || pm2 start npm --name "team-content-os" -- start
    pm2 save
else
    echo "⚠️  未检测到 PM2，请手动启动服务："
    echo "  npm start"
fi

echo "✅ 部署完成！"
echo ""
echo "📝 v1.0.10 更新内容："
echo "  - 参考视频池可视化升级"
echo "  - 支持拖拽排序"
echo "  - 自动解析 YouTube 视频信息"
echo ""
echo "🌐 访问地址：http://localhost:3000/planner"

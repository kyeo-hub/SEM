#!/bin/bash

# EIM 服务启动脚本
# 用法：./start.sh

echo "🚀 正在启动服务..."
echo ""

# 启动 Go 后端
echo "   📦 启动 Go 后端 (http://localhost:8080)..."
cd /workspaces/SEM/eim
go run cmd/server/main.go > /tmp/eim-backend.log 2>&1 &
BACKEND_PID=$!
echo "      PID: $BACKEND_PID"

# 等待后端启动
sleep 3

# 启动 Next.js 前端
echo "   🌐 启动 Next.js 前端 (http://localhost:3000)..."
cd /workspaces/SEM/eim/web
npm run dev > /tmp/eim-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "      PID: $FRONTEND_PID"

echo ""
echo "✅ 服务启动完成!"
echo ""
echo "📊 服务状态:"
echo "   后端 API:  http://localhost:8080"
echo "   前端 PC:   http://localhost:3000/admin"
echo "   前端 H5:   http://localhost:3000/mobile"
echo ""
echo "📝 日志文件:"
echo "   后端：/tmp/eim-backend.log (tail -f 查看)"
echo "   前端：/tmp/eim-frontend.log (tail -f 查看)"
echo ""
echo "🛑 停止服务：./stop.sh"
echo "🔄 重启服务：./restart.sh"
echo ""

# 显示进程信息
ps aux | grep -E "next dev|go run" | grep -v grep

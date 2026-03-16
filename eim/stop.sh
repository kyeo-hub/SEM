#!/bin/bash

# EIM 服务停止脚本
# 用法：./stop.sh

echo "🛑 正在停止服务..."

# 停止 Next.js 服务
pkill -f "next dev" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✓ Next.js 服务已停止"
else
    echo "   ⚠ Next.js 服务未运行"
fi

# 停止 Go 后端服务
pkill -f "go run" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✓ Go 后端服务已停止"
else
    echo "   ⚠ Go 后端服务未运行"
fi

# 清理缓存（可选）
read -p "是否清理缓存？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 正在清理缓存..."
    cd /workspaces/SEM/eim/web
    rm -rf .next node_modules/.cache .swc *.tsbuildinfo 2>/dev/null
    echo "   ✓ 缓存已清理"
fi

echo ""
echo "✅ 所有服务已停止"

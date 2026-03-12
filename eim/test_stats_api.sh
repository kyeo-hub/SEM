#!/bin/bash
# EIM 统计 API 测试脚本

BASE_URL="http://localhost:8080"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaXNzIjoiZWltIiwiZXhwIjoxNzczNjMwNDQ3LCJpYXQiOjE3NzMwMjU2NDd9.VT2bd47gHejPsdpBJu6urEEC5CPvZfM6vQYV_WvmiDI"
AUTH_HEADER="Authorization: Bearer $TOKEN"

# 测试设备 ID
EQUIPMENT_ID=3

echo "=========================================="
echo "EIM 统计 API 测试"
echo "=========================================="
echo ""

# 测试 1: 获取概览统计
echo "=== 测试 1: 获取概览统计 ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/stats/overview" | jq '.data.equipment'
echo ""

# 测试 2: 获取作业统计
echo "=== 测试 2: 获取作业统计（今日） ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/stats/operations?equipment_id=$EQUIPMENT_ID" | jq '.data'
echo ""

# 测试 3: 获取维保统计
echo "=== 测试 3: 获取维保统计（今日） ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/stats/maintenance?equipment_id=$EQUIPMENT_ID" | jq '.data'
echo ""

# 测试 4: 获取故障统计
echo "=== 测试 4: 获取故障统计（今日） ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/stats/faults?equipment_id=$EQUIPMENT_ID" | jq '.data'
echo ""

# 测试 5: 获取状态时长统计
echo "=== 测试 5: 获取状态时长统计（今日） ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/stats/status-duration?equipment_id=$EQUIPMENT_ID" | jq '.data'
echo ""

# 测试 6: 获取设备详细统计
echo "=== 测试 6: 获取设备详细统计 ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/stats/equipment/$EQUIPMENT_ID" | jq '.data | {operation: .operation, fault: .fault, status_duration: .status_duration}'
echo ""

# 测试 7: 获取日报统计
echo "=== 测试 7: 获取日报统计 ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/stats/daily?equipment_id=$EQUIPMENT_ID" | jq '.data'
echo ""

# 测试 8: 获取月报统计
echo "=== 测试 8: 获取月报统计 ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/stats/monthly?equipment_id=$EQUIPMENT_ID" | jq '.data.status_duration'
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="

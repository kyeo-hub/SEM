#!/bin/bash
# EIM API 测试脚本
# 测试新增的作业、维保、故障管理 API

BASE_URL="http://localhost:8080"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaXNzIjoiZWltIiwiZXhwIjoxNzczNjMwNDQ3LCJpYXQiOjE3NzMwMjU2NDd9.VT2bd47gHejPsdpBJu6urEEC5CPvZfM6vQYV_WvmiDI"
AUTH_HEADER="Authorization: Bearer $TOKEN"

# 测试设备 ID（选择待命状态的设备 MQ40-03）
EQUIPMENT_ID=3

echo "=========================================="
echo "EIM API 测试"
echo "=========================================="
echo ""

# 测试 1: 开始作业
echo "=== 测试 1: 开始作业 ==="
curl -s -X POST "$BASE_URL/api/operations/start" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"equipment_id\": $EQUIPMENT_ID,
    \"ship_name\": \"测试船\",
    \"cargo_name\": \"铁矿石\",
    \"operator_name\": \"张三\",
    \"qr_scan\": true,
    \"changed_by\": \"测试员\"
  }" | jq .
echo ""

# 等待一下
sleep 1

# 测试 2: 获取今日作业记录
echo "=== 测试 2: 获取今日作业记录 ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/operations/today?equipment_id=$EQUIPMENT_ID" | jq .
echo ""

# 测试 3: 结束作业
echo "=== 测试 3: 结束作业 ==="
# 先获取作业记录 ID
OPERATION_ID=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/operations/today?equipment_id=$EQUIPMENT_ID" | jq '.data[0].id')
if [ "$OPERATION_ID" != "null" ] && [ -n "$OPERATION_ID" ]; then
  curl -s -X POST "$BASE_URL/api/operations/end" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
      \"operation_id\": $OPERATION_ID,
      \"cargo_weight\": 150.5,
      \"has_fault\": false,
      \"operator_name\": \"张三\",
      \"reason\": \"作业完成\",
      \"qr_scan\": true,
      \"changed_by\": \"测试员\"
    }" | jq .
else
  echo "未找到作业记录"
fi
echo ""

# 测试 4: 开始维保
echo "=== 测试 4: 开始维保 ==="
curl -s -X POST "$BASE_URL/api/maintenance/start" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"equipment_id\": $EQUIPMENT_ID,
    \"maintenance_type\": \"daily\",
    \"plan_content\": \"日常保养：检查润滑油、紧固螺丝\",
    \"maintainer_name\": \"李四\",
    \"qr_scan\": true,
    \"changed_by\": \"测试员\"
  }" | jq .
echo ""

# 等待一下
sleep 1

# 测试 5: 完成维保
echo "=== 测试 5: 完成维保 ==="
# 先获取维保记录 ID
MAINTENANCE_ID=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/maintenance/today?equipment_id=$EQUIPMENT_ID" | jq '.data[0].id')
if [ "$MAINTENANCE_ID" != "null" ] && [ -n "$MAINTENANCE_ID" ]; then
  curl -s -X POST "$BASE_URL/api/maintenance/complete" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
      \"maintenance_id\": $MAINTENANCE_ID,
      \"result\": \"resolved\",
      \"actual_content\": \"已完成润滑油检查和螺丝紧固\",
      \"maintainer_signature\": \"data:image/png;base64,test_signature\",
      \"qr_scan\": true,
      \"changed_by\": \"测试员\"
    }" | jq .
else
  echo "未找到维保记录"
fi
echo ""

# 测试 6: 创建故障记录
echo "=== 测试 6: 创建故障记录 ==="
curl -s -X POST "$BASE_URL/api/faults" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"equipment_id\": $EQUIPMENT_ID,
    \"fault_level_id\": 2,
    \"description\": \"测试故障：减速机漏油\",
    \"source\": \"manual\",
    \"reporter_name\": \"王五\",
    \"qr_scan\": true,
    \"changed_by\": \"测试员\"
  }" | jq .
echo ""

# 测试 7: 获取未解决故障
echo "=== 测试 7: 获取未解决故障 ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/faults/unresolved?equipment_id=$EQUIPMENT_ID" | jq .
echo ""

# 测试 8: 获取故障记录列表
echo "=== 测试 8: 获取故障记录列表 ==="
curl -s -H "$AUTH_HEADER" "$BASE_URL/api/faults?equipment_id=$EQUIPMENT_ID&page=1&page_size=10" | jq .
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="

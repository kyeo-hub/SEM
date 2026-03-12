# EIM 集成测试方案

> 测试版本：v1.5
> 测试日期：2026-03-06
> 测试范围：H5 移动端核心功能 + 后端 API

---

## 📋 测试准备

### 1. 环境准备

```bash
# 1. 启动 PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15

# 2. 启动 Redis
docker run -d --name redis \
  -e REDIS_PASSWORD=redis \
  -p 6379:6379 \
  redis:7

# 3. 启动后端 API
cd /workspaces/SEM/eim
go run cmd/server/main.go

# 4. 启动前端 Web（另一个终端）
cd /workspaces/SEM/eim/web
npm run dev
```

### 2. 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 Web | http://localhost:3000 | Next.js 前端 |
| 后端 API | http://localhost:8080 | Go API 服务 |
| 健康检查 | http://localhost:8080/health | API 健康检查 |

### 3. 测试账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | admin | admin123 | 后台管理 + 移动端 |
| 点检员 | inspector | 123456 | 移动端点检 |

---

## 🧪 测试用例

### 测试 1: 登录功能 ✅

**测试步骤**：
1. 访问 http://localhost:3000/login
2. 输入账号密码（admin/admin123）
3. 点击登录

**预期结果**：
- ✅ 登录成功
- ✅ 跳转到 /admin 页面（管理员）或 /mobile（点检员）
- ✅ localStorage 中保存 token 和 user

**测试 API**：
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

### 测试 2: 设备列表查询 ✅

**测试步骤**：
1. 登录后访问 http://localhost:3000/admin/equipment
2. 查看设备列表

**预期结果**：
- ✅ 显示设备列表
- ✅ 显示设备状态（颜色区分）
- ✅ 可以搜索设备

**测试 API**：
```bash
curl http://localhost:8080/api/equipments \
  -H "Authorization: Bearer {token}"
```

---

### 测试 3: 扫码功能 🔄

**测试步骤**：
1. 访问 http://localhost:3000/mobile/scan
2. 允许浏览器使用摄像头
3. 扫描设备二维码

**预期结果**：
- ✅ 摄像头正常启动
- ✅ 扫码成功后跳转到设备操作页
- ✅ 显示设备信息

**手动输入测试**：
1. 点击"手动输入设备编号"
2. 输入设备编号

---

### 测试 4: 设备操作 - 开始作业 ✅

**前置条件**：设备状态为 standby

**测试步骤**：
1. 扫码进入设备操作页
2. 点击"开始作业"按钮
3. 填写船名、货品名称、操作人
4. 点击确认

**预期结果**：
- ✅ 弹窗关闭
- ✅ 设备状态变为 working
- ✅ 显示船名和货品信息
- ✅ Toast 提示"开始作业成功"

**测试 API**：
```bash
curl -X PUT http://localhost:8080/api/equipments/1/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "working",
    "ship_name": "测试船",
    "cargo_name": "测试货品",
    "reason": "开始作业",
    "qr_scan": true,
    "changed_by": "测试用户"
  }'
```

---

### 测试 5: 设备操作 - 结束作业 ✅

**前置条件**：设备状态为 working

**测试步骤**：
1. 扫码进入设备操作页
2. 点击"结束作业"按钮
3. 确认结束作业

**预期结果**：
- ✅ 弹出确认框"当前设备正在作业中，是否结束作业？"
- ✅ 确认后设备状态变为 standby
- ✅ Toast 提示"结束作业成功"

---

### 测试 6: 设备操作 - 故障等级检查 ⭐

**前置条件**：设备状态为 fault，故障等级为 L1

**测试步骤**：
1. 扫码进入设备操作页
2. 点击"开始作业"按钮

**预期结果**：
- ❌ Toast 提示"设备严重故障，禁止作业！"
- ❌ 不允许开始作业

**测试 API**：
```bash
# 先设置设备为 L1 故障
curl -X PUT http://localhost:8080/api/equipments/1/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "fault",
    "fault_level_id": 1,
    "reason": "测试 L1 故障"
  }'

# 尝试开始作业（应该失败）
curl -X PUT http://localhost:8080/api/equipments/1/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "working"}'

# 预期响应：
# {"code": 1, "message": "设备严重故障，禁止作业！"}
```

---

### 测试 7: 设备操作 - L2/L3 故障作业 ⭐

**前置条件**：设备状态为 fault，故障等级为 L2 或 L3

**测试步骤**：
1. 扫码进入设备操作页
2. 点击"开始作业"按钮

**预期结果**：
- ⚠️ 弹出确认框"设备当前为一般故障/轻微故障，允许带病作业，但需注意安全！是否继续？"
- ✅ 确认后允许开始作业

**测试 API**：
```bash
# 设置设备为 L2 故障
curl -X PUT http://localhost:8080/api/equipments/1/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "fault",
    "fault_level_id": 2,
    "reason": "测试 L2 故障"
  }'

# 尝试开始作业（应该成功）
curl -X PUT http://localhost:8080/api/equipments/1/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "working"}'

# 预期响应：
# {"code": 0, "data": {...}}
```

---

### 测试 8: 设备操作 - 维保状态禁止作业 ⭐

**前置条件**：设备状态为 maintenance

**测试步骤**：
1. 扫码进入设备操作页
2. 点击"开始作业"按钮

**预期结果**：
- ❌ Toast 提示"设备正在维保中，禁止作业"
- ❌ 按钮禁用或不允许点击

**测试 API**：
```bash
# 设置设备为维保状态
curl -X PUT http://localhost:8080/api/equipments/1/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "maintenance",
    "reason": "测试维保"
  }'

# 尝试开始作业（应该失败）
curl -X PUT http://localhost:8080/api/equipments/1/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "working"}'

# 预期响应：
# {"code": 1, "message": "设备正在维保中，禁止作业"}
```

---

### 测试 9: 设备操作 - 维保登记 ✅

**测试步骤**：
1. 扫码进入设备操作页
2. 点击"维保登记"按钮
3. 选择维保类型（日常保养/故障维修/定期检修/紧急抢修）
4. 填写维保内容
5. 点击确认

**预期结果**：
- ✅ 设备状态变为 maintenance
- ✅ Toast 提示"维保登记成功"

---

### 测试 10: 设备操作 - 设为待命 ✅

**测试步骤**：
1. 扫码进入设备操作页
2. 点击"设为待命"按钮
3. 填写原因（可选）
4. 点击确认

**预期结果**：
- ✅ 设备状态变为 standby
- ✅ Toast 提示"状态更新成功"

---

### 测试 11: 点检录入 🔄

**前置条件**：设备已添加点检标准

**测试步骤**：
1. 扫码进入设备操作页
2. 点击"点检录入"按钮
3. 选择班次（班前/班中/交班）
4. 填写点检结果（正常/异常）
5. 填写问题记录
6. 电子签名
7. 提交点检

**预期结果**：
- ✅ 点检标准列表正常显示
- ✅ 可以正常选择正常/异常
- ✅ 电子签名可以正常绘制
- ✅ 提交成功
- ✅ Toast 提示"点检完成"

**测试 API**：
```bash
curl -X POST http://localhost:8080/api/inspections \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "equipment_id": 1,
    "inspection_date": "2026-03-06",
    "shift": "before",
    "inspector_name": "测试用户",
    "details": [
      {
        "standard_id": 1,
        "part_name": "发动机",
        "item_name": "机油压力",
        "result": "normal",
        "remark": ""
      }
    ],
    "signature_image": "data:image/png;base64,..."
  }'
```

---

### 测试 12: 个人中心 ✅

**测试步骤**：
1. 访问 http://localhost:3000/mobile/profile
2. 查看用户信息
3. 查看最近点检记录
4. 点击"修改密码"
5. 填写旧密码、新密码
6. 确认修改

**预期结果**：
- ✅ 显示用户信息（姓名、角色、部门）
- ✅ 显示最近点检记录
- ✅ 修改密码成功
- ✅ 自动退出登录
- ✅ 需要重新登录

**测试 API**：
```bash
# 获取用户信息
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer {token}"

# 修改密码
curl -X PUT http://localhost:8080/api/users/change-password \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "123456",
    "new_password": "new123456"
  }'
```

---

### 测试 13: 文件上传 🔄

**测试步骤**：
1. 访问任意支持图片上传的页面
2. 选择图片文件
3. 上传

**预期结果**：
- ✅ 图片上传成功
- ✅ 显示图片预览
- ✅ 返回图片 URL

**测试 API**：
```bash
curl -X POST http://localhost:8080/api/files/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/image.jpg"
```

---

### 测试 14: 统计分析 ✅

**测试步骤**：
1. 访问 http://localhost:3000/admin/statistics
2. 查看日/周/月统计

**预期结果**：
- ✅ 显示设备统计（总数、作业中、待命、故障等）
- ✅ 显示点检统计

**测试 API**：
```bash
# 日统计
curl http://localhost:8080/api/stats/daily \
  -H "Authorization: Bearer {token}"

# 周统计
curl http://localhost:8080/api/stats/weekly \
  -H "Authorization: Bearer {token}"

# 月统计
curl http://localhost:8080/api/stats/monthly \
  -H "Authorization: Bearer {token}"
```

---

### 测试 15: 企业微信推送 🔄

**前置条件**：已配置企业微信 Webhook

**测试步骤**：
1. 访问 http://localhost:3000/admin
2. 点击"测试企业微信推送"

**预期结果**：
- ✅ 企业微信收到测试消息
- ✅ Toast 提示"推送成功"

**测试 API**：
```bash
curl -X POST http://localhost:8080/api/wechat/test \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"content":"测试消息"}'
```

---

## 📊 测试检查清单

### 后端 API 测试

- [ ] `GET /health` - 健康检查
- [ ] `POST /api/auth/login` - 用户登录
- [ ] `GET /api/users/me` - 获取用户信息
- [ ] `PUT /api/users/change-password` - 修改密码
- [ ] `GET /api/equipments` - 获取设备列表
- [ ] `GET /api/equipments/:id` - 获取设备详情
- [ ] `PUT /api/equipments/:id/status` - 更新设备状态
- [ ] `POST /api/inspections` - 创建点检记录
- [ ] `GET /api/inspections` - 获取点检记录列表
- [ ] `GET /api/stats/daily` - 日统计
- [ ] `POST /api/files/upload` - 文件上传
- [ ] `POST /api/wechat/test` - 测试企业微信推送

### 前端功能测试

- [ ] 登录页面 - 账号密码登录
- [ ] 管理后台 - 设备列表
- [ ] 管理后台 - 点检记录
- [ ] 管理后台 - 统计分析
- [ ] 移动端 - 首页
- [ ] 移动端 - 扫码
- [ ] 移动端 - 设备操作（4 大功能）
- [ ] 移动端 - 点检录入
- [ ] 移动端 - 个人中心

### 核心业务规则测试 ⭐

- [ ] L1 故障禁止作业
- [ ] L2/L3 故障确认后允许作业
- [ ] 维保状态禁止作业
- [ ] 前后端双重验证
- [ ] 状态流转约束

---

## 🐛 问题记录

### 问题模板

| 问题 ID | 问题描述 | 严重程度 | 状态 | 备注 |
|---------|----------|----------|------|------|
| BUG-001 | 问题描述 | 高/中/低 | 待修复/已修复 | - |

---

## ✅ 测试完成标准

1. **所有 P0 功能测试通过**
   - 登录功能
   - 设备状态变更
   - 点检录入
   - 故障等级检查

2. **核心业务规则验证通过**
   - L1 故障禁止作业
   - L2/L3 故障确认后允许
   - 维保状态禁止作业

3. **无严重 Bug**
   - 无崩溃性问题
   - 无数据丢失问题
   - 无安全漏洞

4. **用户体验良好**
   - 操作流畅
   - 提示清晰
   - 响应及时

---

## 📝 测试报告模板

### 测试概况

- **测试日期**: 2026-03-06
- **测试人员**: @kyeo-hub
- **测试版本**: v1.5
- **测试范围**: H5 移动端核心功能 + 后端 API

### 测试结果

| 测试类型 | 总数 | 通过 | 失败 | 通过率 |
|----------|------|------|------|--------|
| 后端 API | 12 | - | - | -% |
| 前端功能 | 9 | - | - | -% |
| 业务规则 | 4 | - | - | -% |
| **总计** | **25** | **-** | **-** | **-%** |

### 发现问题

| ID | 问题描述 | 严重程度 | 状态 |
|----|----------|----------|------|
| - | - | - | - |

### 测试结论

- [ ] ✅ 通过，可以发布
- [ ] ⚠️ 有条件通过，需修复问题后发布
- [ ] ❌ 不通过，需修复后重新测试

---

**测试版本**: v1.5
**测试日期**: 2026-03-06
**测试人员**: @kyeo-hub

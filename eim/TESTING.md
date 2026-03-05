# EIM 系统测试指南

> Equipment Inspection & Operation Management System
> 测试指南和步骤说明

---

## 🚀 服务启动状态

### 后端服务
- **状态**: ✅ 运行中
- **地址**: http://localhost:8080
- **健康检查**: http://localhost:8080/health

### 前端服务
- **状态**: ✅ 运行中
- **地址**: http://localhost:3000
- **管理后台**: http://localhost:3000/admin
- **大屏展示**: http://localhost:3000/dashboard
- **H5 移动端**: http://localhost:3000/mobile

---

## 📋 测试步骤

### 1. 访问系统首页

打开浏览器访问：http://localhost:3000

系统会自动跳转到登录页。

### 2. 登录系统

**默认账号**:
- 用户名：`admin`
- 密码：`admin123`

访问登录页：http://localhost:3000/login

### 3. 管理后台功能测试

访问管理后台：http://localhost:3000/admin

#### 3.1 工作台
- ✅ 查看设备统计卡片（总数、作业中、待命、故障）
- ✅ 查看今日点检进度
- ✅ 查看异常率统计
- ✅ 查看设备列表

#### 3.2 设备管理
访问：http://localhost:3000/admin/equipment

**测试项目**:
1. 查看设备列表（分页、筛选）
2. 新增设备
   - 设备编号：MQ40-05
   - 设备名称：40 吨门机 M5
   - 设备类型：门式起重机
   - 使用单位：外贸码头
   - 安装位置：5#泊位
3. 编辑设备信息
4. 删除设备（带确认）

#### 3.3 大屏展示
访问：http://localhost:3000/dashboard

**测试项目**:
- ✅ 深色主题展示
- ✅ 设备总数统计
- ✅ 作业中设备列表
- ✅ 故障设备列表
- ✅ 点检进度展示
- ✅ 30 秒自动刷新

### 4. H5 移动端功能测试

#### 4.1 移动端首页
访问：http://localhost:3000/mobile

**测试项目**:
- ✅ 统计卡片显示
- ✅ 扫码点检入口
- ✅ 快捷操作按钮

> 💡 提示：使用浏览器开发者工具的移动设备模式测试

#### 4.2 扫码功能
访问：http://localhost:3000/mobile/scan

**测试项目**:
1. 点击"开始扫码"启动摄像头
2. 对准设备二维码
3. 扫码成功后跳转设备操作页

**手动输入测试**:
1. 点击"手动输入设备编号"
2. 输入设备编号：MQ40
3. 跳转设备操作页

#### 4.3 设备操作页面
访问：http://localhost:3000/mobile/equipment/MQ40

**测试项目**:
1. 查看设备信息
2. 点击"变更状态"
3. 选择状态（作业/待命/维保/故障）
4. 填写作业信息（船名、货品）
5. 选择故障等级（如选择故障状态）
6. 提交状态变更

#### 4.4 点检录入
访问：http://localhost:3000/mobile/inspection/new?equipmentId=1

**测试项目**:
1. 选择班次（班前/班中/交班）
2. 输入点检人姓名
3. 逐项点检（正常/异常/跳过）
4. 异常项填写备注
5. 填写问题记录
6. 点击"点击签名"进行电子签名
7. 提交点检记录

---

## 🧪 API 接口测试

### 使用 curl 测试

#### 1. 健康检查
```bash
curl http://localhost:8080/health
```

#### 2. 用户登录
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

保存返回的 token 到环境变量：
```bash
TOKEN="返回的 token"
```

#### 3. 获取设备列表
```bash
curl -X GET "http://localhost:8080/api/equipments?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN"
```

#### 4. 获取设备详情
```bash
curl -X GET "http://localhost:8080/api/equipments/1" \
  -H "Authorization: Bearer $TOKEN"
```

#### 5. 创建设备
```bash
curl -X POST http://localhost:8080/api/equipments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "MQ40-05",
    "name": "40 吨门机 M5",
    "type": "门式起重机",
    "company": "外贸码头",
    "location": "5#泊位",
    "latitude": 30.12345678,
    "longitude": 114.87654324,
    "inspection_enabled": true,
    "inspection_frequency": "daily"
  }'
```

#### 6. 更新设备状态
```bash
curl -X PUT "http://localhost:8080/api/equipments/1/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "working",
    "ship_name": "长航 5 号",
    "cargo_name": "铁矿石"
  }'
```

#### 7. 获取点检标准
```bash
curl -X GET "http://localhost:8080/api/standards?equipment_type=门式起重机" \
  -H "Authorization: Bearer $TOKEN"
```

#### 8. 提交点检记录
```bash
curl -X POST http://localhost:8080/api/inspections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipment_id": 1,
    "inspection_date": "2026-03-05",
    "shift": "before",
    "inspector_name": "张三",
    "details": [
      {
        "standard_id": 1,
        "part_name": "起升机构",
        "item_name": "电动机",
        "result": "normal",
        "remark": ""
      }
    ],
    "problems_found": "",
    "problems_handled": "",
    "legacy_issues": ""
  }'
```

#### 9. 获取统计信息
```bash
# 日报
curl -X GET "http://localhost:8080/api/stats/daily" \
  -H "Authorization: Bearer $TOKEN"

# 周报
curl -X GET "http://localhost:8080/api/stats/weekly" \
  -H "Authorization: Bearer $TOKEN"

# 月报
curl -X GET "http://localhost:8080/api/stats/monthly?year=2026&month=3" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📱 移动端测试提示

### 浏览器开发者工具
1. 打开 Chrome/Edge 浏览器
2. 按 F12 打开开发者工具
3. 点击设备切换按钮（Ctrl+Shift+M）
4. 选择设备型号（如 iPhone 12 Pro）

### 测试场景
1. **扫码测试**: 需要摄像头权限，允许浏览器访问摄像头
2. **拍照测试**: 需要摄像头权限
3. **电子签名**: 使用鼠标或触摸板模拟手指签名
4. **响应式测试**: 测试不同屏幕尺寸的显示效果

---

## ✅ 测试检查清单

### 后端 API
- [ ] 健康检查接口
- [ ] 用户登录接口
- [ ] 设备 CRUD 接口
- [ ] 设备状态更新接口
- [ ] 点检标准查询接口
- [ ] 点检记录提交接口
- [ ] 统计接口

### Web 管理后台
- [ ] 登录页面
- [ ] 管理工作台
- [ ] 设备管理页面
- [ ] 大屏展示页面

### H5 移动端
- [ ] 移动端首页
- [ ] 扫码页面
- [ ] 设备操作页面
- [ ] 点检录入页面
- [ ] 电子签名功能

---

## 🐛 常见问题

### 1. 登录失败
**问题**: 返回"用户名或密码错误"
**解决**: 确认数据库中的密码哈希正确，使用默认密码 admin123

### 2. Token 无效
**问题**: 返回"无效的 token"
**解决**: 重新登录获取新 token，检查 Authorization header 格式

### 3. 扫码失败
**问题**: 无法启动摄像头
**解决**: 
- 检查浏览器摄像头权限
- 使用 HTTPS 或 localhost 访问
- 确保设备有摄像头

### 4. 前端页面空白
**问题**: 页面加载后空白
**解决**: 
- 检查浏览器控制台错误
- 确认后端服务已启动
- 清除浏览器缓存

---

## 📊 测试数据

### 默认管理员账号
- 用户名：admin
- 密码：admin123

### 种子设备数据
1. MQ40 - 40 吨门机 M1（外贸码头，1#泊位）
2. MQ40-02 - 40 吨门机 M2（外贸码头，2#泊位）
3. MQ40-03 - 40 吨门机 M3（外贸码头，3#泊位）
4. MQ40-04 - 40 吨门机 M4（外贸码头，4#泊位）

### 点检标准
- 门式起重机：30 条点检标准

---

**最后更新**: 2026-03-05
**版本**: v1.0

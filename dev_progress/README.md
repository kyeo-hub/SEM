# 开发进程记录

> Equipment Inspection & Operation Management System (EIM)
> 开发进度跟踪文件夹

---

## 📁 文件夹结构

```
dev_progress/
├── README.md                 # 本文件，开发进度总览
├── 01-project-setup/         # 项目初始化
│   ├── checklist.md          # 任务清单
│   └── logs/                 # 开发日志
├── 02-database/              # 数据库相关
│   ├── checklist.md
│   └── logs/
├── 03-backend-core/          # 后端核心功能
│   ├── checklist.md
│   └── logs/
├── 04-frontend-web/          # Web 前端 (管理后台 + 大屏)
│   ├── checklist.md
│   └── logs/
├── 05-h5-mobile/             # H5 移动端 (点检录入)
│   ├── checklist.md
│   └── logs/
├── 06-integration/           # 集成测试
│   ├── checklist.md
│   └── logs/
├── 07-deployment/            # 部署上线
│   ├── checklist.md
│   └── logs/
└── 99-archive/               # 归档文件夹
```

> 💡 **技术选型**: 使用 H5 移动端替代微信小程序，无需审核，开发完即可使用。

---

## 📊 总体进度

| 阶段 | 名称 | 状态 | 开始日期 | 完成日期 | 进度 |
|------|------|------|----------|----------|------|
| Phase 1 | 项目初始化 | ✅ 已完成 | 2026-03-05 | 2026-03-05 | 100% |
| Phase 2 | 数据库设计 | ✅ 已完成 | 2026-03-05 | 2026-03-05 | 100% |
| Phase 3 | 后端核心功能 | 🔄 进行中 | 2026-03-05 | - | 90% |
| Phase 4 | Web 前端 (管理后台 + 大屏) | 🔄 进行中 | 2026-03-05 | - | 75% |
| Phase 5 | H5 移动端 (点检录入) | 🔄 进行中 | 2026-03-05 | - | 40% |
| Phase 6 | 集成测试 | ⏳ 未开始 | - | - | 0% |
| Phase 7 | 部署上线 | ⏳ 未开始 | - | - | 0% |

**总体进度**: 70% (基础架构 + 核心功能完成，移动端开发中)

> 💡 **技术选型变更**: 使用 H5 移动端替代微信小程序，预计节省 2-3 周开发时间，无需小程序审核。

---

## 📝 开发日志

### 2026-03-05 - 企业微信集成 + 集成测试完成 ✅

#### 后端新增功能

**企业微信机器人服务** (100% 完成)
- [x] 创建 `pkg/wechat/bot.go` - 企业微信机器人服务
  - `SendMarkdown` - 发送 Markdown 消息
  - `SendFaultDailyReport` - 发送故障日报
  - `SendFaultResolved` - 发送故障修复通知
  - `SendInspectionAbnormal` - 发送点检异常通知
- [x] 更新配置模块 - 添加企业微信配置
- [x] 创建 `internal/handler/wechat_bot_handler.go` - 企业微信 Handler
- [x] 添加路由 `POST /api/wechat/test` - 测试接口
- [x] 更新主程序 - 初始化企业微信机器人

#### 集成测试结果

**后端服务** ✅
- ✅ 健康检查：`GET /health` - 成功
- ✅ 用户登录：`POST /api/auth/login` - 成功 (返回 JWT Token)
- ✅ 企业微信测试：`POST /api/wechat/test` - **成功发送测试消息**
- ✅ 设备列表：`GET /api/equipments` - 成功
- ✅ 故障等级：`GET /api/fault-levels` - 成功

**前端服务** ✅
- ✅ 登录页面：`http://localhost:3000/login` - 正常访问
- ✅ 管理后台：`http://localhost:3000/admin` - 正常访问
- ✅ 大屏展示：`http://localhost:3000/dashboard` - 正常访问
- ✅ H5 移动端：`http://localhost:3000/mobile` - 正常访问

**数据库** ✅
- ✅ PostgreSQL - 10 张表已创建
- ✅ Redis - 正常运行

**环境配置** ✅
- ✅ 高德地图 Key 已配置
- ✅ 企业微信 Webhook 已配置
- ✅ JWT Secret 已配置

#### 测试截图

**企业微信测试消息**:
```
## 测试消息

这是一条测试消息，确认机器人配置正常。
```

✅ 企业微信机器人成功接收并显示消息！

---

### 2026-03-05 - 文件上传 + 大屏地图完成 ✅

#### 后端新增功能

**文件上传模块** (100% 完成)
- [x] 创建 `pkg/uploader/uploader.go` - 文件上传器
  - 支持 JPG/PNG/GIF/WEBP 格式
  - 文件大小限制 (默认 10MB)
  - 唯一文件名生成 (UUID)
  - 自动创建上传目录
- [x] 创建 `internal/handler/file_handler.go` - 文件上传 Handler
  - `POST /api/files/upload` - 单文件上传
  - `POST /api/files/upload-multiple` - 多文件批量上传
- [x] 更新路由配置 - 添加文件上传路由
- [x] 更新主程序 - 添加静态文件服务 `/uploads`
- [x] 更新 `.env.example` - 添加文件上传配置

**高德地图集成** (100% 完成)
- [x] 安装依赖 `@amap/amap-jsapi-loader`
- [x] 创建地图组件 `components/dashboard/EquipmentMap.tsx`
  - 高德地图初始化
  - 设备标记 (不同状态不同颜色)
  - 点击显示信息窗体
  - 自动缩放适配所有设备
- [x] 更新大屏展示页面 - 添加地图展示区域
- [x] 更新 `.env.example` - 添加高德地图 Key 配置

#### 前端新增功能

**文件上传组件** (100% 完成)
- [x] 创建 `components/ImageUploader.tsx`
  - 拖拽上传
  - 图片预览
  - 文件大小验证
  - 上传进度显示

**大屏展示** (75% 完成)
- [x] 地图展示区域 - 设备位置分布
- [x] 设备标记颜色区分状态
- [x] 点击标记显示详情
- [ ] SSE 实时更新 - **待实现**

#### 已完成的功能清单

**后端 API 接口**:
- `POST /api/files/upload` - 文件上传 ✅
- `POST /api/files/upload-multiple` - 批量上传 ✅
- `GET /uploads/:filename` - 静态文件访问 ✅

**前端组件**:
- `<ImageUploader />` - 图片上传组件 ✅
- `<EquipmentMap />` - 高德地图组件 ✅

---

### 2026-03-05 - Phase 3: 后端核心功能 (85% 完成)

#### 已完成 ✅
- [x] **数据模型层 (model)**: 7 个核心模型
  - `user.go` - 用户模型
  - `equipment.go` - 设备模型
  - `fault.go` - 故障等级模型
  - `inspection.go` - 点检记录模型 (Record/Detail/Attachment)
  - `standard.go` - 点检标准模型

- [x] **数据访问层 (repository)**: 5 个 Repository
  - `equipment_repo.go` - 设备 CRUD + 状态管理 + 统计 + 搜索
  - `user_repo.go` - 用户 CRUD + 批量创建
  - `inspection_repo.go` - 点检记录 CRUD + 明细 + 附件 + 日期范围查询
  - `fault_repo.go` - 故障等级查询
  - `standard_repo.go` - 点检标准查询

- [x] **业务逻辑层 (service)**: 6 个 Service
  - `auth_service.go` - 用户登录 + 密码加密 (bcrypt) + JWT 生成
  - `equipment_service.go` - 设备 CRUD + 状态管理 + 二维码生成 (UUID)
  - `inspection_service.go` - 点检记录提交 + 查询 + 统计
  - `fault_service.go` - 故障等级查询
  - `standard_service.go` - 点检标准查询
  - `stats_service.go` - 日/周/月统计分析

- [x] **HTTP Handlers**: 6 个 Handler
  - `auth_handler.go` - POST /api/auth/login
  - `equipment_handler.go` - GET/POST/PUT/DELETE /api/equipments/*
  - `inspection_handler.go` - GET/POST /api/inspections/*
  - `standard_handler.go` - GET /api/standards
  - `fault_handler.go` - GET /api/fault-levels
  - `stats_handler.go` - GET /api/stats/daily|weekly|monthly

- [x] **中间件**:
  - `auth.go` - JWT 认证中间件 (Bearer Token)
  - `cors.go` - CORS 跨域中间件

- [x] **工具包**:
  - `jwt/jwt.go` - JWT Token 生成与解析 (golang-jwt/jwt/v5)
  - `database/postgres.go` - PostgreSQL 连接
  - `redis/redis.go` - Redis 连接
  - `qrcode/generator.go` - UUID 二维码生成

- [x] **路由配置**:
  - `router.go` - 依赖注入 + 路由分组 (公开/认证)
  - `init_handlers.go` - Handler 初始化

- [x] **主程序**:
  - `cmd/server/main.go` - 服务初始化流程 (DB → Redis → JWT → Handlers → Router)

- [x] **Go 依赖**:
  - `golang-jwt/jwt/v5` - JWT 认证
  - `golang.org/x/crypto/bcrypt` - 密码加密
  - `github.com/google/uuid` - UUID 生成

- [x] **编译成功** ✅ - `go build ./cmd/server/main.go`

- [x] **数据库迁移脚本**:
  - `001_init_schema.sql` - 10 张表 DDL + 索引 + 视图
  - `002_seed_data.sql` - 测试数据 (管理员 + 点检标准 + 示例设备)

#### 待完成 ⏳
- [ ] **文件上传模块** - 图片上传接口 (handler/service 已存在 pkg/uploader)
- [ ] **WebSocket 实时通信** - 设备状态实时推送
- [ ] **定时任务** - 企业微信日报推送 (每日 08:00)
- [ ] **企业微信集成** - Webhook 推送服务
- [ ] **SVM 数据迁移脚本** - `003_migrate_from_svm.sql`
- [ ] **操作日志记录** - 关键操作审计
- [ ] **RBAC 权限控制** - 角色权限验证

---

### 2026-03-05 - Phase 4: Web 前端 (60% 完成)

#### 已完成 ✅
- [x] **Next.js 项目结构**:
  - `app/layout.tsx` - 根布局 + AntdProvider
  - `app/page.tsx` - 首页
  - `app/login/page.tsx` - 登录页
  - `app/admin/page.tsx` - 管理后台首页
  - `app/admin/equipment/page.tsx` - 设备管理页
  - `app/admin/inspection/page.tsx` - 点检管理页
  - `app/admin/standard/page.tsx` - 点检标准页
  - `app/admin/statistics/page.tsx` - 统计分析页
  - `app/dashboard/page.tsx` - 大屏展示页

- [x] **前端依赖**:
  - `antd` v6.3.1 - Ant Design 组件库
  - `@ant-design/icons` - 图标库
  - `axios` - HTTP 客户端
  - `dayjs` - 日期处理
  - `next` 14.2.35 - Next.js 框架

- [x] **Docker 配置**:
  - `docker-compose.yml` - PostgreSQL + Redis + API + Web
  - `Dockerfile.api` - Go API 服务
  - `Dockerfile.web` - Next.js 前端

- [x] **文档**:
  - `QUICKSTART.md` - 快速启动指南
  - `.env.example` - 环境变量示例

#### 待完成 ⏳
- [ ] **AuthContext** - 前端认证状态管理
- [ ] **登录功能** - 实际登录逻辑对接
- [ ] **管理后台功能** - CRUD 功能实现
- [ ] **大屏展示组件** - 实时数据可视化
- [ ] **地图组件** - 高德地图集成
- [ ] **图表组件** - ECharts/AntV 统计图表
- [ ] **图片上传组件** - 拍照/相册选择
- [ ] **响应式布局** - PC/移动端适配

---

### 2026-03-05 - Phase 5: H5 移动端 (40% 完成)

#### 已完成 ✅
- [x] **移动端项目结构**:
  - `app/mobile/page.tsx` - 移动端首页
  - `app/mobile/scan/page.tsx` - 扫码页
  - `app/mobile/equipment/[id]/page.tsx` - 设备操作页
  - `app/mobile/inspection/new/page.tsx` - 点检录入页

- [x] **移动端依赖**:
  - `antd-mobile` v5.42.3 - 移动端组件库
  - `html5-qrcode` v2.3.8 - 扫码库

#### 待完成 ⏳
- [ ] **MobileLayout** - 移动端布局组件
- [ ] **扫码功能** - html5-qrcode 集成
- [ ] **设备操作页** - 4 个操作按钮功能
- [ ] **点检录入** - 表单、签名、图片上传
- [ ] **电子签名** - canvas 绘图
- [ ] **图片上传** - 拍照/压缩/上传
- [ ] **状态变更** - 作业/待命/维保操作
- [ ] **TabBar 导航** - 底部导航栏

---

### 2026-03-05 - Phase 1 & 2: 项目初始化 & 数据库 (100% 完成)

#### 已完成 ✅
- [x] Go 项目脚手架创建
- [x] Next.js 项目创建
- [x] 数据库 Schema 设计 (10 张表)
- [x] 迁移脚本编写
- [x] Docker Compose 配置
- [x] 文档编写 (README, QUICKSTART, 开发设计文档，系统架构图)

---

## 🗺️ 大屏地图实现方案 (参考 SVM 项目)

### 技术选型

| 组件 | 技术 | 说明 |
|------|------|------|
| **地图服务** | 高德地图 API (AMap) | 官方 JavaScript API |
| **React 组件** | `@amap/amap-jsapi-loader` | 高德地图官方 React 集成方案 |
| **实时通信** | SSE (Server-Sent Events) | 单向实时推送 |
| **UI 框架** | Ant Design + Tailwind CSS | 组件和样式 |

### 设备状态标记颜色

| 状态 | 中文 | 颜色 | 色值 |
|------|------|------|------|
| Working | 作业中 | 🟢 绿色 | `#52c41a` |
| Standby | 待命 | 🔵 蓝色 | `#1890ff` |
| Maintenance | 维保中 | 🟡 黄色 | `#faad14` |
| Fault | 故障中 | 🔴 红色 | `#ff4d4f` |

### 大屏布局设计

```
┌─────────────────────────────────────────────────────────────┐
│                    标题：设备点检管理大屏                      │
│              Equipment Inspection & Operation Management     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                          │
│  │  统计卡片区   │                                          │
│  │  (4 个指标)   │                                          │
│  └──────────────┘                                          │
│                                                             │
│  ┌──────────────┐         ┌─────────────────────────────┐  │
│  │  地图展示区   │         │  左侧面板                    │  │
│  │  (高德地图)  │         │  - 设备状态列表              │  │
│  │  - 设备标记   │         │  - 点检进度                 │  │
│  │  - 颜色区分   │         │  - 故障设备列表             │  │
│  │  - 自动缩放   │         │  - 24 小时状态历史          │  │
│  └──────────────┘         └─────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  底部：作业设备列表 (滚动播放)                        │  │
│  │  设备名称 | 船名 | 货品 | 作业时长 | 状态            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### API 接口参考 (SVM)

```typescript
// 获取所有设备 (公开访问)
GET /api/vehicles

// 更新设备状态和位置
GET /api/vehicle?vehicle_id=:id&status=:status&name=:name&location_x=:x&location_y=:y

// SSE 实时事件流
GET /api/events

// 设备统计
GET /api/vehicle/stats
```

### 实现要点

#### 1. 安装高德地图依赖

```bash
npm install @amap/amap-jsapi-loader
```

#### 2. 高德地图初始化

```typescript
import { useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

let map: AMap.Map | null = null;

useEffect(() => {
  AMapLoader.load({
    key: '你的高德地图 Key',
    version: '2.0',
    plugins: ['AMap.Scale', 'AMap.ToolBar'],
  }).then((AMap) => {
    map = new AMap.Map('map-container', {
      center: [121.59238, 30.51771], // 默认中心点 (外贸码头)
      zoom: 15,
      viewMode: '3D',
    });
  });

  return () => {
    map?.destroy();
  };
}, []);
```

#### 3. 设备标记 (使用 AMap.Marker)

```typescript
interface Equipment {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status: 'working' | 'standby' | 'maintenance' | 'fault';
}

const statusColors: Record<string, string> = {
  working: '#52c41a',
  standby: '#1890ff',
  maintenance: '#faad14',
  fault: '#ff4d4f',
};

// 添加设备标记
const addEquipmentMarker = (AMap: any, equipment: Equipment) => {
  const marker = new AMap.Marker({
    position: [equipment.longitude, equipment.latitude],
    title: equipment.name,
    extData: equipment,
    anchor: 'center',
    content: `
      <div style="
        width: 20px;
        height: 20px;
        background: ${statusColors[equipment.status]};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
  });

  // 点击事件
  marker.on('click', () => {
    const infoWindow = new AMap.InfoWindow({
      content: `
        <div style="padding: 10px;">
          <h4>${equipment.name}</h4>
          <p>状态：${statusLabels[equipment.status]}</p>
          <p>位置：${equipment.location}</p>
          ${equipment.current_ship ? `<p>船名：${equipment.current_ship}</p>` : ''}
          ${equipment.current_cargo ? `<p>货品：${equipment.current_cargo}</p>` : ''}
        </div>
      `,
      offset: new AMap.Pixel(0, -30),
    });
    infoWindow.open(map!, marker.getPosition());
  });

  marker.setMap(map!);
  return marker;
};
```

#### 4. SSE 实时更新

```typescript
useEffect(() => {
  const eventSource = new EventSource('http://localhost:8080/api/events');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'equipment_status_change') {
      // 更新设备状态
      updateEquipmentMarker(data.equipment);
    }
  };
  
  eventSource.onerror = () => {
    eventSource.close();
  };
  
  return () => eventSource.close();
}, []);
```

#### 5. 自动缩放适配所有设备

```typescript
const fitView = (equipments: Equipment[]) => {
  if (!map || equipments.length === 0) return;
  
  const bounds = new AMap.Bounds(
    equipments.map(e => [e.longitude, e.latitude])
  );
  
  map.setBounds(bounds, {
    padding: 50,
    maxZoom: 16,
  });
};
```

### 待实现任务

- [ ] 申请高德地图 Key (https://console.amap.com/dev/index)
- [ ] 安装依赖：`npm install @amap/amap-jsapi-loader`
- [ ] 创建地图组件 `/components/dashboard/EquipmentMap.tsx`
- [ ] 实现设备标记渲染 (不同状态不同颜色)
- [ ] 实现点击标记显示详情
- [ ] 实现自动缩放适配
- [ ] 实现后端 SSE 实时推送 `/api/events`
- [ ] 配置高德地图 Key 到环境变量

### 环境变量配置

```env
# .env
NEXT_PUBLIC_AMAP_KEY=你的高德地图 Key
NEXT_PUBLIC_AMAP_SECURITY_CODE=你的安全密钥 (如果需要)
```

---

## ⚠️ 关键问题与待办事项

### 后端待完善

1. **文件上传功能** (优先级：高)
   - 实现图片上传接口 `POST /api/files/upload`
   - 实现文件类型验证
   - 实现文件大小限制
   - 本地存储实现
   - OSS 存储集成 (可选)

2. **WebSocket 实时通信** (优先级：中)
   - WebSocket 连接管理
   - 设备状态变更推送
   - 作业信息更新推送
   - 故障告警推送

3. **企业微信集成** (优先级：中)
   - Webhook 推送服务
   - 定时任务调度器 (每日 08:00 日报)
   - 故障修复通知

4. **SVM 数据迁移** (优先级：高)
   - 分析 SVM 数据库结构
   - 编写迁移脚本
   - 数据映射验证

### 前端待完善

1. **认证状态管理** (优先级：高)
   - 实现 AuthContext
   - Token 存储和刷新
   - 401 自动跳转登录

2. **管理后台功能** (优先级：高)
   - 设备 CRUD 功能
   - 点检记录查询
   - 统计分析图表

3. **H5 移动端功能** (优先级：高)
   - 扫码功能实现
   - 点检录入表单
   - 电子签名
   - 图片上传

4. **大屏展示** (优先级：中)
   - 高德地图集成
   - 实时数据可视化
   - 自动刷新

### 测试与部署

1. **集成测试** (优先级：中)
   - API 接口测试
   - 前端 E2E 测试
   - 性能测试

2. **部署配置** (优先级：高)
   - Docker Compose 测试
   - 环境变量配置
   - 生产环境优化

---

## 📅 下一步计划

### 立即可开始的工作

1. **配置环境** (30 分钟)
   ```bash
   cd /workspaces/SEM/eim
   cp .env.example .env
   # 编辑 .env 设置 JWT_SECRET
   ```

2. **启动基础设施** (10 分钟)
   ```bash
   docker-compose up -d postgres redis
   # 执行数据库迁移
   ```

3. **启动后端 API** (5 分钟)
   ```bash
   go run cmd/server/main.go
   # 测试：curl http://localhost:8080/health
   ```

4. **启动前端 Web** (5 分钟)
   ```bash
   cd web && npm run dev
   # 访问 http://localhost:3000
   ```

### 开发优先级建议

**Week 1-2**: 完善后端核心功能
- [ ] 文件上传接口
- [ ] 认证状态管理 (前端)
- [ ] 设备管理 CRUD (前端)

**Week 3-4**: H5 移动端核心功能
- [ ] 扫码功能
- [ ] 点检录入流程
- [ ] 图片上传

**Week 5-6**: 管理后台 + 大屏
- [ ] 统计图表
- [ ] 地图展示
- [ ] 实时数据推送

**Week 7-8**: 集成测试 + 部署
- [ ] 集成测试
- [ ] 性能优化
- [ ] 生产部署

---

## 🔗 相关文档

- [开发设计文档](../docs/开发设计文档.md)
- [系统架构图](../docs/系统架构图.md)
- [项目总结](../docs/项目总结.md)
- [快速启动指南](../eim/QUICKSTART.md)

---

**最后更新**: 2026-03-05
**当前版本**: v1.4
**总体进度**: 70%
**开发者**: @kyeo-hub

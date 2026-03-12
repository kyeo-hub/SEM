# EIM - 设备管理系统

> **Equipment Inspection & Operation Management System**
> 基于 Go + Next.js + H5 移动端的设备管理与运营管理系统
> **当前版本**: v2.3 | **最后更新**: 2026-03-09 | **总体进度**: 92%

---

## 项目简介

本项目是武汉钢铁集团物流有限公司的设备管理系统，用于将传统纸质点检本电子化，实现设备管理、状态监控、故障管理、作业跟踪的完整数字化流程。

### 核心功能

| 功能模块 | 说明 | 状态 |
|----------|------|------|
| 📋 **点检管理** | 班前/班中/交班点检，支持图片上传、电子签名 | ✅ |
| 🔧 **设备管理** | 设备台账、状态管理 (作业/待命/维修/故障) | ✅ |
| ⚠️ **故障分级** | L1 严重/L2 一般/L3 轻微，支持带病作业判定 | ✅ |
| 🚢 **作业跟踪** | 船名、货品名称实时登记，大屏展示 | ✅ |
| 📊 **统计分析** | 日报/周报/月报，ECharts 图表展示 | ✅ |
| 📱 **H5 移动端** | 手机浏览器扫码、状态变更、维保登记 | ✅ |
| 🖥️ **大屏展示** | 高德地图设备分布、实时状态 | ✅ |
| 💬 **企业微信** | 故障日报定时推送、维修完成通知 | ✅ |
| 👥 **用户管理** | 用户 CRUD、角色权限分配 | ✅ |

---

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                │
│  Web 管理后台    大屏展示    H5 移动端                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare / Caddy                         │
│                  (反向代理 + SSL 终止)                         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    Next.js :3000        │     │      Go API :8080       │
│  管理后台 + 大屏 + H5     │     │   业务逻辑 + WebSocket   │
└─────────────────────────┘     └─────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
          │   PostgreSQL    │   │      Redis      │   │   文件存储       │
          │   主数据库       │   │   缓存/会话      │   │  /uploads/OSS   │
          └─────────────────┘   └─────────────────┘   └─────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go 1.21+ + Gin + GORM |
| 前端 | Next.js 14+ + Ant Design + Ant Design Mobile |
| 移动端 | H5 (Next.js 响应式设计) + html5-qrcode |
| 数据库 | PostgreSQL 15+ |
| 缓存 | Redis 7+ |
| 地图 | 高德地图 |
| 部署 | Docker + Docker Compose |

---

## 项目结构

```
eim/
├── cmd/                    # 程序入口
│   ├── server/             # API 服务
│   └── migrate/            # 数据库迁移
├── internal/               # 内部包
│   ├── handler/            # HTTP Handlers
│   ├── service/            # 业务逻辑
│   ├── repository/         # 数据访问
│   ├── model/              # 数据模型
│   ├── middleware/         # 中间件
│   └── router/             # 路由
├── pkg/                    # 公共包
│   ├── database/           # 数据库连接
│   ├── redis/              # Redis 客户端
│   ├── jwt/                # JWT 工具
│   ├── qrcode/             # 二维码生成
│   └── wechat/             # 企业微信集成
├── web/                    # Next.js 前端 (PC + H5)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (admin)/    # 管理后台
│   │   │   ├── (dashboard)/# 大屏展示
│   │   │   └── (mobile)/   # H5 移动端
│   │   ├── components/     # 组件
│   │   └── lib/            # 工具
│   └── package.json
├── migrations/             # 数据库迁移脚本
├── docker/                 # Docker 配置
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── docker-compose.yml
├── docs/                   # 文档
│   ├── 开发设计文档.md
│   └── 系统架构图.md
└── .env.example            # 环境变量示例
```

---

## 快速开始

### 环境要求

- Go 1.21+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (推荐)

### Docker Compose 启动

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 修改配置
vim .env  # 修改数据库密码、JWT 密钥等

# 3. 启动服务
docker-compose up -d

# 4. 初始化数据库
docker-compose run --rm api ./eim migrate up

# 5. 查看日志
docker-compose logs -f
```

### 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| Web 前端 | http://localhost:3000 | 管理后台 + 大屏 |
| API | http://localhost:8080 | REST API |
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |

---

## 核心业务流程

### 扫码操作流程

```
扫描设备二维码
       │
       ▼
H5 移动端设备操作页 (手机浏览器)
       │
       ▼
┌──────┴──────┬──────────┬──────────┬──────────┐
▼             ▼          ▼          ▼
🟢 作业       🔵 待命     📋 点检     🔧 维保
开始作业       结束作业    点检录入    维保登记
填写船名       确认时长    选择班次    类型/内容
货品名称                  点检表单    故障等级
```

### 人员管理方案

**简化的人员管理**：

1. 管理后台批量生成账号密码 (支持 Excel 导入)
2. 点检员手机浏览器访问 → 输入账号密码 → 记住登录 (7 天)
3. 点击扫码按钮 → 调用摄像头 → 解析设备 UUID

### 故障报告流程

| 场景 | 路径 |
|------|------|
| 点检异常 | 点检录入 → 某项异常 → 填写故障等级 → 提交 |
| 维保故障 | 维保登记 → 故障维修 → 选择故障等级 → 提交 |
| 作业中发现 | 扫码 → 维保 → 故障维修 → 填写信息 |
| 故障修复 | 扫码 → 维保 → 维修完成 → 推送企微 |

---

## 文档

- [开发设计文档](./docs/开发设计文档.md) - 完整的系统设计文档
- [系统架构图](./docs/系统架构图.md) - Mermaid 架构图

---

## API 接口

### 认证模块
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户

### 设备管理
- `GET /api/equipments` - 设备列表
- `GET /api/equipments/:id` - 设备详情
- `POST /api/equipments` - 创建设备
- `PUT /api/equipments/:id` - 更新设备
- `GET /api/equipments/:id/qrcode` - 获取二维码

### 设备状态
- `PUT /api/equipments/:id/status` - 更新状态
- `PUT /api/equipments/:id/fault-level` - 设置故障等级
- `PUT /api/equipments/:id/operation` - 更新作业信息

### 检查管理
- `GET /api/inspections` - 检查记录列表
- `POST /api/inspections` - 提交检查记录
- `GET /api/inspections/today` - 今日检查情况
- `POST /api/inspections/:id/attachments` - 上传附件

### 统计分析
- `GET /api/stats/daily` - 日报
- `GET /api/stats/weekly` - 周报
- `GET /api/stats/monthly` - 月报
- `GET /api/stats/fault-analysis` - 故障分析

---

## 企业微信集成

### 推送场景

| 场景 | 时间 | 内容 |
|------|------|------|
| 故障设备日报 | 每日 08:00 | 当前故障设备列表 |
| 故障修复通知 | 实时 | 维修完成通知 |

### 配置方式

```bash
# .env
WECHAT_BOT_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
WECHAT_BOT_ENABLED=true
WECHAT_BOT_DAILY_TIME=0 8 * * *  # Cron 表达式
```

---

## SVM 数据迁移

如从 SVM 项目迁移数据：

```bash
# 运行迁移工具
go run cmd/migrate/main.go --from-svm \
  --svm-db="postgres://user:pass@host/svm_db" \
  --eim-db="postgres://user:pass@host/eim_db"

# 生成迁移报告
go run cmd/migrate/main.go report
```

---

## 开发计划

| 阶段 | 时间 | 内容 |
|------|------|------|
| Phase 1 | Week 1-2 | 基础框架搭建 (Go + Next.js) |
| Phase 2 | Week 3-4 | 设备管理核心功能 |
| Phase 3 | Week 5-6 | 检查管理核心功能 |
| Phase 4 | Week 7 | 统计分析 + 企业微信 |
| Phase 5 | Week 8 | SVM 数据迁移 |
| Phase 6 | Week 9-10 | Web 前端开发 (管理后台 + 大屏 + H5) |
| **总计** | **10 周** | **比原计划 (14 周) 节省 4 周，无需小程序审核** |

---

## License

MIT License

---

**武汉钢铁集团物流有限公司** © 2026

**技术选型变更**: v1.2 使用 H5 移动端替代微信小程序，无需审核，开发完即可使用。

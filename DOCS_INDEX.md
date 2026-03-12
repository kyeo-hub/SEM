# EIM 项目文档索引

> Equipment Inspection & Operation Management System
> 最后更新：2026-03-09

---

## 📋 核心文档

### 项目总览
| 文档 | 路径 | 说明 |
|------|------|------|
| 📘 **README** | `/README.md` | 项目介绍、技术架构、快速开始 |
| 📊 **开发总结报告** | `/DEVELOPMENT_REPORT_2026-03-09-FINAL.md` | 完整开发报告（v2.3） |
| 📝 **开发进度** | `/dev_progress/README.md` | 开发日志和进度跟踪 |

### 设计与规划
| 文档 | 路径 | 说明 |
|------|------|------|
| 🏗️ **开发设计文档** | `/docs/开发设计文档.md` | 详细设计文档（v1.1） |
| 🗺️ **系统架构图** | `/docs/系统架构图.md` | 技术架构、ER 图（v1.2） |
| 📋 **项目总结** | `/docs/项目总结.md` | 项目总结文档（v1.2） |
| 📋 **核心业务规则** | `/docs/核心业务规则.md` | 业务规则、状态流转 |

### 测试文档
| 文档 | 路径 | 说明 |
|------|------|------|
| 📝 **测试计划** | `/TEST_PLAN.md` | 测试计划和策略 |
| 📱 **移动端测试指南** | `/TEST_GUIDE_MOBILE.md` | H5 移动端测试指南 |
| 📊 **测试报告 (03-06)** | `/TEST_REPORT_2026-03-06.md` | 第一阶段测试报告 |
| 📊 **测试报告 (03-09)** | `/TEST_REPORT_2026-03-09.md` | 最新测试报告 |

---

## 📁 开发进度归档

### 历史报告（已归档）
| 文档 | 路径 | 日期 |
|------|------|------|
| 开发报告 (03-05) | `/dev_progress/99-archive/REPORT_2026-03-05.md` | 2026-03-05 |
| 开发报告 (03-06) | `/dev_progress/99-archive/REPORT_2026-03-06.md` | 2026-03-06 |
| 开发报告 (03-06-Phase1) | `/dev_progress/99-archive/DEVELOPMENT_REPORT_2026-03-06.md` | 2026-03-06 |
| 开发报告 (03-09-Phase2) | `/dev_progress/99-archive/REPORT_2026-03-09-PHASE2.md` | 2026-03-09 |

---

## 🔗 快速链接

### 前端
- **管理后台**: `http://localhost:3000/admin`
- **大屏展示**: `http://localhost:3000/dashboard`
- **H5 移动端**: `http://localhost:3000/mobile`
- **登录页面**: `http://localhost:3000/login`

### 后端 API
- **API 地址**: `http://localhost:8080/api`
- **健康检查**: `http://localhost:8080/health`
- **文件上传**: `http://localhost:8080/api/files/upload`

### 数据库
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## 📞 测试账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | admin | 123456 | 后台管理 |
| 维保员 | maintainer01 | 123456 | 维保操作 |
| 操作司机 | operator01 | 123456 | 设备操作 |

---

## 📊 项目进度

| 阶段 | 进度 | 状态 |
|------|------|------|
| Phase 1 - 项目初始化 | 100% | ✅ |
| Phase 2 - 数据库设计 | 100% | ✅ |
| Phase 3 - 后端核心功能 | 100% | ✅ |
| Phase 4 - Web 前端 | 95% | ✅ |
| Phase 5 - H5 移动端 | 95% | ✅ |
| Phase 6 - 集成测试 | 50% | 🔄 |
| Phase 7 - 部署上线 | 0% | ⏳ |

**总体进度**: 92%

---

## 🚀 快速启动

```bash
# 启动后端
cd /workspaces/SEM/eim
go run cmd/server/main.go

# 启动前端（新终端）
cd /workspaces/SEM/eim/web
npm run dev
```

访问：
- 前端：http://localhost:3000
- 后端：http://localhost:8080

---

**项目仓库**: `/workspaces/SEM`  
**技术栈**: Go 1.21+ | Next.js 14+ | PostgreSQL 15+ | Redis 7+ | Ant Design | ECharts

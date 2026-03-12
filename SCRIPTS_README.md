# EIM 测试服务脚本

> Equipment Inspection & Operation Management System
> 设备点检管理系统 - 测试服务启动脚本

---

## 📜 脚本列表

| 脚本 | 功能 | 使用方式 |
|------|------|----------|
| `start_test.sh` | 启动所有测试服务 | `./start_test.sh` |
| `stop_test.sh` | 停止所有测试服务 | `./stop_test.sh` |
| `restart_test.sh` | 重启所有测试服务 | `./restart_test.sh` |

---

## 🚀 快速开始

### 1. 启动服务

```bash
cd /workspaces/SEM
./start_test.sh
```

### 2. 访问系统

启动成功后，访问以下地址：

- 📊 **管理后台**: http://localhost:3000/admin
- 🖥️ **大屏展示**: http://localhost:3000/dashboard
- 📱 **移动端**: http://localhost:3000/mobile
- 🔑 **登录页面**: http://localhost:3000/login
- 🌐 **API**: http://localhost:8080/api

### 3. 登录测试

使用测试账号登录：
- **用户名**: `admin`
- **密码**: `admin123`

### 4. 停止服务

```bash
cd /workspaces/SEM
./stop_test.sh
```

---

## 📋 详细说明

### start_test.sh - 启动脚本

**执行流程**:
1. 停止已运行的服务
2. 检查 Docker 服务（PostgreSQL、Redis）
3. 检查环境配置文件
4. 检查后端可执行文件
5. 启动后端服务（端口 8080）
6. 启动前端服务（端口 3000）
7. 显示访问信息

**输出示例**:
```
========================================
  EIM 测试服务启动脚本
========================================

[i] 检查是否有已运行的服务...
[✓] 已清理旧服务
[i] 检查 Docker 服务状态...
[✓] Docker 服务运行正常
[✓] 环境配置文件检查完成
[✓] 后端可执行文件已存在
[i] 启动后端服务 (端口：8080)...
[✓] 后端服务已启动 (PID: 12345)
  日志文件：/workspaces/SEM/eim/logs/backend.log
[i] 启动前端服务 (端口：3000)...
[✓] 前端服务已启动 (PID: 12346)
  日志文件：/workspaces/SEM/eim/logs/frontend.log

========================================
  所有服务已启动成功！
========================================

访问地址:
  📊 管理后台：  http://localhost:3000/admin
  🖥️  大屏展示：  http://localhost:3000/dashboard
  📱 移动端：    http://localhost:3000/mobile
  🔑 登录页面：  http://localhost:3000/login

API 地址:
  🌐 API:        http://localhost:8080/api

测试账号:
  👤 管理员：admin / admin123

日志文件:
  📄 后端日志：/workspaces/SEM/eim/logs/backend.log
  📄 前端日志：/workspaces/SEM/eim/logs/frontend.log

停止服务:
  ./stop_test.sh  (运行停止脚本)
```

### stop_test.sh - 停止脚本

**执行流程**:
1. 读取 PID 文件
2. 停止后端服务
3. 停止前端服务
4. 清理残留进程

### restart_test.sh - 重启脚本

**执行流程**:
1. 调用 `stop_test.sh` 停止服务
2. 调用 `start_test.sh` 启动服务

---

## 📁 文件结构

```
/workspaces/SEM/
├── start_test.sh          # 启动脚本
├── stop_test.sh           # 停止脚本
├── restart_test.sh        # 重启脚本
├── 测试服务启动指南.md     # 详细使用指南
└── eim/
    ├── logs/              # 日志目录
    │   ├── backend.log    # 后端日志
    │   ├── frontend.log   # 前端日志
    │   ├── backend.pid    # 后端 PID
    │   └── frontend.pid   # 前端 PID
    ├── main               # 后端可执行文件
    ├── web/               # 前端目录
    └── docker/            # Docker 配置
```

---

## ⚠️ 注意事项

### 1. Docker 服务

启动脚本会检查 Docker 服务是否运行。如未运行，请先启动：

```bash
cd /workspaces/SEM/eim/docker
docker-compose up -d
```

### 2. 端口占用

确保端口 8080 和 3000 未被占用：

```bash
# 检查端口
netstat -tlnp | grep -E "8080|3000"

# 如被占用，停止旧服务
./stop_test.sh
```

### 3. Codespace 环境

在 GitHub Codespaces 中，后台进程可能无法长时间运行。如遇问题，建议：

- 使用前台运行（两个终端分别运行后端和前端）
- 或使用 Docker Compose 运行所有服务

---

## 🔧 故障排查

### 查看日志

```bash
# 后端日志
tail -f /workspaces/SEM/eim/logs/backend.log

# 前端日志
tail -f /workspaces/SEM/eim/logs/frontend.log
```

### 检查进程

```bash
# 后端进程
ps aux | grep "./main"

# 前端进程
ps aux | grep "next dev"
```

### 检查端口

```bash
netstat -tlnp | grep -E "8080|3000"
```

---

## 📖 相关文档

- [测试服务启动指南](./测试服务启动指南.md) - 详细使用指南
- [大屏展示访问指南](./DASHBOARD_GUIDE_2026-03-11.md) - 大屏使用说明
- [项目总结](./QWEN.md) - 项目整体说明

---

## 📞 技术支持

- **项目仓库**: `/workspaces/SEM`
- **文档目录**: `/workspaces/SEM/docs`
- **日志目录**: `/workspaces/SEM/eim/logs`

---

**版本**: v2.0
**最后更新**: 2026-03-11
**维护人员**: @kyeo-hub

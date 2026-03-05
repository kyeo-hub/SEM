# EIM 快速启动指南

> Equipment Inspection & Operation Management System
> 快速启动和开发指南

---

## 📋 前置要求

- Go 1.23+
- Node.js 18+
- Docker & Docker Compose (可选，用于容器化部署)
- PostgreSQL 15+ (本地开发或 Docker)
- Redis 7+ (本地开发或 Docker)

---

## 🚀 方式一：Docker Compose 启动（推荐）

### 1. 复制环境变量

```bash
cd /workspaces/SEM/eim
cp .env.example .env
```

### 2. 启动所有服务

```bash
docker-compose up -d
```

### 3. 查看日志

```bash
docker-compose logs -f
```

### 4. 访问地址

- **Web 前端**: http://localhost:3000
- **API**: http://localhost:8080
- **健康检查**: http://localhost:8080/health

---

## 💻 方式二：本地开发模式

### 1. 启动基础设施（PostgreSQL + Redis）

```bash
# 使用 Docker 启动
docker run -d --name eim-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15

docker run -d --name eim-redis \
  -e REDIS_PASSWORD=redis \
  -p 6379:6379 \
  redis:7
```

### 2. 初始化数据库

```bash
# 连接数据库
psql -h localhost -U postgres -d eim

# 执行迁移脚本
\i /workspaces/SEM/eim/migrations/001_init_schema.sql
\i /workspaces/SEM/eim/migrations/002_seed_data.sql
```

或者使用 Go 迁移工具（待实现）:

```bash
go run cmd/migrate/main.go up
```

### 3. 启动后端 API

```bash
cd /workspaces/SEM/eim

# 复制环境变量
cp .env.example .env

# 编辑 .env 文件，设置 JWT_SECRET
# JWT_SECRET=your-random-secret-key-here

# 启动服务
go run cmd/server/main.go
```

API 将启动在：http://localhost:8080

### 4. 启动前端 Web

```bash
cd /workspaces/SEM/eim/web

# 安装依赖（首次运行）
npm install

# 开发模式
npm run dev
```

Web 前端将启动在：http://localhost:3000

---

## 🧪 测试 API

### 1. 健康检查

```bash
curl http://localhost:8080/health
```

预期响应:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "ok"
  }
}
```

### 2. 用户登录

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

> ⚠️ 注意：首次运行时需要先创建用户。可以使用以下 SQL 插入测试用户：
>
> ```sql
> INSERT INTO users (username, password_hash, role, real_name, department)
> VALUES (
>   'admin',
>   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
>   'admin',
>   '管理员',
>   '技术部'
> );
> -- 密码：admin123
> ```

### 3. 获取设备列表（需要登录）

```bash
TOKEN="your-jwt-token-here"

curl -X GET http://localhost:8080/api/equipments \
  -H "Authorization: Bearer $TOKEN"
```

### 4. 创建设备

```bash
curl -X POST http://localhost:8080/api/equipments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "M4001",
    "name": "40 吨门机 M4",
    "type": "门式起重机",
    "company": "外贸码头",
    "location": "1#泊位",
    "latitude": 30.51771,
    "longitude": 121.59238,
    "inspection_enabled": true,
    "inspection_frequency": "daily"
  }'
```

### 5. 获取故障等级列表

```bash
curl -X GET http://localhost:8080/api/fault-levels \
  -H "Authorization: Bearer $TOKEN"
```

### 6. 获取点检标准

```bash
curl -X GET "http://localhost:8080/api/standards?equipment_type=门式起重机" \
  -H "Authorization: Bearer $TOKEN"
```

### 7. 提交点检记录

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
        "part_name": "吊钩组",
        "item_name": "吊钩",
        "result": "normal",
        "remark": ""
      },
      {
        "part_name": "钢丝绳",
        "item_name": "磨损",
        "result": "abnormal",
        "remark": "发现轻微磨损"
      }
    ],
    "problems_found": "钢丝绳轻微磨损",
    "problems_handled": "已记录，建议更换",
    "legacy_issues": ""
  }'
```

### 8. 获取统计数据

```bash
# 日报
curl -X GET "http://localhost:8080/api/stats/daily?date=2026-03-05" \
  -H "Authorization: Bearer $TOKEN"

# 周报
curl -X GET http://localhost:8080/api/stats/weekly \
  -H "Authorization: Bearer $TOKEN"

# 月报
curl -X GET "http://localhost:8080/api/stats/monthly?year=2026&month=3" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📁 项目结构

```
eim/
├── cmd/                    # 程序入口
│   ├── server/            # API 服务
│   └── migrate/           # 数据库迁移工具
├── internal/              # 业务代码
│   ├── config/           # 配置
│   ├── handler/          # HTTP Handlers
│   ├── service/          # 业务逻辑
│   ├── repository/       # 数据访问
│   ├── model/            # 数据模型
│   ├── middleware/       # 中间件
│   └── router/           # 路由
├── pkg/                   # 公共包
│   ├── database/         # 数据库
│   ├── redis/            # Redis
│   ├── jwt/              # JWT
│   └── qrcode/           # 二维码生成
├── migrations/            # 数据库迁移脚本
├── web/                   # Next.js 前端
│   ├── app/
│   │   ├── admin/        # 管理后台
│   │   ├── login/        # 登录页
│   │   └── (mobile)/     # H5 移动端（待创建）
│   └── components/
└── docker/                # Docker 配置
```

---

## 🔧 常见问题

### 1. 数据库连接失败

检查 PostgreSQL 是否运行：
```bash
docker ps | grep postgres
# 或
pg_isready -h localhost -p 5432
```

### 2. Redis 连接失败

检查 Redis 是否运行：
```bash
docker ps | grep redis
# 或
redis-cli -h localhost -p 6379 ping
```

### 3. Go 依赖下载失败

```bash
cd /workspaces/SEM/eim
go mod tidy
go mod download
```

### 4. 前端依赖安装失败

```bash
cd /workspaces/SEM/eim/web
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 下一步

1. **创建测试用户** - 使用 SQL 插入测试账号
2. **启动服务** - 后端 API + 前端 Web
3. **测试登录** - 访问 http://localhost:3000/login
4. **开发功能** - 参考开发设计文档

---

## 📚 相关文档

- [开发设计文档](../docs/开发设计文档.md)
- [系统架构图](../docs/系统架构图.md)
- [项目总结](../docs/项目总结.md)
- [开发进度](../dev_progress/README.md)

---

**最后更新**: 2026-03-05

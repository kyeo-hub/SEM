# EIM - 设备点检管理系统

> Equipment Inspection & Operation Management System

基于 Go + Next.js + H5 移动端的设备点检与运营管理系统。

## 快速开始

### 使用 Docker Compose (推荐)

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 启动所有服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f
```

访问地址:
- Web 前端：http://localhost:3000
- API: http://localhost:8080

### 本地开发

```bash
# 启动 PostgreSQL
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15

# 启动 Redis
docker run -d --name redis -e REDIS_PASSWORD=redis -p 6379:6379 redis:7

# 启动 API
cd cmd/server && go run main.go

# 启动 Web (另一个终端)
cd web && npm install && npm run dev
```

## 技术栈

- **后端**: Go 1.21+ + Gin + GORM
- **前端**: Next.js 14+ + Ant Design
- **数据库**: PostgreSQL 15+
- **缓存**: Redis 7+

## 许可证

MIT License

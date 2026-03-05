package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/kyeo-hub/eim/internal/config"
	"github.com/kyeo-hub/eim/internal/router"
	"github.com/kyeo-hub/eim/pkg/database"
	"github.com/kyeo-hub/eim/pkg/jwt"
	"github.com/kyeo-hub/eim/pkg/redis"
	"github.com/kyeo-hub/eim/pkg/wechat"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("未找到 .env 文件，使用系统环境变量")
	}

	// 加载配置
	cfg := config.Load()

	// 设置 Gin 模式
	gin.SetMode(cfg.Server.Mode)

	// 初始化数据库
	dbCfg := database.Config{
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.DBName,
		SSLMode:  cfg.Database.SSLMode,
	}
	db, err := database.New(dbCfg)
	if err != nil {
		log.Fatalf("数据库连接失败：%v", err)
	}

	// 初始化 Redis
	redisCfg := redis.Config{
		Host:     cfg.Redis.Host,
		Port:     cfg.Redis.Port,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	}
	rdb, err := redis.New(redisCfg)
	if err != nil {
		log.Fatalf("Redis 连接失败：%v", err)
	}
	_ = rdb

	// 初始化 JWT 服务
	jwtSvc := jwt.New(cfg.JWT.Secret, cfg.JWT.ExpireHours)

	// 初始化企业微信机器人
	wechatBotCfg := cfg.GetWeChatBot()
	wechatBot := wechat.NewWeChatBot(wechatBotCfg.Webhook, wechatBotCfg.Enabled)
	if wechatBotCfg.Enabled {
		log.Printf("✅ 企业微信机器人已启用")
	}

	// 初始化所有 Handler
	router.InitializeHandlers(db, jwtSvc, wechatBot)

	// 创建 Gin 路由
	r := gin.Default()

	// 设置静态文件服务 (上传的文件)
	r.Static("/uploads", "./uploads")

	// 设置路由
	router.Setup(r)

	// 启动服务
	port := os.Getenv("PORT")
	if port == "" {
		port = cfg.Server.Port
	}
	addr := fmt.Sprintf(":%s", port)
	log.Printf("🚀 服务启动在 %s", addr)
	log.Printf("📖 健康检查：http://localhost%s/health", port)
	log.Printf("🔑 登录接口：POST http://localhost%s/api/auth/login", port)
	if err := r.Run(addr); err != nil {
		log.Fatalf("启动失败：%v", err)
	}
}

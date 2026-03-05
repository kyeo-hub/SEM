package redis

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

// Config Redis 配置
type Config struct {
	Host     string
	Port     string
	Password string
	DB       int
}

// New 创建 Redis 客户端
func New(cfg Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	// 测试连接
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("连接 Redis 失败：%w", err)
	}

	log.Println("✅ Redis 连接成功")
	return client, nil
}

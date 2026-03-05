package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/handler"
	"github.com/kyeo-hub/eim/pkg/jwt"
)

// JWTAuth JWT 认证中间件
func JWTAuth() gin.HandlerFunc {
	// 每次创建中间件时都获取最新的 JWT secret
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "eim-secret-key-2026-change-in-production"
	}
	jwtSvc := jwt.New(secret, 168)
	log.Printf("🔑 JWT 中间件已初始化，Secret: %s...", secret[:min(10, len(secret))])
	
	return func(c *gin.Context) {
		// 从 Authorization header 获取 token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			handler.Error(c, http.StatusUnauthorized, "未提供认证信息")
			c.Abort()
			return
		}

		// 提取 token (Bearer <token>)
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			handler.Error(c, http.StatusUnauthorized, "认证格式错误")
			c.Abort()
			return
		}

		tokenString := parts[1]

		// 解析 token
		claims, err := jwtSvc.ParseToken(tokenString)
		if err != nil {
			log.Printf("❌ Token 解析失败：%v", err)
			handler.Error(c, http.StatusUnauthorized, "无效的 token")
			c.Abort()
			return
		}

		// 将用户信息存入上下文
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

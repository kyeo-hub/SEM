package handler

import (
	"context"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
)

// authHandler 认证 Handler
var authHandler *service.AuthService

// InitAuthHandler 初始化认证 Handler
func InitAuthHandler(svc *service.AuthService) {
	authHandler = svc
	log.Println("✅ AuthHandler 已初始化")
}

// Login 用户登录
// POST /api/auth/login
func Login(c *gin.Context) {
	log.Println("📥 收到登录请求")
	log.Printf("authHandler: %v", authHandler)
	
	var req service.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	if authHandler == nil {
		log.Println("❌ authHandler 未初始化")
		Error(c, http.StatusInternalServerError, "服务未初始化")
		return
	}

	resp, err := authHandler.Login(context.Background(), &req)
	if err != nil {
		log.Printf("❌ 登录失败：%v", err)
		Error(c, http.StatusUnauthorized, err.Error())
		return
	}

	log.Println("✅ 登录成功")
	log.Printf("🎫 生成 Token: %s", resp.Token[:50]+"...")
	Success(c, resp)
}

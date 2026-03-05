package router

import (
	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/handler"
	"github.com/kyeo-hub/eim/internal/middleware"
)

// Setup 设置路由
func Setup(r *gin.Engine) {
	// 使用 CORS 中间件
	r.Use(middleware.CORS())

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		handler.Success(c, gin.H{"status": "ok"})
	})

	// API 路由组
	api := r.Group("/api")
	{
		// 认证模块（无需登录）
		auth := api.Group("/auth")
		{
			auth.POST("/login", handler.Login)
		}

		// 需要登录的路由
		authRequired := api.Group("")
		authRequired.Use(middleware.JWTAuth())
		{
			// 设备管理
			equipment := authRequired.Group("/equipments")
			{
				equipment.GET("", handler.GetEquipments)
				equipment.GET("/:id", handler.GetEquipment)
				equipment.POST("", handler.CreateEquipment)
				equipment.PUT("/:id", handler.UpdateEquipment)
				equipment.DELETE("/:id", handler.DeleteEquipment)
				equipment.GET("/:id/qrcode", handler.GetQRCode)
				equipment.PUT("/:id/status", handler.UpdateStatus)
			}

			// 点检管理
			inspection := authRequired.Group("/inspections")
			{
				inspection.GET("", handler.GetInspections)
				inspection.POST("", handler.CreateInspection)
				inspection.GET("/today", handler.GetTodayInspections)
			}

			// 点检标准
			standards := authRequired.Group("/standards")
			{
				standards.GET("", handler.GetStandards)
			}

			// 故障等级
			faultLevels := authRequired.Group("/fault-levels")
			{
				faultLevels.GET("", handler.GetFaultLevels)
			}

			// 统计分析
			stats := authRequired.Group("/stats")
			{
				stats.GET("/daily", handler.GetDailyStats)
				stats.GET("/weekly", handler.GetWeeklyStats)
				stats.GET("/monthly", handler.GetMonthlyStats)
			}

			// 文件上传
			files := authRequired.Group("/files")
			{
				files.POST("/upload", handler.UploadFile)
				files.POST("/upload-multiple", handler.UploadFiles)
			}

			// 企业微信机器人
			wechat := authRequired.Group("/wechat")
			{
				wechat.POST("/test", handler.TestWeChatBot)
			}
		}
	}
}

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

		// SSE 事件流（独立路由，不使用JWT中间件，在handler中处理认证）
		events := api.Group("/events")
		{
			events.GET("/equipments", handler.StreamEquipmentEvents)
		}

		// 需要登录的路由
		authRequired := api.Group("")
		authRequired.Use(middleware.JWTAuth())
		{
			// 设备管理
			equipment := authRequired.Group("/equipments")
			{
				equipment.GET("", handler.GetEquipments)                          // 所有角色
				equipment.GET("/:id", handler.GetEquipment)                        // 所有角色
				equipment.POST("", middleware.RequireRole("admin"), handler.CreateEquipment)        // 仅管理员
				equipment.PUT("/:id", middleware.RequireRole("admin"), handler.UpdateEquipment)     // 仅管理员
				equipment.DELETE("/:id", middleware.RequireRole("admin"), handler.DeleteEquipment)  // 仅管理员
				equipment.GET("/:id/qrcode", handler.GetQRCode)                    // 所有角色
				equipment.PUT("/:id/status", handler.UpdateStatus)                 // 所有角色
				equipment.GET("/export", handler.ExportEquipments)                 // 所有角色
				equipment.POST("/import", middleware.RequireRole("admin"), handler.ImportEquipments) // 仅管理员
			}

			// 检查管理
			inspection := authRequired.Group("/inspections")
			{
				inspection.GET("", handler.GetInspections)                         // 所有角色
				inspection.POST("", handler.CreateInspection)                      // 所有角色
				inspection.GET("/today", handler.GetTodayInspections)              // 所有角色
			}

			// 检查标准
			standards := authRequired.Group("/standards")
			{
				standards.GET("", handler.GetStandards)                            // 所有角色
				standards.GET("/equipment-types", handler.GetEquipmentTypes)       // 所有角色
				standards.POST("", middleware.RequireRole("admin"), handler.CreateStandard)        // 仅管理员
				standards.PUT("/:id", middleware.RequireRole("admin"), handler.UpdateStandard)     // 仅管理员
				standards.DELETE("/:id", middleware.RequireRole("admin"), handler.DeleteStandard)  // 仅管理员
				standards.POST("/bulk", middleware.RequireRole("admin"), handler.BulkCreateStandards) // 仅管理员
			}

			// 故障等级
			faultLevels := authRequired.Group("/fault-levels")
			{
				faultLevels.GET("", handler.GetFaultLevels)                        // 所有角色
			}

			// 故障记录
			faults := authRequired.Group("/faults")
			{
				faults.POST("", handler.CreateFault)                               // 所有角色
				faults.GET("", handler.GetFaultList)                               // 所有角色
				faults.GET("/:id", handler.GetFault)                               // 所有角色
				faults.GET("/unresolved", handler.GetUnresolvedFaults)             // 所有角色
				faults.GET("/today", handler.GetTodayFaults)                       // 所有角色
				faults.POST("/:id/resolve", middleware.RequireRole("admin", "maintainer"), handler.ResolveFault) // 管理员、维保员
			}

			// 作业记录（管理员、操作司机）
			operations := authRequired.Group("/operations")
			{
				operations.POST("/start", middleware.RequireRole("admin", "operator"), handler.StartWork)
				operations.POST("/end", middleware.RequireRole("admin", "operator"), handler.EndWork)
				operations.GET("", handler.GetOperationList)                       // 所有角色
				operations.GET("/:id", handler.GetOperation)                       // 所有角色
				operations.GET("/today", handler.GetTodayOperations)               // 所有角色
				operations.GET("/statistics", handler.GetOperationStatistics)      // 所有角色
			}

			// 维保记录（管理员、维保员）
			maintenance := authRequired.Group("/maintenance")
			{
				maintenance.POST("/start", middleware.RequireRole("admin", "maintainer"), handler.StartMaintenance)
				maintenance.POST("/complete", middleware.RequireRole("admin", "maintainer"), handler.CompleteMaintenance)
				maintenance.GET("", handler.GetMaintenanceList)                    // 所有角色
				maintenance.GET("/:id", handler.GetMaintenance)                    // 所有角色
				maintenance.GET("/today", handler.GetTodayMaintenances)            // 所有角色
				maintenance.GET("/statistics", handler.GetMaintenanceStatistics)   // 所有角色
			}

			// 统计分析
			stats := authRequired.Group("/stats")
			{
				stats.GET("/overview", handler.GetOverviewStats)                   // 所有角色
				stats.GET("/operations", handler.GetOperationStats)                // 所有角色
				stats.GET("/maintenance", handler.GetMaintenanceStats)             // 所有角色
				stats.GET("/faults", handler.GetFaultStats)                        // 所有角色
				stats.GET("/status-duration", handler.GetStatusDurationStats)      // 所有角色
				stats.GET("/monthly-status-duration", handler.GetMonthlyStatusDurationStats) // 所有角色
				stats.GET("/equipment/:id", handler.GetEquipmentDetailStats)       // 所有角色
				stats.GET("/daily", handler.GetDailyStats)                         // 所有角色
				stats.GET("/weekly", handler.GetWeeklyStats)                       // 所有角色
				stats.GET("/monthly", handler.GetMonthlyStats)                     // 所有角色
			}

			// 文件上传
			files := authRequired.Group("/files")
			{
				files.POST("/upload", handler.UploadFile)                          // 所有角色
				files.POST("/upload-multiple", handler.UploadFiles)                // 所有角色
			}

			// 企业微信机器人
			wechat := authRequired.Group("/wechat")
			{
				wechat.POST("/test", handler.TestWeChatBot)                        // 所有角色
			}

			// 角色管理
			roles := authRequired.Group("/roles")
			{
				roles.GET("", handler.GetRoles)                                    // 所有角色
			}

			// 用户管理（仅管理员）
			users := authRequired.Group("/users")
			{
				users.GET("", middleware.RequireRole("admin"), handler.GetUsers)            // 获取用户列表
				users.POST("", middleware.RequireRole("admin"), handler.CreateUser)         // 创建用户
				users.GET("/:id", middleware.RequireRole("admin"), handler.GetUser)         // 获取用户详情
				users.PUT("/:id", middleware.RequireRole("admin"), handler.UpdateUser)      // 更新用户
				users.DELETE("/:id", middleware.RequireRole("admin"), handler.DeleteUser)   // 删除用户
				users.GET("/me", handler.GetUserInfo)                                       // 所有角色
				users.PUT("/change-password", handler.ChangePassword)                       // 所有角色
			}
		}
	}
}

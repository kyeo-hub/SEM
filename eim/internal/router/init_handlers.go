package router

import (
	"github.com/kyeo-hub/eim/internal/handler"
	"github.com/kyeo-hub/eim/internal/repository"
	"github.com/kyeo-hub/eim/internal/service"
	"github.com/kyeo-hub/eim/pkg/jwt"
	"gorm.io/gorm"
)

// InitializeHandlers 初始化所有 Handler（从 main.go 调用）
func InitializeHandlers(db *gorm.DB, jwtSvc *jwt.Service) {
	// 初始化仓库
	userRepo := repository.NewUserRepository(db)
	equipmentRepo := repository.NewEquipmentRepository(db)
	inspectionRepo := repository.NewInspectionRepository(db)
	standardRepo := repository.NewStandardRepository(db)
	faultRepo := repository.NewFaultLevelRepository(db)

	// 初始化服务
	authSvc := service.NewAuthService(userRepo, jwtSvc)
	equipmentSvc := service.NewEquipmentService(equipmentRepo)
	inspectionSvc := service.NewInspectionService(inspectionRepo, standardRepo, equipmentRepo)
	standardSvc := service.NewStandardService(standardRepo)
	faultSvc := service.NewFaultLevelService(faultRepo)
	statsSvc := service.NewStatsService(equipmentRepo, inspectionRepo)

	// 初始化 Handler
	handler.InitAuthHandler(authSvc)
	handler.InitEquipmentHandler(equipmentSvc)
	handler.InitInspectionHandler(inspectionSvc)
	handler.InitStandardHandler(standardSvc)
	handler.InitFaultHandler(faultSvc)
	handler.InitStatsHandler(statsSvc)
}

package router

import (
	"github.com/kyeo-hub/eim/internal/handler"
	"github.com/kyeo-hub/eim/internal/repository"
	"github.com/kyeo-hub/eim/internal/service"
	"github.com/kyeo-hub/eim/pkg/jwt"
	"github.com/kyeo-hub/eim/pkg/uploader"
	"github.com/kyeo-hub/eim/pkg/wechat"
	"gorm.io/gorm"
)

// InitializeHandlers 初始化所有 Handler（从 main.go 调用）
func InitializeHandlers(db *gorm.DB, jwtSvc *jwt.Service, wechatBot *wechat.WeChatBot) {
	// 初始化仓库
	userRepo := repository.NewUserRepository(db)
	equipmentRepo := repository.NewEquipmentRepository(db)
	inspectionRepo := repository.NewInspectionRepository(db)
	standardRepo := repository.NewStandardRepository(db)
	faultRepo := repository.NewFaultLevelRepository(db)
	faultRecordRepo := repository.NewFaultRepository(db)
	operationRepo := repository.NewOperationRepository(db)
	maintenanceRepo := repository.NewMaintenanceRepository(db)
	statusHistoryRepo := repository.NewEquipmentStatusHistoryRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	apiRolePermRepo := repository.NewAPIRolePermissionRepository(db)

	// 初始化服务
	authSvc := service.NewAuthService(userRepo, jwtSvc)
	equipmentSvc := service.NewEquipmentService(equipmentRepo)
	inspectionSvc := service.NewInspectionService(inspectionRepo, standardRepo, equipmentRepo)
	standardSvc := service.NewStandardService(standardRepo)
	faultSvc := service.NewFaultLevelService(faultRepo)
	faultRecordSvc := service.NewFaultService(faultRecordRepo, equipmentRepo, statusHistoryRepo, wechatBot)
	operationSvc := service.NewOperationService(operationRepo, equipmentRepo, faultRecordRepo, statusHistoryRepo)
	maintenanceSvc := service.NewMaintenanceService(maintenanceRepo, equipmentRepo, statusHistoryRepo)
	statsSvc := service.NewStatsService(operationRepo, maintenanceRepo, faultRecordRepo, statusHistoryRepo, equipmentRepo)

	// 初始化文件上传器
	fileUploader := uploader.NewFileUploader("./uploads", 10) // 最大 10MB

	// 初始化 Handler
	handler.InitAuthHandler(authSvc)
	handler.InitEquipmentHandler(equipmentSvc)
	handler.InitInspectionHandler(inspectionSvc)
	handler.InitStandardHandler(standardSvc)
	handler.InitFaultHandler(faultSvc)
	handler.InitStatsHandler(statsSvc)
	handler.InitFileHandler(fileUploader)
	handler.InitWeChatBotHandler(wechatBot)
	handler.InitUserHandler(userRepo)
	handler.InitFaultRecordHandler(faultRecordSvc)
	handler.InitOperationHandler(operationSvc)
	handler.InitMaintenanceHandler(maintenanceSvc)
	handler.InitRoleHandler(roleRepo)
	handler.InitSSEHandler(equipmentSvc)

	// 初始化角色权限（预加载 API 权限配置）
	_ = apiRolePermRepo
	_ = roleRepo
}

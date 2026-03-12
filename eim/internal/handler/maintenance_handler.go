package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
)

// maintenanceHandler 维保 Handler
var maintenanceHandler *service.MaintenanceService

// InitMaintenanceHandler 初始化维保 Handler
func InitMaintenanceHandler(svc *service.MaintenanceService) {
	maintenanceHandler = svc
}

// StartMaintenance 开始维保
// POST /api/maintenance/start
func StartMaintenance(c *gin.Context) {
	var req service.StartMaintenanceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	maintenance, err := maintenanceHandler.StartMaintenance(context.Background(), &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	// 广播设备状态变更（SSE 推送）
	BroadcastEquipmentUpdate("equipment-change", gin.H{
		"equipment_id": maintenance.EquipmentID,
		"action":       "start_maintenance",
	})

	Success(c, maintenance)
}

// CompleteMaintenance 完成维保
// POST /api/maintenance/complete
func CompleteMaintenance(c *gin.Context) {
	var req service.CompleteMaintenanceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	maintenance, err := maintenanceHandler.CompleteMaintenance(context.Background(), &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	// 广播设备状态变更（SSE 推送）
	BroadcastEquipmentUpdate("equipment-change", gin.H{
		"equipment_id": maintenance.EquipmentID,
		"action":       "complete_maintenance",
	})

	Success(c, maintenance)
}

// GetMaintenance 获取维保记录详情
// GET /api/maintenance/:id
func GetMaintenance(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的维保记录 ID")
		return
	}

	maintenance, err := maintenanceHandler.GetMaintenance(context.Background(), id)
	if err != nil {
		Error(c, http.StatusNotFound, "维保记录不存在")
		return
	}

	Success(c, maintenance)
}

// GetMaintenanceList 获取维保记录列表
// GET /api/maintenance
func GetMaintenanceList(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	list, total, err := maintenanceHandler.GetMaintenanceList(context.Background(), equipmentID, page, pageSize)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, PaginatedResponse{
		List:     list,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// GetTodayMaintenances 获取今日维保记录
// GET /api/maintenance/today
func GetTodayMaintenances(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	records, err := maintenanceHandler.GetTodayMaintenances(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, records)
}

// GetMaintenanceStatistics 获取维保统计
// GET /api/maintenance/statistics
func GetMaintenanceStatistics(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	// TODO: 实现统计功能
	_ = page
	_ = pageSize

	Success(c, gin.H{
		"message": "TODO: 实现统计功能",
	})
}

package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
)

// operationHandler 作业 Handler
var operationHandler *service.OperationService

// InitOperationHandler 初始化作业 Handler
func InitOperationHandler(svc *service.OperationService) {
	operationHandler = svc
}

// StartWork 开始作业
// POST /api/operations/start
func StartWork(c *gin.Context) {
	var req service.StartWorkRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	operation, err := operationHandler.StartWork(context.Background(), &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	// 广播设备状态变更（SSE 推送）
	BroadcastEquipmentUpdate("equipment-change", gin.H{
		"equipment_id": operation.EquipmentID,
		"action":       "start_work",
	})

	Success(c, operation)
}

// EndWork 结束作业
// POST /api/operations/end
func EndWork(c *gin.Context) {
	var req service.EndWorkRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	operation, err := operationHandler.EndWork(context.Background(), &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	// 广播设备状态变更（SSE 推送）
	BroadcastEquipmentUpdate("equipment-change", gin.H{
		"equipment_id": operation.EquipmentID,
		"action":       "end_work",
	})

	Success(c, operation)
}

// GetOperation 获取作业记录详情
// GET /api/operations/:id
func GetOperation(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的作业记录 ID")
		return
	}

	operation, err := operationHandler.GetOperation(context.Background(), id)
	if err != nil {
		Error(c, http.StatusNotFound, "作业记录不存在")
		return
	}

	Success(c, operation)
}

// GetOperationList 获取作业记录列表
// GET /api/operations
func GetOperationList(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	list, total, err := operationHandler.GetOperationList(context.Background(), equipmentID, page, pageSize)
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

// GetTodayOperations 获取今日作业记录
// GET /api/operations/today
func GetTodayOperations(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	records, err := operationHandler.GetTodayOperations(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, records)
}

// GetOperationStatistics 获取作业统计
// GET /api/operations/statistics
func GetOperationStatistics(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	// TODO: 实现统计功能
	_ = page
	_ = pageSize

	Success(c, gin.H{
		"message": "TODO: 实现统计功能",
	})
}

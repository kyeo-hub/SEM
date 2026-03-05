package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
)

// inspectionHandler 点检 Handler
var inspectionHandler *service.InspectionService

// InitInspectionHandler 初始化点检 Handler
func InitInspectionHandler(svc *service.InspectionService) {
	inspectionHandler = svc
}

// GetInspections 获取点检记录列表
// GET /api/inspections
func GetInspections(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	filters := make(map[string]interface{})
	if equipmentID := c.Query("equipment_id"); equipmentID != "" {
		if id, err := strconv.ParseInt(equipmentID, 10, 64); err == nil {
			filters["equipment_id"] = id
		}
	}
	if date := c.Query("date"); date != "" {
		filters["inspection_date"] = date
	}
	if shift := c.Query("shift"); shift != "" {
		filters["shift"] = shift
	}

	list, total, err := inspectionHandler.GetInspectionList(context.Background(), page, pageSize, filters)
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

// CreateInspection 提交点检记录
// POST /api/inspections
func CreateInspection(c *gin.Context) {
	var req service.CreateInspectionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	record, err := inspectionHandler.CreateInspection(context.Background(), &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, record)
}

// GetTodayInspections 获取今日点检情况
// GET /api/inspections/today
func GetTodayInspections(c *gin.Context) {
	records, err := inspectionHandler.GetTodayInspections(context.Background())
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	total := len(records)
	completed := total
	abnormal := 0
	for _, r := range records {
		if r.OverallStatus == "abnormal" {
			abnormal++
		}
	}

	Success(c, gin.H{
		"total":     total,
		"completed": completed,
		"pending":   0,
		"abnormal":  abnormal,
	})
}

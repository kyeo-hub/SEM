package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
)

// statsHandler 统计 Handler
var statsHandler *service.StatsService

// InitStatsHandler 初始化统计 Handler
func InitStatsHandler(svc *service.StatsService) {
	statsHandler = svc
}

// GetOverviewStats 获取概览统计
// GET /api/stats/overview
func GetOverviewStats(c *gin.Context) {
	// 设备统计
	equipmentStats, err := statsHandler.GetEquipmentStats(context.Background())
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, gin.H{
		"equipment": equipmentStats,
	})
}

// GetOperationStats 获取作业统计
// GET /api/stats/operations
func GetOperationStats(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	stats, err := statsHandler.GetOperationStats(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, stats)
}

// GetMaintenanceStats 获取维保统计
// GET /api/stats/maintenance
func GetMaintenanceStats(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	stats, err := statsHandler.GetMaintenanceStats(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, stats)
}

// GetFaultStats 获取故障统计
// GET /api/stats/faults
func GetFaultStats(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	stats, err := statsHandler.GetFaultStats(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, stats)
}

// GetStatusDurationStats 获取状态时长统计（今日）
// GET /api/stats/status-duration
func GetStatusDurationStats(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	stats, err := statsHandler.GetStatusDurationStats(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, stats)
}

// GetMonthlyStatusDurationStats 获取状态时长统计（本月）
// GET /api/stats/monthly-status-duration
func GetMonthlyStatusDurationStats(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	stats, err := statsHandler.GetMonthlyStatusDurationStats(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, stats)
}

// GetEquipmentDetailStats 获取设备详细统计
// GET /api/stats/equipment/:id
func GetEquipmentDetailStats(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	// 获取各项统计
	equipmentStats, _ := statsHandler.GetEquipmentStats(context.Background())
	operationStats, _ := statsHandler.GetOperationStats(context.Background(), equipmentID)
	maintenanceStats, _ := statsHandler.GetMaintenanceStats(context.Background(), equipmentID)
	faultStats, _ := statsHandler.GetFaultStats(context.Background(), equipmentID)
	statusDurationStats, _ := statsHandler.GetStatusDurationStats(context.Background(), equipmentID)

	Success(c, gin.H{
		"equipment_id":     equipmentID,
		"equipment":        equipmentStats,
		"operation":        operationStats,
		"maintenance":      maintenanceStats,
		"fault":            faultStats,
		"status_duration":  statusDurationStats,
	})
}

// GetDailyStats 获取日报统计（兼容旧接口）
// GET /api/stats/daily
func GetDailyStats(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	operationStats, _ := statsHandler.GetOperationStats(context.Background(), equipmentID)
	faultStats, _ := statsHandler.GetFaultStats(context.Background(), equipmentID)

	Success(c, gin.H{
		"operation": operationStats,
		"fault":     faultStats,
	})
}

// GetWeeklyStats 获取周报统计（最近 7 天）
// GET /api/stats/weekly
func GetWeeklyStats(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	// 获取最近 7 天的统计
	now := time.Now()
	sevenDaysAgo := now.AddDate(0, 0, -7)

	operationStats, err := statsHandler.GetOperationStatsByDateRange(context.Background(), equipmentID, sevenDaysAgo, now)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	faultStats, err := statsHandler.GetFaultStatsByDateRange(context.Background(), equipmentID, sevenDaysAgo, now)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	maintenanceStats, err := statsHandler.GetMaintenanceStatsByDateRange(context.Background(), equipmentID, sevenDaysAgo, now)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, gin.H{
		"period":      "weekly",
		"days":        7,
		"operation":   operationStats,
		"fault":       faultStats,
		"maintenance": maintenanceStats,
	})
}

// GetMonthlyStats 获取月报统计（本月）
// GET /api/stats/monthly
func GetMonthlyStats(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)
	year := c.Query("year")
	month := c.Query("month")

	var startDate, endDate time.Time

	// 如果指定了年月，使用该年月；否则使用当前月
	if year != "" && month != "" {
		yearInt, _ := strconv.Atoi(year)
		monthInt, _ := strconv.Atoi(month)
		startDate = time.Date(yearInt, time.Month(monthInt), 1, 0, 0, 0, 0, time.Local)
		endDate = startDate.AddDate(0, 1, 0)
	} else {
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = now
	}

	operationStats, err := statsHandler.GetOperationStatsByDateRange(context.Background(), equipmentID, startDate, endDate)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	faultStats, err := statsHandler.GetFaultStatsByDateRange(context.Background(), equipmentID, startDate, endDate)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	maintenanceStats, err := statsHandler.GetMaintenanceStatsByDateRange(context.Background(), equipmentID, startDate, endDate)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	statusStats, err := statsHandler.GetMonthlyStatusDurationStats(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, gin.H{
		"period":          "monthly",
		"year":            startDate.Year(),
		"month":           int(startDate.Month()),
		"operation":       operationStats,
		"fault":           faultStats,
		"maintenance":     maintenanceStats,
		"status_duration": statusStats,
	})
}

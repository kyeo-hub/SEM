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

// GetDailyStats 获取日报统计
// GET /api/stats/daily
func GetDailyStats(c *gin.Context) {
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))

	stats, err := statsHandler.GetDailyStats(context.Background(), date)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, stats)
}

// GetWeeklyStats 获取周报统计
// GET /api/stats/weekly
func GetWeeklyStats(c *gin.Context) {
	stats, err := statsHandler.GetWeeklyStats(context.Background())
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, stats)
}

// GetMonthlyStats 获取月报统计
// GET /api/stats/monthly
func GetMonthlyStats(c *gin.Context) {
	now := time.Now()
	year, _ := strconv.Atoi(c.DefaultQuery("year", strconv.Itoa(now.Year())))
	month, _ := strconv.Atoi(c.DefaultQuery("month", strconv.Itoa(int(now.Month()))))

	stats, err := statsHandler.GetMonthlyStats(context.Background(), year, month)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, stats)
}

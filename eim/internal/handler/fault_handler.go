package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
)

// faultHandler 故障等级 Handler
var faultHandler *service.FaultLevelService

// InitFaultHandler 初始化故障等级 Handler
func InitFaultHandler(svc *service.FaultLevelService) {
	faultHandler = svc
}

// GetFaultLevels 获取故障等级列表
// GET /api/fault-levels
func GetFaultLevels(c *gin.Context) {
	list, err := faultHandler.GetFaultLevels(context.Background())
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, list)
}

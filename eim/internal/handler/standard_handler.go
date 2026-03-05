package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
)

// standardHandler 点检标准 Handler
var standardHandler *service.StandardService

// InitStandardHandler 初始化点检标准 Handler
func InitStandardHandler(svc *service.StandardService) {
	standardHandler = svc
}

// GetStandards 获取点检标准列表
// GET /api/standards
func GetStandards(c *gin.Context) {
	equipmentType := c.Query("equipment_type")

	list, err := standardHandler.GetStandards(context.Background(), equipmentType)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, list)
}

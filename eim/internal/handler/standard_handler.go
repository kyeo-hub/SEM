package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/service"
)

// standardHandler 检查标准 Handler
var standardHandler *service.StandardService

// InitStandardHandler 初始化检查标准 Handler
func InitStandardHandler(svc *service.StandardService) {
	standardHandler = svc
}

// GetStandards 获取检查标准列表
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

// CreateStandard 创建检查标准
// POST /api/standards
func CreateStandard(c *gin.Context) {
	var req model.InspectionStandard
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "请求参数错误："+err.Error())
		return
	}

	standard, err := standardHandler.CreateStandard(context.Background(), &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, standard)
}

// UpdateStandard 更新检查标准
// PUT /api/standards/:id
func UpdateStandard(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "标准 ID 格式错误")
		return
	}

	var req model.InspectionStandard
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "请求参数错误："+err.Error())
		return
	}

	standard, err := standardHandler.UpdateStandard(context.Background(), id, &req)
	if err != nil {
		if err.Error() == "标准不存在" {
			Error(c, http.StatusNotFound, err.Error())
			return
		}
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, standard)
}

// DeleteStandard 删除检查标准
// DELETE /api/standards/:id
func DeleteStandard(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "标准 ID 格式错误")
		return
	}

	err = standardHandler.DeleteStandard(context.Background(), id)
	if err != nil {
		if err.Error() == "标准不存在" {
			Error(c, http.StatusNotFound, err.Error())
			return
		}
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, nil)
}

// GetEquipmentTypes 获取设备类型列表
// GET /api/standards/equipment-types
func GetEquipmentTypes(c *gin.Context) {
	types, err := standardHandler.GetEquipmentTypes(context.Background())
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, types)
}

// BulkCreateStandards 批量创建检查标准
// POST /api/standards/bulk
func BulkCreateStandards(c *gin.Context) {
	var req []*model.InspectionStandard
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "请求参数错误："+err.Error())
		return
	}

	count, err := standardHandler.BulkCreateStandards(context.Background(), req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, gin.H{"count": count})
}

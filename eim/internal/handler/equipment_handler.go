package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
)

// equipmentHandler 设备 Handler
var equipmentHandler *service.EquipmentService

// InitEquipmentHandler 初始化设备 Handler
func InitEquipmentHandler(svc *service.EquipmentService) {
	equipmentHandler = svc
}

// GetEquipments 获取设备列表
// GET /api/equipments
func GetEquipments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	filters := make(map[string]interface{})
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if company := c.Query("company"); company != "" {
		filters["company"] = company
	}
	if eqType := c.Query("type"); eqType != "" {
		filters["type"] = eqType
	}
	// 支持按 QR 码 UUID 查询
	if qrCodeUuid := c.Query("qr_code_uuid"); qrCodeUuid != "" {
		filters["qr_code_uuid"] = qrCodeUuid
	}

	list, total, err := equipmentHandler.GetEquipmentList(context.Background(), page, pageSize, filters)
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

// GetEquipment 获取设备详情
// GET /api/equipments/:id
func GetEquipment(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的设备 ID")
		return
	}

	eq, err := equipmentHandler.GetEquipment(context.Background(), id)
	if err != nil {
		Error(c, http.StatusNotFound, "设备不存在")
		return
	}

	Success(c, eq)
}

// CreateEquipment 创建设备
// POST /api/equipments
func CreateEquipment(c *gin.Context) {
	var req service.CreateEquipmentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	eq, err := equipmentHandler.CreateEquipment(context.Background(), &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, eq)
}

// UpdateEquipment 更新设备
// PUT /api/equipments/:id
func UpdateEquipment(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的设备 ID")
		return
	}

	var req service.UpdateEquipmentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	eq, err := equipmentHandler.UpdateEquipment(context.Background(), id, &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, eq)
}

// DeleteEquipment 删除设备
// DELETE /api/equipments/:id
func DeleteEquipment(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的设备 ID")
		return
	}

	if err := equipmentHandler.DeleteEquipment(context.Background(), id); err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, nil)
}

// GetQRCode 获取设备二维码
// GET /api/equipments/:id/qrcode
func GetQRCode(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的设备 ID")
		return
	}

	qrContent, err := equipmentHandler.GetQRCode(context.Background(), id)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, gin.H{
		"qr_code":    qrContent,
		"qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + qrContent,
	})
}

// UpdateStatus 更新设备状态
// PUT /api/equipments/:id/status
func UpdateStatus(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的设备 ID")
		return
	}

	var req service.UpdateStatusRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	eq, err := equipmentHandler.UpdateStatus(context.Background(), id, &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, eq)
}

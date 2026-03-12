package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
)

// faultRecordHandler 故障记录 Handler
var faultRecordHandler *service.FaultService

// InitFaultRecordHandler 初始化故障记录 Handler
func InitFaultRecordHandler(svc *service.FaultService) {
	faultRecordHandler = svc
}

// CreateFault 创建故障记录
// POST /api/faults
func CreateFault(c *gin.Context) {
	var req service.CreateFaultRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	fault, err := faultRecordHandler.CreateFault(context.Background(), &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, fault)
}

// ResolveFault 解决故障
// POST /api/faults/:id/resolve
func ResolveFault(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的故障记录 ID")
		return
	}

	var req service.ResolveFaultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	req.FaultID = id

	fault, err := faultRecordHandler.ResolveFault(context.Background(), &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, fault)
}

// GetFault 获取故障记录详情
// GET /api/faults/:id
func GetFault(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的故障记录 ID")
		return
	}

	fault, err := faultRecordHandler.GetFault(context.Background(), id)
	if err != nil {
		Error(c, http.StatusNotFound, "故障记录不存在")
		return
	}

	Success(c, fault)
}

// GetFaultList 获取故障记录列表
// GET /api/faults
func GetFaultList(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	list, total, err := faultRecordHandler.GetFaultList(context.Background(), equipmentID, page, pageSize)
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

// GetUnresolvedFaults 获取未解决的故障
// GET /api/faults/unresolved
func GetUnresolvedFaults(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	records, err := faultRecordHandler.GetUnresolvedFaults(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, records)
}

// GetTodayFaults 获取今日故障记录
// GET /api/faults/today
func GetTodayFaults(c *gin.Context) {
	equipmentID, _ := strconv.ParseInt(c.Query("equipment_id"), 10, 64)

	records, err := faultRecordHandler.GetTodayFaults(context.Background(), equipmentID)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, records)
}

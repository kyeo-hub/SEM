package handler

import (
	"context"
	"encoding/csv"
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
	// 支持按设备编号查询
	if code := c.Query("code"); code != "" {
		filters["code"] = code
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

	// 广播设备新增（SSE 推送）
	BroadcastEquipmentUpdate("equipment-change", gin.H{
		"equipment": eq,
		"action":    "create",
	})

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

	// 广播设备更新（SSE 推送）
	BroadcastEquipmentUpdate("equipment-change", gin.H{
		"equipment": eq,
		"action":    "update",
	})

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

	// 广播设备删除（SSE 推送）
	BroadcastEquipmentUpdate("equipment-change", gin.H{
		"equipment_id": id,
		"action":       "delete",
	})

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

	base64Img, err := equipmentHandler.GetQRCode(context.Background(), id)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	Success(c, gin.H{
		"qr_code_base64": base64Img,
		"qr_code_type":   "image/png",
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

	// 广播设备状态变更（SSE 推送）
	BroadcastEquipmentUpdate("equipment-change", gin.H{
		"equipment": eq,
		"action":    "status_update",
	})

	Success(c, eq)
}

// ExportEquipments 导出设备数据
// GET /api/equipments/export
func ExportEquipments(c *gin.Context) {
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

	list, err := equipmentHandler.GetEquipmentListNoPagination(context.Background(), filters)
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	// 导出为 CSV 格式
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=equipments.csv")

	// CSV 表头
	c.Writer.WriteString("设备编号，设备名称，设备类型，所属公司，位置，纬度，经度，状态\n")

	// CSV 数据
	for _, eq := range list {
		c.Writer.WriteString(eq.Code + "," + eq.Name + "," + eq.Type + "," + eq.Company + "," + eq.Location + "," +
			strconv.FormatFloat(eq.Latitude, 'f', -1, 64) + "," +
			strconv.FormatFloat(eq.Longitude, 'f', -1, 64) + "," +
			eq.Status + "\n")
	}
}

// ImportEquipments 批量导入设备数据
// POST /api/equipments/import
func ImportEquipments(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		Error(c, http.StatusBadRequest, "请上传文件")
		return
	}

	// 验证文件类型
	if file.Filename[len(file.Filename)-4:] != ".csv" {
		Error(c, http.StatusBadRequest, "仅支持 CSV 格式文件")
		return
	}

	// 打开上传的文件
	src, err := file.Open()
	if err != nil {
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer src.Close()

	// 读取 CSV 内容
	reader := csv.NewReader(src)
	records, err := reader.ReadAll()
	if err != nil {
		Error(c, http.StatusBadRequest, "CSV 文件解析失败："+err.Error())
		return
	}

	if len(records) < 2 {
		Error(c, http.StatusBadRequest, "CSV 文件为空")
		return
	}

	// 跳过表头，解析设备数据
	var imported int
	var failed int
	var failedRows []string

	for i, record := range records[1:] {
		if len(record) < 5 {
			failed++
			failedRows = append(failedRows, "第"+strconv.Itoa(i+2)+"行：列数不足")
			continue
		}

		req := service.CreateEquipmentRequest{
			Code:     record[0],
			Name:     record[1],
			Type:     record[2],
			Company:  record[3],
			Location: record[4],
		}

		// 可选字段
		if len(record) > 5 && record[5] != "" {
			req.Latitude, _ = strconv.ParseFloat(record[5], 64)
		}
		if len(record) > 6 && record[6] != "" {
			req.Longitude, _ = strconv.ParseFloat(record[6], 64)
		}

		_, err := equipmentHandler.CreateEquipment(context.Background(), &req)
		if err != nil {
			failed++
			failedRows = append(failedRows, "第"+strconv.Itoa(i+2)+"行："+err.Error())
		} else {
			imported++
		}
	}

	Success(c, gin.H{
		"imported":    imported,
		"failed":      failed,
		"failed_rows": failedRows,
	})
}

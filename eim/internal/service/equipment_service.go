package service

import (
	"context"
	"errors"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EquipmentService 设备服务
type EquipmentService struct {
	equipmentRepo *repository.EquipmentRepository
	statusRepo    *repository.EquipmentRepository // 用于记录状态历史
}

// NewEquipmentService 创建设备服务实例
func NewEquipmentService(equipmentRepo *repository.EquipmentRepository) *EquipmentService {
	return &EquipmentService{
		equipmentRepo: equipmentRepo,
	}
}

// CreateEquipmentRequest 创建设备请求
type CreateEquipmentRequest struct {
	Code                string  `json:"code" binding:"required"`
	Name                string  `json:"name" binding:"required"`
	Type                string  `json:"type" binding:"required"`
	Company             string  `json:"company"`
	Location            string  `json:"location"`
	Latitude            float64 `json:"latitude"`
	Longitude           float64 `json:"longitude"`
	InspectionEnabled   bool    `json:"inspection_enabled"`
	InspectionFrequency string  `json:"inspection_frequency"`
}

// CreateEquipment 创建设备
func (s *EquipmentService) CreateEquipment(ctx context.Context, req *CreateEquipmentRequest) (*model.Equipment, error) {
	// 检查设备编号是否已存在
	_, err := s.equipmentRepo.GetByCode(ctx, req.Code)
	if err == nil {
		return nil, errors.New("设备编号已存在")
	}

	// 生成二维码 UUID
	qrUUID := uuid.New().String()

	equipment := &model.Equipment{
		Code:                req.Code,
		Name:                req.Name,
		Type:                req.Type,
		Company:             req.Company,
		Location:            req.Location,
		Latitude:            req.Latitude,
		Longitude:           req.Longitude,
		Status:              "standby",
		QrCodeUUID:          qrUUID,
		InspectionEnabled:   req.InspectionEnabled,
		InspectionFrequency: req.InspectionFrequency,
	}

	if equipment.InspectionFrequency == "" {
		equipment.InspectionFrequency = "daily"
	}

	if err := s.equipmentRepo.Create(ctx, equipment); err != nil {
		return nil, err
	}

	return equipment, nil
}

// GetEquipment 获取设备详情
func (s *EquipmentService) GetEquipment(ctx context.Context, id int64) (*model.Equipment, error) {
	return s.equipmentRepo.GetByID(ctx, id)
}

// GetEquipmentByCode 根据编号获取设备
func (s *EquipmentService) GetEquipmentByCode(ctx context.Context, code string) (*model.Equipment, error) {
	return s.equipmentRepo.GetByCode(ctx, code)
}

// GetEquipmentList 获取设备列表
func (s *EquipmentService) GetEquipmentList(ctx context.Context, page, pageSize int, filters map[string]interface{}) ([]*model.Equipment, int64, error) {
	offset := (page - 1) * pageSize
	return s.equipmentRepo.List(ctx, offset, pageSize, filters)
}

// UpdateEquipmentRequest 更新设备请求
type UpdateEquipmentRequest struct {
	Name                string  `json:"name"`
	Type                string  `json:"type"`
	Company             string  `json:"company"`
	Location            string  `json:"location"`
	Latitude            float64 `json:"latitude"`
	Longitude           float64 `json:"longitude"`
	InspectionEnabled   bool    `json:"inspection_enabled"`
	InspectionFrequency string  `json:"inspection_frequency"`
}

// UpdateEquipment 更新设备
func (s *EquipmentService) UpdateEquipment(ctx context.Context, id int64, req *UpdateEquipmentRequest) (*model.Equipment, error) {
	equipment, err := s.equipmentRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("设备不存在")
		}
		return nil, err
	}

	// 更新字段
	if req.Name != "" {
		equipment.Name = req.Name
	}
	if req.Type != "" {
		equipment.Type = req.Type
	}
	equipment.Company = req.Company
	equipment.Location = req.Location
	equipment.Latitude = req.Latitude
	equipment.Longitude = req.Longitude
	equipment.InspectionEnabled = req.InspectionEnabled
	if req.InspectionFrequency != "" {
		equipment.InspectionFrequency = req.InspectionFrequency
	}

	if err := s.equipmentRepo.Update(ctx, equipment); err != nil {
		return nil, err
	}

	return equipment, nil
}

// DeleteEquipment 删除设备
func (s *EquipmentService) DeleteEquipment(ctx context.Context, id int64) error {
	return s.equipmentRepo.Delete(ctx, id)
}

// UpdateStatusRequest 更新设备状态请求
type UpdateStatusRequest struct {
	Status     string `json:"status" binding:"required"` // working/standby/maintenance/fault
	FaultLevelID *int64 `json:"fault_level_id"`          // 故障等级 ID（status=fault 时必填）
	Reason     string `json:"reason"`                    // 状态变更原因
	QrScan     bool   `json:"qr_scan"`                   // 是否通过扫码变更
	ChangedBy  string `json:"changed_by"`                // 操作人
	ChangedByID int64  `json:"changed_by_id"`             // 操作人 ID
	// 作业信息（status=working 时填写）
	ShipName  string `json:"ship_name"`
	CargoName string `json:"cargo_name"`
}

// UpdateStatus 更新设备状态
func (s *EquipmentService) UpdateStatus(ctx context.Context, id int64, req *UpdateStatusRequest) (*model.Equipment, error) {
	_, err := s.equipmentRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("设备不存在")
		}
		return nil, err
	}

	// 验证状态
	validStatuses := map[string]bool{
		"working":     true,
		"standby":     true,
		"maintenance": true,
		"fault":       true,
	}
	if !validStatuses[req.Status] {
		return nil, errors.New("无效的状态值")
	}

	// 故障状态必须指定故障等级
	if req.Status == "fault" && req.FaultLevelID == nil {
		return nil, errors.New("故障状态必须指定故障等级")
	}

	// 更新设备状态
	var faultLevelID *int64
	if req.Status == "fault" {
		faultLevelID = req.FaultLevelID
	}
	if err := s.equipmentRepo.UpdateStatus(ctx, id, req.Status, faultLevelID); err != nil {
		return nil, err
	}

	// 如果是作业状态，更新作业信息
	if req.Status == "working" {
		if err := s.equipmentRepo.UpdateOperationInfo(ctx, id, req.ShipName, req.CargoName); err != nil {
			return nil, err
		}
	}

	// TODO: 记录状态历史到 equipment_status_history 表

	// 重新获取设备信息
	return s.equipmentRepo.GetByID(ctx, id)
}

// GetQRCode 生成设备二维码
func (s *EquipmentService) GetQRCode(ctx context.Context, id int64) (string, error) {
	equipment, err := s.equipmentRepo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}

	// TODO: 生成二维码图片（使用 pkg/qrcode 包）
	// 二维码内容格式：https://your-domain.com/mobile/equipment/{qr_code_uuid}
	qrContent := "https://your-domain.com/mobile/equipment/" + equipment.QrCodeUUID

	return qrContent, nil
}

// GetFaultEquipments 获取故障设备列表
func (s *EquipmentService) GetFaultEquipments(ctx context.Context) ([]*model.Equipment, error) {
	return s.equipmentRepo.GetFaultEquipments(ctx)
}

// GetEquipmentStats 获取设备统计
func (s *EquipmentService) GetEquipmentStats(ctx context.Context) (map[string]int64, error) {
	return s.equipmentRepo.CountByStatus(ctx)
}

// SearchEquipment 搜索设备
func (s *EquipmentService) SearchEquipment(ctx context.Context, keyword string) ([]*model.Equipment, error) {
	return s.equipmentRepo.Search(ctx, keyword)
}

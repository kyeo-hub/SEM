package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
	"gorm.io/gorm"
)

// MaintenanceService 维保服务
type MaintenanceService struct {
	maintenanceRepo *repository.MaintenanceRepository
	equipmentRepo   *repository.EquipmentRepository
	statusHistoryRepo *repository.EquipmentStatusHistoryRepository
}

// NewMaintenanceService 创建维保服务实例
func NewMaintenanceService(
	maintenanceRepo *repository.MaintenanceRepository,
	equipmentRepo *repository.EquipmentRepository,
	statusHistoryRepo *repository.EquipmentStatusHistoryRepository,
) *MaintenanceService {
	return &MaintenanceService{
		maintenanceRepo: maintenanceRepo,
		equipmentRepo:   equipmentRepo,
		statusHistoryRepo: statusHistoryRepo,
	}
}

// StartMaintenanceRequest 开始维保请求
type StartMaintenanceRequest struct {
	EquipmentID    int64  `json:"equipment_id" binding:"required"`
	MaintenanceType string `json:"maintenance_type" binding:"required"` // daily/repair/periodic/emergency
	PlanContent    string `json:"plan_content"`                          // 计划维保内容
	MaintainerName string `json:"maintainer_name" binding:"required"`    // 维保人姓名
	MaintainerID   *int64 `json:"maintainer_id"`                         // 维保人 ID（可选）
	QrScan         bool   `json:"qr_scan"`                               // 是否通过扫码变更
	ChangedBy      string `json:"changed_by"`                            // 操作人
}

// StartMaintenance 开始维保
func (s *MaintenanceService) StartMaintenance(ctx context.Context, req *StartMaintenanceRequest) (*model.MaintenanceRecord, error) {
	// 验证设备是否存在
	equipment, err := s.equipmentRepo.GetByID(ctx, req.EquipmentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("设备不存在")
		}
		return nil, err
	}

	// 检查设备状态：作业时不允许维保
	if equipment.Status == "working" {
		return nil, errors.New("设备正在作业中，请先结束作业")
	}

	// 创建维保记录
	now := time.Now()
	maintenance := &model.MaintenanceRecord{
		EquipmentID:     req.EquipmentID,
		MaintenanceType: req.MaintenanceType,
		PlanContent:     req.PlanContent,
		ActualContent:   req.PlanContent, // 初始时实际内容等于计划内容
		StartTime:       now,
		MaintainerName:  req.MaintainerName,
		MaintainerID:    req.MaintainerID,
		Status:          "in_progress",
	}

	if err := s.maintenanceRepo.Create(ctx, maintenance); err != nil {
		return nil, err
	}

	// 更新设备状态
	if err := s.equipmentRepo.UpdateStatus(ctx, req.EquipmentID, "maintenance", nil); err != nil {
		return nil, err
	}

	// 记录状态历史
	history := &model.EquipmentStatusHistory{
		EquipmentID:   req.EquipmentID,
		OldStatus:     equipment.Status,
		NewStatus:     "maintenance",
		MaintenanceID: &maintenance.ID,
		Reason:        "开始维保：" + req.MaintenanceType,
		QrScan:        req.QrScan,
		ChangedBy:     req.ChangedBy,
		ChangedByID:   req.MaintainerID,
	}
	s.statusHistoryRepo.Create(ctx, history)

	return maintenance, nil
}

// CompleteMaintenanceRequest 完成维保请求
type CompleteMaintenanceRequest struct {
	MaintenanceID   int64   `json:"maintenance_id" binding:"required"` // 维保记录 ID
	Result          string  `json:"result" binding:"required"`         // resolved/partially_resolved/unresolved
	FaultLevelID    *int64  `json:"fault_level_id"`                    // 维保后的故障等级（部分解决时必填）
	ActualContent   string  `json:"actual_content" binding:"required"` // 实际完成的维保工作
	NextPlan        string  `json:"next_plan"`                         // 后续计划
	MaintainerSignature string `json:"maintainer_signature"`           // 维保人电子签名
	AcceptorName    string  `json:"acceptor_name"`                     // 验收人姓名（可选）
	AcceptorSignature string `json:"acceptor_signature"`               // 验收人电子签名（可选）
	PhotosBefore    []string `json:"photos_before"`                    // 维保前照片
	PhotosAfter     []string `json:"photos_after"`                     // 维保后照片
	QrScan          bool    `json:"qr_scan"`                           // 是否通过扫码变更
	ChangedBy       string  `json:"changed_by"`                        // 操作人
}

// CompleteMaintenance 完成维保
func (s *MaintenanceService) CompleteMaintenance(ctx context.Context, req *CompleteMaintenanceRequest) (*model.MaintenanceRecord, error) {
	// 获取维保记录
	maintenance, err := s.maintenanceRepo.GetByID(ctx, req.MaintenanceID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("维保记录不存在")
		}
		return nil, err
	}

	// 计算维保时长
	now := time.Now()
	duration := int(now.Sub(maintenance.StartTime).Minutes())

	// 更新维保记录
	maintenance.EndTime = &now
	maintenance.DurationMinutes = duration
	maintenance.Result = req.Result
	maintenance.ActualContent = req.ActualContent
	maintenance.NextPlan = req.NextPlan
	maintenance.MaintainerSignature = req.MaintainerSignature
	maintenance.AcceptorName = req.AcceptorName
	maintenance.AcceptorSignature = req.AcceptorSignature
	maintenance.Status = "completed"

	// 处理照片（转换为 JSON 数组存储）
	if len(req.PhotosBefore) > 0 {
		if photosJSON, err := json.Marshal(req.PhotosBefore); err == nil {
			maintenance.PhotosBefore = string(photosJSON)
		}
	} else {
		maintenance.PhotosBefore = "[]"
	}
	if len(req.PhotosAfter) > 0 {
		if photosJSON, err := json.Marshal(req.PhotosAfter); err == nil {
			maintenance.PhotosAfter = string(photosJSON)
		}
	} else {
		maintenance.PhotosAfter = "[]"
	}

	// 根据维保结果确定设备状态
	var newStatus string
	var faultLevelID *int64

	switch req.Result {
	case "resolved":
		// 全部解决 → 待命
		newStatus = "standby"
		faultLevelID = nil
	case "partially_resolved":
		// 部分解决 → 故障（可能降低等级）
		newStatus = "fault"
		faultLevelID = req.FaultLevelID
	case "unresolved":
		// 未解决 → 保持故障状态
		newStatus = "fault"
		// 保持原故障等级
		faultLevelID = maintenance.FaultLevelID
	}

	if err := s.maintenanceRepo.Update(ctx, maintenance); err != nil {
		return nil, err
	}

	// 更新设备状态
	if err := s.equipmentRepo.UpdateStatus(ctx, maintenance.EquipmentID, newStatus, faultLevelID); err != nil {
		return nil, err
	}

	// 记录状态历史
	history := &model.EquipmentStatusHistory{
		EquipmentID:     maintenance.EquipmentID,
		OldStatus:       "maintenance",
		NewStatus:       newStatus,
		DurationMinutes: duration,
		FaultLevelID:    faultLevelID,
		MaintenanceID:   &maintenance.ID,
		Reason:          "维保完成：" + req.Result,
		QrScan:          req.QrScan,
		ChangedBy:       req.ChangedBy,
	}
	s.statusHistoryRepo.Create(ctx, history)

	return maintenance, nil
}

// GetMaintenance 获取维保记录详情
func (s *MaintenanceService) GetMaintenance(ctx context.Context, id int64) (*model.MaintenanceRecord, error) {
	return s.maintenanceRepo.GetByID(ctx, id)
}

// GetMaintenanceList 获取维保记录列表
func (s *MaintenanceService) GetMaintenanceList(ctx context.Context, equipmentID int64, page, pageSize int) ([]*model.MaintenanceRecord, int64, error) {
	offset := (page - 1) * pageSize
	return s.maintenanceRepo.GetByEquipmentID(ctx, equipmentID, offset, pageSize)
}

// GetTodayMaintenances 获取今日维保记录
func (s *MaintenanceService) GetTodayMaintenances(ctx context.Context, equipmentID int64) ([]*model.MaintenanceRecord, error) {
	return s.maintenanceRepo.GetTodayRecords(ctx, equipmentID)
}

// GetMaintenanceStatistics 获取维保统计
func (s *MaintenanceService) GetMaintenanceStatistics(ctx context.Context, equipmentID int64, startDate, endDate time.Time) (*repository.MaintenanceStatistics, error) {
	return s.maintenanceRepo.GetStatistics(ctx, equipmentID, startDate, endDate)
}

package service

import (
	"context"
	"errors"
	"time"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
	"gorm.io/gorm"
)

// OperationService 作业服务
type OperationService struct {
	operationRepo    *repository.OperationRepository
	equipmentRepo    *repository.EquipmentRepository
	faultRepo        *repository.FaultRepository
	statusHistoryRepo *repository.EquipmentStatusHistoryRepository
}

// NewOperationService 创建作业服务实例
func NewOperationService(
	operationRepo *repository.OperationRepository,
	equipmentRepo *repository.EquipmentRepository,
	faultRepo *repository.FaultRepository,
	statusHistoryRepo *repository.EquipmentStatusHistoryRepository,
) *OperationService {
	return &OperationService{
		operationRepo:    operationRepo,
		equipmentRepo:    equipmentRepo,
		faultRepo:        faultRepo,
		statusHistoryRepo: statusHistoryRepo,
	}
}

// StartWorkRequest 开始作业请求
type StartWorkRequest struct {
	EquipmentID int64  `json:"equipment_id" binding:"required"`
	ShipName    string `json:"ship_name"`             // 船名（可选）
	CargoName   string `json:"cargo_name"`            // 货品名称（可选）
	OperatorName string `json:"operator_name" binding:"required"` // 操作人姓名
	OperatorID  *int64 `json:"operator_id"`           // 操作人 ID（可选）
	QrScan      bool   `json:"qr_scan"`               // 是否通过扫码变更
	ChangedBy   string `json:"changed_by"`            // 操作人
}

// StartWork 开始作业
func (s *OperationService) StartWork(ctx context.Context, req *StartWorkRequest) (*model.OperationRecord, error) {
	// 验证设备是否存在
	equipment, err := s.equipmentRepo.GetByID(ctx, req.EquipmentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("设备不存在")
		}
		return nil, err
	}

	// 检查设备状态
	if equipment.Status == "maintenance" {
		return nil, errors.New("设备正在维保中，禁止作业")
	}

	// 检查故障等级
	if equipment.Status == "fault" && equipment.FaultLevelID != nil {
		faultLevel, err := s.equipmentRepo.GetFaultLevel(ctx, *equipment.FaultLevelID)
		if err == nil && !faultLevel.AllowWork {
			return nil, errors.New("设备严重故障，禁止作业！")
		}
	}

	// 创建作业记录
	now := time.Now()
	operation := &model.OperationRecord{
		EquipmentID:   req.EquipmentID,
		ShipName:      req.ShipName,
		CargoName:     req.CargoName,
		StartTime:     now,
		OperatorName:  req.OperatorName,
		OperatorID:    req.OperatorID,
		Status:        "working",
		QrScan:        req.QrScan,
	}

	if err := s.operationRepo.Create(ctx, operation); err != nil {
		return nil, err
	}

	// 更新设备状态
	if err := s.equipmentRepo.UpdateStatus(ctx, req.EquipmentID, "working", nil); err != nil {
		return nil, err
	}

	// 记录状态历史
	history := &model.EquipmentStatusHistory{
		EquipmentID: req.EquipmentID,
		OldStatus:   equipment.Status,
		NewStatus:   "working",
		OperationID: &operation.ID,
		Reason:      "开始作业",
		QrScan:      req.QrScan,
		ChangedBy:   req.ChangedBy,
		ChangedByID: req.OperatorID,
	}
	s.statusHistoryRepo.Create(ctx, history)

	return operation, nil
}

// EndWorkRequest 结束作业请求
type EndWorkRequest struct {
	OperationID     int64   `json:"operation_id" binding:"required"` // 作业记录 ID
	CargoWeight     float64 `json:"cargo_weight"`                    // 装卸吨位（可选）
	HasFault        bool    `json:"has_fault"`                       // 是否有故障
	FaultLevelID    *int64  `json:"fault_level_id"`                  // 故障等级（当 has_fault=true 时必填）
	FaultDescription string `json:"fault_description"`               // 故障描述（当 has_fault=true 时必填）
	OperatorName    string  `json:"operator_name" binding:"required"` // 操作人姓名
	OperatorID      *int64  `json:"operator_id"`                     // 操作人 ID（可选）
	Reason          string  `json:"reason"`                          // 结束作业原因
	QrScan          bool    `json:"qr_scan"`                         // 是否通过扫码变更
	ChangedBy       string  `json:"changed_by"`                      // 操作人
}

// EndWork 结束作业
func (s *OperationService) EndWork(ctx context.Context, req *EndWorkRequest) (*model.OperationRecord, error) {
	// 获取作业记录
	operation, err := s.operationRepo.GetByID(ctx, req.OperationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("作业记录不存在")
		}
		return nil, err
	}

	// 计算作业时长
	now := time.Now()
	duration := int(now.Sub(operation.StartTime).Minutes())

	// 更新作业记录
	operation.EndTime = &now
	operation.DurationMinutes = duration
	operation.CargoWeight = req.CargoWeight
	operation.HasFault = req.HasFault
	operation.FaultLevelID = req.FaultLevelID
	operation.FaultDescription = req.FaultDescription
	operation.Status = "completed"

	if err := s.operationRepo.Update(ctx, operation); err != nil {
		return nil, err
	}

	// 处理故障（如果有）
	var newStatus string
	var faultLevelID *int64

	if req.HasFault && req.FaultLevelID != nil && *req.FaultLevelID > 0 {
		// 创建故障记录
		fault := &model.FaultRecord{
			EquipmentID:    operation.EquipmentID,
			FaultLevelID:   *req.FaultLevelID,
			Description:    req.FaultDescription,
			Source:         "operation",
			ReporterName:   req.OperatorName,
			ReporterID:     req.OperatorID,
			Status:         "open",
		}

		if err := s.faultRepo.Create(ctx, fault); err != nil {
			return nil, err
		}

		// 检查是否允许作业
		faultLevel, err := s.equipmentRepo.GetFaultLevel(ctx, *req.FaultLevelID)
		if err == nil && !faultLevel.AllowWork {
			newStatus = "fault"
			faultLevelID = req.FaultLevelID
		} else {
			newStatus = "standby"
		}
	} else {
		newStatus = "standby"
	}

	// 更新设备状态
	if err := s.equipmentRepo.UpdateStatus(ctx, operation.EquipmentID, newStatus, faultLevelID); err != nil {
		return nil, err
	}

	// 记录状态历史
	history := &model.EquipmentStatusHistory{
		EquipmentID:    operation.EquipmentID,
		OldStatus:      "working",
		NewStatus:      newStatus,
		DurationMinutes: duration,
		FaultLevelID:   faultLevelID,
		OperationID:    &operation.ID,
		Reason:         "结束作业" + req.Reason,
		QrScan:         req.QrScan,
		ChangedBy:      req.ChangedBy,
		ChangedByID:    req.OperatorID,
	}
	s.statusHistoryRepo.Create(ctx, history)

	return operation, nil
}

// GetOperation 获取作业记录详情
func (s *OperationService) GetOperation(ctx context.Context, id int64) (*model.OperationRecord, error) {
	return s.operationRepo.GetByID(ctx, id)
}

// GetOperationList 获取作业记录列表
func (s *OperationService) GetOperationList(ctx context.Context, equipmentID int64, page, pageSize int) ([]*model.OperationRecord, int64, error) {
	offset := (page - 1) * pageSize
	return s.operationRepo.GetByEquipmentID(ctx, equipmentID, offset, pageSize)
}

// GetTodayOperations 获取今日作业记录
func (s *OperationService) GetTodayOperations(ctx context.Context, equipmentID int64) ([]*model.OperationRecord, error) {
	return s.operationRepo.GetTodayRecords(ctx, equipmentID)
}

// GetOperationStatistics 获取作业统计
func (s *OperationService) GetOperationStatistics(ctx context.Context, equipmentID int64, startDate, endDate time.Time) (*repository.OperationStatistics, error) {
	return s.operationRepo.GetStatistics(ctx, equipmentID, startDate, endDate)
}

package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
	"github.com/kyeo-hub/eim/pkg/wechat"
	"gorm.io/gorm"
)

// FaultService 故障服务
type FaultService struct {
	faultRepo         *repository.FaultRepository
	equipmentRepo     *repository.EquipmentRepository
	statusHistoryRepo *repository.EquipmentStatusHistoryRepository
	wechatBot         *wechat.WeChatBot
}

// NewFaultService 创建故障服务实例
func NewFaultService(
	faultRepo *repository.FaultRepository,
	equipmentRepo *repository.EquipmentRepository,
	statusHistoryRepo *repository.EquipmentStatusHistoryRepository,
	wechatBot *wechat.WeChatBot,
) *FaultService {
	return &FaultService{
		faultRepo:         faultRepo,
		equipmentRepo:     equipmentRepo,
		statusHistoryRepo: statusHistoryRepo,
		wechatBot:         wechatBot,
	}
}

// CreateFaultRequest 创建故障记录请求
type CreateFaultRequest struct {
	EquipmentID   int64    `json:"equipment_id" binding:"required"`
	FaultLevelID  int64    `json:"fault_level_id" binding:"required"`
	Description   string   `json:"description" binding:"required"`
	Source        string   `json:"source"` // manual/operation/inspection
	Photos        []string `json:"photos"`
	ReporterName  string   `json:"reporter_name" binding:"required"`
	ReporterID    *int64   `json:"reporter_id"`
	QrScan        bool     `json:"qr_scan"`
	ChangedBy     string   `json:"changed_by"`
}

// CreateFault 创建故障记录
func (s *FaultService) CreateFault(ctx context.Context, req *CreateFaultRequest) (*model.FaultRecord, error) {
	// 验证设备是否存在
	equipment, err := s.equipmentRepo.GetByID(ctx, req.EquipmentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("设备不存在")
		}
		return nil, err
	}

	// 创建故障记录
	fault := &model.FaultRecord{
		EquipmentID:  req.EquipmentID,
		FaultLevelID: req.FaultLevelID,
		Description:  req.Description,
		Source:       req.Source,
		ReporterName: req.ReporterName,
		ReporterID:   req.ReporterID,
		Status:       "open",
	}

	// 处理照片（转换为 JSON 数组存储）
	if len(req.Photos) > 0 {
		if photosJSON, err := json.Marshal(req.Photos); err == nil {
			fault.Photos = string(photosJSON)
		}
	} else {
		fault.Photos = "[]"
	}

	if err := s.faultRepo.Create(ctx, fault); err != nil {
		return nil, err
	}

	// 获取故障等级
	faultLevel, err := s.equipmentRepo.GetFaultLevel(ctx, req.FaultLevelID)
	if err != nil {
		return nil, err
	}

	// 更新设备状态
	var newStatus string
	if !faultLevel.AllowWork {
		newStatus = "fault"
	} else {
		// L2/L3 故障，设备可以保持原状态或设为故障
		newStatus = "fault"
	}

	if err := s.equipmentRepo.UpdateStatus(ctx, req.EquipmentID, newStatus, &req.FaultLevelID); err != nil {
		return nil, err
	}

	// 记录状态历史
	history := &model.EquipmentStatusHistory{
		EquipmentID:  req.EquipmentID,
		OldStatus:    equipment.Status,
		NewStatus:    "fault",
		FaultLevelID: &req.FaultLevelID,
		Reason:       "故障登记：" + faultLevel.LevelName,
		QrScan:       req.QrScan,
		ChangedBy:    req.ChangedBy,
		ChangedByID:  req.ReporterID,
	}
	s.statusHistoryRepo.Create(ctx, history)

	// 发送企业微信通知（L1 故障必须实时通知）
	if req.FaultLevelID == 1 && s.wechatBot != nil {
		go func() {
			err := s.sendFaultAlert(ctx, fault, equipment, faultLevel)
			if err != nil {
				// 记录错误但不影响主流程
			}
		}()
	}

	return fault, nil
}

// sendFaultAlert 发送故障告警
func (s *FaultService) sendFaultAlert(ctx context.Context, fault *model.FaultRecord, equipment *model.Equipment, faultLevel *model.FaultLevel) error {
	// 构建告警消息
	title := "🚨 严重故障告警\n\n"
	content := buildFaultAlertContent(fault, equipment, faultLevel)

	// 发送企业微信消息
	err := s.wechatBot.SendMarkdown(title + content)
	if err != nil {
		return err
	}

	// 标记已通知
	now := time.Now()
	s.faultRepo.MarkWechatNotified(ctx, fault.ID, now)

	return nil
}

// buildFaultAlertContent 构建告警内容
func buildFaultAlertContent(fault *model.FaultRecord, equipment *model.Equipment, faultLevel *model.FaultLevel) string {
	content := "## " + faultLevel.LevelName + "\n\n"
	content += "**设备名称**: " + equipment.Name + "\n"
	content += "**设备编号**: " + equipment.Code + "\n"
	content += "**位置**: " + equipment.Location + "\n"
	content += "**故障描述**: " + fault.Description + "\n"
	content += "**报告人**: " + fault.ReporterName + "\n"
	content += "**时间**: " + fault.CreatedAt.Format("2006-01-02 15:04:05") + "\n\n"
	content += "> 请立即安排维修！"

	return content
}

// ResolveFaultRequest 解决故障请求
type ResolveFaultRequest struct {
	FaultID       int64  `json:"fault_id" binding:"required"`
	RepairedBy    string `json:"repaired_by" binding:"required"`
	RepairContent string `json:"repair_content" binding:"required"`
	QrScan        bool   `json:"qr_scan"`
	ChangedBy     string `json:"changed_by"`
}

// ResolveFault 解决故障
func (s *FaultService) ResolveFault(ctx context.Context, req *ResolveFaultRequest) (*model.FaultRecord, error) {
	// 获取故障记录
	fault, err := s.faultRepo.GetByID(ctx, req.FaultID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("故障记录不存在")
		}
		return nil, err
	}

	// 更新故障状态
	now := time.Now()
	if err := s.faultRepo.ResolveFault(ctx, req.FaultID, req.RepairedBy, req.RepairContent, now); err != nil {
		return nil, err
	}

	fault.Status = "resolved"
	fault.RepairedAt = &now
	fault.RepairedBy = req.RepairedBy
	fault.RepairContent = req.RepairContent

	// 更新设备状态为待命
	if err := s.equipmentRepo.UpdateStatus(ctx, fault.EquipmentID, "standby", nil); err != nil {
		return nil, err
	}

	// 记录状态历史
	history := &model.EquipmentStatusHistory{
		EquipmentID:  fault.EquipmentID,
		OldStatus:    "fault",
		NewStatus:    "standby",
		Reason:       "故障解决：" + req.RepairedBy,
		QrScan:       req.QrScan,
		ChangedBy:    req.ChangedBy,
	}
	s.statusHistoryRepo.Create(ctx, history)

	return fault, nil
}

// GetFault 获取故障记录详情
func (s *FaultService) GetFault(ctx context.Context, id int64) (*model.FaultRecord, error) {
	return s.faultRepo.GetByID(ctx, id)
}

// GetFaultList 获取故障记录列表
func (s *FaultService) GetFaultList(ctx context.Context, equipmentID int64, page, pageSize int) ([]*model.FaultRecord, int64, error) {
	offset := (page - 1) * pageSize
	return s.faultRepo.GetByEquipmentID(ctx, equipmentID, offset, pageSize)
}

// GetUnresolvedFaults 获取未解决的故障
func (s *FaultService) GetUnresolvedFaults(ctx context.Context, equipmentID int64) ([]*model.FaultRecord, error) {
	return s.faultRepo.GetUnresolvedFaults(ctx, equipmentID)
}

// GetTodayFaults 获取今日故障记录
func (s *FaultService) GetTodayFaults(ctx context.Context, equipmentID int64) ([]*model.FaultRecord, error) {
	return s.faultRepo.GetTodayRecords(ctx, equipmentID)
}

// GetFaultStatistics 获取故障统计
func (s *FaultService) GetFaultStatistics(ctx context.Context, equipmentID int64, startDate, endDate time.Time) (*repository.FaultStatistics, error) {
	return s.faultRepo.GetStatistics(ctx, equipmentID, startDate, endDate)
}

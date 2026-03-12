package service

import (
	"context"
	"errors"
	"time"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
	"gorm.io/gorm"
)

// InspectionService 检查服务
type InspectionService struct {
	inspectionRepo *repository.InspectionRepository
	standardRepo   *repository.StandardRepository
	equipmentRepo  *repository.EquipmentRepository
}

// NewInspectionService 创建检查服务实例
func NewInspectionService(
	inspectionRepo *repository.InspectionRepository,
	standardRepo *repository.StandardRepository,
	equipmentRepo *repository.EquipmentRepository,
) *InspectionService {
	return &InspectionService{
		inspectionRepo: inspectionRepo,
		standardRepo:   standardRepo,
		equipmentRepo:  equipmentRepo,
	}
}

// CreateInspectionRequest 创建检查记录请求
type CreateInspectionRequest struct {
	EquipmentID     int64                  `json:"equipment_id" binding:"required"`
	InspectionDate  string                 `json:"inspection_date" binding:"required"` // YYYY-MM-DD
	Shift           string                 `json:"shift" binding:"required"`           // before/during/handover
	InspectorID     int64                  `json:"inspector_id"`
	InspectorName   string                 `json:"inspector_name" binding:"required"`
	Details         []*InspectionDetailReq `json:"details"`
	ProblemsFound   string                 `json:"problems_found"`
	ProblemsHandled string                 `json:"problems_handled"`
	LegacyIssues    string                 `json:"legacy_issues"`
	SignatureImage  string                 `json:"signature_image"`
}

// InspectionDetailReq 检查明细请求
type InspectionDetailReq struct {
	StandardID int64  `json:"standard_id"`
	PartName   string `json:"part_name" binding:"required"`
	ItemName   string `json:"item_name" binding:"required"`
	Result     string `json:"result" binding:"required"` // normal/abnormal/skip
	Remark     string `json:"remark"`
}

// CreateInspection 创建检查记录
func (s *InspectionService) CreateInspection(ctx context.Context, req *CreateInspectionRequest) (*model.InspectionRecord, error) {
	// 解析日期
	inspectionDate, err := time.Parse("2006-01-02", req.InspectionDate)
	if err != nil {
		return nil, errors.New("日期格式错误")
	}

	// 检查是否已存在同设备、同日期、同班次的记录
	existing, err := s.inspectionRepo.GetByEquipmentAndShift(ctx, req.EquipmentID, inspectionDate, req.Shift)
	if err == nil && existing != nil {
		return nil, errors.New("该设备今日此班次已检查")
	}

	// 验证设备是否存在
	_, err = s.equipmentRepo.GetByID(ctx, req.EquipmentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("设备不存在")
		}
		return nil, err
	}

	// 创建检查记录
	record := &model.InspectionRecord{
		EquipmentID:     req.EquipmentID,
		InspectionDate:  inspectionDate,
		Shift:           req.Shift,
		InspectorName:   req.InspectorName,
		ProblemsFound:   req.ProblemsFound,
		ProblemsHandled: req.ProblemsHandled,
		LegacyIssues:    req.LegacyIssues,
		SignatureImage:  req.SignatureImage,
		OverallStatus:   "normal",
		ReviewStatus:    "pending",
	}
	// 只有当 InspectorID 有效时才设置
	if req.InspectorID > 0 {
		record.InspectorID = &req.InspectorID
	}

	// 计算检查结果
	totalItems := len(req.Details)
	normalCount := 0
	abnormalCount := 0

	for _, detail := range req.Details {
		if detail.Result == "normal" {
			normalCount++
		} else if detail.Result == "abnormal" {
			abnormalCount++
			record.OverallStatus = "abnormal"
		}
	}

	record.TotalItems = totalItems
	record.NormalCount = normalCount
	record.AbnormalCount = abnormalCount

	// 使用 repository 直接保存
	if err := s.inspectionRepo.Create(ctx, record); err != nil {
		return nil, err
	}

	// 保存明细
	for _, detail := range req.Details {
		d := &model.InspectionDetail{
			RecordID:      record.ID,
			StandardID:    &detail.StandardID,
			PartName:      detail.PartName,
			ItemName:      detail.ItemName,
			Result:        detail.Result,
			Remark:        detail.Remark,
			HasAttachment: false,
		}
		if err := s.inspectionRepo.CreateDetail(ctx, d); err != nil {
			return nil, err
		}
	}

	return record, nil
}

// GetInspection 获取检查记录详情
func (s *InspectionService) GetInspection(ctx context.Context, id int64) (*model.InspectionRecord, error) {
	return s.inspectionRepo.GetByID(ctx, id)
}

// GetInspectionList 获取检查记录列表
func (s *InspectionService) GetInspectionList(ctx context.Context, page, pageSize int, filters map[string]interface{}) ([]*model.InspectionRecord, int64, error) {
	offset := (page - 1) * pageSize
	return s.inspectionRepo.List(ctx, offset, pageSize, filters)
}

// GetTodayInspections 获取今日检查记录
func (s *InspectionService) GetTodayInspections(ctx context.Context) ([]*model.InspectionRecord, error) {
	return s.inspectionRepo.GetTodayInspections(ctx)
}

// GetInspectionByEquipment 获取设备检查记录列表
func (s *InspectionService) GetInspectionByEquipment(ctx context.Context, equipmentID int64, page, pageSize int) ([]*model.InspectionRecord, int64, error) {
	offset := (page - 1) * pageSize
	return s.inspectionRepo.GetByEquipmentID(ctx, equipmentID, offset, pageSize)
}

// GetStandardsByEquipmentType 获取设备类型的检查标准
func (s *InspectionService) GetStandardsByEquipmentType(ctx context.Context, equipmentType string) ([]*model.InspectionStandard, error) {
	return s.standardRepo.GetByEquipmentType(ctx, equipmentType)
}

// GetAllStandards 获取所有检查标准
func (s *InspectionService) GetAllStandards(ctx context.Context) ([]*model.InspectionStandard, error) {
	return s.standardRepo.GetAll(ctx)
}

// GetInspectionDetails 获取检查明细
func (s *InspectionService) GetInspectionDetails(ctx context.Context, recordID int64) ([]*model.InspectionDetail, error) {
	return s.inspectionRepo.GetDetailsByRecordID(ctx, recordID)
}

// GetInspectionAttachments 获取检查附件
func (s *InspectionService) GetInspectionAttachments(ctx context.Context, recordID int64) ([]*model.InspectionAttachment, error) {
	return s.inspectionRepo.GetAttachmentsByRecordID(ctx, recordID)
}

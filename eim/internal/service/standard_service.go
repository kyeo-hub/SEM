package service

import (
	"context"
	"errors"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
)

// StandardService 检查标准服务
type StandardService struct {
	standardRepo *repository.StandardRepository
}

// NewStandardService 创建检查标准服务实例
func NewStandardService(standardRepo *repository.StandardRepository) *StandardService {
	return &StandardService{
		standardRepo: standardRepo,
	}
}

// GetStandards 获取检查标准列表
func (s *StandardService) GetStandards(ctx context.Context, equipmentType string) ([]*model.InspectionStandard, error) {
	if equipmentType != "" {
		return s.standardRepo.GetByEquipmentType(ctx, equipmentType)
	}
	return s.standardRepo.GetAll(ctx)
}

// GetStandardsByEquipmentType 根据设备类型获取检查标准
func (s *StandardService) GetStandardsByEquipmentType(ctx context.Context, equipmentType string) ([]*model.InspectionStandard, error) {
	return s.standardRepo.GetByEquipmentType(ctx, equipmentType)
}

// GetEquipmentTypes 获取所有设备类型
func (s *StandardService) GetEquipmentTypes(ctx context.Context) ([]string, error) {
	return s.standardRepo.GetEquipmentTypes(ctx)
}

// CreateStandard 创建检查标准
func (s *StandardService) CreateStandard(ctx context.Context, standard *model.InspectionStandard) (*model.InspectionStandard, error) {
	// 验证必填字段
	if standard.EquipmentType == "" {
		return nil, errors.New("设备类型不能为空")
	}
	if standard.PartName == "" {
		return nil, errors.New("部位名称不能为空")
	}
	if standard.ItemName == "" {
		return nil, errors.New("检查项目不能为空")
	}
	if standard.Content == "" {
		return nil, errors.New("检查内容不能为空")
	}

	// 设置默认值
	if standard.Method == "" {
		standard.Method = "目视"
	}

	err := s.standardRepo.Create(ctx, standard)
	if err != nil {
		return nil, err
	}
	return standard, nil
}

// UpdateStandard 更新检查标准
func (s *StandardService) UpdateStandard(ctx context.Context, id int64, standard *model.InspectionStandard) (*model.InspectionStandard, error) {
	// 验证必填字段
	if standard.EquipmentType == "" {
		return nil, errors.New("设备类型不能为空")
	}
	if standard.PartName == "" {
		return nil, errors.New("部位名称不能为空")
	}
	if standard.ItemName == "" {
		return nil, errors.New("检查项目不能为空")
	}
	if standard.Content == "" {
		return nil, errors.New("检查内容不能为空")
	}

	// 检查标准是否存在
	existing, err := s.standardRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("标准不存在")
	}
	if existing == nil {
		return nil, errors.New("标准不存在")
	}

	// 更新字段
	existing.EquipmentType = standard.EquipmentType
	existing.PartName = standard.PartName
	existing.PartOrder = standard.PartOrder
	existing.ItemName = standard.ItemName
	existing.ItemOrder = standard.ItemOrder
	existing.Content = standard.Content
	existing.Method = standard.Method
	existing.LimitValue = standard.LimitValue
	existing.IsRequired = standard.IsRequired

	err = s.standardRepo.Update(ctx, existing)
	if err != nil {
		return nil, err
	}
	return existing, nil
}

// DeleteStandard 删除检查标准
func (s *StandardService) DeleteStandard(ctx context.Context, id int64) error {
	// 检查标准是否存在
	existing, err := s.standardRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("标准不存在")
	}
	if existing == nil {
		return errors.New("标准不存在")
	}

	return s.standardRepo.Delete(ctx, id)
}

// BulkCreateStandards 批量创建检查标准
func (s *StandardService) BulkCreateStandards(ctx context.Context, standards []*model.InspectionStandard) (int, error) {
	if len(standards) == 0 {
		return 0, errors.New("标准列表不能为空")
	}

	// 验证每条标准
	for i, standard := range standards {
		if standard.EquipmentType == "" {
			return 0, errors.New("第" + string(rune(i+1)) + "条标准：设备类型不能为空")
		}
		if standard.PartName == "" {
			return 0, errors.New("第" + string(rune(i+1)) + "条标准：部位名称不能为空")
		}
		if standard.ItemName == "" {
			return 0, errors.New("第" + string(rune(i+1)) + "条标准：检查项目不能为空")
		}
		if standard.Content == "" {
			return 0, errors.New("第" + string(rune(i+1)) + "条标准：检查内容不能为空")
		}
	}

	err := s.standardRepo.BulkCreate(ctx, standards)
	if err != nil {
		return 0, err
	}
	return len(standards), nil
}

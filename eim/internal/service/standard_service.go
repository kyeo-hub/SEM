package service

import (
	"context"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
)

// StandardService 点检标准服务
type StandardService struct {
	standardRepo *repository.StandardRepository
}

// NewStandardService 创建点检标准服务实例
func NewStandardService(standardRepo *repository.StandardRepository) *StandardService {
	return &StandardService{
		standardRepo: standardRepo,
	}
}

// GetStandards 获取点检标准列表
func (s *StandardService) GetStandards(ctx context.Context, equipmentType string) ([]*model.InspectionStandard, error) {
	if equipmentType != "" {
		return s.standardRepo.GetByEquipmentType(ctx, equipmentType)
	}
	return s.standardRepo.GetAll(ctx)
}

// GetStandardsByEquipmentType 根据设备类型获取点检标准
func (s *StandardService) GetStandardsByEquipmentType(ctx context.Context, equipmentType string) ([]*model.InspectionStandard, error) {
	return s.standardRepo.GetByEquipmentType(ctx, equipmentType)
}

// GetEquipmentTypes 获取所有设备类型
func (s *StandardService) GetEquipmentTypes(ctx context.Context) ([]string, error) {
	return s.standardRepo.GetEquipmentTypes(ctx)
}

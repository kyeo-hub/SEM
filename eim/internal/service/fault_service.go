package service

import (
	"context"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
)

// FaultLevelService 故障等级服务
type FaultLevelService struct {
	faultRepo *repository.FaultLevelRepository
}

// NewFaultLevelService 创建故障等级服务实例
func NewFaultLevelService(faultRepo *repository.FaultLevelRepository) *FaultLevelService {
	return &FaultLevelService{
		faultRepo: faultRepo,
	}
}

// GetFaultLevels 获取所有故障等级
func (s *FaultLevelService) GetFaultLevels(ctx context.Context) ([]*model.FaultLevel, error) {
	return s.faultRepo.GetAll(ctx)
}

// GetFaultLevelByCode 根据代码获取故障等级
func (s *FaultLevelService) GetFaultLevelByCode(ctx context.Context, code string) (*model.FaultLevel, error) {
	return s.faultRepo.GetByCode(ctx, code)
}

// GetAllowWorkLevels 获取允许作业的故障等级
func (s *FaultLevelService) GetAllowWorkLevels(ctx context.Context) ([]*model.FaultLevel, error) {
	return s.faultRepo.GetAllowWorkLevels(ctx)
}

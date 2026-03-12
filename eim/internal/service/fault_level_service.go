package service

import (
	"context"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
)

// FaultLevelService 故障等级服务
type FaultLevelService struct {
	faultLevelRepo *repository.FaultLevelRepository
}

// NewFaultLevelService 创建故障等级服务实例
func NewFaultLevelService(faultLevelRepo *repository.FaultLevelRepository) *FaultLevelService {
	return &FaultLevelService{
		faultLevelRepo: faultLevelRepo,
	}
}

// GetFaultLevels 获取故障等级列表
func (s *FaultLevelService) GetFaultLevels(ctx context.Context) ([]*model.FaultLevel, error) {
	return s.faultLevelRepo.GetAll(ctx)
}

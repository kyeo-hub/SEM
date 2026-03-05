package repository

import (
	"context"

	"github.com/kyeo-hub/eim/internal/model"
	"gorm.io/gorm"
)

// FaultLevelRepository 故障等级数据访问层
type FaultLevelRepository struct {
	db *gorm.DB
}

// NewFaultLevelRepository 创建故障等级仓库实例
func NewFaultLevelRepository(db *gorm.DB) *FaultLevelRepository {
	return &FaultLevelRepository{db: db}
}

// GetAll 获取所有故障等级
func (r *FaultLevelRepository) GetAll(ctx context.Context) ([]*model.FaultLevel, error) {
	var levels []*model.FaultLevel
	err := r.db.WithContext(ctx).Order("sort_order ASC").Find(&levels).Error
	return levels, err
}

// GetByCode 根据代码获取故障等级
func (r *FaultLevelRepository) GetByCode(ctx context.Context, code string) (*model.FaultLevel, error) {
	var level model.FaultLevel
	err := r.db.WithContext(ctx).Where("level_code = ?", code).First(&level).Error
	if err != nil {
		return nil, err
	}
	return &level, nil
}

// GetAllowWorkLevels 获取允许作业的故障等级
func (r *FaultLevelRepository) GetAllowWorkLevels(ctx context.Context) ([]*model.FaultLevel, error) {
	var levels []*model.FaultLevel
	err := r.db.WithContext(ctx).Where("allow_work = ?", true).Find(&levels).Error
	return levels, err
}

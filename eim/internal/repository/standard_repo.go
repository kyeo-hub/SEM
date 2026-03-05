package repository

import (
	"context"

	"github.com/kyeo-hub/eim/internal/model"
	"gorm.io/gorm"
)

// StandardRepository 点检标准数据访问层
type StandardRepository struct {
	db *gorm.DB
}

// NewStandardRepository 创建点检标准仓库实例
func NewStandardRepository(db *gorm.DB) *StandardRepository {
	return &StandardRepository{db: db}
}

// GetByEquipmentType 根据设备类型获取点检标准
func (r *StandardRepository) GetByEquipmentType(ctx context.Context, equipmentType string) ([]*model.InspectionStandard, error) {
	var standards []*model.InspectionStandard
	err := r.db.WithContext(ctx).
		Where("equipment_type = ?", equipmentType).
		Order("part_order ASC, item_order ASC").
		Find(&standards).Error
	return standards, err
}

// GetAll 获取所有点检标准
func (r *StandardRepository) GetAll(ctx context.Context) ([]*model.InspectionStandard, error) {
	var standards []*model.InspectionStandard
	err := r.db.WithContext(ctx).
		Order("equipment_type, part_order, item_order").
		Find(&standards).Error
	return standards, err
}

// GetByPart 根据部位获取点检标准
func (r *StandardRepository) GetByPart(ctx context.Context, equipmentType, partName string) ([]*model.InspectionStandard, error) {
	var standards []*model.InspectionStandard
	err := r.db.WithContext(ctx).
		Where("equipment_type = ? AND part_name = ?", equipmentType, partName).
		Order("item_order ASC").
		Find(&standards).Error
	return standards, err
}

// Create 创建点检标准
func (r *StandardRepository) Create(ctx context.Context, standard *model.InspectionStandard) error {
	return r.db.WithContext(ctx).Create(standard).Error
}

// BulkCreate 批量创建点检标准
func (r *StandardRepository) BulkCreate(ctx context.Context, standards []*model.InspectionStandard) error {
	return r.db.WithContext(ctx).Create(&standards).Error
}

// Update 更新点检标准
func (r *StandardRepository) Update(ctx context.Context, standard *model.InspectionStandard) error {
	return r.db.WithContext(ctx).Save(standard).Error
}

// Delete 删除点检标准
func (r *StandardRepository) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(&model.InspectionStandard{}, id).Error
}

// GetEquipmentTypes 获取所有设备类型（去重）
func (r *StandardRepository) GetEquipmentTypes(ctx context.Context) ([]string, error) {
	var types []string
	err := r.db.WithContext(ctx).
		Model(&model.InspectionStandard{}).
		Distinct().
		Pluck("equipment_type", &types).Error
	return types, err
}

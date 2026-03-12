package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/kyeo-hub/eim/internal/model"
	"gorm.io/gorm"
)

// EquipmentRepository 设备数据访问层
type EquipmentRepository struct {
	db *gorm.DB
}

// NewEquipmentRepository 创建设备仓库实例
func NewEquipmentRepository(db *gorm.DB) *EquipmentRepository {
	return &EquipmentRepository{db: db}
}

// Create 创建设备
func (r *EquipmentRepository) Create(ctx context.Context, eq *model.Equipment) error {
	return r.db.WithContext(ctx).Create(eq).Error
}

// GetByID 根据 ID 获取设备
func (r *EquipmentRepository) GetByID(ctx context.Context, id int64) (*model.Equipment, error) {
	var eq model.Equipment
	err := r.db.WithContext(ctx).Preload("FaultLevel").First(&eq, id).Error
	if err != nil {
		return nil, err
	}
	return &eq, nil
}

// GetByCode 根据编号获取设备
func (r *EquipmentRepository) GetByCode(ctx context.Context, code string) (*model.Equipment, error) {
	var eq model.Equipment
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&eq).Error
	if err != nil {
		return nil, err
	}
	return &eq, nil
}

// GetFaultLevel 根据 ID 获取故障等级
func (r *EquipmentRepository) GetFaultLevel(ctx context.Context, id int64) (*model.FaultLevel, error) {
	var fl model.FaultLevel
	err := r.db.WithContext(ctx).First(&fl, id).Error
	if err != nil {
		return nil, err
	}
	return &fl, nil
}

// List 获取设备列表
func (r *EquipmentRepository) List(ctx context.Context, offset, limit int, filters map[string]interface{}) ([]*model.Equipment, int64, error) {
	var equipments []*model.Equipment
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Equipment{})

	// 应用筛选条件
	for key, value := range filters {
		if value != nil && value != "" {
			query = query.Where(key+" = ?", value)
		}
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	err := query.Preload("FaultLevel").
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&equipments).Error

	return equipments, total, err
}

// Update 更新设备
func (r *EquipmentRepository) Update(ctx context.Context, eq *model.Equipment) error {
	eq.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(eq).Error
}

// Delete 删除设备（软删除）
func (r *EquipmentRepository) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(&model.Equipment{}, id).Error
}

// DeleteStatusHistory 删除设备状态历史
func (r *EquipmentRepository) DeleteStatusHistory(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Where("equipment_id = ?", id).Delete(&model.EquipmentStatusHistory{}).Error
}

// DeleteInspectionRecords 删除设备点检记录
func (r *EquipmentRepository) DeleteInspectionRecords(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Where("equipment_id = ?", id).Delete(&model.InspectionRecord{}).Error
}

// UpdateStatus 更新设备状态
func (r *EquipmentRepository) UpdateStatus(ctx context.Context, id int64, status string, faultLevelID *int64) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if faultLevelID != nil {
		updates["fault_level_id"] = *faultLevelID
	} else {
		updates["fault_level_id"] = nil
	}
	return r.db.WithContext(ctx).Model(&model.Equipment{}).Where("id = ?", id).Updates(updates).Error
}

// UpdateOperationInfo 更新作业信息
func (r *EquipmentRepository) UpdateOperationInfo(ctx context.Context, id int64, shipName, cargoName string) error {
	updates := map[string]interface{}{
		"current_ship":  shipName,
		"current_cargo": cargoName,
	}
	return r.db.WithContext(ctx).Model(&model.Equipment{}).Where("id = ?", id).Updates(updates).Error
}

// GetByStatus 根据状态获取设备列表
func (r *EquipmentRepository) GetByStatus(ctx context.Context, status string) ([]*model.Equipment, error) {
	var equipments []*model.Equipment
	err := r.db.WithContext(ctx).Where("status = ?", status).Find(&equipments).Error
	return equipments, err
}

// GetFaultEquipments 获取故障设备列表
func (r *EquipmentRepository) GetFaultEquipments(ctx context.Context) ([]*model.Equipment, error) {
	var equipments []*model.Equipment
	err := r.db.WithContext(ctx).
		Where("status = ?", "fault").
		Preload("FaultLevel").
		Find(&equipments).Error
	return equipments, err
}

// CountByStatus 按状态统计设备数量
func (r *EquipmentRepository) CountByStatus(ctx context.Context) (map[string]int64, error) {
	type StatusCount struct {
		Status string
		Count  int64
	}

	var results []StatusCount
	err := r.db.WithContext(ctx).
		Model(&model.Equipment{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	countMap := make(map[string]int64)
	for _, r := range results {
		countMap[r.Status] = r.Count
	}
	return countMap, nil
}

// Search 搜索设备
func (r *EquipmentRepository) Search(ctx context.Context, keyword string) ([]*model.Equipment, error) {
	var equipments []*model.Equipment
	searchPattern := fmt.Sprintf("%%%s%%", keyword)
	err := r.db.WithContext(ctx).
		Where("name LIKE ? OR code LIKE ? OR type LIKE ?", searchPattern, searchPattern, searchPattern).
		Find(&equipments).Error
	return equipments, err
}

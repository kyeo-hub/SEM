package repository

import (
	"context"
	"time"

	"github.com/kyeo-hub/eim/internal/model"
	"gorm.io/gorm"
)

// OperationRepository 作业记录数据访问层
type OperationRepository struct {
	db *gorm.DB
}

// NewOperationRepository 创建作业记录仓库实例
func NewOperationRepository(db *gorm.DB) *OperationRepository {
	return &OperationRepository{db: db}
}

// Create 创建作业记录
func (r *OperationRepository) Create(ctx context.Context, record *model.OperationRecord) error {
	return r.db.WithContext(ctx).Create(record).Error
}

// GetByID 根据 ID 获取作业记录
func (r *OperationRepository) GetByID(ctx context.Context, id int64) (*model.OperationRecord, error) {
	var record model.OperationRecord
	err := r.db.WithContext(ctx).Preload("FaultLevel").First(&record, id).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetByEquipmentID 根据设备 ID 获取作业记录列表
func (r *OperationRepository) GetByEquipmentID(ctx context.Context, equipmentID int64, offset, limit int) ([]*model.OperationRecord, int64, error) {
	var records []*model.OperationRecord
	var total int64

	query := r.db.WithContext(ctx).Model(&model.OperationRecord{}).Where("equipment_id = ?", equipmentID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Preload("FaultLevel").
		Offset(offset).
		Limit(limit).
		Order("start_time DESC").
		Find(&records).Error; err != nil {
		return nil, 0, err
	}

	return records, total, nil
}

// GetByDateRange 根据日期范围获取作业记录
func (r *OperationRepository) GetByDateRange(ctx context.Context, equipmentID int64, startDate, endDate time.Time) ([]*model.OperationRecord, error) {
	var records []*model.OperationRecord

	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND DATE(start_time) BETWEEN ? AND ?", equipmentID, startDate, endDate).
		Preload("FaultLevel").
		Order("start_time DESC").
		Find(&records).Error

	return records, err
}

// GetTodayRecords 获取今日作业记录
func (r *OperationRepository) GetTodayRecords(ctx context.Context, equipmentID int64) ([]*model.OperationRecord, error) {
	var records []*model.OperationRecord

	today := time.Now().Truncate(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND DATE(start_time) = ?", equipmentID, today).
		Preload("FaultLevel").
		Order("start_time DESC").
		Find(&records).Error

	return records, err
}

// Update 更新作业记录
func (r *OperationRepository) Update(ctx context.Context, record *model.OperationRecord) error {
	return r.db.WithContext(ctx).Save(record).Error
}

// UpdateStatus 更新作业状态
func (r *OperationRepository) UpdateStatus(ctx context.Context, id int64, status string, endTime *time.Time, duration int) error {
	updates := map[string]interface{}{
		"status":           status,
		"updated_at":       time.Now(),
		"duration_minutes": duration,
	}
	if endTime != nil {
		updates["end_time"] = endTime
	}

	return r.db.WithContext(ctx).Model(&model.OperationRecord{}).
		Where("id = ?", id).
		UpdateColumns(updates).Error
}

// GetStatistics 获取作业统计
func (r *OperationRepository) GetStatistics(ctx context.Context, equipmentID int64, startDate, endDate time.Time) (*OperationStatistics, error) {
	var stats OperationStatistics

	query := r.db.WithContext(ctx).
		Model(&model.OperationRecord{}).
		Where("equipment_id = ? AND start_time >= ? AND start_time <= ?", equipmentID, startDate, endDate)

	// 总作业次数
	query.Count(&stats.TotalCount)

	// 总作业时长
	query.Select("COALESCE(SUM(duration_minutes), 0)").Scan(&stats.TotalMinutes)

	// 总装卸吨位
	query.Select("COALESCE(SUM(cargo_weight), 0)").Scan(&stats.TotalCargoWeight)

	// 有故障的作业次数
	query.Where("has_fault = true").Count(&stats.FaultCount)

	return &stats, nil
}

// OperationStatistics 作业统计
type OperationStatistics struct {
	TotalCount      int64   `json:"total_count"`       // 总作业次数
	TotalMinutes    int     `json:"total_minutes"`     // 总作业时长（分钟）
	TotalCargoWeight float64 `json:"total_cargo_weight"` // 总装卸吨位
	FaultCount      int64   `json:"fault_count"`       // 有故障的作业次数
}

// GetAllByDateRange 根据日期范围获取所有设备的作业记录
func (r *OperationRepository) GetAllByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*model.OperationRecord, error) {
	var records []*model.OperationRecord

	err := r.db.WithContext(ctx).
		Where("start_time >= ? AND start_time <= ?", startDate, endDate).
		Preload("FaultLevel").
		Order("start_time DESC").
		Find(&records).Error

	return records, err
}

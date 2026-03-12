package repository

import (
	"context"
	"time"

	"github.com/kyeo-hub/eim/internal/model"
	"gorm.io/gorm"
)

// MaintenanceRepository 维保记录数据访问层
type MaintenanceRepository struct {
	db *gorm.DB
}

// NewMaintenanceRepository 创建维保记录仓库实例
func NewMaintenanceRepository(db *gorm.DB) *MaintenanceRepository {
	return &MaintenanceRepository{db: db}
}

// Create 创建维保记录
func (r *MaintenanceRepository) Create(ctx context.Context, record *model.MaintenanceRecord) error {
	return r.db.WithContext(ctx).Create(record).Error
}

// GetByID 根据 ID 获取维保记录
func (r *MaintenanceRepository) GetByID(ctx context.Context, id int64) (*model.MaintenanceRecord, error) {
	var record model.MaintenanceRecord
	err := r.db.WithContext(ctx).Preload("FaultLevel").First(&record, id).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetByEquipmentID 根据设备 ID 获取维保记录列表
func (r *MaintenanceRepository) GetByEquipmentID(ctx context.Context, equipmentID int64, offset, limit int) ([]*model.MaintenanceRecord, int64, error) {
	var records []*model.MaintenanceRecord
	var total int64

	query := r.db.WithContext(ctx).Model(&model.MaintenanceRecord{}).Where("equipment_id = ?", equipmentID)

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

// GetByDateRange 根据日期范围获取维保记录
func (r *MaintenanceRepository) GetByDateRange(ctx context.Context, equipmentID int64, startDate, endDate time.Time) ([]*model.MaintenanceRecord, error) {
	var records []*model.MaintenanceRecord

	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND DATE(start_time) BETWEEN ? AND ?", equipmentID, startDate, endDate).
		Preload("FaultLevel").
		Order("start_time DESC").
		Find(&records).Error

	return records, err
}

// GetTodayRecords 获取今日维保记录
func (r *MaintenanceRepository) GetTodayRecords(ctx context.Context, equipmentID int64) ([]*model.MaintenanceRecord, error) {
	var records []*model.MaintenanceRecord

	today := time.Now().Truncate(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND DATE(start_time) = ?", equipmentID, today).
		Preload("FaultLevel").
		Order("start_time DESC").
		Find(&records).Error

	return records, err
}

// Update 更新维保记录
func (r *MaintenanceRepository) Update(ctx context.Context, record *model.MaintenanceRecord) error {
	return r.db.WithContext(ctx).Save(record).Error
}

// UpdateStatus 更新维保状态
func (r *MaintenanceRepository) UpdateStatus(ctx context.Context, id int64, status string, endTime *time.Time, duration int) error {
	updates := map[string]interface{}{
		"status":           status,
		"updated_at":       time.Now(),
		"duration_minutes": duration,
	}
	if endTime != nil {
		updates["end_time"] = endTime
	}

	return r.db.WithContext(ctx).Model(&model.MaintenanceRecord{}).
		Where("id = ?", id).
		UpdateColumns(updates).Error
}

// CompleteMaintenance 完成维保（带结果）
func (r *MaintenanceRepository) CompleteMaintenance(ctx context.Context, id int64, result string, faultLevelID *int64, nextPlan string, endTime time.Time, duration int) error {
	updates := map[string]interface{}{
		"result":           result,
		"status":           "completed",
		"end_time":         endTime,
		"duration_minutes": duration,
		"updated_at":       time.Now(),
	}

	if faultLevelID != nil {
		updates["fault_level_id"] = faultLevelID
	}
	if nextPlan != "" {
		updates["next_plan"] = nextPlan
	}

	return r.db.WithContext(ctx).Model(&model.MaintenanceRecord{}).
		Where("id = ?", id).
		UpdateColumns(updates).Error
}

// GetStatistics 获取维保统计
func (r *MaintenanceRepository) GetStatistics(ctx context.Context, equipmentID int64, startDate, endDate time.Time) (*MaintenanceStatistics, error) {
	var stats MaintenanceStatistics

	query := r.db.WithContext(ctx).
		Model(&model.MaintenanceRecord{}).
		Where("equipment_id = ? AND start_time >= ? AND start_time <= ?", equipmentID, startDate, endDate)

	// 总维保次数
	query.Count(&stats.TotalCount)

	// 总维保时长
	query.Select("COALESCE(SUM(duration_minutes), 0)").Scan(&stats.TotalMinutes)

	// 按结果统计
	query.Where("result = ?", "resolved").Count(&stats.ResolvedCount)
	query.Where("result = ?", "partially_resolved").Count(&stats.PartiallyResolvedCount)
	query.Where("result = ?", "unresolved").Count(&stats.UnresolvedCount)

	return &stats, nil
}

// MaintenanceStatistics 维保统计
type MaintenanceStatistics struct {
	TotalCount            int64 `json:"total_count"`             // 总维保次数
	TotalMinutes          int   `json:"total_minutes"`           // 总维保时长（分钟）
	ResolvedCount         int64 `json:"resolved_count"`          // 全部解决次数
	PartiallyResolvedCount int64 `json:"partially_resolved_count"` // 部分解决次数
	UnresolvedCount       int64 `json:"unresolved_count"`        // 未解决次数
}

// GetAllByDateRange 根据日期范围获取所有设备的维保记录
func (r *MaintenanceRepository) GetAllByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*model.MaintenanceRecord, error) {
	var records []*model.MaintenanceRecord

	err := r.db.WithContext(ctx).
		Where("start_time >= ? AND start_time <= ?", startDate, endDate).
		Preload("FaultLevel").
		Order("start_time DESC").
		Find(&records).Error

	return records, err
}

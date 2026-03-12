package repository

import (
	"context"
	"time"

	"github.com/kyeo-hub/eim/internal/model"
	"gorm.io/gorm"
)

// EquipmentStatusHistoryRepository 设备状态历史数据访问层
type EquipmentStatusHistoryRepository struct {
	db *gorm.DB
}

// NewEquipmentStatusHistoryRepository 创建设备状态历史仓库实例
func NewEquipmentStatusHistoryRepository(db *gorm.DB) *EquipmentStatusHistoryRepository {
	return &EquipmentStatusHistoryRepository{db: db}
}

// Create 创建状态历史记录
func (r *EquipmentStatusHistoryRepository) Create(ctx context.Context, history *model.EquipmentStatusHistory) error {
	return r.db.WithContext(ctx).Create(history).Error
}

// GetByEquipmentID 根据设备 ID 获取状态历史列表
func (r *EquipmentStatusHistoryRepository) GetByEquipmentID(ctx context.Context, equipmentID int64, offset, limit int) ([]*model.EquipmentStatusHistory, int64, error) {
	var histories []*model.EquipmentStatusHistory
	var total int64

	query := r.db.WithContext(ctx).Model(&model.EquipmentStatusHistory{}).Where("equipment_id = ?", equipmentID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&histories).Error

	return histories, total, err
}

// GetByDateRange 根据日期范围获取状态历史
func (r *EquipmentStatusHistoryRepository) GetByDateRange(ctx context.Context, equipmentID int64, startDate, endDate time.Time) ([]*model.EquipmentStatusHistory, error) {
	var histories []*model.EquipmentStatusHistory

	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND created_at >= ? AND created_at <= ?", equipmentID, startDate, endDate).
		Order("created_at DESC").
		Find(&histories).Error

	return histories, err
}

// GetTodayRecords 获取今日状态历史记录
func (r *EquipmentStatusHistoryRepository) GetTodayRecords(ctx context.Context, equipmentID int64) ([]*model.EquipmentStatusHistory, error) {
	var histories []*model.EquipmentStatusHistory

	today := time.Now().Truncate(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND DATE(created_at) = ?", equipmentID, today).
		Order("created_at DESC").
		Find(&histories).Error

	return histories, err
}

// GetStatusDuration 获取指定状态的时长统计
func (r *EquipmentStatusHistoryRepository) GetStatusDuration(ctx context.Context, equipmentID int64, status string, startDate, endDate time.Time) (int, error) {
	var totalMinutes int

	err := r.db.WithContext(ctx).
		Model(&model.EquipmentStatusHistory{}).
		Where("equipment_id = ? AND new_status = ? AND created_at >= ? AND created_at <= ?", equipmentID, status, startDate, endDate).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Scan(&totalMinutes).Error

	return totalMinutes, err
}

// GetTodayStatusDuration 获取今日各状态时长
func (r *EquipmentStatusHistoryRepository) GetTodayStatusDuration(ctx context.Context, equipmentID int64) (*StatusDuration, error) {
	var duration StatusDuration

	today := time.Now().Truncate(24 * time.Hour)

	// 作业时长
	r.db.WithContext(ctx).
		Model(&model.EquipmentStatusHistory{}).
		Where("equipment_id = ? AND new_status = 'working' AND created_at >= ?", equipmentID, today).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Scan(&duration.WorkingMinutes)

	// 待命时长
	r.db.WithContext(ctx).
		Model(&model.EquipmentStatusHistory{}).
		Where("equipment_id = ? AND new_status = 'standby' AND created_at >= ?", equipmentID, today).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Scan(&duration.StandbyMinutes)

	// 维保时长
	r.db.WithContext(ctx).
		Model(&model.EquipmentStatusHistory{}).
		Where("equipment_id = ? AND new_status = 'maintenance' AND created_at >= ?", equipmentID, today).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Scan(&duration.MaintenanceMinutes)

	// 故障时长
	r.db.WithContext(ctx).
		Model(&model.EquipmentStatusHistory{}).
		Where("equipment_id = ? AND new_status = 'fault' AND created_at >= ?", equipmentID, today).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Scan(&duration.FaultMinutes)

	return &duration, nil
}

// GetMonthlyStatusDuration 获取本月各状态时长
func (r *EquipmentStatusHistoryRepository) GetMonthlyStatusDuration(ctx context.Context, equipmentID int64) (*StatusDuration, error) {
	var duration StatusDuration

	startOfMonth := time.Now().Truncate(24 * time.Hour).AddDate(0, 0, -time.Now().Day()+1)

	// 作业时长
	r.db.WithContext(ctx).
		Model(&model.EquipmentStatusHistory{}).
		Where("equipment_id = ? AND new_status = 'working' AND created_at >= ?", equipmentID, startOfMonth).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Scan(&duration.WorkingMinutes)

	// 待命时长
	r.db.WithContext(ctx).
		Model(&model.EquipmentStatusHistory{}).
		Where("equipment_id = ? AND new_status = 'standby' AND created_at >= ?", equipmentID, startOfMonth).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Scan(&duration.StandbyMinutes)

	// 维保时长
	r.db.WithContext(ctx).
		Model(&model.EquipmentStatusHistory{}).
		Where("equipment_id = ? AND new_status = 'maintenance' AND created_at >= ?", equipmentID, startOfMonth).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Scan(&duration.MaintenanceMinutes)

	// 故障时长
	r.db.WithContext(ctx).
		Model(&model.EquipmentStatusHistory{}).
		Where("equipment_id = ? AND new_status = 'fault' AND created_at >= ?", equipmentID, startOfMonth).
		Select("COALESCE(SUM(duration_minutes), 0)").
		Scan(&duration.FaultMinutes)

	return &duration, nil
}

// StatusDuration 状态时长统计
type StatusDuration struct {
	WorkingMinutes    int `json:"working_minutes"`     // 作业时长（分钟）
	StandbyMinutes    int `json:"standby_minutes"`     // 待命时长（分钟）
	MaintenanceMinutes int `json:"maintenance_minutes"` // 维保时长（分钟）
	FaultMinutes      int `json:"fault_minutes"`       // 故障时长（分钟）
}

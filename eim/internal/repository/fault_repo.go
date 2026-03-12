package repository

import (
	"context"
	"time"

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
	err := r.db.WithContext(ctx).Order("sort_order").Find(&levels).Error
	return levels, err
}

// FaultRepository 故障记录数据访问层
type FaultRepository struct {
	db *gorm.DB
}

// NewFaultRepository 创建故障记录仓库实例
func NewFaultRepository(db *gorm.DB) *FaultRepository {
	return &FaultRepository{db: db}
}

// Create 创建故障记录
func (r *FaultRepository) Create(ctx context.Context, record *model.FaultRecord) error {
	return r.db.WithContext(ctx).Create(record).Error
}

// GetByID 根据 ID 获取故障记录
func (r *FaultRepository) GetByID(ctx context.Context, id int64) (*model.FaultRecord, error) {
	var record model.FaultRecord
	err := r.db.WithContext(ctx).Preload("FaultLevel").Preload("Equipment").First(&record, id).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetByEquipmentID 根据设备 ID 获取故障记录列表
func (r *FaultRepository) GetByEquipmentID(ctx context.Context, equipmentID int64, offset, limit int) ([]*model.FaultRecord, int64, error) {
	var records []*model.FaultRecord
	var total int64

	query := r.db.WithContext(ctx).Model(&model.FaultRecord{}).Where("equipment_id = ?", equipmentID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Preload("FaultLevel").
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&records).Error; err != nil {
		return nil, 0, err
	}

	return records, total, nil
}

// GetByDateRange 根据日期范围获取故障记录
func (r *FaultRepository) GetByDateRange(ctx context.Context, equipmentID int64, startDate, endDate time.Time) ([]*model.FaultRecord, error) {
	var records []*model.FaultRecord

	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND created_at >= ? AND created_at <= ?", equipmentID, startDate, endDate).
		Preload("FaultLevel").
		Order("created_at DESC").
		Find(&records).Error

	return records, err
}

// GetTodayRecords 获取今日故障记录
func (r *FaultRepository) GetTodayRecords(ctx context.Context, equipmentID int64) ([]*model.FaultRecord, error) {
	var records []*model.FaultRecord

	today := time.Now().Truncate(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND DATE(created_at) = ?", equipmentID, today).
		Preload("FaultLevel").
		Order("created_at DESC").
		Find(&records).Error

	return records, err
}

// GetUnresolvedFaults 获取未解决的故障记录
func (r *FaultRepository) GetUnresolvedFaults(ctx context.Context, equipmentID int64) ([]*model.FaultRecord, error) {
	var records []*model.FaultRecord

	query := r.db.WithContext(ctx).
		Model(&model.FaultRecord{}).
		Where("status IN ?", []string{"open", "in_progress"})

	if equipmentID > 0 {
		query = query.Where("equipment_id = ?", equipmentID)
	}

	err := query.Preload("FaultLevel").Preload("Equipment").Order("created_at DESC").Find(&records).Error
	return records, err
}

// Update 更新故障记录
func (r *FaultRepository) Update(ctx context.Context, record *model.FaultRecord) error {
	return r.db.WithContext(ctx).Save(record).Error
}

// UpdateStatus 更新故障状态
func (r *FaultRepository) UpdateStatus(ctx context.Context, id int64, status string, resolvedAt *time.Time) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}
	if resolvedAt != nil {
		updates["resolved_at"] = resolvedAt
	}

	return r.db.WithContext(ctx).Model(&model.FaultRecord{}).
		Where("id = ?", id).
		UpdateColumns(updates).Error
}

// ResolveFault 解决故障
func (r *FaultRepository) ResolveFault(ctx context.Context, id int64, repairedBy, repairContent string, resolvedAt time.Time) error {
	updates := map[string]interface{}{
		"status":          "resolved",
		"repaired_at":     resolvedAt,
		"repaired_by":     repairedBy,
		"repair_content":  repairContent,
		"resolved_at":     resolvedAt,
		"resolved_by":     repairedBy,
		"updated_at":      time.Now(),
	}

	return r.db.WithContext(ctx).Model(&model.FaultRecord{}).
		Where("id = ?", id).
		UpdateColumns(updates).Error
}

// MarkWechatNotified 标记企业微信已通知
func (r *FaultRepository) MarkWechatNotified(ctx context.Context, id int64, notifyTime time.Time) error {
	updates := map[string]interface{}{
		"wechat_notified":  true,
		"wechat_notify_time": notifyTime,
		"updated_at":       time.Now(),
	}

	return r.db.WithContext(ctx).Model(&model.FaultRecord{}).
		Where("id = ?", id).
		UpdateColumns(updates).Error
}

// GetStatistics 获取故障统计
func (r *FaultRepository) GetStatistics(ctx context.Context, equipmentID int64, startDate, endDate time.Time) (*FaultStatistics, error) {
	var stats FaultStatistics

	query := r.db.WithContext(ctx).
		Model(&model.FaultRecord{}).
		Where("equipment_id = ? AND created_at >= ? AND created_at <= ?", equipmentID, startDate, endDate)

	// 总故障次数
	query.Count(&stats.TotalCount)

	// 按等级统计
	query.Where("fault_level_id = ?", 1).Count(&stats.L1Count) // L1
	query.Where("fault_level_id = ?", 2).Count(&stats.L2Count) // L2
	query.Where("fault_level_id = ?", 3).Count(&stats.L3Count) // L3

	// 按来源统计
	query.Where("source = ?", "operation").Count(&stats.FromOperationCount)    // 作业中发现
	query.Where("source = ?", "inspection").Count(&stats.FromInspectionCount)  // 点检中发现
	query.Where("source = ?", "manual").Count(&stats.FromManualCount)          // 手动登记

	// 已解决/未解决
	query.Where("status IN ?", []string{"resolved", "closed"}).Count(&stats.ResolvedCount)
	query.Where("status IN ?", []string{"open", "in_progress"}).Count(&stats.UnresolvedCount)

	return &stats, nil
}

// FaultStatistics 故障统计
type FaultStatistics struct {
	TotalCount          int64 `json:"total_count"`           // 总故障次数
	L1Count             int64 `json:"l1_count"`              // L1 严重故障次数
	L2Count             int64 `json:"l2_count"`              // L2 一般故障次数
	L3Count             int64 `json:"l3_count"`              // L3 轻微故障次数
	FromOperationCount  int64 `json:"from_operation_count"`  // 作业中发现次数
	FromInspectionCount int64 `json:"from_inspection_count"` // 点检中发现次数
	FromManualCount     int64 `json:"from_manual_count"`     // 手动登记次数
	ResolvedCount       int64 `json:"resolved_count"`        // 已解决次数
	UnresolvedCount     int64 `json:"unresolved_count"`      // 未解决次数
}

// GetAllByDateRange 根据日期范围获取所有设备的故障记录
func (r *FaultRepository) GetAllByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*model.FaultRecord, error) {
	var records []*model.FaultRecord

	err := r.db.WithContext(ctx).
		Where("created_at >= ? AND created_at <= ?", startDate, endDate).
		Preload("FaultLevel").
		Order("created_at DESC").
		Find(&records).Error

	return records, err
}

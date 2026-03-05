package repository

import (
	"context"
	"time"

	"github.com/kyeo-hub/eim/internal/model"
	"gorm.io/gorm"
)

// InspectionRepository 点检记录数据访问层
type InspectionRepository struct {
	db *gorm.DB
}

// NewInspectionRepository 创建点检记录仓库实例
func NewInspectionRepository(db *gorm.DB) *InspectionRepository {
	return &InspectionRepository{db: db}
}

// Create 创建点检记录
func (r *InspectionRepository) Create(ctx context.Context, record *model.InspectionRecord) error {
	return r.db.WithContext(ctx).Create(record).Error
}

// CreateDetail 创建点检明细
func (r *InspectionRepository) CreateDetail(ctx context.Context, detail *model.InspectionDetail) error {
	return r.db.WithContext(ctx).Create(detail).Error
}

// CreateDetails 批量创建点检明细
func (r *InspectionRepository) CreateDetails(ctx context.Context, details []*model.InspectionDetail) error {
	return r.db.WithContext(ctx).Create(&details).Error
}

// GetByID 根据 ID 获取点检记录
func (r *InspectionRepository) GetByID(ctx context.Context, id int64) (*model.InspectionRecord, error) {
	var record model.InspectionRecord
	err := r.db.WithContext(ctx).First(&record, id).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetByEquipmentID 根据设备 ID 获取点检记录列表
func (r *InspectionRepository) GetByEquipmentID(ctx context.Context, equipmentID int64, offset, limit int) ([]*model.InspectionRecord, int64, error) {
	var records []*model.InspectionRecord
	var total int64

	query := r.db.WithContext(ctx).Model(&model.InspectionRecord{}).Where("equipment_id = ?", equipmentID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Offset(offset).
		Limit(limit).
		Order("inspection_date DESC, shift DESC").
		Find(&records).Error

	return records, total, err
}

// GetByDate 根据日期获取点检记录
func (r *InspectionRepository) GetByDate(ctx context.Context, date time.Time) ([]*model.InspectionRecord, error) {
	var records []*model.InspectionRecord
	err := r.db.WithContext(ctx).
		Where("inspection_date = ?", date).
		Find(&records).Error
	return records, err
}

// GetByEquipmentAndDate 根据设备 ID 和日期获取点检记录
func (r *InspectionRepository) GetByEquipmentAndDate(ctx context.Context, equipmentID int64, date time.Time) ([]*model.InspectionRecord, error) {
	var records []*model.InspectionRecord
	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND inspection_date = ?", equipmentID, date).
		Find(&records).Error
	return records, err
}

// GetByEquipmentAndShift 根据设备 ID 和班次获取点检记录
func (r *InspectionRepository) GetByEquipmentAndShift(ctx context.Context, equipmentID int64, date time.Time, shift string) (*model.InspectionRecord, error) {
	var record model.InspectionRecord
	err := r.db.WithContext(ctx).
		Where("equipment_id = ? AND inspection_date = ? AND shift = ?", equipmentID, date, shift).
		First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetTodayInspections 获取今日点检记录
func (r *InspectionRepository) GetTodayInspections(ctx context.Context) ([]*model.InspectionRecord, error) {
	today := time.Now().Truncate(24 * time.Hour)
	var records []*model.InspectionRecord
	err := r.db.WithContext(ctx).
		Where("inspection_date = ?", today).
		Find(&records).Error
	return records, err
}

// List 获取点检记录列表（带筛选）
func (r *InspectionRepository) List(ctx context.Context, offset, limit int, filters map[string]interface{}) ([]*model.InspectionRecord, int64, error) {
	var records []*model.InspectionRecord
	var total int64

	query := r.db.WithContext(ctx).Model(&model.InspectionRecord{})

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
	err := query.
		Offset(offset).
		Limit(limit).
		Order("inspection_date DESC, created_at DESC").
		Find(&records).Error

	return records, total, err
}

// Update 更新点检记录
func (r *InspectionRepository) Update(ctx context.Context, record *model.InspectionRecord) error {
	return r.db.WithContext(ctx).Save(record).Error
}

// Delete 删除点检记录
func (r *InspectionRepository) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(&model.InspectionRecord{}, id).Error
}

// GetDetailsByRecordID 根据记录 ID 获取点检明细
func (r *InspectionRepository) GetDetailsByRecordID(ctx context.Context, recordID int64) ([]*model.InspectionDetail, error) {
	var details []*model.InspectionDetail
	err := r.db.WithContext(ctx).Where("record_id = ?", recordID).Find(&details).Error
	return details, err
}

// GetAttachmentsByRecordID 根据记录 ID 获取附件
func (r *InspectionRepository) GetAttachmentsByRecordID(ctx context.Context, recordID int64) ([]*model.InspectionAttachment, error) {
	var attachments []*model.InspectionAttachment
	err := r.db.WithContext(ctx).Where("record_id = ?", recordID).Find(&attachments).Error
	return attachments, err
}

// CreateAttachment 创建附件
func (r *InspectionRepository) CreateAttachment(ctx context.Context, attachment *model.InspectionAttachment) error {
	return r.db.WithContext(ctx).Create(attachment).Error
}

// GetByDateRange 根据日期范围获取点检记录
func (r *InspectionRepository) GetByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*model.InspectionRecord, error) {
	var records []*model.InspectionRecord
	err := r.db.WithContext(ctx).
		Where("inspection_date BETWEEN ? AND ?", startDate, endDate).
		Find(&records).Error
	return records, err
}

// CountByDateRange 统计日期范围内的点检记录数
func (r *InspectionRepository) CountByDateRange(ctx context.Context, startDate, endDate time.Time) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).
		Model(&model.InspectionRecord{}).
		Where("inspection_date BETWEEN ? AND ?", startDate, endDate).
		Count(&total).Error
	return total, err
}

// GetAbnormalRecordsByDateRange 获取日期范围内的异常记录
func (r *InspectionRepository) GetAbnormalRecordsByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*model.InspectionRecord, error) {
	var records []*model.InspectionRecord
	err := r.db.WithContext(ctx).
		Where("inspection_date BETWEEN ? AND ? AND overall_status = ?", startDate, endDate, "abnormal").
		Find(&records).Error
	return records, err
}

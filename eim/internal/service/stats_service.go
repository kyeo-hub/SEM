package service

import (
	"context"
	"time"

	"github.com/kyeo-hub/eim/internal/repository"
)

// StatsService 统计服务
type StatsService struct {
	equipmentRepo  *repository.EquipmentRepository
	inspectionRepo *repository.InspectionRepository
}

// NewStatsService 创建统计服务实例
func NewStatsService(
	equipmentRepo *repository.EquipmentRepository,
	inspectionRepo *repository.InspectionRepository,
) *StatsService {
	return &StatsService{
		equipmentRepo:  equipmentRepo,
		inspectionRepo: inspectionRepo,
	}
}

// DailyStats 每日统计
type DailyStats struct {
	Date              string `json:"date"`
	TotalEquipments   int64  `json:"total_equipments"`
	WorkingCount      int64  `json:"working_count"`
	StandbyCount      int64  `json:"standby_count"`
	MaintenanceCount  int64  `json:"maintenance_count"`
	FaultCount        int64  `json:"fault_count"`
	InspectionCount   int64  `json:"inspection_count"`
	AbnormalCount     int64  `json:"abnormal_count"`
}

// GetDailyStats 获取每日统计
func (s *StatsService) GetDailyStats(ctx context.Context, date string) (*DailyStats, error) {
	// 获取设备状态统计
	statusCount, err := s.equipmentRepo.CountByStatus(ctx)
	if err != nil {
		return nil, err
	}

	// 计算设备总数
	var totalEquipments int64
	for _, count := range statusCount {
		totalEquipments += count
	}

	// 获取今日点检统计
	today := time.Now().Truncate(24 * time.Hour)
	inspections, err := s.inspectionRepo.GetByDate(ctx, today)
	if err != nil {
		return nil, err
	}

	inspCount := int64(len(inspections))
	abnormalCount := int64(0)
	for _, insp := range inspections {
		if insp.OverallStatus == "abnormal" {
			abnormalCount++
		}
	}

	return &DailyStats{
		Date:              date,
		TotalEquipments:   totalEquipments,
		WorkingCount:      statusCount["working"],
		StandbyCount:      statusCount["standby"],
		MaintenanceCount:  statusCount["maintenance"],
		FaultCount:        statusCount["fault"],
		InspectionCount:   inspCount,
		AbnormalCount:     abnormalCount,
	}, nil
}

// WeeklyStats 每周统计
type WeeklyStats struct {
	WeekStart         string `json:"week_start"`
	WeekEnd           string `json:"week_end"`
	TotalInspections  int64  `json:"total_inspections"`
	AbnormalCount     int64  `json:"abnormal_count"`
	AvgInspectionsPerDay float64 `json:"avg_inspections_per_day"`
}

// GetWeeklyStats 获取每周统计
func (s *StatsService) GetWeeklyStats(ctx context.Context) (*WeeklyStats, error) {
	now := time.Now()
	// 计算本周开始（周一）
	weekStart := now.AddDate(0, 0, -int(now.Weekday())+1).Truncate(24 * time.Hour)
	if now.Weekday() == 0 {
		weekStart = weekStart.AddDate(0, 0, -6)
	}
	weekEnd := weekStart.AddDate(0, 0, 6)

	// 统计本周点检记录
	totalInsp, err := s.inspectionRepo.CountByDateRange(ctx, weekStart, weekEnd)
	if err != nil {
		return nil, err
	}

	abnormalRecords, err := s.inspectionRepo.GetAbnormalRecordsByDateRange(ctx, weekStart, weekEnd)
	if err != nil {
		return nil, err
	}

	abnormalCount := int64(len(abnormalRecords))

	// 计算日均点检数
	days := 7
	avgPerDay := float64(totalInsp) / float64(days)

	return &WeeklyStats{
		WeekStart:         weekStart.Format("2006-01-02"),
		WeekEnd:           weekEnd.Format("2006-01-02"),
		TotalInspections:  totalInsp,
		AbnormalCount:     abnormalCount,
		AvgInspectionsPerDay: avgPerDay,
	}, nil
}

// MonthlyStats 每月统计
type MonthlyStats struct {
	Month             string `json:"month"`
	TotalInspections  int64  `json:"total_inspections"`
	AbnormalCount     int64  `json:"abnormal_count"`
	AvgInspectionsPerDay float64 `json:"avg_inspections_per_day"`
	TotalEquipments   int64  `json:"total_equipments"`
}

// GetMonthlyStats 获取每月统计
func (s *StatsService) GetMonthlyStats(ctx context.Context, year, month int) (*MonthlyStats, error) {
	// 计算月份开始和结束
	monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	monthEnd := monthStart.AddDate(0, 1, 0).Add(-time.Second)

	// 统计月点检记录
	totalInsp, err := s.inspectionRepo.CountByDateRange(ctx, monthStart, monthEnd)
	if err != nil {
		return nil, err
	}

	abnormalRecords, err := s.inspectionRepo.GetAbnormalRecordsByDateRange(ctx, monthStart, monthEnd)
	if err != nil {
		return nil, err
	}

	abnormalCount := int64(len(abnormalRecords))

	// 计算日均点检数
	days := monthEnd.Day()
	avgPerDay := float64(totalInsp) / float64(days)

	// 获取设备总数
	statusCount, err := s.equipmentRepo.CountByStatus(ctx)
	if err != nil {
		return nil, err
	}
	var totalEquipments int64
	for _, count := range statusCount {
		totalEquipments += count
	}

	return &MonthlyStats{
		Month:              monthStart.Format("2006-01"),
		TotalInspections:   totalInsp,
		AbnormalCount:      abnormalCount,
		AvgInspectionsPerDay: avgPerDay,
		TotalEquipments:    totalEquipments,
	}, nil
}

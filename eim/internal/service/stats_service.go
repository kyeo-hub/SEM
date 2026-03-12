package service

import (
	"context"
	"time"

	"github.com/kyeo-hub/eim/internal/repository"
)

// StatsService 统计服务
type StatsService struct {
	operationRepo     *repository.OperationRepository
	maintenanceRepo   *repository.MaintenanceRepository
	faultRepo         *repository.FaultRepository
	statusHistoryRepo *repository.EquipmentStatusHistoryRepository
	equipmentRepo     *repository.EquipmentRepository
}

// NewStatsService 创建统计服务实例
func NewStatsService(
	operationRepo *repository.OperationRepository,
	maintenanceRepo *repository.MaintenanceRepository,
	faultRepo *repository.FaultRepository,
	statusHistoryRepo *repository.EquipmentStatusHistoryRepository,
	equipmentRepo *repository.EquipmentRepository,
) *StatsService {
	return &StatsService{
		operationRepo:     operationRepo,
		maintenanceRepo:   maintenanceRepo,
		faultRepo:         faultRepo,
		statusHistoryRepo: statusHistoryRepo,
		equipmentRepo:     equipmentRepo,
	}
}

// EquipmentStats 设备统计
type EquipmentStats struct {
	TotalCount       int64 `json:"total_count"`        // 设备总数
	WorkingCount     int64 `json:"working_count"`      // 作业中
	StandbyCount     int64 `json:"standby_count"`      // 待命
	MaintenanceCount int64 `json:"maintenance_count"`  // 维保中
	FaultCount       int64 `json:"fault_count"`        // 故障
}

// OperationStats 作业统计
type OperationStats struct {
	TotalCount       int64   `json:"total_count"`         // 总作业次数
	TotalMinutes     int     `json:"total_minutes"`       // 总作业时长（分钟）
	TotalCargoWeight float64 `json:"total_cargo_weight"`  // 总装卸吨位
	FaultCount       int64   `json:"fault_count"`         // 有故障的作业次数
	AverageDuration  float64 `json:"average_duration"`    // 平均作业时长（分钟）
}

// MaintenanceStats 维保统计
type MaintenanceStats struct {
	TotalCount             int64 `json:"total_count"`              // 总维保次数
	TotalMinutes           int   `json:"total_minutes"`            // 总维保时长（分钟）
	ResolvedCount          int64 `json:"resolved_count"`           // 全部解决
	PartiallyResolvedCount int64 `json:"partially_resolved_count"` // 部分解决
	UnresolvedCount        int64 `json:"unresolved_count"`         // 未解决
	AverageDuration        float64 `json:"average_duration"`       // 平均维保时长（分钟）
}

// FaultStats 故障统计
type FaultStats struct {
	TotalCount          int64 `json:"total_count"`           // 总故障次数
	L1Count             int64 `json:"l1_count"`              // L1 严重故障
	L2Count             int64 `json:"l2_count"`              // L2 一般故障
	L3Count             int64 `json:"l3_count"`              // L3 轻微故障
	ResolvedCount       int64 `json:"resolved_count"`        // 已解决
	UnresolvedCount     int64 `json:"unresolved_count"`      // 未解决
	FromOperationCount  int64 `json:"from_operation_count"`  // 作业中发现
	FromInspectionCount int64 `json:"from_inspection_count"` // 点检中发现
	FromManualCount     int64 `json:"from_manual_count"`     // 手动登记
}

// StatusDurationStats 状态时长统计
type StatusDurationStats struct {
	WorkingMinutes    int `json:"working_minutes"`      // 作业时长（分钟）
	StandbyMinutes    int `json:"standby_minutes"`      // 待命时长（分钟）
	MaintenanceMinutes int `json:"maintenance_minutes"`  // 维保时长（分钟）
	FaultMinutes      int `json:"fault_minutes"`        // 故障时长（分钟）
	TotalMinutes      int `json:"total_minutes"`        // 总时长（分钟）
	UtilizationRate   float64 `json:"utilization_rate"` // 设备利用率（%）
}

// GetEquipmentStats 获取设备统计
func (s *StatsService) GetEquipmentStats(ctx context.Context) (*EquipmentStats, error) {
	equipments, _, err := s.equipmentRepo.List(ctx, 0, 10000, nil)
	if err != nil {
		return nil, err
	}

	stats := &EquipmentStats{}
	stats.TotalCount = int64(len(equipments))

	for _, eq := range equipments {
		switch eq.Status {
		case "working":
			stats.WorkingCount++
		case "standby":
			stats.StandbyCount++
		case "maintenance":
			stats.MaintenanceCount++
		case "fault":
			stats.FaultCount++
		}
	}

	return stats, nil
}

// GetOperationStats 获取作业统计（今日）
func (s *StatsService) GetOperationStats(ctx context.Context, equipmentID int64) (*OperationStats, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	tomorrow := today.Add(24 * time.Hour)

	stats := &OperationStats{}

	if equipmentID > 0 {
		// 单个设备统计
		records, err := s.operationRepo.GetByDateRange(ctx, equipmentID, today, tomorrow)
		if err != nil {
			return nil, err
		}

		for _, r := range records {
			stats.TotalCount++
			stats.TotalMinutes += r.DurationMinutes
			stats.TotalCargoWeight += r.CargoWeight
			if r.HasFault {
				stats.FaultCount++
			}
		}
	} else {
		// 所有设备统计 - 需要实现 GetAllStats 方法
		// 暂时返回空统计
	}

	if stats.TotalCount > 0 {
		stats.AverageDuration = float64(stats.TotalMinutes) / float64(stats.TotalCount)
	}

	return stats, nil
}

// GetMaintenanceStats 获取维保统计（今日）
func (s *StatsService) GetMaintenanceStats(ctx context.Context, equipmentID int64) (*MaintenanceStats, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	tomorrow := today.Add(24 * time.Hour)

	stats := &MaintenanceStats{}

	if equipmentID > 0 {
		records, err := s.maintenanceRepo.GetByDateRange(ctx, equipmentID, today, tomorrow)
		if err != nil {
			return nil, err
		}

		for _, r := range records {
			stats.TotalCount++
			stats.TotalMinutes += r.DurationMinutes
			switch r.Result {
			case "resolved":
				stats.ResolvedCount++
			case "partially_resolved":
				stats.PartiallyResolvedCount++
			case "unresolved":
				stats.UnresolvedCount++
			}
		}
	}

	if stats.TotalCount > 0 {
		stats.AverageDuration = float64(stats.TotalMinutes) / float64(stats.TotalCount)
	}

	return stats, nil
}

// GetFaultStats 获取故障统计（今日）
func (s *StatsService) GetFaultStats(ctx context.Context, equipmentID int64) (*FaultStats, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	tomorrow := today.Add(24 * time.Hour)

	stats := &FaultStats{}

	if equipmentID > 0 {
		records, err := s.faultRepo.GetByDateRange(ctx, equipmentID, today, tomorrow)
		if err != nil {
			return nil, err
		}

		for _, r := range records {
			stats.TotalCount++
			switch r.FaultLevelID {
			case 1:
				stats.L1Count++
			case 2:
				stats.L2Count++
			case 3:
				stats.L3Count++
			}
			switch r.Status {
			case "resolved", "closed":
				stats.ResolvedCount++
			case "open", "in_progress":
				stats.UnresolvedCount++
			}
			switch r.Source {
			case "operation":
				stats.FromOperationCount++
			case "inspection":
				stats.FromInspectionCount++
			case "manual":
				stats.FromManualCount++
			}
		}
	}

	return stats, nil
}

// GetStatusDurationStats 获取状态时长统计（今日）
func (s *StatsService) GetStatusDurationStats(ctx context.Context, equipmentID int64) (*StatusDurationStats, error) {
	stats := &StatusDurationStats{}

	if equipmentID > 0 {
		duration, err := s.statusHistoryRepo.GetTodayStatusDuration(ctx, equipmentID)
		if err != nil {
			return nil, err
		}

		stats.WorkingMinutes = duration.WorkingMinutes
		stats.StandbyMinutes = duration.StandbyMinutes
		stats.MaintenanceMinutes = duration.MaintenanceMinutes
		stats.FaultMinutes = duration.FaultMinutes
		stats.TotalMinutes = stats.WorkingMinutes + stats.StandbyMinutes + stats.MaintenanceMinutes + stats.FaultMinutes

		if stats.TotalMinutes > 0 {
			stats.UtilizationRate = float64(stats.WorkingMinutes) / float64(stats.TotalMinutes) * 100
		}
	}

	return stats, nil
}

// GetMonthlyStatusDurationStats 获取状态时长统计（本月）
func (s *StatsService) GetMonthlyStatusDurationStats(ctx context.Context, equipmentID int64) (*StatusDurationStats, error) {
	stats := &StatusDurationStats{}

	if equipmentID > 0 {
		duration, err := s.statusHistoryRepo.GetMonthlyStatusDuration(ctx, equipmentID)
		if err != nil {
			return nil, err
		}

		stats.WorkingMinutes = duration.WorkingMinutes
		stats.StandbyMinutes = duration.StandbyMinutes
		stats.MaintenanceMinutes = duration.MaintenanceMinutes
		stats.FaultMinutes = duration.FaultMinutes
		stats.TotalMinutes = stats.WorkingMinutes + stats.StandbyMinutes + stats.MaintenanceMinutes + stats.FaultMinutes

		if stats.TotalMinutes > 0 {
			stats.UtilizationRate = float64(stats.WorkingMinutes) / float64(stats.TotalMinutes) * 100
		}
	}

	return stats, nil
}

// GetOperationStatsByDateRange 获取指定日期范围的作业统计
func (s *StatsService) GetOperationStatsByDateRange(ctx context.Context, equipmentID int64, startDate, endDate time.Time) (*OperationStats, error) {
	stats := &OperationStats{}

	if equipmentID > 0 {
		records, err := s.operationRepo.GetByDateRange(ctx, equipmentID, startDate, endDate)
		if err != nil {
			return nil, err
		}

		for _, r := range records {
			stats.TotalCount++
			stats.TotalMinutes += r.DurationMinutes
			stats.TotalCargoWeight += r.CargoWeight
			if r.HasFault {
				stats.FaultCount++
			}
		}
	} else {
		// 所有设备统计
		records, err := s.operationRepo.GetAllByDateRange(ctx, startDate, endDate)
		if err != nil {
			return nil, err
		}

		for _, r := range records {
			stats.TotalCount++
			stats.TotalMinutes += r.DurationMinutes
			stats.TotalCargoWeight += r.CargoWeight
			if r.HasFault {
				stats.FaultCount++
			}
		}
	}

	if stats.TotalCount > 0 {
		stats.AverageDuration = float64(stats.TotalMinutes) / float64(stats.TotalCount)
	}

	return stats, nil
}

// GetFaultStatsByDateRange 获取指定日期范围的故障统计
func (s *StatsService) GetFaultStatsByDateRange(ctx context.Context, equipmentID int64, startDate, endDate time.Time) (*FaultStats, error) {
	stats := &FaultStats{}

	if equipmentID > 0 {
		records, err := s.faultRepo.GetByDateRange(ctx, equipmentID, startDate, endDate)
		if err != nil {
			return nil, err
		}

		for _, r := range records {
			stats.TotalCount++
			switch r.FaultLevelID {
			case 1:
				stats.L1Count++
			case 2:
				stats.L2Count++
			case 3:
				stats.L3Count++
			}
			switch r.Status {
			case "resolved", "closed":
				stats.ResolvedCount++
			case "open", "in_progress":
				stats.UnresolvedCount++
			}
			switch r.Source {
			case "operation":
				stats.FromOperationCount++
			case "inspection":
				stats.FromInspectionCount++
			case "manual":
				stats.FromManualCount++
			}
		}
	} else {
		// 所有设备统计
		records, err := s.faultRepo.GetAllByDateRange(ctx, startDate, endDate)
		if err != nil {
			return nil, err
		}

		for _, r := range records {
			stats.TotalCount++
			switch r.FaultLevelID {
			case 1:
				stats.L1Count++
			case 2:
				stats.L2Count++
			case 3:
				stats.L3Count++
			}
			switch r.Status {
			case "resolved", "closed":
				stats.ResolvedCount++
			case "open", "in_progress":
				stats.UnresolvedCount++
			}
			switch r.Source {
			case "operation":
				stats.FromOperationCount++
			case "inspection":
				stats.FromInspectionCount++
			case "manual":
				stats.FromManualCount++
			}
		}
	}

	return stats, nil
}

// GetMaintenanceStatsByDateRange 获取指定日期范围的维保统计
func (s *StatsService) GetMaintenanceStatsByDateRange(ctx context.Context, equipmentID int64, startDate, endDate time.Time) (*MaintenanceStats, error) {
	stats := &MaintenanceStats{}

	if equipmentID > 0 {
		records, err := s.maintenanceRepo.GetByDateRange(ctx, equipmentID, startDate, endDate)
		if err != nil {
			return nil, err
		}

		for _, r := range records {
			stats.TotalCount++
			stats.TotalMinutes += r.DurationMinutes
			switch r.Result {
			case "resolved":
				stats.ResolvedCount++
			case "partially_resolved":
				stats.PartiallyResolvedCount++
			case "unresolved":
				stats.UnresolvedCount++
			}
		}
	} else {
		// 所有设备统计
		records, err := s.maintenanceRepo.GetAllByDateRange(ctx, startDate, endDate)
		if err != nil {
			return nil, err
		}

		for _, r := range records {
			stats.TotalCount++
			stats.TotalMinutes += r.DurationMinutes
			switch r.Result {
			case "resolved":
				stats.ResolvedCount++
			case "partially_resolved":
				stats.PartiallyResolvedCount++
			case "unresolved":
				stats.UnresolvedCount++
			}
		}
	}

	if stats.TotalCount > 0 {
		stats.AverageDuration = float64(stats.TotalMinutes) / float64(stats.TotalCount)
	}

	return stats, nil
}

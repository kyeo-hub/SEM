package model

import (
	"time"
)

// User 用户
type User struct {
	ID           int64      `gorm:"primaryKey" json:"id"`
	Username     string     `gorm:"size:50;uniqueIndex" json:"username"`
	PasswordHash string     `gorm:"size:100" json:"-"`
	Role         string     `gorm:"size:20" json:"role"` // admin/inspector/supervisor/operator
	RoleID       *int64     `json:"role_id"`             // 关联角色表 ID
	RealName     string     `gorm:"size:50" json:"real_name"`
	Department   string     `gorm:"size:50" json:"department"`
	Phone        string     `gorm:"size:20" json:"phone"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `gorm:"index" json:"-"`
}

// TableName 表名
func (User) TableName() string {
	return "users"
}

// FaultLevel 故障等级
type FaultLevel struct {
	ID          int64     `gorm:"primaryKey" json:"id"`
	LevelCode   string    `gorm:"size:10;uniqueIndex" json:"level_code"` // L1/L2/L3
	LevelName   string    `gorm:"size:50" json:"level_name"`
	Description string    `gorm:"type:text" json:"description"`
	AllowWork   bool      `gorm:"default:false" json:"allow_work"`
	Color       string    `gorm:"size:20" json:"color"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}

func (FaultLevel) TableName() string {
	return "fault_level"
}

// Equipment 设备
type Equipment struct {
	ID                  int64      `gorm:"primaryKey" json:"id"`
	Code                string     `gorm:"size:50;uniqueIndex" json:"code"`
	Name                string     `gorm:"size:100" json:"name"`
	Type                string     `gorm:"size:50" json:"type"`
	Company             string     `gorm:"size:100" json:"company"`
	Location            string     `gorm:"size:200" json:"location"`
	Latitude            float64    `gorm:"type:decimal(10,8)" json:"latitude"`
	Longitude           float64    `gorm:"type:decimal(11,8)" json:"longitude"`
	Status              string     `gorm:"size:20" json:"status"` // working/standby/maintenance/fault
	FaultLevelID        *int64     `json:"fault_level_id"`
	FaultLevel          *FaultLevel `gorm:"foreignKey:FaultLevelID" json:"fault_level,omitempty"`
	WorkScene           string     `gorm:"size:20;default:'yard'" json:"work_scene"` // wharf(码头)/yard(货场)
	CurrentShip         string     `gorm:"size:100" json:"current_ship"`
	CurrentCargo        string     `gorm:"size:100" json:"current_cargo"`
	QrCodeUUID          string     `gorm:"size:100;uniqueIndex" json:"qr_code_uuid"`
	InspectionEnabled   bool       `gorm:"default:true" json:"inspection_enabled"`
	InspectionFrequency string     `gorm:"size:20" json:"inspection_frequency"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	DeletedAt           *time.Time `gorm:"index" json:"-"`
}

func (Equipment) TableName() string {
	return "equipment"
}

// InspectionStandard 检查标准
type InspectionStandard struct {
	ID            int64     `gorm:"primaryKey" json:"id"`
	EquipmentType string    `gorm:"size:50" json:"equipment_type"`
	PartName      string    `gorm:"size:50" json:"part_name"`
	PartOrder     int       `json:"part_order"`
	ItemName      string    `gorm:"size:50" json:"item_name"`
	ItemOrder     int       `json:"item_order"`
	Content       string    `gorm:"size:100" json:"content"`
	Method        string    `gorm:"size:20" json:"method"`
	LimitValue    string    `gorm:"size:200" json:"limit_value"`
	IsRequired    bool      `gorm:"default:true" json:"is_required"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (InspectionStandard) TableName() string {
	return "inspection_standard"
}

// InspectionRecord 检查记录 (主表)
type InspectionRecord struct {
	ID              int64      `gorm:"primaryKey" json:"id"`
	EquipmentID     int64      `json:"equipment_id"`
	InspectionDate  time.Time  `gorm:"type:date" json:"inspection_date"`
	Shift           string     `gorm:"size:10" json:"shift"` // before/during/handover
	InspectorID     *int64     `json:"inspector_id"`
	InspectorName   string     `gorm:"size:50" json:"inspector_name"`
	TotalItems      int        `json:"total_items"`
	NormalCount     int        `json:"normal_count"`
	AbnormalCount   int        `json:"abnormal_count"`
	OverallStatus   string     `gorm:"size:10" json:"overall_status"`
	ProblemsFound   string     `gorm:"type:text" json:"problems_found"`
	ProblemsHandled string     `gorm:"type:text" json:"problems_handled"`
	LegacyIssues    string     `gorm:"type:text" json:"legacy_issues"`
	SignatureImage  string     `gorm:"size:200" json:"signature_image"`
	ReviewedBy      *int64     `json:"reviewed_by"`
	ReviewedAt      *time.Time `json:"reviewed_at"`
	ReviewStatus    string     `gorm:"size:20" json:"review_status"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (InspectionRecord) TableName() string {
	return "inspection_record"
}

// InspectionDetail 检查明细
type InspectionDetail struct {
	ID            int64     `gorm:"primaryKey" json:"id"`
	RecordID      int64     `json:"record_id"`
	StandardID    *int64    `json:"standard_id"`
	PartName      string    `gorm:"size:50" json:"part_name"`
	ItemName      string    `gorm:"size:50" json:"item_name"`
	Result        string    `gorm:"size:10" json:"result"` // normal/abnormal/skip
	Remark        string    `gorm:"size:500" json:"remark"`
	HasAttachment bool      `json:"has_attachment"`
	CreatedAt     time.Time `json:"created_at"`
}

func (InspectionDetail) TableName() string {
	return "inspection_detail"
}

// InspectionAttachment 检查附件
type InspectionAttachment struct {
	ID           int64     `gorm:"primaryKey" json:"id"`
	RecordID     int64     `json:"record_id"`
	DetailID     *int64    `json:"detail_id"`
	FileURL      string    `gorm:"size:500" json:"file_url"`
	FileName     string    `gorm:"size:200" json:"file_name"`
	FileSize     int64     `json:"file_size"`
	FileType     string    `gorm:"size:50" json:"file_type"`
	PartName     string    `gorm:"size:50" json:"part_name"`
	ItemName     string    `gorm:"size:50" json:"item_name"`
	UploadedBy   string    `gorm:"size:50" json:"uploaded_by"`
	UploadedAt   time.Time `json:"uploaded_at"`
}

func (InspectionAttachment) TableName() string {
	return "inspection_attachment"
}

// OperationRecord 作业记录
type OperationRecord struct {
	ID              int64      `gorm:"primaryKey" json:"id"`
	EquipmentID     int64      `gorm:"index" json:"equipment_id"`
	ShipName        string     `gorm:"size:100" json:"ship_name"`          // 船名（可选）
	CargoName       string     `gorm:"size:100" json:"cargo_name"`         // 货品名称（可选）
	CargoWeight     float64    `gorm:"type:decimal(10,2)" json:"cargo_weight"` // 装卸吨位（可选）
	StartTime       time.Time  `gorm:"index" json:"start_time"`            // 作业开始时间
	EndTime         *time.Time `gorm:"index" json:"end_time"`              // 作业结束时间
	DurationMinutes int        `json:"duration_minutes"`                   // 作业时长（分钟）
	OperatorName    string     `gorm:"size:50" json:"operator_name"`       // 操作人姓名
	OperatorID      *int64     `json:"operator_id"`                        // 操作人 ID（可选）
	HasFault        bool       `gorm:"default:false" json:"has_fault"`     // 是否有故障
	FaultLevelID    *int64     `json:"fault_level_id"`                     // 故障等级
	FaultLevel      *FaultLevel `gorm:"foreignKey:FaultLevelID" json:"fault_level,omitempty"`
	FaultDescription string    `gorm:"type:text" json:"fault_description"` // 故障描述
	Status          string     `gorm:"size:20;index" json:"status"`        // working/completed
	QrScan          bool       `gorm:"default:true" json:"qr_scan"`        // 是否通过扫码变更
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (OperationRecord) TableName() string {
	return "operation_record"
}

// MaintenanceRecord 维保记录
type MaintenanceRecord struct {
	ID                 int64      `gorm:"primaryKey" json:"id"`
	EquipmentID        int64      `gorm:"index" json:"equipment_id"`
	MaintenanceType    string     `gorm:"size:20;index" json:"maintenance_type"` // daily/repair/periodic/emergency
	PlanContent        string     `gorm:"type:text" json:"plan_content"`         // 计划维保内容
	ActualContent      string     `gorm:"type:text" json:"actual_content"`       // 实际完成的维保工作
	Result             string     `gorm:"size:20" json:"result"`                 // resolved/partially_resolved/unresolved
	FaultLevelID       *int64     `json:"fault_level_id"`                        // 维保后的故障等级
	FaultLevel         *FaultLevel `gorm:"foreignKey:FaultLevelID" json:"fault_level,omitempty"`
	NextPlan           string     `gorm:"type:text" json:"next_plan"`            // 后续计划
	StartTime          time.Time  `gorm:"index" json:"start_time"`               // 维保开始时间
	EndTime            *time.Time `gorm:"index" json:"end_time"`                 // 维保结束时间
	DurationMinutes    int        `json:"duration_minutes"`                      // 维保时长（分钟）
	MaintainerName     string     `gorm:"size:50" json:"maintainer_name"`        // 维保人姓名
	MaintainerID       *int64     `json:"maintainer_id"`                         // 维保人 ID（可选）
	MaintainerSignature string    `gorm:"type:text" json:"maintainer_signature"` // 维保人电子签名
	AcceptorName       string     `gorm:"size:50" json:"acceptor_name"`          // 验收人姓名（可选）
	AcceptorID         *int64     `json:"acceptor_id"`                           // 验收人 ID（可选）
	AcceptorSignature  string     `gorm:"type:text" json:"acceptor_signature"`   // 验收人电子签名
	PhotosBefore       string     `gorm:"type:text" json:"photos_before"`        // 维保前照片（JSON 数组）
	PhotosAfter        string     `gorm:"type:text" json:"photos_after"`         // 维保后照片（JSON 数组）
	Status             string     `gorm:"size:20;index" json:"status"`           // in_progress/completed/cancelled
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

func (MaintenanceRecord) TableName() string {
	return "maintenance_record"
}

// FaultRecord 故障记录
type FaultRecord struct {
	ID              int64      `gorm:"primaryKey" json:"id"`
	EquipmentID     int64      `gorm:"index" json:"equipment_id"`
	Equipment       *Equipment `gorm:"foreignKey:EquipmentID" json:"equipment,omitempty"`
	FaultLevelID    int64      `gorm:"index" json:"fault_level_id"`
	FaultLevel      *FaultLevel `gorm:"foreignKey:FaultLevelID" json:"fault_level,omitempty"`
	Description     string     `gorm:"type:text" json:"description"`           // 故障描述
	Source          string     `gorm:"size:20;index" json:"source"`            // manual/operation/inspection
	Photos          string     `gorm:"type:text" json:"photos"`                // 故障照片（JSON 数组）
	ReporterName    string     `gorm:"size:50" json:"reporter_name"`           // 报告人姓名
	ReporterID      *int64     `json:"reporter_id"`                            // 报告人 ID（可选）
	AssignedTo      string     `gorm:"size:50" json:"assigned_to"`             // 指派给谁维修
	RepairedAt      *time.Time `json:"repaired_at"`                            // 维修完成时间
	RepairedBy      string     `gorm:"size:50" json:"repaired_by"`             // 维修人
	RepairContent   string     `gorm:"type:text" json:"repair_content"`        // 维修内容
	Status          string     `gorm:"size:20;index" json:"status"`            // open/in_progress/resolved/closed
	ResolvedAt      *time.Time `json:"resolved_at"`                            // 故障解决时间
	ResolvedBy      string     `gorm:"size:50" json:"resolved_by"`             // 解决人
	WechatNotified  bool       `gorm:"default:false" json:"wechat_notified"`   // 是否已发送企业微信通知
	WechatNotifyTime *time.Time `json:"wechat_notify_time"`                    // 企业微信通知时间
	CreatedAt       time.Time  `gorm:"index" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"index" json:"updated_at"`
}

func (FaultRecord) TableName() string {
	return "fault_record"
}

// EquipmentStatusHistory 设备状态历史
type EquipmentStatusHistory struct {
	ID             int64      `gorm:"primaryKey" json:"id"`
	EquipmentID    int64      `gorm:"index" json:"equipment_id"`
	OldStatus      string     `gorm:"size:20" json:"old_status"`
	NewStatus      string     `gorm:"size:20;index" json:"new_status"`
	DurationMinutes int       `json:"duration_minutes"`
	FaultLevelID   *int64     `json:"fault_level_id"`
	OperationID    *int64     `json:"operation_id"`
	MaintenanceID  *int64     `json:"maintenance_id"`
	Reason         string     `gorm:"size:500" json:"reason"`
	QrScan         bool       `gorm:"default:false" json:"qr_scan"`
	ChangedBy      string     `gorm:"size:50" json:"changed_by"`
	ChangedByID    *int64     `json:"changed_by_id"`
	CreatedAt      time.Time  `gorm:"index" json:"created_at"`
}

func (EquipmentStatusHistory) TableName() string {
	return "equipment_status_history"
}

// Role 角色
type Role struct {
	ID          int64             `gorm:"primaryKey" json:"id"`
	RoleCode    string            `gorm:"size:20;uniqueIndex" json:"role_code"` // admin/maintainer/operator
	RoleName    string            `gorm:"size:50" json:"role_name"`
	Description string            `gorm:"type:text" json:"description"`
	Permissions map[string]bool   `gorm:"type:jsonb;default:'{}'" json:"permissions"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

func (Role) TableName() string {
	return "roles"
}

// UserRole 用户角色关联
type UserRole struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	UserID    int64     `gorm:"uniqueIndex:user_role_unique" json:"user_id"`
	RoleID    int64     `gorm:"uniqueIndex:user_role_unique" json:"role_id"`
	IsPrimary bool      `gorm:"default:true" json:"is_primary"`
	CreatedAt time.Time `json:"created_at"`
}

func (UserRole) TableName() string {
	return "user_roles"
}

// APIRolePermission API 角色权限配置
type APIRolePermission struct {
	ID           int64     `gorm:"primaryKey" json:"id"`
	APIPath      string    `gorm:"size:200;uniqueIndex:api_path_method" json:"api_path"`
	APIMethod    string    `gorm:"size:10;uniqueIndex:api_path_method" json:"api_method"`
	AllowedRoles []string  `gorm:"type:text[]" json:"allowed_roles"`
	Description  string    `gorm:"type:text" json:"description"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (APIRolePermission) TableName() string {
	return "api_role_permissions"
}

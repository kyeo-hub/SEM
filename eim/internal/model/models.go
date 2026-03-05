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

// InspectionStandard 点检标准
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

// InspectionRecord 点检记录 (主表)
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

// InspectionDetail 点检明细
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

// InspectionAttachment 点检附件
type InspectionAttachment struct {
	ID           int64     `gorm:"primaryKey" json:"id"`
	RecordID     int64     `json:"record_id"`
	DetailID     *int64    `json:"detail_id"`
	FileURL      string    `gorm:"size:500" json:"file_url"`
	FileName     string    `gorm:"size:200" json:"file_name"`
	FileSize     int64     `json:"file_size"`
	FileType     string    `gorm:"size:50" json:"file_type"`
	ThumbnailURL string    `gorm:"size:500" json:"thumbnail_url"`
	UploadedBy   *int64    `json:"uploaded_by"`
	UploadedAt   time.Time `json:"uploaded_at"`
}

func (InspectionAttachment) TableName() string {
	return "inspection_attachment"
}

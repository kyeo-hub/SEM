-- ========================================
-- EIM 数据库初始化脚本
-- 创建时间：2026-03-05
-- ========================================

-- ========================================
-- 1. 用户表
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(100) NOT NULL,
    role            VARCHAR(20) DEFAULT 'inspector',  -- admin/inspector/supervisor/operator
    real_name       VARCHAR(50),
    department      VARCHAR(50),                      -- 部门/班组
    phone           VARCHAR(20),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- ========================================
-- 2. 故障等级表
-- ========================================
CREATE TABLE IF NOT EXISTS fault_level (
    id              SERIAL PRIMARY KEY,
    level_code      VARCHAR(10) UNIQUE NOT NULL,      -- L1/L2/L3
    level_name      VARCHAR(50) NOT NULL,             -- 严重故障/一般故障/轻微故障
    description     TEXT,                             -- 故障等级说明
    allow_work      BOOLEAN DEFAULT FALSE,            -- 是否允许带病作业
    color           VARCHAR(20) DEFAULT 'red',        -- 显示颜色
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 初始化故障等级数据
INSERT INTO fault_level (level_code, level_name, description, allow_work, color, sort_order) VALUES
('L1', '严重故障', '设备完全不能作业，必须立即停机维修', FALSE, 'red', 1),
('L2', '一般故障', '设备可带病作业，但需尽快安排维修', TRUE, 'orange', 2),
('L3', '轻微故障', '设备可正常作业，建议安排维修', TRUE, 'yellow', 3)
ON CONFLICT (level_code) DO NOTHING;

-- ========================================
-- 3. 设备表
-- ========================================
CREATE TABLE IF NOT EXISTS equipment (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL,      -- 设备编号
    name            VARCHAR(100) NOT NULL,            -- 设备名称
    type            VARCHAR(50) NOT NULL,             -- 设备类型
    company         VARCHAR(100),                     -- 使用单位
    location        VARCHAR(200),                     -- 安装位置
    latitude        DECIMAL(10, 8),                   -- 纬度
    longitude       DECIMAL(11, 8),                   -- 经度

    -- 状态相关
    status          VARCHAR(20) DEFAULT 'standby',    -- working/standby/maintenance/fault
    fault_level_id  INT REFERENCES fault_level(id),   -- 故障等级

    -- 当前作业信息
    current_ship    VARCHAR(100),                     -- 当前船名
    current_cargo   VARCHAR(100),                     -- 当前货品名称

    -- QR 码
    qr_code_uuid    VARCHAR(100) UNIQUE,              -- 二维码 UUID

    -- 点检配置
    inspection_enabled BOOLEAN DEFAULT TRUE,          -- 是否启用点检
    inspection_frequency VARCHAR(20) DEFAULT 'daily', -- 点检频次

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_type ON equipment(type);
CREATE INDEX idx_equipment_company ON equipment(company);

-- ========================================
-- 4. 点检标准表
-- ========================================
CREATE TABLE IF NOT EXISTS inspection_standard (
    id              SERIAL PRIMARY KEY,
    equipment_type  VARCHAR(50) NOT NULL,             -- 设备类型
    part_name       VARCHAR(50) NOT NULL,             -- 部位名称
    part_order      INT DEFAULT 0,                    -- 部位排序
    item_name       VARCHAR(50) NOT NULL,             -- 点检项目
    item_order      INT DEFAULT 0,                    -- 项目排序
    content         VARCHAR(100) NOT NULL,            -- 点检内容
    method          VARCHAR(20),                      -- 方法 (视/听/敲/测量/操作)
    limit_value     VARCHAR(200),                     -- 允许界限值
    is_required     BOOLEAN DEFAULT TRUE,             -- 是否必填项
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (equipment_type, part_name, item_name)
);

CREATE INDEX idx_inspection_standard_type ON inspection_standard(equipment_type);

-- ========================================
-- 5. 点检记录表 (主表)
-- ========================================
CREATE TABLE IF NOT EXISTS inspection_record (
    id              SERIAL PRIMARY KEY,
    equipment_id    INT NOT NULL REFERENCES equipment(id),
    inspection_date DATE NOT NULL,                    -- 点检日期
    shift           VARCHAR(10) NOT NULL,             -- 班次：before/during/handover
    inspector_id    INT REFERENCES users(id),         -- 点检人 ID
    inspector_name  VARCHAR(50),                      -- 点检人姓名

    -- 点检结果
    total_items     INT DEFAULT 0,                    -- 总点检项数
    normal_count    INT DEFAULT 0,                    -- 正常项数
    abnormal_count  INT DEFAULT 0,                    -- 异常项数
    overall_status  VARCHAR(10) DEFAULT 'normal',     -- normal/abnormal

    -- 问题记录
    problems_found  TEXT,                             -- 当班点检发现问题
    problems_handled TEXT,                            -- 班中问题处理
    legacy_issues   TEXT,                             -- 遗留问题

    -- 签名
    signature_image VARCHAR(200),                     -- 电子签名图片 URL

    -- 审核
    reviewed_by     INT REFERENCES users(id),         -- 审核人
    reviewed_at     TIMESTAMPTZ,
    review_status   VARCHAR(20) DEFAULT 'pending',    -- pending/approved/rejected

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (equipment_id, inspection_date, shift)
);

CREATE INDEX idx_inspection_record_date ON inspection_record(inspection_date);
CREATE INDEX idx_inspection_record_equip_date ON inspection_record(equipment_id, inspection_date);

-- ========================================
-- 6. 点检明细表
-- ========================================
CREATE TABLE IF NOT EXISTS inspection_detail (
    id              SERIAL PRIMARY KEY,
    record_id       INT NOT NULL REFERENCES inspection_record(id) ON DELETE CASCADE,
    standard_id     INT REFERENCES inspection_standard(id),
    part_name       VARCHAR(50) NOT NULL,             -- 部位名称
    item_name       VARCHAR(50) NOT NULL,             -- 点检项目
    result          VARCHAR(10) NOT NULL,             -- normal/abnormal/skip
    remark          VARCHAR(500),                     -- 异常备注
    has_attachment  BOOLEAN DEFAULT FALSE,            -- 是否有附件图片
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspection_detail_record ON inspection_detail(record_id);

-- ========================================
-- 7. 点检附件表 (图片)
-- ========================================
CREATE TABLE IF NOT EXISTS inspection_attachment (
    id              SERIAL PRIMARY KEY,
    record_id       INT NOT NULL REFERENCES inspection_record(id) ON DELETE CASCADE,
    detail_id       INT REFERENCES inspection_detail(id) ON DELETE SET NULL,
    file_url        VARCHAR(500) NOT NULL,            -- 文件存储路径/URL
    file_name       VARCHAR(200),                     -- 原始文件名
    file_size       BIGINT,                           -- 文件大小 (bytes)
    file_type       VARCHAR(50),                      -- image/jpeg, image/png 等
    thumbnail_url   VARCHAR(500),                     -- 缩略图 URL
    uploaded_by     INT REFERENCES users(id),
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspection_attachment_record ON inspection_attachment(record_id);

-- ========================================
-- 8. 设备状态历史表
-- ========================================
CREATE TABLE IF NOT EXISTS equipment_status_history (
    id              SERIAL PRIMARY KEY,
    equipment_id    INT NOT NULL REFERENCES equipment(id),
    old_status      VARCHAR(20),
    new_status      VARCHAR(20) NOT NULL,
    fault_level_id  INT REFERENCES fault_level(id),   -- 故障等级
    changed_by      VARCHAR(50),                      -- 操作人
    changed_by_id   INT REFERENCES users(id),
    reason          VARCHAR(500),                     -- 变更原因
    qr_scan         BOOLEAN DEFAULT FALSE,            -- 是否通过扫码变更
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_history_equip ON equipment_status_history(equipment_id);
CREATE INDEX idx_status_history_time ON equipment_status_history(created_at);

-- ========================================
-- 9. 作业信息历史表
-- ========================================
CREATE TABLE IF NOT EXISTS operation_info_history (
    id              SERIAL PRIMARY KEY,
    equipment_id    INT NOT NULL REFERENCES equipment(id),
    ship_name       VARCHAR(100) NOT NULL,            -- 船名
    cargo_name      VARCHAR(100) NOT NULL,            -- 货品名称
    started_at      TIMESTAMPTZ NOT NULL,             -- 开始作业时间
    ended_at        TIMESTAMPTZ,                      -- 结束作业时间
    duration_minutes INT,                             -- 作业时长 (分钟)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_operation_history_equip ON operation_info_history(equipment_id);
CREATE INDEX idx_operation_history_time ON operation_info_history(started_at);

-- ========================================
-- 10. 企业微信推送记录表
-- ========================================
CREATE TABLE IF NOT EXISTS wechat_notification (
    id              SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,           -- daily_fault_report/fault_resolved
    equipment_id    INT REFERENCES equipment(id),
    content         TEXT NOT NULL,                    -- 推送内容
    status          VARCHAR(20) DEFAULT 'pending',    -- pending/sent/failed
    error_message   TEXT,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_type ON wechat_notification(notification_type);
CREATE INDEX idx_notification_status ON wechat_notification(status);

-- ========================================
-- 视图：设备点检统计
-- ========================================
CREATE OR REPLACE VIEW v_equipment_inspection_stats AS
SELECT
    e.id AS equipment_id,
    e.code AS equipment_code,
    e.name AS equipment_name,
    e.status AS current_status,
    DATE_TRUNC('day', ir.inspection_date) AS stat_date,
    COUNT(DISTINCT ir.id) AS inspection_count,
    SUM(ir.total_items) AS total_items,
    SUM(ir.normal_count) AS normal_count,
    SUM(ir.abnormal_count) AS abnormal_count
FROM equipment e
LEFT JOIN inspection_record ir ON e.id = ir.equipment_id
GROUP BY e.id, e.code, e.name, e.status, DATE_TRUNC('day', ir.inspection_date);

-- ========================================
-- 注释说明
-- ========================================
COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE fault_level IS '故障等级表';
COMMENT ON TABLE equipment IS '设备表';
COMMENT ON TABLE inspection_standard IS '点检标准表';
COMMENT ON TABLE inspection_record IS '点检记录主表';
COMMENT ON TABLE inspection_detail IS '点检明细表';
COMMENT ON TABLE inspection_attachment IS '点检附件表';
COMMENT ON TABLE equipment_status_history IS '设备状态历史表';
COMMENT ON TABLE operation_info_history IS '作业信息历史表';
COMMENT ON TABLE wechat_notification IS '企业微信推送记录表';

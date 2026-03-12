-- ========================================
-- EIM 数据库增强脚本 - 作业/维保/故障记录
-- 创建时间：2026-03-09
-- 版本：v2.0
-- ========================================

-- ========================================
-- 1. 作业记录表
-- ========================================
-- 记录每次作业的详细信息，包括时长、吨位、可选故障登记
CREATE TABLE IF NOT EXISTS operation_record (
    id              BIGSERIAL PRIMARY KEY,
    equipment_id    BIGINT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    
    -- 作业信息
    ship_name       VARCHAR(100),                     -- 船名（可选，货场/仓库设备可不填）
    cargo_name      VARCHAR(100),                     -- 货品名称（可选）
    cargo_weight    DECIMAL(10, 2),                   -- 装卸吨位（可选）
    
    -- 时长信息
    start_time      TIMESTAMPTZ NOT NULL,             -- 作业开始时间
    end_time        TIMESTAMPTZ,                      -- 作业结束时间
    duration_minutes INT DEFAULT 0,                   -- 作业时长（分钟）
    
    -- 操作人员
    operator_name   VARCHAR(50) NOT NULL,             -- 操作人姓名
    operator_id     BIGINT REFERENCES users(id),      -- 操作人 ID（可选）
    
    -- 故障信息（可选）
    has_fault       BOOLEAN DEFAULT FALSE,            -- 是否有故障
    fault_level_id  BIGINT REFERENCES fault_level(id), -- 故障等级
    fault_description TEXT,                           -- 故障描述
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'working',    -- working/completed
    qr_scan         BOOLEAN DEFAULT TRUE,             -- 是否通过扫码变更
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 删除可能存在的重复索引
DROP INDEX IF EXISTS idx_operation_date;
DROP INDEX IF EXISTS idx_operation_equipment;
DROP INDEX IF EXISTS idx_operation_start_time;
DROP INDEX IF EXISTS idx_operation_status;

CREATE INDEX idx_operation_equipment ON operation_record(equipment_id);
CREATE INDEX idx_operation_start_time ON operation_record(start_time);
CREATE INDEX idx_operation_status ON operation_record(status);
CREATE INDEX idx_operation_equipment_date ON operation_record(equipment_id, start_time DESC);

-- 注释
COMMENT ON TABLE operation_record IS '作业记录表 - 记录每次作业的详细信息';
COMMENT ON COLUMN operation_record.ship_name IS '作业船舶名称（可选，货场/仓库设备可不填）';
COMMENT ON COLUMN operation_record.cargo_name IS '装卸货品名称（可选）';
COMMENT ON COLUMN operation_record.cargo_weight IS '装卸吨位（可选，单位：吨）';
COMMENT ON COLUMN operation_record.duration_minutes IS '作业时长（自动计算，单位：分钟）';
COMMENT ON COLUMN operation_record.has_fault IS '作业中是否发现故障（可选）';
COMMENT ON COLUMN operation_record.fault_level_id IS '故障等级 ID（当 has_fault=true 时必填）';

-- ========================================
-- 2. 维保记录表
-- ========================================
-- 记录维保全过程，包括登记、完成确认、结果跟踪
CREATE TABLE IF NOT EXISTS maintenance_record (
    id              BIGSERIAL PRIMARY KEY,
    equipment_id    BIGINT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    
    -- 维保类型
    maintenance_type VARCHAR(20) NOT NULL,            -- daily/repair/periodic/emergency
    
    -- 维保内容
    plan_content    TEXT,                             -- 计划维保内容
    actual_content  TEXT NOT NULL,                    -- 实际完成的维保工作
    
    -- 维保结果
    result          VARCHAR(20) NOT NULL,             -- resolved/partially_resolved/unresolved
    fault_level_id  BIGINT REFERENCES fault_level(id), -- 维保后的故障等级（部分解决时必填）
    next_plan       TEXT,                             -- 后续计划（未解决或部分解决时）
    
    -- 时间信息
    start_time      TIMESTAMPTZ NOT NULL,             -- 维保开始时间
    end_time        TIMESTAMPTZ,                      -- 维保结束时间
    duration_minutes INT DEFAULT 0,                   -- 维保时长（分钟）
    
    -- 人员信息
    maintainer_name VARCHAR(50) NOT NULL,             -- 维保人姓名
    maintainer_id   BIGINT REFERENCES users(id),      -- 维保人 ID（可选）
    maintainer_signature TEXT,                        -- 维保人电子签名（base64）
    
    acceptor_name   VARCHAR(50),                      -- 验收人姓名（可选）
    acceptor_id     BIGINT REFERENCES users(id),      -- 验收人 ID（可选）
    acceptor_signature TEXT,                          -- 验收人电子签名（base64）
    
    -- 照片（使用数组存储 URL）
    photos_before   TEXT[],                           -- 维保前照片 URL 数组
    photos_after    TEXT[],                           -- 维保后照片 URL 数组
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'in_progress', -- in_progress/completed/cancelled
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 删除可能存在的重复索引
DROP INDEX IF EXISTS idx_maintenance_date;
DROP INDEX IF EXISTS idx_maintenance_equipment;
DROP INDEX IF EXISTS idx_maintenance_start_time;
DROP INDEX IF EXISTS idx_maintenance_status;
DROP INDEX IF EXISTS idx_maintenance_type;

CREATE INDEX idx_maintenance_equipment ON maintenance_record(equipment_id);
CREATE INDEX idx_maintenance_start_time ON maintenance_record(start_time);
CREATE INDEX idx_maintenance_status ON maintenance_record(status);
CREATE INDEX idx_maintenance_type ON maintenance_record(maintenance_type);
CREATE INDEX idx_maintenance_equipment_date ON maintenance_record(equipment_id, start_time DESC);

-- 注释
COMMENT ON TABLE maintenance_record IS '维保记录表 - 记录维保全过程';
COMMENT ON COLUMN maintenance_record.maintenance_type IS '维保类型：daily(日常保养)/repair(故障维修)/periodic(定期检修)/emergency(紧急抢修)';
COMMENT ON COLUMN maintenance_record.result IS '维保结果：resolved(全部解决)/partially_resolved(部分解决)/unresolved(未解决)';
COMMENT ON COLUMN maintenance_record.fault_level_id IS '维保后的故障等级（部分解决时用于降低故障等级）';
COMMENT ON COLUMN maintenance_record.maintainer_signature IS '维保人电子签名（base64 编码的 PNG 图片）';
COMMENT ON COLUMN maintenance_record.acceptor_signature IS '验收人电子签名（可选，base64 编码的 PNG 图片）';
COMMENT ON COLUMN maintenance_record.photos_before IS '维保前照片 URL 数组';
COMMENT ON COLUMN maintenance_record.photos_after IS '维保后照片 URL 数组';

-- ========================================
-- 3. 故障记录表（增强）
-- ========================================
-- 记录故障全过程，包括上报、维修、解决
CREATE TABLE IF NOT EXISTS fault_record (
    id              BIGSERIAL PRIMARY KEY,
    equipment_id    BIGINT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    
    -- 故障等级
    fault_level_id  BIGINT NOT NULL REFERENCES fault_level(id),
    
    -- 故障描述
    description     TEXT NOT NULL,                    -- 详细故障情况
    
    -- 故障来源
    source          VARCHAR(20) DEFAULT 'manual',     -- manual/operation/inspection
    -- manual: 手动登记
    -- operation: 作业中发现
    -- inspection: 点检中发现
    
    -- 照片（使用数组存储 URL）
    photos          TEXT[],                           -- 故障照片 URL 数组
    
    -- 报告人信息
    reporter_name   VARCHAR(50) NOT NULL,             -- 报告人姓名
    reporter_id     BIGINT REFERENCES users(id),      -- 报告人 ID（可选）
    
    -- 维修信息
    assigned_to     VARCHAR(50),                      -- 指派给谁维修
    repaired_at     TIMESTAMPTZ,                      -- 维修完成时间
    repaired_by     VARCHAR(50),                      -- 维修人
    repair_content  TEXT,                             -- 维修内容
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'open',       -- open/in_progress/resolved/closed
    resolved_at     TIMESTAMPTZ,                      -- 故障解决时间
    resolved_by     VARCHAR(50),                      -- 解决人
    
    -- 企业微信通知
    wechat_notified BOOLEAN DEFAULT FALSE,            -- 是否已发送企业微信通知
    wechat_notify_time TIMESTAMPTZ,                   -- 企业微信通知时间
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 删除可能存在的重复索引
DROP INDEX IF EXISTS idx_fault_equipment;
DROP INDEX IF EXISTS idx_fault_level;
DROP INDEX IF EXISTS idx_fault_status;
DROP INDEX IF EXISTS idx_fault_created;
DROP INDEX IF EXISTS idx_fault_date;
DROP INDEX IF EXISTS idx_fault_source;

CREATE INDEX idx_fault_equipment ON fault_record(equipment_id);
CREATE INDEX idx_fault_level ON fault_record(fault_level_id);
CREATE INDEX idx_fault_status ON fault_record(status);
CREATE INDEX idx_fault_created ON fault_record(created_at);
CREATE INDEX idx_fault_source ON fault_record(source);
CREATE INDEX idx_fault_equipment_status ON fault_record(equipment_id, status);

-- 注释
COMMENT ON TABLE fault_record IS '故障记录表 - 记录故障全过程';
COMMENT ON COLUMN fault_record.source IS '故障来源：manual(手动登记)/operation(作业中发现)/inspection(点检中发现)';
COMMENT ON COLUMN fault_record.photos IS '故障照片 URL 数组';
COMMENT ON COLUMN fault_record.wechat_notified IS '是否已发送企业微信通知（L1 故障必须实时通知）';

-- ========================================
-- 4. 设备状态历史表（增强）
-- ========================================
-- 记录设备状态变更历史，用于统计各状态时长
-- 注意：表已存在，需要添加新字段

-- 添加新字段（如果不存在）
DO $$
BEGIN
    -- 添加 duration_minutes 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'equipment_status_history' AND column_name = 'duration_minutes') THEN
        ALTER TABLE equipment_status_history ADD COLUMN duration_minutes INT DEFAULT 0;
    END IF;
    
    -- 添加 operation_id 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'equipment_status_history' AND column_name = 'operation_id') THEN
        ALTER TABLE equipment_status_history ADD COLUMN operation_id BIGINT REFERENCES operation_record(id);
    END IF;
    
    -- 添加 maintenance_id 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'equipment_status_history' AND column_name = 'maintenance_id') THEN
        ALTER TABLE equipment_status_history ADD COLUMN maintenance_id BIGINT REFERENCES maintenance_record(id);
    END IF;
END $$;

-- 删除可能存在的重复索引
DROP INDEX IF EXISTS idx_status_date;

-- 注释
COMMENT ON TABLE equipment_status_history IS '设备状态历史表 - 记录设备状态变更历史，用于统计各状态时长';
COMMENT ON COLUMN equipment_status_history.duration_minutes IS '该状态持续时长（分钟），用于统计作业/待命/故障/维保时长';
COMMENT ON COLUMN equipment_status_history.operation_id IS '关联作业记录 ID（当 new_status=working 或 standby 时）';
COMMENT ON COLUMN equipment_status_history.maintenance_id IS '关联维保记录 ID（当 new_status=maintenance 时）';

-- ========================================
-- 5. 点检附件表（新增）
-- ========================================
-- 存储点检时的照片附件
CREATE TABLE IF NOT EXISTS inspection_attachment (
    id              BIGSERIAL PRIMARY KEY,
    record_id       BIGINT NOT NULL REFERENCES inspection_record(id) ON DELETE CASCADE,
    detail_id       BIGINT REFERENCES inspection_detail(id) ON DELETE SET NULL,
    
    file_url        VARCHAR(500) NOT NULL,              -- 文件 URL
    file_name       VARCHAR(200),                       -- 原始文件名
    file_size       BIGINT,                             -- 文件大小（字节）
    file_type       VARCHAR(50),                        -- 文件类型（image/jpeg 等）
    
    -- 关联信息
    part_name       VARCHAR(50),                        -- 部位名称（冗余字段，便于查询）
    item_name       VARCHAR(50),                        -- 点检项目（冗余字段）
    
    uploaded_by     VARCHAR(50),                        -- 上传人
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

DROP INDEX IF EXISTS idx_attachment_record;
DROP INDEX IF EXISTS idx_attachment_detail;

CREATE INDEX idx_attachment_record ON inspection_attachment(record_id);
CREATE INDEX idx_attachment_detail ON inspection_attachment(detail_id);

-- 注释
COMMENT ON TABLE inspection_attachment IS '点检附件表 - 存储点检时的照片附件';
COMMENT ON COLUMN inspection_attachment.file_url IS '文件访问 URL';
COMMENT ON COLUMN inspection_attachment.file_type IS '文件 MIME 类型，如 image/jpeg, image/png';

-- ========================================
-- 6. 创建视图 - 设备状态时长统计
-- ========================================

-- 删除已存在的视图
DROP VIEW IF EXISTS v_equipment_status_today CASCADE;
DROP VIEW IF EXISTS v_equipment_status_monthly CASCADE;
DROP VIEW IF EXISTS v_equipment_utilization CASCADE;

-- 今日状态时长统计视图
CREATE VIEW v_equipment_status_today AS
SELECT 
    equipment_id,
    new_status AS status,
    COUNT(*) AS status_count,
    SUM(duration_minutes) AS total_minutes,
    DATE(created_at) AS stat_date
FROM equipment_status_history
WHERE created_at >= DATE_TRUNC('day', NOW())
GROUP BY equipment_id, new_status, DATE(created_at);

-- 本月状态时长统计视图
CREATE VIEW v_equipment_status_monthly AS
SELECT 
    equipment_id,
    new_status AS status,
    COUNT(*) AS status_count,
    SUM(duration_minutes) AS total_minutes,
    DATE_TRUNC('month', created_at) AS stat_month
FROM equipment_status_history
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY equipment_id, new_status, DATE_TRUNC('month', created_at);

-- 设备利用率统计视图
CREATE VIEW v_equipment_utilization AS
SELECT 
    e.id AS equipment_id,
    e.code AS equipment_code,
    e.name AS equipment_name,
    COALESCE(w.total_minutes, 0) AS working_minutes,
    COALESCE(s.total_minutes, 0) AS standby_minutes,
    COALESCE(m.total_minutes, 0) AS maintenance_minutes,
    COALESCE(f.total_minutes, 0) AS fault_minutes,
    COALESCE(w.total_minutes, 0) + COALESCE(s.total_minutes, 0) + 
        COALESCE(m.total_minutes, 0) + COALESCE(f.total_minutes, 0) AS total_minutes,
    CASE 
        WHEN COALESCE(w.total_minutes, 0) + COALESCE(s.total_minutes, 0) + 
             COALESCE(m.total_minutes, 0) + COALESCE(f.total_minutes, 0) > 0
        THEN ROUND(
            COALESCE(w.total_minutes, 0)::NUMERIC / 
            (COALESCE(w.total_minutes, 0) + COALESCE(s.total_minutes, 0) + 
             COALESCE(m.total_minutes, 0) + COALESCE(f.total_minutes, 0)) * 100, 2)
        ELSE 0
    END AS utilization_rate
FROM equipment e
LEFT JOIN (
    SELECT equipment_id, SUM(duration_minutes) AS total_minutes
    FROM equipment_status_history
    WHERE new_status = 'working' 
    AND created_at >= DATE_TRUNC('day', NOW())
    GROUP BY equipment_id
) w ON e.id = w.equipment_id
LEFT JOIN (
    SELECT equipment_id, SUM(duration_minutes) AS total_minutes
    FROM equipment_status_history
    WHERE new_status = 'standby'
    AND created_at >= DATE_TRUNC('day', NOW())
    GROUP BY equipment_id
) s ON e.id = s.equipment_id
LEFT JOIN (
    SELECT equipment_id, SUM(duration_minutes) AS total_minutes
    FROM equipment_status_history
    WHERE new_status = 'maintenance'
    AND created_at >= DATE_TRUNC('day', NOW())
    GROUP BY equipment_id
) m ON e.id = m.equipment_id
LEFT JOIN (
    SELECT equipment_id, SUM(duration_minutes) AS total_minutes
    FROM equipment_status_history
    WHERE new_status = 'fault'
    AND created_at >= DATE_TRUNC('day', NOW())
    GROUP BY equipment_id
) f ON e.id = f.equipment_id;

COMMENT ON VIEW v_equipment_utilization IS '设备利用率统计视图 - 今日各状态时长及设备利用率';
COMMENT ON COLUMN v_equipment_utilization.utilization_rate IS '设备利用率 = 作业时长 / 总时长 × 100%';

-- ========================================
-- 7. 创建触发器函数 - 自动计算时长
-- ========================================

-- 删除已存在的触发器
DROP TRIGGER IF EXISTS trg_operation_duration ON operation_record;
DROP TRIGGER IF EXISTS trg_maintenance_duration ON maintenance_record;
DROP FUNCTION IF EXISTS fn_calculate_operation_duration();
DROP FUNCTION IF EXISTS fn_calculate_maintenance_duration();

-- 作业记录时长自动计算触发器
CREATE FUNCTION fn_calculate_operation_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_operation_duration
    BEFORE INSERT OR UPDATE ON operation_record
    FOR EACH ROW
    EXECUTE FUNCTION fn_calculate_operation_duration();

-- 维保记录时长自动计算触发器
CREATE FUNCTION fn_calculate_maintenance_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintenance_duration
    BEFORE INSERT OR UPDATE ON maintenance_record
    FOR EACH ROW
    EXECUTE FUNCTION fn_calculate_maintenance_duration();

-- ========================================
-- 迁移完成验证
-- ========================================
-- 验证查询：
-- SELECT 'operation_record' AS table_name, COUNT(*) AS row_count FROM operation_record
-- UNION ALL
-- SELECT 'maintenance_record', COUNT(*) FROM maintenance_record
-- UNION ALL
-- SELECT 'fault_record', COUNT(*) FROM fault_record
-- UNION ALL
-- SELECT 'inspection_attachment', COUNT(*) FROM inspection_attachment;

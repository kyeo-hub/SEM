-- ========================================
-- EIM 数据库增强脚本 - 设备作业场景字段
-- 创建时间：2026-03-13
-- 版本：v2.6
-- ========================================

-- ========================================
-- 1. 添加 work_scene 字段到 equipment 表
-- ========================================
-- 用于区分设备的工作场景：码头/货场
-- 决定开始作业时的字段必填性

-- 添加字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment' AND column_name = 'work_scene'
    ) THEN
        ALTER TABLE equipment 
        ADD COLUMN work_scene VARCHAR(20) DEFAULT 'yard' NOT NULL;
        
        -- 添加注释（PostgreSQL 使用 COMMENT ON）
        COMMENT ON COLUMN equipment.work_scene IS '作业场景：wharf(码头)/yard(货场) - 决定开始作业时船名/货品是否必填';
    END IF;
END $$;

-- 创建索引（优化查询）
DROP INDEX IF EXISTS idx_equipment_work_scene;
CREATE INDEX idx_equipment_work_scene ON equipment(work_scene);

-- ========================================
-- 2. 更新现有设备数据
-- ========================================
-- 根据设备类型设置默认的作业场景
-- 门式起重机、桥式起重机、装船机、卸船机 → 码头 (wharf)
-- 其他设备 → 货场 (yard)

UPDATE equipment 
SET work_scene = 'wharf' 
WHERE type IN ('门式起重机', '桥式起重机', '装船机', '卸船机');

UPDATE equipment 
SET work_scene = 'yard' 
WHERE type NOT IN ('门式起重机', '桥式起重机', '装船机', '卸船机');

-- ========================================
-- 3. 验证查询
-- ========================================
-- 验证设备作业场景分布：
-- SELECT work_scene, type, COUNT(*) 
-- FROM equipment 
-- GROUP BY work_scene, type 
-- ORDER BY work_scene, type;

-- 预期结果示例：
-- work_scene | type | count
-- -----------+------+------
-- wharf      | 门式起重机 | 4
-- yard       | 叉车 | 2
-- yard       | 装载机 | 1

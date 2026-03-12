-- ========================================
-- EIM 数据库迁移脚本 - 角色权限管理
-- 创建时间：2026-03-09
-- 版本：v2.1
-- ========================================

-- ========================================
-- 1. 角色表
-- ========================================
-- 定义系统角色及其权限配置
CREATE TABLE IF NOT EXISTS roles (
    id              SERIAL PRIMARY KEY,
    role_code       VARCHAR(20) UNIQUE NOT NULL,      -- admin/maintainer/operator
    role_name       VARCHAR(50) NOT NULL,             -- 管理员/维保员/操作司机
    description     TEXT,                             -- 角色描述
    permissions     JSONB DEFAULT '{}',               -- 权限配置（JSON 格式）
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 初始化角色数据
INSERT INTO roles (role_code, role_name, description, permissions) VALUES
('admin', '管理员', '拥有系统全部权限', '{"all": true}'),
('maintainer', '维保员', '负责设备维保、点检', '{"maintenance": true, "inspection": true, "fault": true}'),
('operator', '操作司机', '负责设备作业、点检', '{"work": true, "inspection": true, "fault": true}')
ON CONFLICT (role_code) DO NOTHING;

-- 索引
CREATE INDEX idx_roles_code ON roles(role_code);

-- 注释
COMMENT ON TABLE roles IS '角色表 - 定义系统角色及其权限';
COMMENT ON COLUMN roles.role_code IS '角色标识：admin(管理员)/maintainer(维保员)/operator(操作司机)';
COMMENT ON COLUMN roles.permissions IS '权限配置（JSON 格式），用于细粒度权限控制';

-- ========================================
-- 2. 用户角色关联表
-- ========================================
-- 支持一个用户拥有多个角色（但当前版本只使用一个主角色）
CREATE TABLE IF NOT EXISTS user_roles (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    is_primary      BOOLEAN DEFAULT TRUE,             -- 是否为主角色
    created_at      TIMESTAMPTZ DEFAULT NOW()
    -- 注意：PostgreSQL 15 不支持部分索引，使用应用层逻辑保证每个用户只有一个主角色
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique ON user_roles(user_id, role_id);

-- 注释
COMMENT ON TABLE user_roles IS '用户角色关联表 - 支持一个用户拥有多个角色';
COMMENT ON COLUMN user_roles.is_primary IS '是否为主角色（每个用户只能有一个主角色）';

-- ========================================
-- 3. 更新 users 表
-- ========================================
-- 添加角色外键约束（保持 role 字段向后兼容）
-- 注意：role 字段仍然保留，用于快速查询

-- 添加角色 ID 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'role_id') THEN
        ALTER TABLE users ADD COLUMN role_id INT REFERENCES roles(id);
        
        -- 根据现有 role 字段设置 role_id
        UPDATE users u SET role_id = r.id
        FROM roles r
        WHERE CASE
            WHEN u.role = 'admin' THEN r.role_code = 'admin'
            WHEN u.role = 'maintainer' THEN r.role_code = 'maintainer'
            WHEN u.role = 'operator' THEN r.role_code = 'operator'
            ELSE r.role_code = 'operator'  -- 默认为操作司机
        END
        AND u.role_id IS NULL;
    END IF;
END $$;

-- 创建外键索引
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- 注释
COMMENT ON COLUMN users.role_id IS '关联角色表 ID（与 role 字段保持一致）';

-- ========================================
-- 4. 角色权限中间件配置表（可选）
-- ========================================
-- 用于配置每个 API 端点需要的角色权限
CREATE TABLE IF NOT EXISTS api_role_permissions (
    id              SERIAL PRIMARY KEY,
    api_path        VARCHAR(200) NOT NULL,            -- API 路径
    api_method      VARCHAR(10) NOT NULL,             -- HTTP 方法
    allowed_roles   TEXT[] NOT NULL,                  -- 允许的角色列表
    description     TEXT,                             -- 权限说明
    is_active       BOOLEAN DEFAULT TRUE,             -- 是否启用
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (api_path, api_method)
);

-- 初始化 API 权限配置
INSERT INTO api_role_permissions (api_path, api_method, allowed_roles, description) VALUES
-- 作业管理
('/api/equipments/*/start-work', 'PUT', ARRAY['admin', 'operator'], '开始作业'),
('/api/equipments/*/end-work', 'PUT', ARRAY['admin', 'operator'], '结束作业'),
('/api/operation/*', 'ALL', ARRAY['admin', 'operator'], '作业记录管理'),

-- 维保管理
('/api/equipments/*/start-maintenance', 'PUT', ARRAY['admin', 'maintainer'], '开始维保'),
('/api/equipments/*/complete-maintenance', 'PUT', ARRAY['admin', 'maintainer'], '维保完成确认'),
('/api/maintenance/*', 'ALL', ARRAY['admin', 'maintainer'], '维保记录管理'),

-- 点检管理
('/api/inspection/*', 'ALL', ARRAY['admin', 'maintainer', 'operator'], '点检管理（所有角色都可点检）'),
('/api/inspection-standard/*', 'ALL', ARRAY['admin'], '点检标准管理（仅管理员）'),

-- 故障管理
('/api/faults/*', 'ALL', ARRAY['admin', 'maintainer', 'operator'], '故障管理（所有角色都可上报）'),
('/api/faults/*/assign', 'PUT', ARRAY['admin', 'maintainer'], '故障指派（操作司机不能指派）'),
('/api/faults/*/repair', 'PUT', ARRAY['admin', 'maintainer'], '故障维修（操作司机不能维修）'),

-- 设备管理
('/api/equipments', 'GET', ARRAY['admin', 'maintainer', 'operator'], '设备列表（所有角色都可查看）'),
('/api/equipments/*', 'GET', ARRAY['admin', 'maintainer', 'operator'], '设备详情（所有角色都可查看）'),
('/api/equipments', 'POST', ARRAY['admin'], '创建设备（仅管理员）'),
('/api/equipments/*', 'PUT', ARRAY['admin'], '更新设备（仅管理员）'),
('/api/equipments/*', 'DELETE', ARRAY['admin'], '删除设备（仅管理员）'),

-- 用户管理
('/api/users', 'ALL', ARRAY['admin'], '用户管理（仅管理员）'),
('/api/users/*', 'ALL', ARRAY['admin'], '用户详情/编辑（仅管理员）'),
('/api/users/me', 'GET', ARRAY['admin', 'maintainer', 'operator'], '获取当前用户信息'),
('/api/users/change-password', 'PUT', ARRAY['admin', 'maintainer', 'operator'], '修改密码'),

-- 统计报表
('/api/stats/*', 'GET', ARRAY['admin', 'maintainer', 'operator'], '统计报表（所有角色都可查看）'),

-- 文件上传
('/api/files/*', 'POST', ARRAY['admin', 'maintainer', 'operator'], '文件上传（所有角色都可上传）')
ON CONFLICT (api_path, api_method) DO NOTHING;

-- 索引
CREATE INDEX idx_api_permissions_path ON api_role_permissions(api_path);
CREATE INDEX idx_api_permissions_active ON api_role_permissions(is_active);

-- 注释
COMMENT ON TABLE api_role_permissions IS 'API 角色权限配置表 - 配置每个 API 端点需要的角色权限';
COMMENT ON COLUMN api_role_permissions.allowed_roles IS '允许访问的角色列表';

-- ========================================
-- 5. 初始化测试用户
-- ========================================
-- 为每种角色创建一个测试用户（密码均为：123456）
-- 注意：如果用户已存在则跳过

DO $$
DECLARE
    admin_role_id INT;
    maintainer_role_id INT;
    operator_role_id INT;
    hashed_password TEXT;
BEGIN
    -- 获取角色 ID
    SELECT id INTO admin_role_id FROM roles WHERE role_code = 'admin';
    SELECT id INTO maintainer_role_id FROM roles WHERE role_code = 'maintainer';
    SELECT id INTO operator_role_id FROM roles WHERE role_code = 'operator';
    
    -- 密码哈希（123456）
    hashed_password := '$2a$10$9Wn.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    
    -- 创建管理员测试用户
    INSERT INTO users (username, password_hash, role, role_id, real_name, department, phone)
    SELECT 'admin', hashed_password, 'admin', admin_role_id, '系统管理员', '设备部', '13800000001'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
    
    -- 创建维保员测试用户
    INSERT INTO users (username, password_hash, role, role_id, real_name, department, phone)
    SELECT 'maintainer01', hashed_password, 'maintainer', maintainer_role_id, '张三', '维修班', '13800000002'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'maintainer01');
    
    -- 创建操作司机测试用户
    INSERT INTO users (username, password_hash, role, role_id, real_name, department, phone)
    SELECT 'operator01', hashed_password, 'operator', operator_role_id, '李四', '操作班', '13800000003'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'operator01');
END $$;

-- ========================================
-- 6. 创建视图 - 用户角色详情
-- ========================================
DROP VIEW IF EXISTS v_user_roles CASCADE;

CREATE VIEW v_user_roles AS
SELECT
    u.id AS user_id,
    u.username,
    u.real_name,
    u.department,
    u.phone,
    u.role AS role_code,
    r.role_name,
    r.description AS role_description,
    r.permissions,
    u.created_at AS user_created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id;

COMMENT ON VIEW v_user_roles IS '用户角色详情视图 - 展示用户及其角色信息';

-- ========================================
-- 迁移完成验证
-- ========================================
-- 验证查询：
-- SELECT 'roles' AS table_name, COUNT(*) AS row_count FROM roles
-- UNION ALL
-- SELECT 'user_roles', COUNT(*) FROM user_roles
-- UNION ALL
-- SELECT 'api_role_permissions', COUNT(*) FROM api_role_permissions;

-- 查看用户角色分布：
-- SELECT r.role_name, COUNT(*) AS user_count
-- FROM users u
-- JOIN roles r ON u.role_id = r.id
-- GROUP BY r.role_name;

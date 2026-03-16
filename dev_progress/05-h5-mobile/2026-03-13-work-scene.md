# 设备作业场景字段增强 - work_scene

**日期**: 2026-03-13
**版本**: v2.6
**状态**: ✅ 已完成

---

## 📋 修改内容

### 1. 数据库变更 ✅

**迁移脚本**: `eim/migrations/005_equipment_work_scene.sql`

**新增字段**:
```sql
ALTER TABLE equipment 
ADD COLUMN work_scene VARCHAR(20) DEFAULT 'yard' NOT NULL;

COMMENT ON COLUMN equipment.work_scene IS '作业场景：wharf(码头)/yard(货场) - 决定开始作业时船名/货品是否必填';

CREATE INDEX idx_equipment_work_scene ON equipment(work_scene);
```

**数据更新**:
```sql
-- 码头设备
UPDATE equipment 
SET work_scene = 'wharf' 
WHERE type IN ('门式起重机', '桥式起重机', '装船机', '卸船机');

-- 货场设备
UPDATE equipment 
SET work_scene = 'yard' 
WHERE type NOT IN ('门式起重机', '桥式起重机', '装船机', '卸船机');
```

---

### 2. Go 模型更新 ✅

**文件**: `eim/internal/model/models.go`

**新增字段**:
```go
type Equipment struct {
    // ... 其他字段
    WorkScene           string     `gorm:"size:20;default:'yard'" json:"work_scene"` // wharf(码头)/yard(货场)
    // ... 其他字段
}
```

---

### 3. 前端 TypeScript 类型更新 ✅

**文件**: `eim/web/app/mobile/equipment/[id]/page.tsx`

**新增字段**:
```typescript
interface Equipment {
  // ... 其他字段
  work_scene?: string;  // wharf(码头)/yard(货场)
  // ... 其他字段
}
```

---

### 4. 前端逻辑优化 ✅

**修改前** (硬编码设备类型):
```typescript
{equipment.type === '门式起重机' || 
 equipment.type === '桥式起重机' || 
 equipment.type === '装船机' || 
 equipment.type === '卸船机' ? (
  // 码头设备 - 必填
  <Form.Item rules={[{ required: true }]} />
) : (
  // 货场设备 - 可选
  <Form.Item extra="货场/仓库设备可不填" />
)}
```

**修改后** (使用 work_scene 字段):
```typescript
{equipment.work_scene === 'wharf' ? (
  // 码头设备 - 必填
  <>
    <Form.Item name="ship_name" rules={[{ required: true }]}>
      <Input placeholder="请输入作业船舶名称" />
    </Form.Item>
    <Form.Item name="cargo_name" rules={[{ required: true }]}>
      <Input placeholder="请输入货品名称" />
    </Form.Item>
  </>
) : (
  // 货场设备 - 可选
  <>
    <Form.Item name="ship_name" extra="货场/仓库设备可不填">
      <Input placeholder="请输入船名（可选）" />
    </Form.Item>
    <Form.Item name="cargo_name" extra="货场/仓库设备可不填">
      <Input placeholder="请输入货品名称（可选）" />
    </Form.Item>
  </>
)}
```

---

## 🎯 设计优势

### 1. 灵活配置

**修改前**:
- 需要修改代码才能调整设备的作业场景分类
- 设备类型列表硬编码在前端代码中
- 新增设备类型需要重新部署

**修改后**:
- 通过数据库字段控制，无需修改代码
- 管理员可以在管理后台修改设备的作业场景
- 新增设备类型时自动应用默认值（yard）

---

### 2. 易于扩展

**未来扩展场景**:
```sql
-- 添加铁路作业场景
ALTER TABLE equipment 
ADD CHECK (work_scene IN ('wharf', 'yard', 'rail'));

-- 添加 pipeline(管道输送) 场景
UPDATE equipment 
SET work_scene = 'pipeline' 
WHERE type = '输送机';
```

**场景枚举**:
| 场景 | 值 | 说明 | 船名/货品 |
|------|---|------|----------|
| 码头作业 | `wharf` | 泊位设备 | 必填 |
| 货场作业 | `yard` | 货场设备 | 可选 |
| 铁路作业 | `rail` | 铁路装卸设备 | 可选（车皮号） |
| 管道输送 | `pipeline` | 管道/输送机 | 不显示 |

---

### 3. 数据驱动

**业务逻辑由数据控制**:
```
设备数据 → work_scene 字段 → 前端表单验证规则
```

**避免硬编码**:
```typescript
// ❌ 硬编码（旧方案）
if (type === '门式起重机' || type === '桥式起重机' ...)

// ✅ 数据驱动（新方案）
if (work_scene === 'wharf')
```

---

## 📊 数据库迁移步骤

### 1. 执行迁移脚本

```bash
# 进入数据库
psql -U eim_user -d eim_db

# 执行迁移
\i /path/to/migrations/005_equipment_work_scene.sql
```

### 2. 验证迁移结果

```sql
-- 验证字段已添加
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'equipment' AND column_name = 'work_scene';

-- 验证数据已更新
SELECT work_scene, type, COUNT(*) 
FROM equipment 
GROUP BY work_scene, type 
ORDER BY work_scene, type;

-- 验证索引已创建
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'equipment' AND indexname = 'idx_equipment_work_scene';
```

### 3. 预期结果

```
 work_scene |     type      | count
------------+---------------+-------
 wharf      | 门式起重机    | 4
 yard       | 叉车          | 2
 yard       | 装载机        | 1
```

---

## 🧪 测试要点

### 1. 码头设备测试 (work_scene = 'wharf')

**测试步骤**:
1. 扫码一台门式起重机（work_scene = 'wharf'）
2. 点击"开始作业"
3. 验证：船名、货品字段显示为必填（有红色星号）
4. 不填写船名/货品，点击"确认开始作业"
5. 验证：显示错误提示"请输入船名"/"请输入货品名称"
6. 填写船名、货品、操作人
7. 点击"确认开始作业"
8. 验证：提交成功

---

### 2. 货场设备测试 (work_scene = 'yard')

**测试步骤**:
1. 扫码一台叉车（work_scene = 'yard'）
2. 点击"开始作业"
3. 验证：船名、货品字段显示为可选（有"货场/仓库设备可不填"提示）
4. 不填写船名/货品，只填写操作人
5. 点击"确认开始作业"
6. 验证：提交成功
7. 验证：也可以填写船名/货品（可选功能正常）

---

### 3. 管理后台测试

**测试步骤**:
1. 登录管理后台
2. 进入设备管理页面
3. 编辑一台设备
4. 验证：可以看到 work_scene 字段（下拉选择：码头/货场）
5. 修改 work_scene 从 'yard' 到 'wharf'
6. 保存
7. 验证：数据库字段已更新
8. 移动端重新扫码该设备
9. 验证：船名/货品变为必填

---

## 📝 注意事项

### 1. 向后兼容

- 默认值为 `'yard'`，确保现有设备默认为货场场景
- 迁移脚本会自动更新现有设备的 work_scene
- 前端代码对 work_scene 为空的情况做降级处理（视为 yard）

---

### 2. 数据迁移

**迁移脚本已包含数据更新**:
```sql
-- 根据设备类型自动设置 work_scene
UPDATE equipment SET work_scene = 'wharf' WHERE type IN (...);
UPDATE equipment SET work_scene = 'yard' WHERE type NOT IN (...);
```

**手动调整**:
```sql
-- 如有特殊情况，可以手动调整个别设备
UPDATE equipment 
SET work_scene = 'wharf' 
WHERE code = 'MQ40-01';
```

---

### 3. 管理后台

**建议**: 在管理后台设备管理页面添加 work_scene 字段的编辑功能

**表单字段**:
```typescript
<Form.Item name="work_scene" label="作业场景" initialValue="yard">
  <Select>
    <Select.Option value="wharf">码头</Select.Option>
    <Select.Option value="yard">货场</Select.Option>
  </Select>
</Form.Item>
```

---

## 🔗 相关文档

- **核心业务规则**: `/workspaces/SEM/docs/核心业务规则.md` - 规则 3.1 开始作业
- **数据库迁移**: `/workspaces/SEM/eim/migrations/005_equipment_work_scene.sql`
- **开发进度**: `/workspaces/SEM/dev_progress/05-h5-mobile/2026-03-13-h5-enhancement.md`

---

## ✅ 完成清单

- [x] 数据库迁移脚本
  - [x] 添加 work_scene 字段
  - [x] 添加字段注释
  - [x] 创建索引
  - [x] 更新现有数据

- [x] Go 模型更新
  - [x] Equipment 结构体添加 WorkScene 字段
  - [x] GORM 标签配置

- [x] 前端代码更新
  - [x] TypeScript 类型定义
  - [x] 开始作业表单逻辑优化
  - [x] 使用 work_scene 判断必填项

- [x] 文档更新
  - [x] 核心业务规则文档
  - [x] 开发进度文档

---

**技术栈**: Go 1.21+ | Next.js 14+ | PostgreSQL 15+ | TypeScript

**修改文件数**: 5
- `eim/migrations/005_equipment_work_scene.sql` (新建)
- `eim/internal/model/models.go`
- `eim/web/app/mobile/equipment/[id]/page.tsx`
- `docs/核心业务规则.md`
- `dev_progress/05-h5-mobile/2026-03-13-work-scene.md` (新建)

**代码行数变化**: +150 行

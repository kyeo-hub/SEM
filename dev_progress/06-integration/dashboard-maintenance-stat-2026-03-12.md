# Dashboard 添加维保中设备统计

**日期**: 2026-03-12
**版本**: v2.5
**状态**: ✅ 已完成

---

## 需求描述

在 Dashboard 页面上添加"维保中"设备的数字统计，让用户可以直观地看到当前正在进行维保的设备数量。

## 解决方案

### 1. 添加图标导入

**文件**: `eim/web/app/dashboard/page.tsx`

```typescript
import {
  // ... 其他图标
  SettingOutlined,
} from '@ant-design/icons';
```

### 2. 添加维保统计卡片

在故障卡片后面添加维保卡片（紫色主题）：

```typescript
<Col xs={24} sm={12} lg={6}>
  <Card
    style={{
      background: 'rgba(114, 46, 218, 0.15)',
      border: '1px solid rgba(114, 46, 218, 0.5)',
      borderRadius: 16,
      boxShadow: '0 0 20px rgba(114, 46, 218, 0.3)',
    }}
    styles={{ body: { padding: 24 } }}
  >
    <Statistic
      title={<span style={{ color: '#722eda', fontSize: 16 }}>维保中</span>}
      value={stats.maintenance}
      prefix={<SettingOutlined style={{ color: '#722eda', fontSize: 24 }} />}
      styles={{
        content: { color: '#722eda', fontSize: 36, fontWeight: 'bold' }
      }}
    />
  </Card>
</Col>
```

### 3. 更新简化地图模式统计

**文件**: `eim/web/components/dashboard/EquipmentMap.tsx`

在简化模式的统计区域添加维保统计卡片：

```typescript
<div style={{
  padding: 12,
  background: 'rgba(114, 46, 218, 0.15)',
  borderRadius: 8,
  textAlign: 'center',
}}>
  <div style={{ fontSize: 12, color: '#722eda', marginBottom: 4 }}>维保</div>
  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>{stats.maintenance}</div>
</div>
```

---

## 修改的文件

1. `eim/web/app/dashboard/page.tsx`
   - 添加 `SettingOutlined` 图标导入
   - 添加维保统计卡片（第 5 个卡片）

2. `eim/web/components/dashboard/EquipmentMap.tsx`
   - 简化模式统计区域添加维保统计

---

## UI 设计

### 颜色方案

| 状态 | 颜色 | RGB |
|------|------|-----|
| 设备总数 | 蓝色 | #1890ff |
| 作业中 | 绿色 | #52c41a |
| 待命 | 橙色 | #faad14 |
| 故障 | 红色 | #ff4d4f |
| **维保中** | **紫色** | **#722eda** |

### 布局

```
┌─────────────────────────────────────────────────────────┐
│  [设备总数]  [作业中]  [待命]  [故障]  [维保中]        │
│     31        15       10      3       3               │
└─────────────────────────────────────────────────────────┘
```

---

## 数据来源

`stats.maintenance` 数据来自 `equipments` 数组中 `status === 'maintenance'` 的设备数量统计。

统计逻辑：
```typescript
const maintenance = equipments.filter((e) => e.status === 'maintenance').length;
```

---

## 实时更新

维保中设备数量通过 SSE 实时更新：
- 当设备状态变为 `maintenance` 时，数字自动 +1
- 当设备维保完成变为 `standby` 时，数字自动 -1

---

## 测试结果

### 预期行为

- ✅ Dashboard 显示 5 个统计卡片（总数、作业、待命、故障、维保）
- ✅ 维保卡片使用紫色主题
- ✅ 数字实时更新（通过 SSE）
- ✅ 简化地图模式也显示维保统计
- ✅ 响应式布局（移动端自动换行）

---

**下一步**: 继续优化 Dashboard 其他功能

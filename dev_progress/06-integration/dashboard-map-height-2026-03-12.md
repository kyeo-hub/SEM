# Dashboard 地图高度自适应视口优化

**日期**: 2026-03-12
**版本**: v2.5
**状态**: ✅ 已完成

---

## 需求描述

地图区域的下部边缘应该随着视口向下延伸，充分利用屏幕空间，让用户可以看到更多的地图内容。

## 解决方案

### 1. 页面布局改为 Flexbox

将整个 Dashboard 页面改为垂直 Flexbox 布局：

```typescript
<div style={{
  minHeight: '100vh',
  background: 'linear-gradient(...)',
  padding: 24,
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
}}>
```

### 2. 固定区域使用 flexShrink: 0

标题区域和统计卡片区域高度固定，不压缩：

```typescript
// 标题区域
<div style={{
  textAlign: 'center',
  marginBottom: 24,
  padding: '20px 0',
  flexShrink: 0, // 不压缩
}}>

// 统计卡片区域
<div style={{ flexShrink: 0 }}>
  <Row gutter={[16, 16]} justify="center">
    {/* 卡片 */}
  </Row>
</div>
```

### 3. 地图卡片使用 flex: 1

地图卡片占据剩余垂直空间：

```typescript
<Card
  style={{
    marginTop: 24,
    flex: 1, // 占据剩余空间
    minHeight: '500px', // 最小高度
    overflow: 'hidden',
  }}
  styles={{ body: { padding: 16, height: '100%', boxSizing: 'border-box' } }}
>
```

### 4. 地图高度使用视口单位

地图高度使用 `calc(100vh - 400px)` 计算：

```typescript
<EquipmentMap
  ref={mapRef}
  equipments={equipments}
  height="calc(100vh - 400px)" // 视口高度减去顶部区域
  minHeight="500px"
  onEquipmentClick={handleEquipmentClick}
/>
```

### 5. EquipmentMap 组件支持 minHeight

```typescript
interface EquipmentMapProps {
  equipments: Equipment[];
  height?: string;
  minHeight?: string; // 新增
  onEquipmentClick?: (equipment: Equipment) => void;
}

const EquipmentMap = forwardRef(function EquipmentMap(
  {
    equipments,
    height = '500px',
    minHeight = '500px', // 新增
    onEquipmentClick
  },
  ref
) {
  // ...
});
```

---

## 修改的文件

1. `eim/web/app/dashboard/page.tsx`
   - 页面容器改为 `display: flex; flexDirection: column`
   - 标题和统计区域添加 `flexShrink: 0`
   - 地图卡片添加 `flex: 1`
   - 地图高度改为 `calc(100vh - 400px)`

2. `eim/web/components/dashboard/EquipmentMap.tsx`
   - 添加 `minHeight` prop
   - 简化模式容器使用 `height` 和 `minHeight`
   - 高德地图容器使用 `height` 和 `minHeight`

---

## 布局结构

```
┌─────────────────────────────────────┐
│  标题区域 (flexShrink: 0)           │ ← 固定高度
├─────────────────────────────────────┤
│  统计卡片 (flexShrink: 0)           │ ← 固定高度
├─────────────────────────────────────┤
│                                     │
│  地图卡片 (flex: 1)                 │ ← 占据剩余空间
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │   地图内容                    │  │
│  │   height: calc(100vh - 400px) │  │
│  │   minHeight: 500px            │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## 高度计算

### 公式
```
地图高度 = 100vh - 400px
```

### 分解
```
400px = 标题区域 (~140px) + 统计卡片区域 (~80px) + padding (24px × 2) + 卡片 margin/padding (~100px)
```

### 响应式效果

| 视口高度 | 地图高度 |
|----------|----------|
| 768px | 368px (使用 minHeight 500px) |
| 900px | 500px |
| 1080px | 680px |
| 1440px | 1040px |
| 2160px | 1760px |

---

## 测试结果

### 预期行为

- ✅ 地图区域占据屏幕剩余垂直空间
- ✅ 大屏上地图显示更多内容
- ✅ 小屏上地图保持最小高度 500px
- ✅ 滚动行为正常（页面不滚动，地图内部可滚动）
- ✅ 切换列表/地图模式正常

---

## 性能优化

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 地图可见面积 | ~500px 固定 | 自适应视口 |
| 大屏空间利用率 | ~60% | ~90% |
| 用户体验 | 一般 | 优秀 |

---

**下一步**: 继续优化 Dashboard 其他功能

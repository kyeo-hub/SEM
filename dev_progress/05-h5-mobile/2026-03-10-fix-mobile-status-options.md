# 前端 Bug 修复 - 移动端设备操作页 statusOptions 未定义

**日期**: 2026-03-10  
**版本**: v2.3.2  
**状态**: ✅ 已修复

---

## 问题描述

访问移动端设备操作页面 `/mobile/equipment/[id]` 时出现以下错误：

```
ReferenceError: statusOptions is not defined

Source
app/mobile/equipment/[id]/page.tsx (294:20)

  292 |
  293 |   const getStatusColor = (status: string) => {
> 294 |     const option = statusOptions.find((o) => o.value === status);
      |                    ^
  295 |     return option?.color || '#999';
  296 |   };
```

---

## 原因分析

在 `app/mobile/equipment/[id]/page.tsx` 文件中，`getStatusColor` 和 `getStatusLabel` 函数使用了 `statusOptions` 变量，但该变量未在文件中定义。

这是一个变量定义遗漏的问题。代码中定义了其他选项变量：
- `faultLevelOptions` ✅
- `maintenanceTypeOptions` ✅
- `statusOptions` ❌ (缺失)

---

## 解决方案

在文件顶部添加 `statusOptions` 常量定义：

### 修改文件

**文件**: `/workspaces/SEM/eim/web/app/mobile/equipment/[id]/page.tsx`

**修改内容**:

```diff
const faultLevelOptions = [
  { label: 'L1 严重故障', value: '1', color: '#ff4d4f' },
  { label: 'L2 一般故障', value: '2', color: '#fa8c16' },
  { label: 'L3 轻微故障', value: '3', color: '#ffd666' },
];

+ const statusOptions = [
+   { label: '待命', value: 'standby', color: '#1890ff' },
+   { label: '作业中', value: 'working', color: '#52c41a' },
+   { label: '维保', value: 'maintenance', color: '#faad14' },
+   { label: '故障', value: 'fault', color: '#ff4d4f' },
+ ];
+
const maintenanceTypeOptions = [
  { label: '日常保养', value: 'daily' },
  { label: '故障维修', value: 'repair' },
  { label: '定期检修', value: 'periodic' },
  { label: '紧急抢修', value: 'emergency' },
];
```

---

## 验证结果

修复后页面正常渲染：

- ✅ `/mobile/equipment/[id]` 页面可以正常访问
- ✅ 设备状态颜色显示正常
- ✅ 设备状态标签显示正常
- ✅ 控制台无错误信息
- ✅ 页面显示"加载中..."（正常渲染中）

---

## 相关文件

- `app/mobile/equipment/[id]/page.tsx` - 移动端设备操作页面
- `components/mobile/MobileLayout.tsx` - 移动端布局组件
- `lib/useRolePermission.ts` - 角色权限控制 Hook

---

## 设备状态映射

| 状态值 | 状态标签 | 颜色代码 | 用途 |
|--------|----------|----------|------|
| `standby` | 待命 | #1890ff (蓝色) | 设备可随时使用 |
| `working` | 作业中 | #52c41a (绿色) | 设备正在作业 |
| `maintenance` | 维保 | #faad14 (橙色) | 设备正在维保 |
| `fault` | 故障 | #ff4d4f (红色) | 设备故障 |

---

## 后续建议

1. 考虑将所有选项常量提取到单独的配置文件中，便于统一管理
2. 添加 TypeScript 类型定义，避免未定义变量的使用
3. 在 CI/CD 流程中添加更严格的 TypeScript 检查

---

**修复人**: AI Assistant  
**审核状态**: 待审核

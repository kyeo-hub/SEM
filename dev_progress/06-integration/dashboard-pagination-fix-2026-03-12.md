# Dashboard 列表分页修复

**日期**: 2026-03-12
**版本**: v2.5
**状态**: ✅ 已完成

---

## 问题描述

Dashboard 页面列表模式中，每页显示条数下拉框无效。用户选择每页显示 20、50 或 100 条记录后，表格仍然显示 10 条记录。

## 根本原因

1. **缺少受控分页状态**: Table 组件的 `pagination` 配置使用了固定的 `pageSize: 10`，没有使用 React 状态来管理。

2. **缺少 onChange 处理**: Table 组件没有 `onChange` 回调函数来处理分页变化。

3. **SSE 数据更新**: 每次 SSE 推送数据时，`equipments` 状态会被更新，但分页状态没有保持。

## 解决方案

### 1. 添加分页状态

```typescript
const [pagination, setPagination] = useState({
  current: 1,
  pageSize: 10,
});
```

### 2. 添加分页变化处理函数

```typescript
// 处理分页变化
const handleTableChange = (pag: any) => {
  setPagination({
    current: pag.current,
    pageSize: pag.pageSize,
  });
};
```

### 3. 修改 Table 组件为受控模式

```typescript
<Table
  columns={columns}
  dataSource={equipments}
  rowKey="id"
  loading={loading}
  onChange={handleTableChange}
  pagination={{
    current: pagination.current,
    pageSize: pagination.pageSize,
    showTotal: (total) => `共 ${total} 台`,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
  }}
  scroll={{ x: 1000 }}
/>
```

---

## 修改的文件

1. `eim/web/app/dashboard/page.tsx`
   - 添加 `pagination` 状态
   - 添加 `handleTableChange` 函数
   - 修改 Table 组件为受控模式

---

## 功能说明

### 分页配置项

| 配置项 | 说明 | 值 |
|--------|------|-----|
| `current` | 当前页码 | 从 `pagination.current` 读取 |
| `pageSize` | 每页显示条数 | 从 `pagination.pageSize` 读取 |
| `showTotal` | 显示总数 | `共 ${total} 台` |
| `showSizeChanger` | 显示每页条数下拉框 | `true` |
| `showQuickJumper` | 显示快速跳页 | `true` |
| `pageSizeOptions` | 每页条数选项 | `['10', '20', '50', '100']` |

### 使用方式

1. **切换每页显示条数**: 选择下拉框中的 10、20、50、100
2. **翻页**: 点击页码或上一页/下一页按钮
3. **快速跳页**: 在输入框中输入页码后回车

---

## 测试结果

### 预期行为

- ✅ 选择每页显示 20 条，表格立即显示 20 条记录
- ✅ 选择每页显示 50 条，表格立即显示 50 条记录
- ✅ 选择每页显示 100 条，表格立即显示 100 条记录
- ✅ 翻页后分页状态保持
- ✅ SSE 数据更新时，分页状态保持

---

**下一步**: 继续测试 Dashboard 其他功能

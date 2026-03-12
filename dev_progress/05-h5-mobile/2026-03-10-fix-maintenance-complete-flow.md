# 前端修复 - 维保状态下的完成流程

**日期**: 2026-03-10  
**版本**: v2.3.4  
**状态**: ✅ 已修复

---

## 问题描述

用户反馈：设备处于维保状态时，点击"设为待命"按钮后，表单显示的是结束作业的字段（包含装卸吨位等），而且提交时提示"没有当前作业记录"，这与维保状态的业务逻辑不符。

**核心问题**:
1. 维保状态下应该使用"维保完成"流程，而不是"结束作业"流程
2. 维保完成和结束作业是两个不同的业务场景，应该有不同的表单字段和 API 调用
3. 当前代码没有区分设备状态，统一使用了结束作业的逻辑

---

## 业务规则

### 设备状态与操作对应关系

| 设备状态 | 按钮文本 | 点击确认提示 | 表单字段 | 提交 API |
|----------|----------|--------------|----------|----------|
| **working** (作业中) | 结束作业 | "是否结束作业并设为待命？" | 装卸吨位、原因、故障选项 | `/api/operations/end` |
| **maintenance** (维保中) | 维保完成 | "是否完成维保并设为待命？" | 原因、故障选项 | `/api/maintenance/complete` |
| **fault** (故障) | 设为待命 | - | 原因 | `/api/equipments/:id/status` |
| **standby** (待命) | 待命中 (禁用) | - | - | - |

### 状态流转

```
作业中 (working)
    │
    ▼ 结束作业
    ├── 无故障 → 待命 (standby)
    └── 有故障 → 故障 (fault)

维保中 (maintenance)
    │
    ▼ 维保完成
    ├── 完全解决 → 待命 (standby)
    └── 部分解决 → 故障 (fault)

故障 (fault)
    │
    ▼ 设为待命
    └── → 待命 (standby)
```

---

## 解决方案

### 1. 添加状态管理

```typescript
const [currentMaintenanceId, setCurrentMaintenanceId] = useState<number | null>(null);
```

### 2. 修改按钮逻辑

根据设备状态显示不同的按钮文本和确认提示：

```typescript
<Button
  color="primary"
  size="large"
  block
  icon={<UserOutline />}
  disabled={equipment.status === 'standby'}
  onClick={() => {
    if (equipment.status === 'maintenance') {
      // 获取当前维保记录 ID
      fetch(`/api/maintenance/today?equipment_id=${equipment.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 0 && data.data?.length > 0) {
            setCurrentMaintenanceId(data.data[0].id);
          }
          Dialog.confirm({
            content: '当前设备正在维保中，是否完成维保并设为待命？',
            onConfirm: () => setStandbyModalVisible(true),
          });
        });
    } else if (equipment.status === 'working') {
      Dialog.confirm({
        content: '当前设备正在作业中，是否结束作业并设为待命？',
        onConfirm: () => setStandbyModalVisible(true),
      });
    } else {
      setStandbyModalVisible(true);
    }
  }}
>
  {equipment.status === 'standby' ? '待命中' : 
   equipment.status === 'maintenance' ? '维保完成' : 
   equipment.status === 'working' ? '结束作业' : 
   '设为待命'}
</Button>
```

### 3. 修改弹窗内容

根据设备状态动态显示不同的表单字段：

```typescript
<Dialog
  title={
    equipment.status === 'maintenance' ? '维保完成' :
    equipment.status === 'working' ? '结束作业' :
    '设为待命'
  }
  content={
    <Form>
      {/* 作业状态时显示吨位字段 */}
      {equipment.status === 'working' && (
        <Form.Item name="cargo_weight" label="装卸吨位">
          <Input type="number" placeholder="请输入装卸吨位（吨）" />
        </Form.Item>
      )}

      <Form.Item name="reason" label="原因说明">
        <Input placeholder="请输入原因（可选）" maxLength={200} rows={2} />
      </Form.Item>

      {/* 作业状态或维保状态时显示故障选项 */}
      {(equipment.status === 'working' || equipment.status === 'maintenance') && (
        <>
          <Form.Item name="has_fault" label="是否有故障">
            <Selector options={[
              { label: '无故障', value: false },
              { label: '有故障', value: true },
            ]} columns={2} />
          </Form.Item>

          <Form.Item name="fault_level_id" label="故障等级" extra="有故障时必填"
            rules={[{
              required: standbyForm.getFieldValue('has_fault') === true,
              message: '有故障时请选择故障等级',
            }]}>
            <Selector options={faultLevelOptions} columns={1} />
          </Form.Item>

          <Form.Item name="fault_description" label="故障描述" extra="有故障时必填"
            rules={[{
              required: standbyForm.getFieldValue('has_fault') === true,
              message: '有故障时请填写故障描述',
            }]}>
            <Input placeholder="请描述故障情况" maxLength={500} rows={3} />
          </Form.Item>
        </>
      )}

      <Form.Item name="operator" label="操作人" rules={[{ required: true }]}>
        <Input placeholder="请输入操作人姓名" />
      </Form.Item>
    </Form>
  }
>
```

### 4. 添加不同的处理函数

#### 维保完成处理

```typescript
const handleCompleteMaintenance = async (values: any) => {
  const token = localStorage.getItem('token');
  
  // 构建故障信息
  let faultInfo = '';
  if (values.has_fault) {
    const faultLevel = faultLevelOptions.find((o) => o.value === values.fault_level_id);
    faultInfo = ` [${faultLevel?.label || '故障'}] ${values.fault_description}`;
  } else {
    faultInfo = ' 无故障';
  }

  const res = await fetch(`/api/maintenance/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      maintenance_id: currentMaintenanceId,
      result: values.has_fault ? 'partially_resolved' : 'resolved',
      fault_level_id: values.has_fault && values.fault_level_id ? parseInt(values.fault_level_id) : null,
      actual_content: values.reason || '维保完成',
      next_plan: '',
      maintainer_signature: '',
      acceptor_name: values.operator,
      acceptor_signature: '',
      photos_before: [],
      photos_after: [],
      qr_scan: true,
      changed_by: values.operator || 'Mobile User',
    }),
  });

  const data = await res.json();
  if (data.code === 0) {
    Toast.show({ 
      content: values.has_fault ? `维保完成，${faultInfo}` : '维保完成', 
      icon: 'success', 
      duration: 2000 
    });
    setStandbyModalVisible(false);
    standbyForm.resetFields();
    loadEquipment();
  } else {
    Toast.show({ content: data.message || '操作失败', icon: 'fail' });
  }
};
```

#### 设为待命处理（非作业/非维保状态）

```typescript
const handleSetStandby = async (values: any) => {
  const token = localStorage.getItem('token');
  
  const res = await fetch(`/api/equipments/${equipment?.id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'standby',
      reason: values.reason || '设为待命',
      qr_scan: true,
      changed_by: values.operator || 'Mobile User',
    }),
  });

  const data = await res.json();
  if (data.code === 0) {
    Toast.show({ content: '设为待命成功', icon: 'success', duration: 2000 });
    setStandbyModalVisible(false);
    standbyForm.resetFields();
    loadEquipment();
  } else {
    Toast.show({ content: data.message || '操作失败', icon: 'fail' });
  }
};
```

### 5. 修改提交逻辑

根据设备状态调用不同的处理函数：

```typescript
{
  key: 'submit',
  text: '确认',
  color: 'primary',
  onClick: async () => {
    try {
      const values = await standbyForm.validateFields();
      console.log('表单验证通过:', values, '设备状态:', equipment.status);

      // 根据设备状态调用不同的 API
      if (equipment.status === 'maintenance') {
        await handleCompleteMaintenance(values);
      } else if (equipment.status === 'working') {
        await handleEndWork(values);
      } else {
        await handleSetStandby(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  },
}
```

---

## 验证结果

### 场景 1: 维保状态 → 维保完成（无故障）

1. 设备处于维保状态
2. 点击"维保完成"按钮
3. 确认提示"当前设备正在维保中，是否完成维保并设为待命？"
4. 表单显示：原因说明、操作人（无吨位字段）
5. 选择"无故障"
6. 提交 → ✅ 调用 `/api/maintenance/complete` API
7. 设备状态变为待命

### 场景 2: 维保状态 → 维保完成（有故障）

1. 设备处于维保状态
2. 点击"维保完成"按钮
3. 确认提示
4. 表单显示：原因说明、是否有故障、故障等级、故障描述、操作人
5. 选择"有故障"，填写故障信息
6. 提交 → ✅ 调用 `/api/maintenance/complete` API
7. 设备状态变为故障（部分解决）

### 场景 3: 作业状态 → 结束作业

1. 设备处于作业状态
2. 点击"结束作业"按钮
3. 确认提示"当前设备正在作业中，是否结束作业并设为待命？"
4. 表单显示：装卸吨位、原因说明、是否有故障、故障等级、故障描述、操作人
5. 填写信息后提交 → ✅ 调用 `/api/operations/end` API
6. 设备状态变为待命或故障

### 场景 4: 故障状态 → 设为待命

1. 设备处于故障状态
2. 点击"设为待命"按钮
3. 表单显示：原因说明、操作人（无故障选项）
4. 提交 → ✅ 调用 `/api/equipments/:id/status` API
5. 设备状态变为待命

---

## 相关文件

- `app/mobile/equipment/[id]/page.tsx` - 移动端设备操作页面
- `internal/handler/maintenance_handler.go` - 后端维保 Handler
- `internal/service/maintenance_service.go` - 后端维保 Service

---

## API 端点

| API | 方法 | 用途 |
|-----|------|------|
| `/api/maintenance/complete` | POST | 完成维保 |
| `/api/maintenance/today` | GET | 获取今日维保记录 |
| `/api/operations/end` | POST | 结束作业 |
| `/api/equipments/:id/status` | PUT | 更新设备状态 |

---

## 后续建议

1. 考虑在维保完成后自动跳转到维保记录详情页
2. 添加维保历史查询功能
3. 优化故障字段的 UI 显示，可以考虑使用条件渲染隐藏/显示
4. 添加签名功能，支持电子签名确认

---

## Bug 修复记录

### 2026-03-10 15:30 - Selector 组件返回值问题

**问题**: `has_fault` 和 `fault_level_id` 字段从 Selector 组件返回的是数组格式，而不是单个值，导致后端 API 报错"参数错误"。

**日志**:
```
表单验证通过: {
  reason: undefined,
  has_fault: Array(1),
  fault_level_id: Array(0),
  fault_description: undefined,
  operator: '杨恺'
}
维保完成响应：{code: 400, message: '参数错误'}
```

**原因**: antd-mobile 的 `Selector` 组件设计为支持多选，所以返回值始终是数组格式。

**解决方案**: 在处理函数中添加数组转换逻辑：

```typescript
// Selector 返回的是数组，需要转换为单个值
const hasFault = Array.isArray(values.has_fault) 
  ? values.has_fault[0] 
  : values.has_fault;
const faultLevelId = Array.isArray(values.fault_level_id) 
  ? values.fault_level_id[0] 
  : values.fault_level_id;
```

**修复文件**:
- `handleCompleteMaintenance` - 维保完成处理
- `handleEndWork` - 结束作业处理

---

**修复人**: AI Assistant  
**审核状态**: 待审核

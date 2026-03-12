# 前端优化 - 结束作业表单故障字段条件验证

**日期**: 2026-03-10  
**版本**: v2.3.3  
**状态**: ✅ 已优化

---

## 问题描述

用户反馈：在结束作业/设为待命时，选择"无故障"后，故障等级和故障描述字段仍然显示为必填，这不合理。

**原问题**:
- 选择"无故障"时，故障等级和故障描述字段仍然要求填写
- 用户必须选择"有故障"才能提交，这不符合业务逻辑

---

## 原因分析

在 `app/mobile/equipment/[id]/page.tsx` 的结束作业表单中，故障等级和故障描述字段的验证规则是静态的，没有根据"是否有故障"的选择动态调整。

**原有代码**:

```typescript
<Form.Item
  name="fault_level_id"
  label="故障等级"
  extra="有故障时必填"
>
  <Selector options={faultLevelOptions} columns={1} />
</Form.Item>

<Form.Item
  name="fault_description"
  label="故障描述"
  extra="有故障时必填"
>
  <Input placeholder="请描述故障情况" maxLength={500} rows={3} />
</Form.Item>
```

虽然 `extra` 提示文字写了"有故障时必填"，但实际上没有实现条件验证逻辑。

---

## 解决方案

### 1. 添加条件验证规则

使用 Ant Design Mobile 的 `rules` 属性，根据 `has_fault` 字段的值动态设置必填规则：

```typescript
<Form.Item
  name="fault_level_id"
  label="故障等级"
  extra="有故障时必填"
  rules={[
    {
      required: standbyForm.getFieldValue('has_fault') === true,
      message: '有故障时请选择故障等级',
    },
  ]}
>
  <Selector options={faultLevelOptions} columns={1} />
</Form.Item>

<Form.Item
  name="fault_description"
  label="故障描述"
  extra="有故障时必填"
  rules={[
    {
      required: standbyForm.getFieldValue('has_fault') === true,
      message: '有故障时请填写故障描述',
    },
  ]}
>
  <Input
    placeholder="请描述故障情况"
    maxLength={500}
    rows={3}
  />
</Form.Item>
```

### 2. 简化提交验证逻辑

移除提交按钮中的重复验证代码，因为表单验证规则已经处理了条件必填：

**修改前**:
```typescript
onClick: async () => {
  try {
    const values = await standbyForm.validateFields();

    // 如果有故障，检查故障信息是否填写
    if (values.has_fault) {
      if (!values.fault_level_id) {
        Toast.show({ content: '请选择故障等级', icon: 'fail' });
        return;
      }
      if (!values.fault_description) {
        Toast.show({ content: '请填写故障描述', icon: 'fail' });
        return;
      }
    }

    await handleEndWork(values);
  } catch (error) {
    Toast.show({ content: '请填写必填项', icon: 'fail' });
  }
}
```

**修改后**:
```typescript
onClick: async () => {
  try {
    const values = await standbyForm.validateFields();
    await handleEndWork(values);
  } catch (error) {
    // 不显示通用错误提示，表单验证会显示具体错误
  }
}
```

---

## 验证结果

### 场景 1: 选择"无故障"

1. 打开结束作业弹窗
2. 选择"无故障"
3. 故障等级和故障描述字段显示为**非必填**（无星号标记）
4. 可以直接提交，不需要填写故障信息

### 场景 2: 选择"有故障"

1. 打开结束作业弹窗
2. 选择"有故障"
3. 故障等级和故障描述字段显示为**必填**（有星号标记）
4. 如果不填写，提交时会提示：
   - "有故障时请选择故障等级"
   - "有故障时请填写故障描述"

---

## 相关文件

- `app/mobile/equipment/[id]/page.tsx` - 移动端设备操作页面

---

## 业务规则

### 结束作业流程

```
结束作业请求
    │
    ▼
填写表单
├── 装卸吨位（可选）
├── 原因说明（可选）
├── 是否有故障（必选）
│   ├── 无故障 → 故障等级和描述为非必填
│   └── 有故障 → 故障等级和描述为必填
└── 操作人（必填）
    │
    ▼
提交验证
├── 无故障 → 直接设为待命
└── 有故障 → 创建故障记录 → 更新设备状态为故障
```

---

## 后续建议

1. 考虑在 UI 上更明显地区分"有故障"和"无故障"的状态
2. 可以在选择"有故障"时动态显示故障字段，选择"无故障"时隐藏
3. 考虑添加故障快速选择模板，提高输入效率

---

**优化人**: AI Assistant  
**审核状态**: 待审核

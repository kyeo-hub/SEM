'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Dialog,
  Toast,
  Form,
  Input,
  Selector,
  DatePicker,
} from 'antd-mobile';
import {
  CheckCircleOutline,
  CloseCircleOutline,
  AppOutline,
  FileOutline,
  UserOutline,
  UnorderedListOutline,
} from 'antd-mobile-icons';
import { useParams, useRouter } from 'next/navigation';
import MobileLayout from '@/components/mobile/MobileLayout';
import { useRolePermission } from '@/lib/useRolePermission';

// 声明全局 window 对象类型
declare global {
  interface Window {
    _currentMaintenanceIdForConfirm?: number | null;
  }
}

interface Equipment {
  id: number;
  code: string;
  name: string;
  type: string;
  company: string;
  location: string;
  status: string;
  current_ship?: string;
  current_cargo?: string;
  fault_level_id?: number;
  fault_level?: {
    id: number;
    level_code: string;
    level_name: string;
    allow_work: boolean;
    color: string;
  };
  work_scene?: string;  // wharf(码头)/yard(货场)
  current_operation_id?: number;  // 当前作业记录 ID
}

const statusOptions = [
  { label: '待命', value: 'standby', color: '#1890ff' },
  { label: '作业中', value: 'working', color: '#52c41a' },
  { label: '维保', value: 'maintenance', color: '#faad14' },
  { label: '故障', value: 'fault', color: '#ff4d4f' },
];

const faultLevelOptions = [
  { label: 'L1 严重故障', value: '1', color: '#ff4d4f' },
  { label: 'L2 一般故障', value: '2', color: '#fa8c16' },
  { label: 'L3 轻微故障', value: '3', color: '#ffd666' },
];

const maintenanceTypeOptions = [
  { label: '日常保养', value: 'daily' },
  { label: '故障维修', value: 'repair' },
  { label: '定期检修', value: 'periodic' },
  { label: '紧急抢修', value: 'emergency' },
];

export default function EquipmentActionPage() {
  const params = useParams();
  const router = useRouter();
  const qrCodeUuid = params.id as string;
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 角色权限
  const { canWork, canMaintenance } = useRolePermission();
  
  // 弹窗状态
  const [workModalVisible, setWorkModalVisible] = useState(false);
  const [standbyModalVisible, setStandbyModalVisible] = useState(false);
  const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
  const [faultModalVisible, setFaultModalVisible] = useState(false);
  
  // 表单
  const [workForm] = Form.useForm();
  const [standbyForm] = Form.useForm();
  const [maintenanceForm] = Form.useForm();
  const [faultForm] = Form.useForm();

  useEffect(() => {
    loadEquipment();
  }, [qrCodeUuid]);

  const loadEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      // 先尝试按 code 查询（手动输入设备编号的情况）
      let res = await fetch(`/api/equipments?code=${qrCodeUuid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      let data = await res.json();

      // 如果按 code 查询为空，再尝试按 qr_code_uuid 查询
      if (data.code !== 0 || !data.data.list || data.data.list.length === 0) {
        res = await fetch(`/api/equipments?qr_code_uuid=${qrCodeUuid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        data = await res.json();
      }

      if (data.code === 0 && data.data.list?.length > 0) {
        setEquipment(data.data.list[0]);
      } else {
        Toast.show({ content: '设备不存在', icon: 'fail' });
      }
    } catch (error) {
      console.error('加载设备失败:', error);
      Toast.show({ content: '加载失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  // 开始作业
  const handleStartWork = async (values: any) => {
    console.log('开始作业提交:', values);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/equipments/${equipment?.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'working',
          ship_name: values.ship_name,
          cargo_name: values.cargo_name,
          reason: `开始作业：${values.ship_name} - ${values.cargo_name}`,
          qr_scan: true,
          changed_by: values.operator || 'Mobile User',
        }),
      });

      const data = await res.json();
      console.log('开始作业响应:', data);
      
      if (data.code === 0) {
        Toast.show({ content: '开始作业成功', icon: 'success', duration: 2000 });
        // 先关闭弹窗
        setWorkModalVisible(false);
        // 重置表单
        setTimeout(() => {
          workForm.resetFields();
          // 重新加载设备信息
          loadEquipment();
        }, 300);
      } else {
        Toast.show({ content: data.message || '操作失败', icon: 'fail' });
      }
    } catch (error) {
      console.error('开始作业失败:', error);
      Toast.show({ content: '操作失败', icon: 'fail' });
    }
  };

  // 结束作业（设为待命）
  const handleEndWork = async (values: any) => {
    console.log('结束作业提交:', values);
    try {
      const token = localStorage.getItem('token');

      // 首先获取当前作业记录
      const todayRes = await fetch(`/api/operations/today?equipment_id=${equipment?.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const todayData = await todayRes.json();

      if (todayData.code !== 0 || !todayData.data || todayData.data.length === 0) {
        Toast.show({ content: '未找到当前作业记录', icon: 'fail' });
        return;
      }

      const operationId = todayData.data[0].id;

      // 调用结束作业 API
      const res = await fetch(`/api/operations/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          operation_id: operationId,
          cargo_weight: values.cargo_weight ? parseFloat(values.cargo_weight) : null,
          has_fault: values.has_fault || false,
          fault_level_id: values.has_fault && values.fault_level_id ? parseInt(values.fault_level_id) : null,
          fault_description: values.fault_description || '',
          operator_name: values.operator,
          reason: values.reason || '作业完成',
          qr_scan: true,
          changed_by: values.operator || 'Mobile User',
        }),
      });

      const data = await res.json();
      console.log('结束作业响应:', data);

      if (data.code === 0) {
        Toast.show({ content: '结束作业成功', icon: 'success', duration: 2000 });
        setStandbyModalVisible(false);
        setTimeout(() => {
          standbyForm.resetFields();
          loadEquipment();
        }, 300);
      } else {
        Toast.show({ content: data.message || '操作失败', icon: 'fail' });
      }
    } catch (error) {
      console.error('结束作业失败:', error);
      Toast.show({ content: '操作失败', icon: 'fail' });
    }
  };

  // 维保登记
  const handleMaintenance = async (values: any) => {
    console.log('维保登记提交:', values);
    try {
      const token = localStorage.getItem('token');
      
      // 调用维保登记 API（创建维保记录）
      const res = await fetch(`/api/maintenance/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          equipment_id: equipment?.id,
          maintenance_type: values.maintenance_type,
          plan_content: values.content,
          maintainer_name: values.operator || 'Mobile User',
          maintainer_id: null,
          qr_scan: true,
          changed_by: values.operator || 'Mobile User',
        }),
      });

      const data = await res.json();
      console.log('维保登记响应:', data);
      
      if (data.code === 0) {
        Toast.show({ content: '维保登记成功', icon: 'success' });
        setMaintenanceModalVisible(false);
        maintenanceForm.resetFields();
        loadEquipment();
      } else {
        Toast.show({ content: data.message || '操作失败', icon: 'fail' });
      }
    } catch (error) {
      console.error('维保登记失败:', error);
      Toast.show({ content: '操作失败', icon: 'fail' });
    }
  };

  // 维保完成（设为待命）
  const handleCompleteMaintenance = async (values: any) => {
    console.log('维保完成提交:', values);

    // 优先使用 window 对象上存储的 ID（避免异步状态更新问题）
    const maintenanceId = window._currentMaintenanceIdForConfirm || currentMaintenanceId;
    console.log('使用维保记录 ID:', maintenanceId);

    // 检查 maintenance_id 是否存在
    if (!maintenanceId) {
      Toast.show({ content: '未找到当前维保记录，请重试', icon: 'fail' });
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // 根据维保结果确定设备状态和故障等级
      let result: string;
      let newFaultLevelId: number | null = null;
      let statusText = '维保完成';

      if (values.result === 'resolved') {
        // 全部解决 - 设备变为待命，无故障
        result = 'resolved';
        newFaultLevelId = null;
        statusText = '维保完成，设备已恢复待命';
      } else if (values.result === 'partially_resolved') {
        // 部分解决 - 设备仍为故障状态，故障等级降低
        result = 'partially_resolved';
        newFaultLevelId = values.fault_level_id ? parseInt(values.fault_level_id) : null;
        const faultLevel = faultLevelOptions.find((o) => o.value === values.fault_level_id);
        statusText = `维保完成，${faultLevel?.label || '故障'}，设备仍需维保`;
      } else {
        // 未解决 - 设备保持故障状态，故障等级不变
        result = 'unresolved';
        newFaultLevelId = equipment.fault_level_id || null;
        statusText = '维保未完成，设备仍为故障状态';
      }

      // 调用维保完成 API
      const res = await fetch(`/api/maintenance/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          maintenance_id: maintenanceId,
          result: result,
          fault_level_id: newFaultLevelId,
          actual_content: values.reason || '维保完成',
          next_plan: values.result !== 'resolved' ? values.next_plan || '' : '',
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
      console.log('维保完成响应:', data);

      if (data.code === 0) {
        Toast.show({
          content: statusText,
          icon: 'success',
          duration: 2000
        });
        setStandbyModalVisible(false);
        // 清除存储的 ID
        window._currentMaintenanceIdForConfirm = null;
        setTimeout(() => {
          standbyForm.resetFields();
          loadEquipment();
        }, 300);
      } else {
        Toast.show({ content: data.message || '操作失败', icon: 'fail' });
      }
    } catch (error) {
      console.error('维保完成失败:', error);
      Toast.show({ content: '操作失败', icon: 'fail' });
    }
  };

  // 设为待命（非维保状态）
  const handleSetStandby = async (values: any) => {
    console.log('设为待命提交:', values);
    try {
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
      console.log('设为待命响应:', data);

      if (data.code === 0) {
        Toast.show({ content: '设为待命成功', icon: 'success', duration: 2000 });
        setStandbyModalVisible(false);
        setTimeout(() => {
          standbyForm.resetFields();
          loadEquipment();
        }, 300);
      } else {
        Toast.show({ content: data.message || '操作失败', icon: 'fail' });
      }
    } catch (error) {
      console.error('设为待命失败:', error);
      Toast.show({ content: '操作失败', icon: 'fail' });
    }
  };

  const getStatusColor = (status: string) => {
    const option = statusOptions.find((o) => o.value === status);
    return option?.color || '#999';
  };

  const getStatusLabel = (status: string) => {
    const option = statusOptions.find((o) => o.value === status);
    return option?.label || status;
  };

  // 维保状态禁止作业
  const [currentMaintenanceId, setCurrentMaintenanceId] = useState<number | null>(null);

  // 检查是否允许开始作业
  const checkAllowWork = () => {
    // 维保状态禁止作业
    if (equipment.status === 'maintenance') {
      Toast.show({
        content: '设备正在维保中，禁止作业',
        icon: 'fail',
      });
      return;
    }

    // 故障状态检查故障等级
    if (equipment.status === 'fault' && equipment.fault_level) {
      if (!equipment.fault_level.allow_work) {
        // L1 故障，禁止作业
        Toast.show({
          content: `设备${equipment.fault_level.level_name}，禁止作业！`,
          icon: 'fail',
          duration: 3000,
        });
        return;
      } else {
        // L2/L3 故障，允许作业但提示
        Dialog.confirm({
          content: `设备当前为${equipment.fault_level.level_name}，允许带病作业，但需注意安全！是否继续？`,
          onConfirm: () => setWorkModalVisible(true),
        });
        return;
      }
    }

    // 故障状态但没有故障等级信息（数据异常）
    if (equipment.status === 'fault') {
      Toast.show({
        content: '设备故障状态异常，请先检查设备',
        icon: 'fail',
      });
      return;
    }

    // 待命状态，允许作业
    setWorkModalVisible(true);
  };

  if (loading) {
    return (
      <MobileLayout title="设备操作" showBack>
        <div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>
      </MobileLayout>
    );
  }

  if (!equipment) {
    return (
      <MobileLayout title="设备操作" showBack>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p>设备不存在</p>
          <Button onClick={() => router.push('/mobile/scan')}>重新扫码</Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="设备操作" showBack>
      <div style={{ padding: 16 }}>
        {/* 设备信息卡片 */}
        <Card
          style={{ marginBottom: 16 }}
          title={
            <Space justify="between">
              <span style={{ fontSize: 18, fontWeight: 'bold' }}>
                {equipment.name}
              </span>
              <Space>
                {equipment.fault_level && equipment.status !== 'working' && (
                  <Tag color={equipment.fault_level.color}>
                    {equipment.fault_level.level_name}
                  </Tag>
                )}
                <Tag color={getStatusColor(equipment.status)}>
                  {getStatusLabel(equipment.status)}
                </Tag>
              </Space>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <span style={{ color: '#999', fontSize: 14 }}>设备编号：</span>
              <span>{equipment.code}</span>
            </div>
            <div>
              <span style={{ color: '#999', fontSize: 14 }}>设备类型：</span>
              <span>{equipment.type}</span>
            </div>
            <div>
              <span style={{ color: '#999', fontSize: 14 }}>使用单位：</span>
              <span>{equipment.company}</span>
            </div>
            <div>
              <span style={{ color: '#999', fontSize: 14 }}>安装位置：</span>
              <span>{equipment.location}</span>
            </div>
            {equipment.status === 'working' && (
              <>
                <div>
                  <span style={{ color: '#999', fontSize: 14 }}>当前船名：</span>
                  <span>{equipment.current_ship || '-'}</span>
                </div>
                <div>
                  <span style={{ color: '#999', fontSize: 14 }}>货品名称：</span>
                  <span>{equipment.current_cargo || '-'}</span>
                </div>
              </>
            )}
          </Space>
        </Card>

        {/* 四大功能按钮 */}
        <Card title="操作功能">
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 作业功能 - 仅管理员和操作司机可见 */}
            {canWork && (
              <Button
                color="success"
                size="large"
                block
                icon={<CheckCircleOutline />}
                onClick={() => {
                  if (equipment.status === 'working') {
                    // 当前是作业状态，提示是否结束作业
                    Dialog.confirm({
                      content: '当前设备正在作业中，是否结束作业？',
                      onConfirm: () => setStandbyModalVisible(true),
                    });
                  } else {
                    // 非作业状态，检查是否允许开始作业
                    checkAllowWork();
                  }
                }}
                disabled={equipment.status === 'maintenance'}
              >
                {equipment.status === 'working' ? '结束作业' : '开始作业'}
              </Button>
            )}

            {/* 待命功能 - 所有角色都可见 */}
            <Button
              color="primary"
              size="large"
              block
              icon={<UserOutline />}
              disabled={equipment.status === 'standby'}
              onClick={() => {
                if (equipment.status === 'maintenance') {
                  // 维保状态，先获取当前维保记录，然后提示维保完成
                  const token = localStorage.getItem('token');
                  Toast.show({ 
                    content: '正在加载维保记录...', 
                    icon: 'loading',
                    duration: 3000
                  });
                  
                  fetch(`/api/maintenance/today?equipment_id=${equipment.id}`, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      console.log('获取维保记录响应:', data);
                      if (data.code === 0 && data.data && data.data.length > 0) {
                        const maintenanceId = data.data[0].id;
                        console.log('获取到维保记录 ID:', maintenanceId);
                        // 直接传入 ID，不依赖状态更新
                        window._currentMaintenanceIdForConfirm = maintenanceId;
                        Dialog.confirm({
                          content: '当前设备正在维保中，是否完成维保并设为待命？',
                          onConfirm: () => {
                            console.log('确认维保完成，使用 ID:', window._currentMaintenanceIdForConfirm);
                            setStandbyModalVisible(true);
                          },
                        });
                      } else {
                        Dialog.confirm({
                          content: '未找到当前维保记录，是否继续？',
                          onConfirm: () => setStandbyModalVisible(true),
                        });
                      }
                    })
                    .catch((err) => {
                      console.error('获取维保记录失败:', err);
                      Dialog.confirm({
                        content: '获取维保记录失败，是否继续？',
                        onConfirm: () => setStandbyModalVisible(true),
                      });
                    });
                } else if (equipment.status === 'working') {
                  // 作业状态，提示结束作业
                  Dialog.confirm({
                    content: '当前设备正在作业中，是否结束作业并设为待命？',
                    onConfirm: () => setStandbyModalVisible(true),
                  });
                } else {
                  // 其他状态（故障或待命），直接设为待命
                  setStandbyModalVisible(true);
                }
              }}
            >
              {equipment.status === 'standby' ? '待命中' : equipment.status === 'maintenance' ? '维保完成' : equipment.status === 'working' ? '结束作业' : '设为待命'}
            </Button>

            {/* 点检功能 - 所有角色都可见 */}
            <Button
              color="warning"
              size="large"
              block
              icon={<FileOutline />}
              onClick={() =>
                router.push(`/mobile/inspection/new?equipmentId=${equipment.id}`)
              }
            >
              点检录入
            </Button>

            {/* 维保功能 - 仅管理员和维保员可见 */}
            {canMaintenance && (
              <Button
                color="danger"
                size="large"
                block
                icon={<UnorderedListOutline />}
                disabled={equipment.status === 'maintenance'}
                onClick={() => setMaintenanceModalVisible(true)}
              >
                {equipment.status === 'maintenance' ? '维保中' : '维保登记'}
              </Button>
            )}
          </Space>
        </Card>

        {/* 开始作业弹窗 */}
        <Dialog
          content={
            <Form
              form={workForm}
              layout="vertical"
            >
              {/* 根据设备作业场景判断是否需要填写船名和货品 */}
              {equipment.work_scene === 'wharf' ? (
                <>
                  <Form.Item
                    name="ship_name"
                    label="船名"
                    rules={[{ required: true, message: '请输入船名' }]}
                  >
                    <Input placeholder="请输入作业船舶名称" />
                  </Form.Item>
                  <Form.Item
                    name="cargo_name"
                    label="货品名称"
                    rules={[{ required: true, message: '请输入货品名称' }]}
                  >
                    <Input placeholder="请输入货品名称" />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item
                    name="ship_name"
                    label="船名"
                    extra="货场/仓库设备可不填"
                  >
                    <Input placeholder="请输入船名（可选）" />
                  </Form.Item>
                  <Form.Item
                    name="cargo_name"
                    label="货品名称"
                    extra="货场/仓库设备可不填"
                  >
                    <Input placeholder="请输入货品名称（可选）" />
                  </Form.Item>
                </>
              )}
              <Form.Item name="operator" label="操作人" rules={[{ required: true }]}>
                <Input placeholder="请输入操作人姓名" />
              </Form.Item>
            </Form>
          }
          visible={workModalVisible}
          onMaskClick={() => setWorkModalVisible(false)}
          actions={[
            {
              key: 'submit',
              text: '确认开始作业',
              color: 'success',
              onClick: async () => {
                try {
                  const values = await workForm.validateFields();
                  console.log('表单验证通过:', values);
                  await handleStartWork(values);
                } catch (error) {
                  console.error('表单验证失败:', error);
                  Toast.show({ content: '请填写必填项', icon: 'fail' });
                }
              },
            },
            {
              key: 'cancel',
              text: '取消',
              onClick: () => setWorkModalVisible(false),
            },
          ]}
        />

        {/* 结束作业/维保完成/设为待命 弹窗 */}
        <Dialog
          title={
            equipment.status === 'maintenance' ? '维保完成' :
            equipment.status === 'working' ? '结束作业' :
            '设为待命'
          }
          content={
            <Form
              form={standbyForm}
              layout="vertical"
            >
              {/* 维保状态时显示维保结果选择 */}
              {equipment.status === 'maintenance' && (
                <>
                  <Form.Item
                    name="result"
                    label="维保结果"
                    initialValue="resolved"
                    rules={[{ required: true }]}
                  >
                    <Selector
                      options={[
                        { label: '全部解决', value: 'resolved', color: '#52c41a' },
                        { label: '部分解决', value: 'partially_resolved', color: '#faad14' },
                        { label: '未解决', value: 'unresolved', color: '#ff4d4f' },
                      ]}
                      columns={1}
                    />
                  </Form.Item>

                  <Form.Item
                    name="reason"
                    label="实际完成的维保工作"
                    rules={[{ required: true, message: '请填写实际完成的维保工作' }]}
                  >
                    <Input
                      placeholder="请描述实际完成的维保工作内容"
                      maxLength={500}
                      rows={3}
                      showCount
                    />
                  </Form.Item>

                  {/* 部分解决或未解决时显示故障等级和后续计划 */}
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, current) => prev.result !== current.result}
                  >
                    {() => {
                      const result = standbyForm.getFieldValue('result');
                      const showFaultFields = result === 'partially_resolved' || result === 'unresolved';
                      
                      return showFaultFields ? (
                        <>
                          {result === 'partially_resolved' && (
                            <Form.Item
                              name="fault_level_id"
                              label="维保后的故障等级"
                              rules={[{ required: true, message: '请选择维保后的故障等级' }]}
                            >
                              <Selector options={faultLevelOptions} columns={1} />
                            </Form.Item>
                          )}

                          <Form.Item
                            name="next_plan"
                            label="后续计划"
                            extra={result === 'unresolved' ? '未解决部分的后续安排' : '剩余工作的计划'}
                            rules={[{ required: true, message: '请填写后续计划' }]}
                          >
                            <Input
                              placeholder="请填写后续维保计划或安排"
                              maxLength={500}
                              rows={3}
                              showCount
                            />
                          </Form.Item>
                        </>
                      ) : null;
                    }}
                  </Form.Item>
                </>
              )}

              {/* 作业状态时显示吨位字段 */}
              {equipment.status === 'working' && (
                <Form.Item
                  name="cargo_weight"
                  label="装卸吨位"
                  extra="可选，货场/仓库设备可不填"
                >
                  <Input
                    type="number"
                    placeholder="请输入装卸吨位（吨）"
                  />
                </Form.Item>
              )}

              {/* 作业状态时显示故障选项 */}
              {equipment.status === 'working' && (
                <>
                  <Form.Item
                    name="has_fault"
                    label="是否有故障"
                    initialValue={false}
                  >
                    <Selector
                      options={[
                        { label: '无故障', value: false },
                        { label: '有故障', value: true },
                      ]}
                      columns={2}
                    />
                  </Form.Item>

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
                </>
              )}

              {/* 非维保状态时显示原因说明 */}
              {equipment.status !== 'maintenance' && (
                <Form.Item name="reason" label="原因说明">
                  <Input
                    placeholder="请输入原因（可选）"
                    maxLength={200}
                    rows={2}
                  />
                </Form.Item>
              )}

              <Form.Item name="operator" label="操作人" rules={[{ required: true }]}>
                <Input placeholder="请输入操作人姓名" />
              </Form.Item>
            </Form>
          }
          visible={standbyModalVisible}
          onMaskClick={() => setStandbyModalVisible(false)}
          actions={[
            {
              key: 'submit',
              text: '确认',
              color: 'primary',
              onClick: async () => {
                try {
                  const values = await standbyForm.validateFields();
                  console.log('表单验证通过:', values, '设备状态:', equipment.status);

                  // Selector 返回的是数组，需要转换为单个值
                  const hasFault = Array.isArray(values.has_fault) ? values.has_fault[0] : values.has_fault;
                  const faultLevelId = Array.isArray(values.fault_level_id) ? values.fault_level_id[0] : values.fault_level_id;

                  // 手动检查故障信息
                  if (hasFault) {
                    if (!faultLevelId) {
                      Toast.show({ content: '请选择故障等级', icon: 'fail' });
                      return;
                    }
                    if (!values.fault_description) {
                      Toast.show({ content: '请填写故障描述', icon: 'fail' });
                      return;
                    }
                  }

                  // 根据设备状态调用不同的 API
                  if (equipment.status === 'maintenance') {
                    await handleCompleteMaintenance({ ...values, has_fault: hasFault, fault_level_id: faultLevelId });
                  } else if (equipment.status === 'working') {
                    await handleEndWork({ ...values, has_fault: hasFault, fault_level_id: faultLevelId });
                  } else {
                    await handleSetStandby(values);
                  }
                } catch (error) {
                  console.error('表单验证失败:', error);
                  // 不显示通用错误提示，表单验证会显示具体错误
                }
              },
            },
            {
              key: 'cancel',
              text: '取消',
              onClick: () => setStandbyModalVisible(false),
            },
          ]}
        />

        {/* 维保登记弹窗 */}
        <Dialog
          content={
            <Form
              form={maintenanceForm}
              layout="vertical"
            >
              <Form.Item
                name="maintenance_type"
                label="维保类型"
                rules={[{ required: true }]}
              >
                <Selector options={maintenanceTypeOptions} columns={2} />
              </Form.Item>
              <Form.Item
                name="fault_level"
                label="故障等级"
                extra="故障维修时选择"
              >
                <Selector options={faultLevelOptions} columns={1} />
              </Form.Item>
              <Form.Item
                name="content"
                label="维保内容"
                rules={[{ required: true }]}
              >
                <Input
                  placeholder="请输入维保内容"
                  maxLength={500}
                  rows={3}
                />
              </Form.Item>
              <Form.Item name="operator" label="操作人">
                <Input placeholder="请输入操作人姓名" />
              </Form.Item>
            </Form>
          }
          visible={maintenanceModalVisible}
          onMaskClick={() => setMaintenanceModalVisible(false)}
          actions={[
            {
              key: 'submit',
              text: '确认登记',
              color: 'danger',
              onClick: async () => {
                try {
                  const values = await maintenanceForm.validateFields();
                  console.log('维保登记表单验证通过:', values);
                  await handleMaintenance(values);
                } catch (error) {
                  console.error('维保登记表单验证失败:', error);
                  Toast.show({ content: '请填写必填项', icon: 'fail' });
                }
              },
            },
            {
              key: 'cancel',
              text: '取消',
              onClick: () => setMaintenanceModalVisible(false),
            },
          ]}
        />

        {/* 故障登记弹窗 */}
        <Dialog
          content={
            <Form
              form={faultForm}
              layout="vertical"
            >
              <Form.Item
                name="fault_level"
                label="故障等级"
                rules={[{ required: true }]}
              >
                <Selector options={faultLevelOptions} columns={1} />
              </Form.Item>
              <Form.Item
                name="description"
                label="故障描述"
                rules={[{ required: true }]}
              >
                <Input
                  placeholder="请描述故障情况"
                  maxLength={500}
                  rows={3}
                />
              </Form.Item>
              <Form.Item name="operator" label="操作人">
                <Input placeholder="请输入操作人姓名" />
              </Form.Item>
            </Form>
          }
          visible={faultModalVisible}
          onMaskClick={() => setFaultModalVisible(false)}
          actions={[
            {
              key: 'submit',
              text: '确认登记',
              color: 'danger',
              onClick: async () => {
                try {
                  const values = await faultForm.validateFields();
                  console.log('故障登记表单验证通过:', values);
                  await handleFault(values);
                } catch (error) {
                  console.error('故障登记表单验证失败:', error);
                  Toast.show({ content: '请填写必填项', icon: 'fail' });
                }
              },
            },
            {
              key: 'cancel',
              text: '取消',
              onClick: () => setFaultModalVisible(false),
            },
          ]}
        />
      </div>
    </MobileLayout>
  );
}

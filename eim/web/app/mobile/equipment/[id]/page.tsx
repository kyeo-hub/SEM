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
} from 'antd-mobile';
import {
  CheckCircleOutline,
  CloseCircleOutline,
  SettingOutline,
  FileTextOutline,
} from 'antd-mobile-icons';
import { useParams, useRouter } from 'next/navigation';
import MobileLayout from '@/components/mobile/MobileLayout';

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
}

const statusOptions = [
  { label: '作业', value: 'working', color: '#52c41a' },
  { label: '待命', value: 'standby', color: '#1890ff' },
  { label: '维保', value: 'maintenance', color: '#faad14' },
  { label: '故障', value: 'fault', color: '#ff4d4f' },
];

const faultLevelOptions = [
  { label: 'L1 严重故障', value: '1', color: '#ff4d4f' },
  { label: 'L2 一般故障', value: '2', color: '#fa8c16' },
  { label: 'L3 轻微故障', value: '3', color: '#ffd666' },
];

export default function EquipmentActionPage() {
  const params = useParams();
  const router = useRouter();
  const qrCodeUuid = params.id as string;
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [operationForm] = Form.useForm();

  useEffect(() => {
    loadEquipment();
  }, [qrCodeUuid]);

  const loadEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      // 先通过 UUID 查询设备
      const res = await fetch(`/api/equipments?qr_code_uuid=${qrCodeUuid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.code === 0 && data.data.list?.length > 0) {
        setEquipment(data.data.list[0]);
      } else {
        Toast.show({
          content: '设备不存在',
          icon: 'fail',
        });
      }
    } catch (error) {
      console.error('加载设备失败:', error);
      Toast.show({ content: '加载失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (values: any) => {
    try {
      const token = localStorage.getItem('token');
      const status = values.status;
      const faultLevelId = status === 'fault' ? values.fault_level : null;

      const res = await fetch(`/api/equipments/${equipment?.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          fault_level_id: faultLevelId ? parseInt(faultLevelId) : null,
          reason: values.reason,
          ship_name: status === 'working' ? values.ship_name : null,
          cargo_name: status === 'working' ? values.cargo_name : null,
        }),
      });

      const data = await res.json();
      if (data.code === 0) {
        Toast.show({ content: '状态更新成功', icon: 'success' });
        setStatusModalVisible(false);
        loadEquipment();
      } else {
        Toast.show({ content: data.message || '更新失败', icon: 'fail' });
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      Toast.show({ content: '更新失败', icon: 'fail' });
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
              <Tag color={getStatusColor(equipment.status)}>
                {getStatusLabel(equipment.status)}
              </Tag>
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

        {/* 操作按钮 */}
        <Card title="快速操作">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              color="primary"
              size="large"
              block
              icon={<FileTextOutline />}
              onClick={() =>
                router.push(`/mobile/inspection/new?equipmentId=${equipment.id}`)
              }
            >
              点检录入
            </Button>

            <Button
              color="success"
              size="large"
              block
              icon={<CheckCircleOutline />}
              onClick={() => setStatusModalVisible(true)}
            >
              变更状态
            </Button>

            <Button
              color="warning"
              size="large"
              block
              icon={<SettingOutline />}
              onClick={() =>
                router.push(`/mobile/equipment/${equipment.id}/edit`)
              }
            >
              设备信息
            </Button>
          </Space>
        </Card>

        {/* 状态变更弹窗 */}
        <Dialog
          content={
            <Form
              form={operationForm}
              onFinish={handleStatusChange}
              layout="vertical"
              footer={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button block color="primary" htmlType="submit">
                    确认
                  </Button>
                  <Button
                    block
                    onClick={() => setStatusModalVisible(false)}
                  >
                    取消
                  </Button>
                </Space>
              }
            >
              <Form.Item
                name="status"
                label="设备状态"
                rules={[{ required: true }]}
              >
                <Selector
                  options={statusOptions}
                  columns={2}
                />
              </Form.Item>

              <Form.Item
                name="ship_name"
                label="船名"
                extra="状态为作业时填写"
              >
                <Input placeholder="请输入船名" />
              </Form.Item>

              <Form.Item
                name="cargo_name"
                label="货品名称"
                extra="状态为作业时填写"
              >
                <Input placeholder="请输入货品名称" />
              </Form.Item>

              <Form.Item
                name="fault_level"
                label="故障等级"
                extra="状态为故障时选择"
              >
                <Selector options={faultLevelOptions} columns={1} />
              </Form.Item>

              <Form.Item name="reason" label="变更原因">
                <Input
                  placeholder="请输入变更原因"
                  maxLength={200}
                  rows={2}
                />
              </Form.Item>
            </Form>
          }
          visible={statusModalVisible}
          onMaskClick={() => setStatusModalVisible(false)}
          style={{ '--content-max-width': '90%' }}
        />
      </div>
    </MobileLayout>
  );
}

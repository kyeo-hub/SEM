'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';

interface Equipment {
  id: number;
  code: string;
  name: string;
  type: string;
  company: string;
  location: string;
  status: string;
  latitude: number;
  longitude: number;
  inspection_enabled: boolean;
  inspection_frequency: string;
}

const statusColors: Record<string, string> = {
  working: 'green',
  standby: 'blue',
  maintenance: 'orange',
  fault: 'red',
};

const statusLabels: Record<string, string> = {
  working: '作业中',
  standby: '待命',
  maintenance: '维保',
  fault: '故障',
};

const equipmentTypes = [
  '门式起重机',
  '桥式起重机',
  '装船机',
  '卸船机',
];

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadEquipments();
  }, [page, pageSize]);

  const loadEquipments = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/equipments?page=${page}&page_size=${pageSize}`);
      setEquipments((data as { list: Equipment[] }).list);
      setTotal((data as { total: number }).total);
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingEquipment(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Equipment) => {
    setEditingEquipment(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/equipments/${id}`);
      message.success('删除成功');
      loadEquipments();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingEquipment) {
        await api.put(`/equipments/${editingEquipment.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/equipments', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadEquipments();
    } catch (error) {
      // 验证失败或请求失败
    }
  };

  const columns = [
    {
      title: '设备编号',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '使用单位',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status] || status}
        </Tag>
      ),
    },
    {
      title: '点检',
      dataIndex: 'inspection_enabled',
      key: 'inspection_enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Equipment) => (
        <Space>
          <Button
            type="link"
            icon={<QrcodeOutlined />}
            onClick={() => message.info('生成二维码功能待实现')}
          >
            二维码
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此设备吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, margin: 0 }}>设备管理</h1>
            <p style={{ color: '#666', margin: '8px 0 0' }}>管理所有设备信息</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增设备
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={equipments}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        title={editingEquipment ? '编辑设备' : '新增设备'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="设备编号"
            rules={[{ required: true, message: '请输入设备编号' }]}
          >
            <Input placeholder="如：MQ40" />
          </Form.Item>

          <Form.Item
            name="name"
            label="设备名称"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="如：40 吨门机 M1" />
          </Form.Item>

          <Form.Item
            name="type"
            label="设备类型"
            rules={[{ required: true, message: '请选择设备类型' }]}
          >
            <Select placeholder="请选择">
              {equipmentTypes.map((type) => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="company" label="使用单位">
            <Input placeholder="如：外贸码头" />
          </Form.Item>

          <Form.Item name="location" label="安装位置">
            <Input placeholder="如：1#泊位" />
          </Form.Item>

          <Form.Item name="latitude" label="纬度">
            <Input type="number" step="0.00000001" placeholder="30.12345678" />
          </Form.Item>

          <Form.Item name="longitude" label="经度">
            <Input type="number" step="0.00000001" placeholder="114.87654321" />
          </Form.Item>

          <Form.Item
            name="inspection_enabled"
            label="点检启用"
            valuePropName="checked"
            initialValue={true}
          >
            <Select>
              <Select.Option value={true}>启用</Select.Option>
              <Select.Option value={false}>禁用</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="inspection_frequency"
            label="点检频次"
            initialValue="daily"
          >
            <Select>
              <Select.Option value="daily">每日</Select.Option>
              <Select.Option value="weekly">每周</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}

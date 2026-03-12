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
  Card,
  Row,
  Col,
  InputNumber,
  Switch,
  Image,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  QrcodeOutlined,
  SearchOutlined,
  ExportOutlined,
  ImportOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import type { FormInstance } from 'antd';

interface Equipment {
  id: number;
  code: string;
  name: string;
  type: string;
  company: string;
  location: string;
  status: string;
  latitude?: number;
  longitude?: number;
  inspection_enabled: boolean;
  inspection_frequency: string;
  current_ship?: string;
  current_cargo?: string;
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
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState<Equipment | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [searchCode, setSearchCode] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchType, setSearchType] = useState('');
  const form = Form.useForm<FormInstance>();

  useEffect(() => {
    loadEquipments();
  }, [page, pageSize]);

  const loadEquipments = async () => {
    setLoading(true);
    try {
      let url = `/equipments?page=${page}&page_size=${pageSize}`;
      const params: string[] = [];
      if (searchCode) params.push(`code=${searchCode}`);
      if (searchStatus) params.push(`status=${searchStatus}`);
      if (searchType) params.push(`type=${searchType}`);
      if (params.length > 0) {
        url += `&${params.join('&')}`;
      }
      const data = await api.get(url);
      setEquipments((data as { list: Equipment[] }).list);
      setTotal((data as { total: number }).total);
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentEquipment(null);
    form.resetFields();
    form.setFieldsValue({
      inspection_enabled: true,
      inspection_frequency: 'daily',
    });
    setModalVisible(true);
  };

  const handleEdit = (record: Equipment) => {
    setCurrentEquipment(record);
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
      if (currentEquipment) {
        await api.put(`/equipments/${currentEquipment.id}`, values);
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

  const handleViewQRCode = async (record: Equipment) => {
    try {
      const data = await api.get(`/equipments/${record.id}/qrcode`);
      const { qr_code_base64 } = data as { qr_code_base64: string };
      setQrCodeImage(qr_code_base64);
      setCurrentEquipment(record);
      setQrModalVisible(true);
    } catch (error) {
      message.error('获取二维码失败');
    }
  };

  const handleExport = () => {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || '/api'}/equipments/export`;
    window.open(url, '_blank');
    message.success('导出中，请查看下载');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/api'}/equipments/import`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });
        
        const result = await response.json();
        if (result.code === 0) {
          message.success(`导入成功！成功：${result.data.imported}, 失败：${result.data.failed}`);
          loadEquipments();
        } else {
          message.error(`导入失败：${result.message}`);
        }
      } catch (error) {
        message.error('导入失败，请重试');
      }
    };
    input.click();
  };

  const handleSearch = () => {
    setPage(1);
    loadEquipments();
  };

  const handleReset = () => {
    setSearchCode('');
    setSearchStatus('');
    setSearchType('');
    setPage(1);
    loadEquipments();
  };

  const columns = [
    {
      title: '设备编号',
      dataIndex: 'code',
      key: 'code',
      sorter: (a: Equipment, b: Equipment) => a.code.localeCompare(b.code),
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
      filters: equipmentTypes.map((t) => ({ text: t, value: t })),
      onFilter: (value: unknown, record: Equipment) => record.type === value,
    },
    {
      title: '使用单位',
      dataIndex: 'company',
      key: 'company',
      responsive: ['md' as const],
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      responsive: ['lg' as const],
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
      filters: [
        { text: '作业中', value: 'working' },
        { text: '待命', value: 'standby' },
        { text: '维保', value: 'maintenance' },
        { text: '故障', value: 'fault' },
      ],
      onFilter: (value: unknown, record: Equipment) => record.status === value,
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
      responsive: ['xl' as const],
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 280,
      render: (_: unknown, record: Equipment) => (
        <Space direction="vertical" size="small">
          <Space>
            <Tooltip title="查看二维码">
              <Button
                type="primary"
                ghost
                size="small"
                icon={<QrcodeOutlined />}
                onClick={() => handleViewQRCode(record)}
              >
                二维码
              </Button>
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
            </Tooltip>
          </Space>
          <Space>
            <Popconfirm
              title="确定删除此设备吗？"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button danger size="small" icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            <Tooltip title="查看详情">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => message.info('详情功能待实现')}
              >
                详情
              </Button>
            </Tooltip>
          </Space>
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
          <Space>
            <Button icon={<ImportOutlined />} onClick={handleImport}>
              导入
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增设备
            </Button>
          </Space>
        </div>
      </div>

      {/* 搜索栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="设备编号"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="设备状态"
              value={searchStatus}
              onChange={(value) => setSearchStatus(value)}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="working">作业中</Select.Option>
              <Select.Option value="standby">待命</Select.Option>
              <Select.Option value="maintenance">维保</Select.Option>
              <Select.Option value="fault">故障</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="设备类型"
              value={searchType}
              onChange={(value) => setSearchType(value)}
              style={{ width: '100%' }}
              allowClear
            >
              {equipmentTypes.map((type) => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={equipments}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={currentEquipment ? '编辑设备' : '新增设备'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" scrollToFirstError>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="设备编号"
                rules={[{ required: true, message: '请输入设备编号' }]}
              >
                <Input placeholder="如：MQ40" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="设备名称"
                rules={[{ required: true, message: '请输入设备名称' }]}
              >
                <Input placeholder="如：40 吨门机 M1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <Form.Item name="company" label="使用单位">
                <Input placeholder="如：外贸码头" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location" label="安装位置">
            <Input placeholder="如：1#泊位" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="latitude" label="纬度">
                <InputNumber
                  style={{ width: '100%' }}
                  step={0.000001}
                  placeholder="30.123456"
                  min={-90}
                  max={90}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="longitude" label="经度">
                <InputNumber
                  style={{ width: '100%' }}
                  step={0.000001}
                  placeholder="114.876543"
                  min={-180}
                  max={180}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="inspection_enabled"
                label="点检启用"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
            <Col span={12}>
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
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 二维码弹窗 */}
      <Modal
        title={`设备二维码 - ${currentEquipment?.name || ''}`}
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="download"
            type="primary"
            onClick={() => {
              const link = document.createElement('a');
              link.download = `${currentEquipment?.code}-qrcode.png`;
              link.href = qrCodeImage;
              link.click();
              message.success('二维码已下载');
            }}
          >
            下载二维码
          </Button>,
        ]}
        width={400}
      >
        <div style={{ textAlign: 'center' }}>
          {qrCodeImage && (
            <Image
              src={qrCodeImage}
              alt="QR Code"
              style={{ maxWidth: '100%' }}
              preview={false}
            />
          )}
          <p style={{ marginTop: 16, color: '#666' }}>
            设备编号：{currentEquipment?.code}
          </p>
          <p style={{ color: '#999', fontSize: 12 }}>
            扫码后可进行：作业、待命、点检、维保操作
          </p>
        </div>
      </Modal>
    </AdminLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Card,
  Input,
  Select,
  Space,
  Button,
  message,
  Modal,
  Form,
  Popconfirm,
  Switch,
  InputNumber,
  Row,
  Col,
  Tooltip,
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import type { FormInstance } from 'antd';

interface Standard {
  id: number;
  equipment_type: string;
  part_name: string;
  part_order: number;
  item_name: string;
  item_order: number;
  content: string;
  method?: string;
  limit_value?: string;
  is_required: boolean;
}

const { Option } = Select;

const equipmentTypes = [
  '门式起重机',
  '桥式起重机',
  '装船机',
  '卸船机',
];

const inspectionMethods = [
  '视检',
  '听诊',
  '敲击',
  '测量',
  '操作',
  '触摸',
];

export default function StandardPage() {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStandard, setEditingStandard] = useState<Standard | null>(null);
  const form = Form.useForm<FormInstance>();

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    setLoading(true);
    try {
      let url = '/standards';
      if (selectedType) {
        url += `?equipment_type=${encodeURIComponent(selectedType)}`;
      }
      const data = await api.get(url);
      setStandards(data as unknown as Standard[]);

      // 提取设备类型
      if (data && Array.isArray(data)) {
        const types = Array.from(new Set((data as Standard[]).map(s => s.equipment_type)));
        setEquipmentTypes(types);
      }
    } catch (error) {
      message.error('加载点检标准失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadStandards();
  };

  const handleReset = () => {
    setSelectedType('');
    setSearchText('');
    loadStandards();
  };

  const handleAdd = () => {
    setEditingStandard(null);
    form.resetFields();
    form.setFieldsValue({
      is_required: true,
      part_order: 0,
      item_order: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: Standard) => {
    setEditingStandard(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/standards/${id}`);
      message.success('删除成功');
      loadStandards();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingStandard) {
        await api.put(`/standards/${editingStandard.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/standards', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadStandards();
    } catch (error) {
      // 验证失败或请求失败
    }
  };

  const filteredStandards = standards.filter(s => {
    if (!searchText) return true;
    return (
      s.part_name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.item_name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.content.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  const columns = [
    {
      title: '设备类型',
      dataIndex: 'equipment_type',
      key: 'equipment_type',
      width: 120,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
      filters: equipmentTypes.map((t) => ({ text: t, value: t })),
      onFilter: (value: unknown, record: Standard) => record.equipment_type === value,
    },
    {
      title: '部位名称',
      dataIndex: 'part_name',
      key: 'part_name',
      width: 150,
      sorter: (a: Standard, b: Standard) => a.part_name.localeCompare(b.part_name),
    },
    {
      title: '点检项目',
      dataIndex: 'item_name',
      key: 'item_name',
      width: 150,
    },
    {
      title: '点检内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      minWidth: 200,
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '允许界限值',
      dataIndex: 'limit_value',
      key: 'limit_value',
      width: 150,
      render: (text: string) => text || '-',
      ellipsis: true,
    },
    {
      title: '必填',
      dataIndex: 'is_required',
      key: 'is_required',
      width: 80,
      render: (required: boolean) => (
        <Tag color={required ? 'green' : 'default'}>
          {required ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 180,
      render: (_: unknown, record: Standard) => (
        <Space>
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
          <Popconfirm
            title="确定删除此标准吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
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
            <h1 style={{ fontSize: 24, margin: 0 }}>点检标准</h1>
            <p style={{ color: '#666', margin: '8px 0 0' }}>管理设备检查标准项目</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增标准
          </Button>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            <span>设备类型：</span>
            <Select
              value={selectedType}
              onChange={(value) => setSelectedType(value)}
              style={{ width: 200 }}
              allowClear
            >
              {equipmentTypes.map((type) => (
                <Option key={type} value={type}>
                  {type}
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
            >
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
          <Input
            placeholder="搜索部位名称、点检项目、点检内容"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 400 }}
            allowClear
          />
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={filteredStandards}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingStandard ? '编辑标准' : '新增标准'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical" scrollToFirstError>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="equipment_type"
                label="设备类型"
                rules={[{ required: true, message: '请选择设备类型' }]}
              >
                <Select placeholder="请选择">
                  {equipmentTypes.map((type) => (
                    <Option key={type} value={type}>
                      {type}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="part_name"
                label="部位名称"
                rules={[{ required: true, message: '请输入部位名称' }]}
              >
                <Input placeholder="如：吊钩组" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="part_order"
                label="部位排序"
                rules={[{ required: true, message: '请输入排序号' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="item_name"
                label="点检项目"
                rules={[{ required: true, message: '请输入点检项目' }]}
              >
                <Input placeholder="如：吊钩" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="item_order"
                label="项目排序"
                rules={[{ required: true, message: '请输入排序号' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_required"
                label="是否必填"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="content"
            label="点检内容"
            rules={[{ required: true, message: '请输入点检内容' }]}
          >
            <Input.TextArea rows={3} placeholder="详细描述点检内容" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="method" label="点检方法">
                <Select placeholder="请选择" allowClear>
                  {inspectionMethods.map((method) => (
                    <Option key={method} value={method}>
                      {method}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="limit_value" label="允许界限值">
                <Input placeholder="如：磨损量≤10%" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </AdminLayout>
  );
}

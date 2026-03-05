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
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';

interface Standard {
  id: number;
  equipment_type: string;
  part_name: string;
  part_order: number;
  item_name: string;
  item_order: number;
  content: string;
  method: string;
  limit_value: string;
  is_required: boolean;
}

const { Option } = Select;

export default function StandardPage() {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    setLoading(true);
    try {
      let url = '/api/standards';
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
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '部位名称',
      dataIndex: 'part_name',
      key: 'part_name',
    },
    {
      title: '点检项目',
      dataIndex: 'item_name',
      key: 'item_name',
    },
    {
      title: '点检内容',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      render: (text: string) => text || '-',
    },
    {
      title: '允许界限值',
      dataIndex: 'limit_value',
      key: 'limit_value',
      render: (text: string) => text || '-',
    },
    {
      title: '必填',
      dataIndex: 'is_required',
      key: 'is_required',
      render: (required: boolean) => (
        <Tag color={required ? 'green' : 'default'}>
          {required ? '是' : '否'}
        </Tag>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>点检标准</h1>
          <p style={{ color: '#666', margin: '8px 0 0' }}>管理设备点检标准项目</p>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
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
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />
    </AdminLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Card,
  Input,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';

interface Inspection {
  id: number;
  equipment_id: number;
  equipment_name: string;
  inspection_date: string;
  shift: string;
  inspector_name: string;
  total_items: number;
  normal_count: number;
  abnormal_count: number;
  overall_status: string;
  created_at: string;
}

const shiftLabels: Record<string, string> = {
  before: '班前',
  during: '班中',
  handover: '交班',
};

const statusColors: Record<string, string> = {
  normal: 'green',
  abnormal: 'red',
};

const statusLabels: Record<string, string> = {
  normal: '正常',
  abnormal: '异常',
};

export default function InspectionPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    loadInspections();
  }, [page, pageSize]);

  const loadInspections = async () => {
    setLoading(true);
    try {
      let url = `/api/inspections?page=${page}&page_size=${pageSize}`;
      if (searchDate) {
        url += `&date=${searchDate}`;
      }
      const data = await api.get(url);
      setInspections((data as { list: Inspection[] }).list);
      setTotal((data as { total: number }).total);
    } catch (error) {
      message.error('加载点检记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadInspections();
  };

  const columns = [
    {
      title: '设备名称',
      dataIndex: 'equipment_name',
      key: 'equipment_name',
    },
    {
      title: '点检日期',
      dataIndex: 'inspection_date',
      key: 'inspection_date',
    },
    {
      title: '班次',
      dataIndex: 'shift',
      key: 'shift',
      render: (shift: string) => shiftLabels[shift] || shift,
    },
    {
      title: '点检人',
      dataIndex: 'inspector_name',
      key: 'inspector_name',
    },
    {
      title: '总项数',
      dataIndex: 'total_items',
      key: 'total_items',
    },
    {
      title: '正常',
      dataIndex: 'normal_count',
      key: 'normal_count',
      render: (count: number) => <span style={{ color: '#52c41a' }}>{count}</span>,
    },
    {
      title: '异常',
      dataIndex: 'abnormal_count',
      key: 'abnormal_count',
      render: (count: number) => <span style={{ color: '#ff4d4f' }}>{count}</span>,
    },
    {
      title: '状态',
      dataIndex: 'overall_status',
      key: 'overall_status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status] || status}
        </Tag>
      ),
    },
    {
      title: '点检时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, margin: 0 }}>点检管理</h1>
            <p style={{ color: '#666', margin: '8px 0 0' }}>查看和管理点检记录</p>
          </div>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="点检日期"
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            搜索
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={inspections}
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
    </AdminLayout>
  );
}

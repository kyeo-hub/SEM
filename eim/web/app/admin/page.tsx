'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Space } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';

interface DailyStats {
  date: string;
  total_equipments: number;
  working_count: number;
  standby_count: number;
  maintenance_count: number;
  fault_count: number;
  inspection_count: number;
  abnormal_count: number;
}

interface Equipment {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  location: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, equipmentData] = await Promise.all([
        api.get('/stats/daily'),
        api.get('/equipments?page=1&page_size=5'),
      ]);
      setStats(statsData as unknown as DailyStats);
      setEquipments((equipmentData as { list: Equipment[] }).list);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

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
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>工作台</h1>
        <p style={{ color: '#666', margin: '8px 0 0' }}>欢迎使用设备点检管理系统</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={stats?.total_equipments || 0}
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="作业中"
              value={stats?.working_count || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待命"
              value={stats?.standby_count || 0}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="故障"
              value={stats?.fault_count || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card title="今日点检">
            <Statistic
              value={stats?.inspection_count || 0}
              suffix={`/ ${stats?.total_equipments || 0}`}
            />
            <Progress
              percent={
                stats?.total_equipments
                  ? Math.round(((stats.inspection_count || 0) / stats.total_equipments) * 100)
                  : 0
              }
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card title="异常设备">
            <Statistic
              value={stats?.abnormal_count || 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Progress
              percent={
                stats?.inspection_count
                  ? Math.round(((stats.abnormal_count || 0) / stats.inspection_count) * 100)
                  : 0
              }
              strokeColor="#ff4d4f"
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="设备列表" style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={equipments}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </AdminLayout>
  );
}

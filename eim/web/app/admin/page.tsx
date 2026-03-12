'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Space, Button } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import dynamic from 'next/dynamic';

// 动态导入地图组件（避免 SSR 问题）
const EquipmentMap = dynamic(() => import('@/components/dashboard/EquipmentMap'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: 500, 
      background: '#f0f0f0', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      地图加载中...
    </div>
  ),
});

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
  latitude?: number;
  longitude?: number;
  current_ship?: string;
  current_cargo?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, equipmentData] = await Promise.all([
        api.get('/stats/daily'),
        api.get('/equipments?page=1&page_size=100'),
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, margin: 0 }}>工作台</h1>
            <p style={{ color: '#666', margin: '8px 0 0' }}>欢迎使用设备管理系统</p>
          </div>
          <Button
            type="primary"
            icon={<EnvironmentOutlined />}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? '隐藏地图' : '显示地图'}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={stats?.total_equipments || 0}
              prefix={<DashboardOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="作业中"
              value={stats?.working_count || 0}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待命"
              value={stats?.standby_count || 0}
              prefix={<ToolOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="故障"
              value={stats?.fault_count || 0}
              prefix={<ExclamationCircleOutlined />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* 点检进度 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card title="今日点检">
            <div style={{ marginBottom: 16 }}>
              <Space>
                <span>已完成 / 总数</span>
                <span style={{ fontSize: 18, fontWeight: 'bold' }}>
                  {stats?.inspection_count || 0} / {stats?.total_equipments || 0}
                </span>
              </Space>
            </div>
            <Progress
              percent={
                stats?.total_equipments
                  ? Math.round(((stats.inspection_count || 0) / stats.total_equipments) * 100)
                  : 0
              }
              strokeColor={{
                '0%': '#1890ff',
                '100%': '#52c41a',
              }}
              size="large"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card title="异常设备">
            <div style={{ marginBottom: 16 }}>
              <Space>
                <span>异常数 / 点检数</span>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: '#ff4d4f' }}>
                  {stats?.abnormal_count || 0} / {stats?.inspection_count || 0}
                </span>
              </Space>
            </div>
            <Progress
              percent={
                stats?.inspection_count
                  ? Math.round(((stats.abnormal_count || 0) / stats.inspection_count) * 100)
                  : 0
              }
              strokeColor="#ff4d4f"
              size="large"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card title="设备状态分布">
            {stats && (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <span style={{ color: '#52c41a' }}>●</span>
                    <span>作业：{stats.working_count}</span>
                  </Space>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <span style={{ color: '#1890ff' }}>●</span>
                    <span>待命：{stats.standby_count}</span>
                  </Space>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <span style={{ color: '#faad14' }}>●</span>
                    <span>维保：{stats.maintenance_count || 0}</span>
                  </Space>
                </div>
                <div>
                  <Space>
                    <span style={{ color: '#ff4d4f' }}>●</span>
                    <span>故障：{stats.fault_count}</span>
                  </Space>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 地图展示 */}
      {showMap && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card title="设备分布地图">
              <EquipmentMap
                equipments={equipments.filter(e => e.latitude && e.longitude)}
                height="500px"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 设备列表 */}
      <Card title="设备列表" style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={equipments}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>
    </AdminLayout>
  );
}

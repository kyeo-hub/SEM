'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

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
  current_ship?: string;
  current_cargo?: string;
}

const statusColors: Record<string, string> = {
  working: '#52c41a',
  standby: '#1890ff',
  maintenance: '#faad14',
  fault: '#ff4d4f',
};

const statusLabels: Record<string, string> = {
  working: '作业中',
  standby: '待命',
  maintenance: '维保',
  fault: '故障',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    loadData();
    // 每 30 秒刷新一次数据
    const interval = setInterval(loadData, 30000);
    // 每秒更新时间
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('zh-CN'));
    }, 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, equipmentRes] = await Promise.all([
        fetch('http://localhost:8080/api/stats/daily'),
        fetch('http://localhost:8080/api/equipments?page=1&page_size=20'),
      ]);
      
      const statsData = await statsRes.json();
      const equipmentData = await equipmentRes.json();
      
      if (statsData.code === 0) {
        setStats(statsData.data);
      }
      if (equipmentData.code === 0) {
        setEquipments(equipmentData.data.list);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const faultEquipments = equipments.filter(e => e.status === 'fault');
  const workingEquipments = equipments.filter(e => e.status === 'working');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0c1929 0%, #1a2a4a 100%)',
      padding: 24,
      color: '#fff',
    }}>
      {/* 标题 */}
      <div style={{
        textAlign: 'center',
        marginBottom: 32,
        padding: '20px 0',
      }}>
        <h1 style={{
          fontSize: 48,
          margin: 0,
          background: 'linear-gradient(90deg, #00f5ff, #007bff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
        }}>
          设备点检管理大屏
        </h1>
        <p style={{ fontSize: 18, color: '#666', margin: '16px 0 0' }}>
          Equipment Inspection & Operation Management System
        </p>
        <p style={{ fontSize: 14, color: '#999', margin: '8px 0 0' }}>
          数据更新时间：{currentTime || '加载中...'}
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              background: 'rgba(24, 144, 255, 0.1)',
              border: '1px solid rgba(24, 144, 255, 0.3)',
              borderRadius: 12,
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title="设备总数"
              value={stats?.total_equipments || 0}
              prefix={<DashboardOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontSize: 36 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              background: 'rgba(82, 196, 26, 0.1)',
              border: '1px solid rgba(82, 196, 26, 0.3)',
              borderRadius: 12,
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title="作业中"
              value={stats?.working_count || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 36 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              background: 'rgba(250, 173, 20, 0.1)',
              border: '1px solid rgba(250, 173, 20, 0.3)',
              borderRadius: 12,
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title="待命"
              value={stats?.standby_count || 0}
              prefix={<ToolOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontSize: 36 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              background: 'rgba(255, 77, 79, 0.1)',
              border: '1px solid rgba(255, 77, 79, 0.3)',
              borderRadius: 12,
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title="故障"
              value={stats?.fault_count || 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f', fontSize: 36 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* 点检进度 */}
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: '#fff', fontSize: 18 }}>今日点检进度</span>}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              height: '100%',
            }}
            bodyStyle={{ padding: 24 }}
          >
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#ccc' }}>已完成 / 总数</span>
                <span style={{ color: '#fff', fontSize: 18 }}>
                  {stats?.inspection_count || 0} / {stats?.total_equipments || 0}
                </span>
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
                trailColor="rgba(255,255,255,0.1)"
                size="large"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#ccc' }}>异常率</span>
                <span style={{ color: '#ff4d4f', fontSize: 18 }}>
                  {stats?.inspection_count
                    ? Math.round(((stats.abnormal_count || 0) / stats.inspection_count) * 100)
                    : 0}%
                </span>
              </div>
              <Progress
                percent={
                  stats?.inspection_count
                    ? Math.round(((stats.abnormal_count || 0) / stats.inspection_count) * 100)
                    : 0
                }
                strokeColor="#ff4d4f"
                trailColor="rgba(255,255,255,0.1)"
                size="large"
              />
            </div>
          </Card>
        </Col>

        {/* 故障设备列表 */}
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: '#fff', fontSize: 18 }}>故障设备</span>}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              height: '100%',
            }}
            bodyStyle={{ padding: 24 }}
          >
            {faultEquipments.length > 0 ? (
              <Table
                columns={[
                  {
                    title: '设备名称',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text: string) => <span style={{ color: '#fff' }}>{text}</span>,
                  },
                  {
                    title: '位置',
                    dataIndex: 'location',
                    key: 'location',
                    render: (text: string) => <span style={{ color: '#999' }}>{text}</span>,
                  },
                ]}
                dataSource={faultEquipments}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ background: 'transparent' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#52c41a', padding: 40 }}>
                <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p style={{ fontSize: 18 }}>暂无故障设备</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 作业设备列表 */}
      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card
            title={<span style={{ color: '#fff', fontSize: 18 }}>作业设备</span>}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
            }}
            bodyStyle={{ padding: 24 }}
          >
            {workingEquipments.length > 0 ? (
              <Table
                columns={[
                  {
                    title: '设备编号',
                    dataIndex: 'code',
                    key: 'code',
                    render: (text: string) => <span style={{ color: '#fff' }}>{text}</span>,
                  },
                  {
                    title: '设备名称',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text: string) => <span style={{ color: '#fff' }}>{text}</span>,
                  },
                  {
                    title: '船名',
                    dataIndex: 'current_ship',
                    key: 'current_ship',
                    render: (text: string) => (
                      <span style={{ color: '#1890ff' }}>{text || '-'}</span>
                    ),
                  },
                  {
                    title: '货品',
                    dataIndex: 'current_cargo',
                    key: 'current_cargo',
                    render: (text: string) => (
                      <span style={{ color: '#1890ff' }}>{text || '-'}</span>
                    ),
                  },
                  {
                    title: '位置',
                    dataIndex: 'location',
                    key: 'location',
                    render: (text: string) => <span style={{ color: '#999' }}>{text}</span>,
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string) => (
                      <Tag color={statusColors[status]} style={{ fontSize: 12 }}>
                        {statusLabels[status]}
                      </Tag>
                    ),
                  },
                ]}
                dataSource={workingEquipments}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                <ClockCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>暂无作业设备</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Statistic, Progress, DatePicker, Space, Select } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

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

export default function StatisticsPage() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      let url = '/api/stats/daily';
      if (period === 'weekly') {
        url = '/api/stats/weekly';
      } else if (period === 'monthly') {
        const now = new Date();
        url = `/api/stats/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`;
      }
      const data = await api.get(url);
      setStats(data as unknown as DailyStats);
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusCards = [
    {
      title: '设备总数',
      value: stats?.total_equipments || 0,
      color: '#1890ff',
      icon: <DashboardOutlined />,
    },
    {
      title: '作业中',
      value: stats?.working_count || 0,
      color: '#52c41a',
      icon: <CheckCircleOutlined />,
    },
    {
      title: '待命',
      value: stats?.standby_count || 0,
      color: '#faad14',
      icon: <ToolOutlined />,
    },
    {
      title: '故障',
      value: stats?.fault_count || 0,
      color: '#ff4d4f',
      icon: <ExclamationCircleOutlined />,
    },
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, margin: 0 }}>统计分析</h1>
            <p style={{ color: '#666', margin: '8px 0 0' }}>设备点检数据统计分析</p>
          </div>
          <Select
            value={period}
            onChange={(value) => setPeriod(value)}
            style={{ width: 150 }}
          >
            <Select.Option value="daily">日报</Select.Option>
            <Select.Option value="weekly">周报</Select.Option>
            <Select.Option value="monthly">月报</Select.Option>
          </Select>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        {statusCards.map((card, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
                valueStyle={{ color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 点检进度 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card title="点检完成率">
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
          <Card title="异常率">
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

      {/* 趋势图表占位 */}
      <Card title="点检趋势" style={{ marginTop: 16 }}>
        <div style={{
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          borderRadius: 8,
        }}>
          <div style={{ textAlign: 'center', color: '#999' }}>
            <BarChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <p>图表功能待实现</p>
            <p style={{ fontSize: 12 }}>可使用 ECharts 或 AntV 实现</p>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}

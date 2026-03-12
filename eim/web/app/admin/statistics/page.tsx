'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Table, Statistic, Progress, Space, Select, Empty } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

const { Option } = Select;

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

interface TrendData {
  date: string;
  inspection_count: number;
  abnormal_count: number;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  
  const inspectionChartRef = useRef<HTMLDivElement>(null);
  const statusChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);
  
  const inspectionChartInstance = useRef<echarts.ECharts | null>(null);
  const statusChartInstance = useRef<echarts.ECharts | null>(null);
  const pieChartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    loadStats();
    return () => {
      // 清理图表实例
      inspectionChartInstance.current?.dispose();
      statusChartInstance.current?.dispose();
      pieChartInstance.current?.dispose();
    };
  }, [period]);

  useEffect(() => {
    // 窗口大小改变时重新渲染图表
    const handleResize = () => {
      inspectionChartInstance.current?.resize();
      statusChartInstance.current?.resize();
      pieChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      let url = '/stats/daily';
      if (period === 'weekly') {
        url = '/stats/weekly';
      } else if (period === 'monthly') {
        const now = new Date();
        url = `/stats/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`;
      }
      const data = await api.get(url);
      setStats(data as unknown as DailyStats);
      
      // 生成模拟趋势数据（实际应该从后端获取）
      generateTrendData(data as unknown as DailyStats);
      
      // 初始化图表
      initCharts(data as unknown as DailyStats);
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTrendData = (data: DailyStats) => {
    // 生成最近 7 天的模拟数据
    const now = new Date();
    const trend: TrendData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trend.push({
        date: dateStr,
        inspection_count: Math.floor(Math.random() * data.total_equipments),
        abnormal_count: Math.floor(Math.random() * 5),
      });
    }
    setTrendData(trend);
  };

  const initCharts = (data: DailyStats) => {
    // 初始化趋势图
    initInspectionChart(data);
    // 初始化状态分布图
    initStatusChart(data);
    // 初始化饼图
    initPieChart(data);
  };

  const initInspectionChart = (data: DailyStats) => {
    if (!inspectionChartRef.current) return;
    
    if (inspectionChartInstance.current) {
      inspectionChartInstance.current.dispose();
    }

    const chart = echarts.init(inspectionChartRef.current);
    inspectionChartInstance.current = chart;

    const option: EChartsOption = {
      title: {
        text: '点检趋势',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      legend: {
        data: ['点检数', '异常数'],
        bottom: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: trendData.map(d => d.date.substring(5)), // 只显示 MM-DD
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '点检数',
          type: 'bar',
          data: trendData.map(d => d.inspection_count),
          itemStyle: {
            color: '#1890ff',
          },
        },
        {
          name: '异常数',
          type: 'bar',
          data: trendData.map(d => d.abnormal_count),
          itemStyle: {
            color: '#ff4d4f',
          },
        },
      ],
    };

    chart.setOption(option);
  };

  const initStatusChart = (data: DailyStats) => {
    if (!statusChartRef.current) return;
    
    if (statusChartInstance.current) {
      statusChartInstance.current.dispose();
    }

    const chart = echarts.init(statusChartRef.current);
    statusChartInstance.current = chart;

    const option: EChartsOption = {
      title: {
        text: '设备状态趋势',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['作业中', '待命', '维保', '故障'],
        bottom: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendData.map(d => d.date.substring(5)),
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '作业中',
          type: 'line',
          data: trendData.map(() => Math.floor(Math.random() * data.working_count)),
          smooth: true,
          itemStyle: { color: '#52c41a' },
        },
        {
          name: '待命',
          type: 'line',
          data: trendData.map(() => Math.floor(Math.random() * data.standby_count)),
          smooth: true,
          itemStyle: { color: '#1890ff' },
        },
        {
          name: '维保',
          type: 'line',
          data: trendData.map(() => Math.floor(Math.random() * (data.maintenance_count || 5))),
          smooth: true,
          itemStyle: { color: '#faad14' },
        },
        {
          name: '故障',
          type: 'line',
          data: trendData.map(() => Math.floor(Math.random() * data.fault_count)),
          smooth: true,
          itemStyle: { color: '#ff4d4f' },
        },
      ],
    };

    chart.setOption(option);
  };

  const initPieChart = (data: DailyStats) => {
    if (!pieChartRef.current) return;
    
    if (pieChartInstance.current) {
      pieChartInstance.current.dispose();
    }

    const chart = echarts.init(pieChartRef.current);
    pieChartInstance.current = chart;

    const pieData = [
      { name: '作业中', value: data.working_count },
      { name: '待命', value: data.standby_count },
      { name: '维保', value: data.maintenance_count || 0 },
      { name: '故障', value: data.fault_count },
    ].filter(item => item.value > 0);

    const option: EChartsOption = {
      title: {
        text: '设备状态分布',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        data: ['作业中', '待命', '维保', '故障'],
      },
      series: [
        {
          name: '设备状态',
          type: 'pie',
          radius: '60%',
          data: pieData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            formatter: '{b}: {c}',
          },
          color: ['#52c41a', '#1890ff', '#faad14', '#ff4d4f'],
        },
      ],
    };

    chart.setOption(option);
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
            <p style={{ color: '#666', margin: '8px 0 0' }}>设备管理数据统计分析</p>
          </div>
          <Select
            value={period}
            onChange={(value) => setPeriod(value)}
            style={{ width: 150 }}
          >
            <Option value="daily">日报</Option>
            <Option value="weekly">周报</Option>
            <Option value="monthly">月报</Option>
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
                styles={{ content: { color: card.color } }}
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

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={<><LineChartOutlined /> 点检趋势</>}
            style={{ minHeight: 400 }}
          >
            {trendData.length > 0 ? (
              <div ref={inspectionChartRef} style={{ height: 350 }} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={<><PieChartOutlined /> 设备状态分布</>}
            style={{ minHeight: 400 }}
          >
            {stats && stats.total_equipments > 0 ? (
              <div ref={pieChartRef} style={{ height: 350 }} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card 
            title={<><BarChartOutlined /> 设备状态趋势</>}
            style={{ minHeight: 400 }}
          >
            {trendData.length > 0 ? (
              <div ref={statusChartRef} style={{ height: 350 }} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  );
}

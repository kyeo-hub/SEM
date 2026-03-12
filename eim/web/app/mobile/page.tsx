'use client';

import { useEffect, useState } from 'react';
import { Card, Space, TabBar,Button } from 'antd-mobile';
import {
  CheckCircleOutline,
  ExclamationOutline,
  AppOutline,
  ScanningOutline,
  UserOutline,
  FileOutline
} from 'antd-mobile-icons';
import { useRouter } from 'next/navigation';
import MobileLayout from '@/components/mobile/MobileLayout';

interface DailyStats {
  total_equipments: number;
  working_count: number;
  standby_count: number;
  maintenance_count: number;
  fault_count: number;
  inspection_count: number;
}

export default function MobileHome() {
  const router = useRouter();
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/stats/daily', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.code === 0) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusCards = [
    {
      title: '作业中',
      value: stats?.working_count || 0,
      color: '#52c41a',
      icon: <CheckCircleOutline />,
    },
    {
      title: '待命',
      value: stats?.standby_count || 0,
      color: '#1890ff',
      icon: <AppOutline />,
    },
    {
      title: '故障',
      value: stats?.fault_count || 0,
      color: '#ff4d4f',
      icon: <ExclamationOutline />,
    },
    {
      title: '总数',
      value: stats?.total_equipments || 0,
      color: '#722ed1',
      icon: null,
    },
  ];

  return (
    <MobileLayout title="设备管理">
      {/* 扫码卡片 */}
      <Card
        style={{
          margin: 16,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        }}
        styles={{ body: { padding: 24 } }}
      >
        <div style={{ textAlign: 'center' }}>
          <ScanningOutline style={{ fontSize: 48, marginBottom: 16 }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>扫码点检</h2>
          <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>
            扫描设备二维码进行点检
          </p>
          <Button
            color="primary"
            size="large"
            style={{ marginTop: 16, background: '#fff', color: '#667eea' }}
            block
            onClick={() => router.push('/mobile/scan')}
          >
            开始扫码
          </Button>
        </div>
      </Card>

      {/* 统计卡片 */}
      <div style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#333' }}>
          今日统计
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}>
          {statusCards.map((card, index) => (
            <Card
              key={index}
              styles={{ body: { padding: 16, textAlign: 'center' } }}
            >
              <div style={{ color: card.color, fontSize: 24, marginBottom: 8 }}>
                {card.icon}
              </div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>
                {card.value}
              </div>
              <div style={{ fontSize: 14, color: '#999', marginTop: 4 }}>
                {card.title}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 快捷操作 */}
      <div style={{ padding: 16, paddingBottom: 80 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#333' }}>
          快捷操作
        </h3>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card
            styles={{ body: { padding: 16 } }}
            onClick={() => router.push('/mobile/equipment')}
          >
            <Space justify="between">
              <span>设备列表</span>
              <span style={{ color: '#999' }}>→</span>
            </Space>
          </Card>
          <Card
            styles={{ body: { padding: 16 } }}
            onClick={() => router.push('/mobile/inspection')}
          >
            <Space justify="between">
              <span>点检记录</span>
              <span style={{ color: '#999' }}>→</span>
            </Space>
          </Card>
        </Space>
      </div>

      {/* 底部导航栏 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid #eee',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <TabBar activeKey="home" onChange={(key) => {
          if (key === 'profile') {
            router.push('/mobile/profile');
          }
        }}>
          <TabBar.Tab key="home" title="首页" icon={<ScanningOutline />}>
            首页
          </TabBar.Tab>
          <TabBar.Tab key="inspection" title="点检" icon={<FileOutline />}>
            点检
          </TabBar.Tab>
          <TabBar.Tab key="profile" title="我的" icon={<UserOutline />}>
            我的
          </TabBar.Tab>
        </TabBar>
      </div>
    </MobileLayout>
  );
}

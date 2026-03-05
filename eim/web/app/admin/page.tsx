'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Layout, Menu, Card, Row, Col, Statistic } from 'antd';
import {
  DashboardOutlined,
  ToolOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="dark">
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#001529',
        }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>EIM 设备管理</h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={[
            { key: 'dashboard', icon: <DashboardOutlined />, label: '工作台' },
            { key: 'equipment', icon: <ToolOutlined />, label: '设备管理' },
            { key: 'inspection', icon: <FileTextOutlined />, label: '点检管理' },
            { key: 'stats', icon: <BarChartOutlined />, label: '统计分析' },
            { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: 0 }}>设备点检管理系统</h3>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Card>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="设备总数"
                  value={4}
                  prefix={<ToolOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="运行中"
                  value={2}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="待命"
                  value={2}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="故障"
                  value={0}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>
          </Card>
          
          <Card style={{ marginTop: 24 }}>
            <h3>欢迎使用设备点检管理系统</h3>
            <p style={{ color: '#666' }}>
              请选择左侧菜单进行操作。系统支持设备管理、点检录入、统计分析等功能。
            </p>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}

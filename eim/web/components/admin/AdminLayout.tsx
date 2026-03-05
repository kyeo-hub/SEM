'use client';

import React, { useState } from 'react';
import {
  Layout,
  Menu,
  theme,
  Avatar,
  Dropdown,
  Space,
  Badge,
} from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  FileTextOutlined,
  TeamOutlined,
  BarChartOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const { Header, Sider, Content } = Layout;

// 菜单配置
const menuItems = [
  {
    key: '/admin',
    icon: <DashboardOutlined />,
    label: '工作台',
  },
  {
    key: '/admin/equipment',
    icon: <SettingOutlined />,
    label: '设备管理',
  },
  {
    key: '/admin/inspection',
    icon: <CheckCircleOutlined />,
    label: '点检管理',
  },
  {
    key: '/admin/standard',
    icon: <FileTextOutlined />,
    label: '点检标准',
  },
  {
    key: '/admin/statistics',
    icon: <BarChartOutlined />,
    label: '统计分析',
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 用户菜单
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={256}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#001529',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: collapsed ? 16 : 20,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}>
            {collapsed ? 'EIM' : '设备点检管理系统'}
          </h1>
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: {
                fontSize: 18,
                cursor: 'pointer',
                marginRight: 16,
              },
            })}
            <span style={{ color: '#666' }}>
              {menuItems.find(item => item.key === pathname)?.label || '工作台'}
            </span>
          </div>
          
          <Space size="large">
            <Badge count={5} size="small">
              <BellOutlined style={{ fontSize: 18, color: '#666', cursor: 'pointer' }} />
            </Badge>
            
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#1890ff' }}>
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <span style={{ color: '#333' }}>{user?.real_name || user?.username}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{
          margin: '24px 16px',
          padding: 24,
          minHeight: 280,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          overflow: 'auto',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

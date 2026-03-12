'use client';

import React from 'react';
import { NavBar, TabBar } from 'antd-mobile';
import {
  AppOutline,
  UnorderedListOutline,
  UserOutline,
} from 'antd-mobile-icons';
import { usePathname, useRouter } from 'next/navigation';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title = 'EIM',
  showBack = false,
  onBack,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 顶部导航 */}
      <NavBar
        back={showBack}
        onBack={handleBack}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {title}
      </NavBar>

      {/* 内容区域 */}
      <div style={{ paddingBottom: 60 }}>{children}</div>

      {/* 底部标签栏 */}
      <TabBar
        activeKey={pathname}
        onChange={(key) => router.push(key)}
        style={{
          position: 'fixed',
          bottom: 0,
          width: '100%',
          borderTop: '1px solid #eee',
        }}
      >
        <TabBar.Item key="/mobile" icon={<AppOutline />} title="首页" />
        <TabBar.Item key="/mobile/scan" icon={<UnorderedListOutline />} title="扫码" />
        <TabBar.Item key="/mobile/profile" icon={<UserOutline />} title="我的" />
      </TabBar>
    </div>
  );
};

export default MobileLayout;

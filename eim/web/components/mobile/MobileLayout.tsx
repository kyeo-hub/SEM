'use client';

import React from 'react';
import { NavBar } from 'antd-mobile';
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
      // 如果是设备操作页，返回扫码首页
      if (pathname?.includes('/mobile/equipment/')) {
        router.push('/mobile');
        return;
      }
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
      <div>{children}</div>
    </div>
  );
};

export default MobileLayout;

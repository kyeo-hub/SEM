'use client';

import { useState, useRef, useEffect } from 'react';
import { Toast, Space, Button, Card } from 'antd-mobile';
import { ScanCodeOutline, AppOutline, UserOutline } from 'antd-mobile-icons';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import MobileLayout from '@/components/mobile/MobileLayout';
import { useAuth } from '@/context/AuthContext';

export default function MobileHome() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/mobile/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScan = async () => {
    try {
      setScanning(true);
      const scanner = new Html5Qrcode('scanner-container');
      scannerRef.current = scanner;

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        const backCamera = devices.find(device =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('environment')
        ) || devices[0];

        await scanner.start(
          backCamera.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          onScanSuccess,
          onScanError
        );

        Toast.show({ content: '请对准二维码', icon: 'info', duration: 2000 });
      } else {
        throw new Error('未找到摄像头');
      }
    } catch (error) {
      console.error('启动扫码失败:', error);
      Toast.show({ content: '启动扫码失败，请检查摄像头权限', icon: 'fail', duration: 2000 });
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      setScanning(false);
    }
  };

  const onScanSuccess = (decodedText: string) => {
    stopScan();
    Toast.show({ content: '扫码成功', icon: 'success', duration: 1000 });

    const match = decodedText.match(/\/mobile\/equipment\/(.+)$/);
    if (match) {
      router.push(`/mobile/equipment/${match[1]}`);
    } else {
      router.push(`/mobile/equipment/${decodedText}`);
    }
  };

  const onScanError = (error: Error) => {
    console.warn('扫码错误:', error);
  };

  return (
    <MobileLayout title="设备扫码">
      <div style={{ padding: 24, textAlign: 'center' }}>
        {/* 扫码区域 */}
        <Card
          style={{
            marginBottom: 24,
            background: '#000',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            id="scanner-container"
            style={{
              width: '100%',
              height: 300,
              background: '#000',
            }}
          />
        </Card>

        {/* 操作按钮 */}
        <Space direction="vertical" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
          {!scanning ? (
            <Button
              color="primary"
              size="large"
              block
              icon={<ScanCodeOutline />}
              onClick={startScan}
            >
              开始扫码
            </Button>
          ) : (
            <Button
              color="danger"
              size="large"
              block
              onClick={stopScan}
            >
              停止扫码
            </Button>
          )}

          <Button
            size="large"
            block
            fill="outline"
            onClick={() => {
              const code = prompt('请输入设备编号:');
              if (code) {
                router.push(`/mobile/equipment/${code}`);
              }
            }}
          >
            手动输入设备编号
          </Button>
        </Space>

        {/* 快捷入口 */}
        <div style={{ marginTop: 32, maxWidth: 400, margin: '32px auto 0' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card
              styles={{ body: { padding: 16 } }}
              onClick={() => router.push('/mobile/equipment/list')}
            >
              <Space justify="between">
                <Space>
                  <AppOutline style={{ fontSize: 20, color: '#1890ff' }} />
                  <span>设备列表</span>
                </Space>
                <span style={{ color: '#999' }}>→</span>
              </Space>
            </Card>

            <Card
              styles={{ body: { padding: 16 } }}
              onClick={() => router.push('/mobile/profile')}
            >
              <Space justify="between">
                <Space>
                  <UserOutline style={{ fontSize: 20, color: '#667eea' }} />
                  <span>个人中心</span>
                </Space>
                <span style={{ color: '#999' }}>→</span>
              </Space>
            </Card>
          </Space>
        </div>

        {/* 使用说明 */}
        <div style={{
          marginTop: 32,
          padding: 16,
          background: '#fff',
          borderRadius: 8,
          textAlign: 'left',
          maxWidth: 400,
          margin: '32px auto 0',
        }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>使用说明</h4>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#666', fontSize: 14 }}>
            <li>点击"开始扫码"启动摄像头</li>
            <li>将设备二维码对准扫描框</li>
            <li>扫码成功后自动跳转设备操作页</li>
            <li>也可点击"手动输入"输入设备编号</li>
          </ol>
        </div>
      </div>
    </MobileLayout>
  );
}

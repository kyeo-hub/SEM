'use client';

import { useState, useRef, useEffect } from 'react';
import { Toast, Space, Button } from 'antd-mobile';
import { ScanOutlined } from 'antd-mobile-icons';
import { useRouter } from 'next/navigation';
import MobileLayout from '@/components/mobile/MobileLayout';
import { Html5Qrcode } from 'html5-qrcode';

export default function MobileScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      // 清理扫码器
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScan = async () => {
    try {
      setScanning(true);
      
      // 创建扫码器
      const scanner = new Html5Qrcode('scanner-container');
      scannerRef.current = scanner;

      // 开始扫码
      await scanner.start(
        { facingMode: 'environment' }, // 使用后置摄像头
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );

      Toast.show({
        content: '请对准二维码',
        icon: 'info',
        duration: 2000,
      });
    } catch (error) {
      console.error('启动扫码失败:', error);
      Toast.show({
        content: '启动扫码失败，请检查摄像头权限',
        icon: 'fail',
        duration: 2000,
      });
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
    Toast.show({
      content: '扫码成功',
      icon: 'success',
      duration: 1000,
    });

    // 解析二维码内容，跳转到设备操作页面
    // 二维码格式：https://your-domain.com/mobile/equipment/{qr_code_uuid}
    const match = decodedText.match(/\/mobile\/equipment\/(.+)$/);
    if (match) {
      const qrCodeUuid = match[1];
      router.push(`/mobile/equipment/${qrCodeUuid}`);
    } else {
      // 如果直接是 UUID
      router.push(`/mobile/equipment/${decodedText}`);
    }
  };

  const onScanError = (error: Error) => {
    console.warn('扫码错误:', error);
  };

  return (
    <MobileLayout title="扫码点检" showBack>
      <div style={{ padding: 24, textAlign: 'center' }}>
        {/* 扫码区域 */}
        <div
          id="scanner-container"
          style={{
            width: '100%',
            maxWidth: 400,
            margin: '0 auto 24px',
            background: '#000',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        />

        {/* 操作按钮 */}
        <Space direction="vertical" style={{ width: '100%' }}>
          {!scanning ? (
            <Button
              color="primary"
              size="large"
              block
              icon={<ScanOutlined />}
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
              // 手动输入设备编号
              const code = prompt('请输入设备编号:');
              if (code) {
                router.push(`/mobile/equipment/${code}`);
              }
            }}
          >
            手动输入设备编号
          </Button>
        </Space>

        {/* 使用说明 */}
        <div style={{
          marginTop: 32,
          padding: 16,
          background: '#fff',
          borderRadius: 8,
          textAlign: 'left',
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

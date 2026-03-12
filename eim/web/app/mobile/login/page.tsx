'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Button } from 'antd-mobile';
import { UserOutline, LockOutline } from 'antd-mobile-icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { showSuccessToast, showErrorToast } from '@/lib/utils';

export default function MobileLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      showSuccessToast('登录成功');

      // 根据角色跳转
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'admin' || user.role === 'supervisor') {
          router.push('/admin');
        } else {
          router.push('/mobile');
        }
      }
    } catch (error: unknown) {
      showErrorToast((error as Error).message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, margin: 0, color: '#1890ff', fontWeight: 'bold' }}>
            EIM
          </h1>
          <p style={{ color: '#666', margin: '8px 0 0', fontSize: 14 }}>
            设备点检管理系统
          </p>
        </div>

        <Form
          onFinish={onFinish}
          layout="vertical"
          footer={
            <Button
              color="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              登录
            </Button>
          }
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutline />}
              placeholder="请输入用户名"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutline />}
              placeholder="请输入密码"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>
        </Form>

        <div style={{
          marginTop: 32,
          padding: 16,
          background: '#fff',
          borderRadius: 8,
        }}>
          <p style={{ margin: '4px 0', fontSize: 13, color: '#666', fontWeight: 'bold' }}>
            测试账号
          </p>
          <p style={{ margin: '4px 0', fontSize: 12, color: '#999' }}>
            管理员：admin / admin123
          </p>
          <p style={{ margin: '4px 0', fontSize: 12, color: '#999' }}>
            点检员：inspector / 123456
          </p>
        </div>
      </div>
    </div>
  );
}

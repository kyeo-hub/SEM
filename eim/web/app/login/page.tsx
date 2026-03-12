'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
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
      message.error((error as Error).message || '登录失败，请检查账号密码');
      form.resetFields(['password']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 16,
    }}>
      <Card style={{ 
        width: '100%', 
        maxWidth: 400, 
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        borderRadius: 16,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ fontSize: 28, margin: 0, color: '#1890ff', fontWeight: 'bold' }}>
            EIM
          </h1>
          <p style={{ color: '#666', margin: '8px 0 0', fontSize: 14 }}>
            设备点检管理系统
          </p>
        </div>

        <Form form={form} onFinish={onFinish} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#999' }} />}
              placeholder="用户名"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="密码"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              style={{ marginTop: 8 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ 
          textAlign: 'center', 
          color: '#999', 
          fontSize: 12,
          marginTop: 16,
          padding: '12px 0',
          background: '#f5f5f5',
          borderRadius: 8,
        }}>
          <p style={{ margin: '4px 0', fontWeight: 'bold' }}>测试账号</p>
          <p style={{ margin: '4px 0' }}>管理员：admin / admin123</p>
          <p style={{ margin: '4px 0' }}>点检员：inspector / 123456</p>
        </div>
      </Card>
    </div>
  );
}

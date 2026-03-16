'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function MobileLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (!username || !password) {
      setMessage({ type: 'error', text: '请输入用户名和密码' });
      return;
    }
    
    setLoading(true);
    try {
      await login(username, password);
      setMessage({ type: 'success', text: '登录成功' });

      // 根据角色跳转
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setTimeout(() => {
          if (user.role === 'admin' || user.role === 'supervisor') {
            router.push('/admin');
          } else {
            router.push('/mobile');
          }
        }, 500);
      }
    } catch (error: unknown) {
      setMessage({ type: 'error', text: (error as Error).message || '登录失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 24 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, margin: 0, color: '#1890ff', fontWeight: 'bold' }}>
            EIM
          </h1>
          <p style={{ color: '#666', margin: '8px 0 0', fontSize: 14 }}>
            设备点检管理系统
          </p>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 8,
            background: message.type === 'success' ? '#f6ffed' : '#fff2f0',
            border: `1px solid ${message.type === 'success' ? '#b7eb8f' : '#ffccc7'}`,
            color: message.type === 'success' ? '#52c41a' : '#ff4d4f',
            fontSize: 14,
          }}>
            {message.text}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#666' }}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#666' }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 16,
              color: '#fff',
              background: loading ? '#91d5ff' : '#1890ff',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* Test Accounts */}
        <div style={{
          marginTop: 24,
          padding: 16,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#666', fontWeight: 'bold' }}>
            测试账号
          </p>
          <p style={{ margin: '4px 0', fontSize: 12, color: '#999' }}>
            管理员：admin / 123456
          </p>
          <p style={{ margin: '4px 0', fontSize: 12, color: '#999' }}>
            操作员：operator01 / 123456
          </p>
        </div>
      </div>
    </div>
  );
}

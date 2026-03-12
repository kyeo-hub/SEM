'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Space, List, Dialog, Toast, Form, Input } from 'antd-mobile';
import {
  UserOutline,
  FileOutline,
  ClockCircleOutline,
  CloseOutline,
} from 'antd-mobile-icons';
import { useRouter } from 'next/navigation';
import MobileLayout from '@/components/mobile/MobileLayout';
import { useAuth } from '@/context/AuthContext';

interface User {
  id: number;
  username: string;
  role: string;
  real_name?: string;
  department?: string;
  phone?: string;
}

interface InspectionRecord {
  id: number;
  equipment_name: string;
  inspection_date: string;
  shift: string;
  overall_status: string;
}

export default function MobileProfilePage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [recentInspections, setRecentInspections] = useState<InspectionRecord[]>([]);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/mobile/login');
      return;
    }

    // 加载用户信息
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUserInfo(JSON.parse(storedUser));
    }

    loadRecentInspections();
  }, [isAuthenticated]);

  const loadRecentInspections = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/inspections?limit=10', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.code === 0) {
        setRecentInspections(data.data.list || []);
      }
    } catch (error) {
      console.error('加载点检记录失败:', error);
    }
  };

  const handleLogout = () => {
    Dialog.confirm({
      content: '确定要退出登录吗？',
      onConfirm: () => {
        logout();
        router.push('/mobile/login');
      },
    });
  };

  const handleChangePassword = async (values: any) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: values.old_password,
          new_password: values.new_password,
        }),
      });

      const data = await res.json();
      if (data.code === 0) {
        Toast.show({
          content: '密码修改成功，请重新登录',
          icon: 'success',
        });
        setPasswordModalVisible(false);
        passwordForm.resetFields();
        setTimeout(() => {
          logout();
          router.push('/mobile/login');
        }, 1500);
      } else {
        Toast.show({
          content: data.message || '密码修改失败',
          icon: 'fail',
        });
      }
    } catch (error) {
      Toast.show({
        content: '密码修改失败',
        icon: 'fail',
      });
    }
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      admin: '管理员',
      supervisor: '主管',
      inspector: '点检员',
      operator: '操作员',
    };
    return roles[role] || role;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      normal: '#52c41a',
      abnormal: '#ff4d4f',
    };
    return colors[status] || '#999';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      normal: '正常',
      abnormal: '异常',
    };
    return texts[status] || status;
  };

  const getShiftName = (shift: string) => {
    const shifts: Record<string, string> = {
      before: '班前',
      during: '班中',
      handover: '交班',
    };
    return shifts[shift] || shift;
  };

  return (
    <MobileLayout title="个人中心">
      <div style={{ padding: 16 }}>
        {/* 用户信息卡片 */}
        <Card
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
          }}
        >
          <Space align="center">
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              <UserOutline />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
                {userInfo?.real_name || userInfo?.username || '用户'}
              </div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                {getRoleName(userInfo?.role || '')}
                {userInfo?.department ? ` · ${userInfo.department}` : ''}
              </div>
            </div>
          </Space>
        </Card>

        {/* 功能菜单 */}
        <Card style={{ marginBottom: 16 }}>
          <List>
            <List.Item
              prefix={<FileOutline style={{ fontSize: 20, color: '#1890ff' }} />}
              description="我的点检记录"
              onClick={() => router.push('/mobile/inspection')}
            >
              点检记录
            </List.Item>
            <List.Item
              prefix={<ClockCircleOutline style={{ fontSize: 20, color: '#52c41a' }} />}
              description="查看排班"
              onClick={() => Toast.show({ content: '功能开发中', icon: 'info' })}
            >
              我的排班
            </List.Item>
            <List.Item
              prefix={<CloseOutline style={{ fontSize: 20, color: '#faad14' }} />}
              description="修改登录密码"
              onClick={() => setPasswordModalVisible(true)}
            >
              修改密码
            </List.Item>
          </List>
        </Card>

        {/* 退出登录 */}
        <Button
          color="danger"
          size="large"
          block
          icon={<CloseOutline />}
          onClick={handleLogout}
        >
          退出登录
        </Button>

        {/* 修改密码弹窗 */}
        <Dialog
          content={
            <Form
              form={passwordForm}
              onFinish={handleChangePassword}
              layout="vertical"
              footer={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button block color="primary" htmlType="submit">
                    确认修改
                  </Button>
                  <Button block onClick={() => setPasswordModalVisible(false)}>
                    取消
                  </Button>
                </Space>
              }
            >
              <Form.Item
                name="old_password"
                label="当前密码"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password placeholder="请输入当前密码" />
              </Form.Item>
              <Form.Item
                name="new_password"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度不能少于 6 位' },
                ]}
              >
                <Input.Password placeholder="请输入新密码" />
              </Form.Item>
              <Form.Item
                name="confirm_password"
                label="确认新密码"
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator: () => {
                      if (
                        getFieldValue('new_password') !==
                        getFieldValue('confirm_password')
                      ) {
                        return Promise.reject('两次输入的密码不一致');
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="请再次输入新密码" />
              </Form.Item>
            </Form>
          }
          visible={passwordModalVisible}
          onMaskClick={() => setPasswordModalVisible(false)}
          style={{ '--content-max-width': '90%' }}
        />

        {/* 最近点检记录 */}
        {recentInspections.length > 0 && (
          <Card title="最近点检" style={{ marginTop: 16 }}>
            <List>
              {recentInspections.slice(0, 5).map((record) => (
                <List.Item
                  key={record.id}
                  description={
                    <Space justify="between">
                      <span style={{ fontSize: 12, color: '#999' }}>
                        {record.inspection_date} · {getShiftName(record.shift)}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: getStatusColor(record.overall_status),
                        }}
                      >
                        {getStatusText(record.overall_status)}
                      </span>
                    </Space>
                  }
                >
                  {record.equipment_name}
                </List.Item>
              ))}
            </List>
            <Button
              fill="outline"
              size="small"
              block
              onClick={() => router.push('/mobile/inspection')}
            >
              查看全部
            </Button>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}

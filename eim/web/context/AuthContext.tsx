'use client';

import { useState, createContext, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api, type LoginResponse } from '@/lib/api';

// 用户类型
export interface User {
  id: number;
  username: string;
  role: string;
  role_id?: number;
  real_name?: string;
  department?: string;
}

// 角色类型
export type Role = 'admin' | 'maintainer' | 'operator';

// 权限控制类型
interface PermissionControl {
  canWork: boolean;           // 作业权限 (开始/结束作业)
  canMaintain: boolean;       // 维保权限
  canInspect: boolean;        // 点检权限
  canManageFault: boolean;    // 故障处理权限
  canManageEquipment: boolean; // 设备管理权限
  canManageUser: boolean;     // 用户管理权限
  canManageStandard: boolean; // 点检标准管理权限
}

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (action: keyof PermissionControl) => boolean;
  permissions: PermissionControl;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 角色权限配置
const ROLE_PERMISSIONS: Record<Role, PermissionControl> = {
  admin: {
    canWork: true,
    canMaintain: true,
    canInspect: true,
    canManageFault: true,
    canManageEquipment: true,
    canManageUser: true,
    canManageStandard: true,
  },
  maintainer: {
    canWork: false,
    canMaintain: true,
    canInspect: true,
    canManageFault: true,
    canManageEquipment: false,
    canManageUser: false,
    canManageStandard: false,
  },
  operator: {
    canWork: true,
    canMaintain: false,
    canInspect: true,
    canManageFault: false,
    canManageEquipment: false,
    canManageUser: false,
    canManageStandard: false,
  },
};

/**
 * 获取用户权限控制对象
 */
function getUserPermissions(role: string): PermissionControl {
  const validRole = (role as Role) in ROLE_PERMISSIONS ? (role as Role) : 'operator';
  return ROLE_PERMISSIONS[validRole];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  // 初始化时检查登录状态
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.post<LoginResponse>('/auth/login', { username, password });
    const loginData = data as unknown as LoginResponse;

    setToken(loginData.token);
    setUser(loginData.user);
    localStorage.setItem('token', loginData.token);
    localStorage.setItem('user', JSON.stringify(loginData.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // 计算权限控制
  const permissions = useMemo<PermissionControl>(() => {
    if (!user?.role) {
      return ROLE_PERMISSIONS.operator;
    }
    return getUserPermissions(user.role);
  }, [user?.role]);

  // 权限检查函数
  const hasPermission = (action: keyof PermissionControl): boolean => {
    return permissions[action];
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    hasPermission,
    permissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

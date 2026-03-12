'use client';

import { useAuth } from '@/context/AuthContext';

/**
 * 角色权限 Hook
 * 用于控制不同角色的功能权限
 */
export function useRolePermission() {
  const { user } = useAuth();

  // 角色判断
  const isAdmin = user?.role === 'admin';
  const isMaintainer = user?.role === 'maintainer';
  const isOperator = user?.role === 'operator';

  // 功能权限
  const canWork = isAdmin || isOperator; // 作业权限
  const canMaintenance = isAdmin || isMaintainer; // 维保权限
  const canInspect = true; // 所有角色都可以点检
  const canManageFault = isAdmin || isMaintainer; // 故障处理权限
  const canManageUsers = isAdmin; // 用户管理权限
  const canManageEquipment = isAdmin; // 设备管理权限
  const canManageStandard = isAdmin; // 点检标准管理权限

  return {
    // 角色判断
    isAdmin,
    isMaintainer,
    isOperator,
    role: user?.role,

    // 功能权限
    canWork,
    canMaintenance,
    canInspect,
    canManageFault,
    canManageUsers,
    canManageEquipment,
    canManageStandard,

    // 权限检查辅助函数
    hasPermission: (permission: string) => {
      switch (permission) {
        case 'work':
          return canWork;
        case 'maintenance':
          return canMaintenance;
        case 'inspect':
          return canInspect;
        case 'manage_fault':
          return canManageFault;
        case 'manage_users':
          return canManageUsers;
        case 'manage_equipment':
          return canManageEquipment;
        case 'manage_standard':
          return canManageStandard;
        default:
          return false;
      }
    },
  };
}

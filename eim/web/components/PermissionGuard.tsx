'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

interface PermissionGuardProps {
  children: ReactNode;
  permission: keyof import('@/context/AuthContext').PermissionControl;
  fallback?: ReactNode;
}

/**
 * 权限守卫组件
 * 
 * 用法:
 * <PermissionGuard permission="canWork">
 *   <Button>开始作业</Button>
 * </PermissionGuard>
 * 
 * <PermissionGuard permission="canManageUser" fallback={<div>无权限</div>}>
 *   <Button>用户管理</Button>
 * </PermissionGuard>
 */
export default function PermissionGuard({
  children,
  permission,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 权限检查 Hook (用于更复杂的场景)
 * 
 * 用法:
 * const { canWork, canMaintain } = usePermissions();
 * 
 * if (canWork) {
 *   // 显示作业按钮
 * }
 */
export function usePermissions() {
  const { permissions } = useAuth();
  return permissions;
}

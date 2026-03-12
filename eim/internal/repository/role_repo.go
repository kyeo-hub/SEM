package repository

import (
	"context"

	"github.com/kyeo-hub/eim/internal/model"
	"gorm.io/gorm"
)

// RoleRepository 角色数据访问层
type RoleRepository struct {
	db *gorm.DB
}

// NewRoleRepository 创建角色仓库实例
func NewRoleRepository(db *gorm.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

// GetByID 根据 ID 获取角色
func (r *RoleRepository) GetByID(ctx context.Context, id int64) (*model.Role, error) {
	var role model.Role
	err := r.db.WithContext(ctx).First(&role, id).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// GetByCode 根据角色标识获取角色
func (r *RoleRepository) GetByCode(ctx context.Context, code string) (*model.Role, error) {
	var role model.Role
	err := r.db.WithContext(ctx).Where("role_code = ?", code).First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// List 获取角色列表
func (r *RoleRepository) List(ctx context.Context) ([]*model.Role, error) {
	var roles []*model.Role
	err := r.db.WithContext(ctx).Order("id ASC").Find(&roles).Error
	return roles, err
}

// Create 创建角色
func (r *RoleRepository) Create(ctx context.Context, role *model.Role) error {
	return r.db.WithContext(ctx).Create(role).Error
}

// Update 更新角色
func (r *RoleRepository) Update(ctx context.Context, role *model.Role) error {
	return r.db.WithContext(ctx).Save(role).Error
}

// Delete 删除角色
func (r *RoleRepository) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(&model.Role{}, id).Error
}

// AssignRoleToUser 为用户分配角色
func (r *RoleRepository) AssignRoleToUser(ctx context.Context, userID, roleID int64, isPrimary bool) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 如果是主角色，先删除用户现有的主角色
		if isPrimary {
			if err := tx.Where("user_id = ?", userID).Delete(&model.UserRole{}).Error; err != nil {
				return err
			}
		}

		// 创建新的用户角色关联
		userRole := &model.UserRole{
			UserID:    userID,
			RoleID:    roleID,
			IsPrimary: isPrimary,
		}
		return tx.Create(userRole).Error
	})
}

// GetUserRoles 获取用户的所有角色
func (r *RoleRepository) GetUserRoles(ctx context.Context, userID int64) ([]*model.Role, error) {
	var roles []*model.Role
	err := r.db.WithContext(ctx).
		Table("roles").
		Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ?", userID).
		Find(&roles).Error
	return roles, err
}

// GetPrimaryRole 获取用户的主角色
func (r *RoleRepository) GetPrimaryRole(ctx context.Context, userID int64) (*model.Role, error) {
	var role model.Role
	err := r.db.WithContext(ctx).
		Table("roles").
		Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ? AND user_roles.is_primary = ?", userID, true).
		First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// APIRolePermissionRepository API 角色权限配置数据访问层
type APIRolePermissionRepository struct {
	db *gorm.DB
}

// NewAPIRolePermissionRepository 创建 API 角色权限仓库实例
func NewAPIRolePermissionRepository(db *gorm.DB) *APIRolePermissionRepository {
	return &APIRolePermissionRepository{db: db}
}

// GetByPathAndMethod 根据 API 路径和方法获取权限配置
func (r *APIRolePermissionRepository) GetByPathAndMethod(ctx context.Context, path, method string) (*model.APIRolePermission, error) {
	var perm model.APIRolePermission
	err := r.db.WithContext(ctx).
		Where("api_path = ? AND api_method = ?", path, method).
		First(&perm).Error
	if err != nil {
		return nil, err
	}
	return &perm, nil
}

// GetByPath 根据 API 路径获取权限配置（支持通配符匹配）
func (r *APIRolePermissionRepository) GetByPath(ctx context.Context, path string) ([]*model.APIRolePermission, error) {
	var perms []*model.APIRolePermission
	err := r.db.WithContext(ctx).
		Where("api_path = ? OR api_path LIKE ?", path, "%*%").
		Where("is_active = ?", true).
		Find(&perms).Error
	return perms, err
}

// List 获取所有 API 权限配置
func (r *APIRolePermissionRepository) List(ctx context.Context) ([]*model.APIRolePermission, error) {
	var perms []*model.APIRolePermission
	err := r.db.WithContext(ctx).Order("api_path ASC").Find(&perms).Error
	return perms, err
}

// Create 创建 API 权限配置
func (r *APIRolePermissionRepository) Create(ctx context.Context, perm *model.APIRolePermission) error {
	return r.db.WithContext(ctx).Create(perm).Error
}

// Update 更新 API 权限配置
func (r *APIRolePermissionRepository) Update(ctx context.Context, perm *model.APIRolePermission) error {
	return r.db.WithContext(ctx).Save(perm).Error
}

// Delete 删除 API 权限配置
func (r *APIRolePermissionRepository) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(&model.APIRolePermission{}, id).Error
}

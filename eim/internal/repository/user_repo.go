package repository

import (
	"context"

	"github.com/kyeo-hub/eim/internal/model"
	"gorm.io/gorm"
)

// UserRepository 用户数据访问层
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository 创建用户仓库实例
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create 创建用户
func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// GetByID 根据 ID 获取用户
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByUsername 根据用户名获取用户
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// List 获取用户列表
func (r *UserRepository) List(ctx context.Context, offset, limit int) ([]*model.User, int64, error) {
	var users []*model.User
	var total int64

	if err := r.db.WithContext(ctx).Model(&model.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.WithContext(ctx).
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&users).Error

	return users, total, err
}

// Update 更新用户
func (r *UserRepository) Update(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// Delete 删除用户（软删除）
func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(&model.User{}, id).Error
}

// GetByDepartment 根据部门获取用户列表
func (r *UserRepository) GetByDepartment(ctx context.Context, department string) ([]*model.User, error) {
	var users []*model.User
	err := r.db.WithContext(ctx).Where("department = ?", department).Find(&users).Error
	return users, err
}

// GetByRole 根据角色获取用户列表
func (r *UserRepository) GetByRole(ctx context.Context, role string) ([]*model.User, error) {
	var users []*model.User
	err := r.db.WithContext(ctx).Where("role = ?", role).Find(&users).Error
	return users, err
}

// BulkCreate 批量创建用户
func (r *UserRepository) BulkCreate(ctx context.Context, users []*model.User) error {
	return r.db.WithContext(ctx).Create(&users).Error
}

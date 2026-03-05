package service

import (
	"context"
	"errors"

	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
	"github.com/kyeo-hub/eim/pkg/jwt"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthService 认证服务
type AuthService struct {
	userRepo *repository.UserRepository
	jwtSvc   *jwt.Service
}

// NewAuthService 创建认证服务实例
func NewAuthService(userRepo *repository.UserRepository, jwtSvc *jwt.Service) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		jwtSvc:   jwtSvc,
	}
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token string      `json:"token"`
	User  *model.User `json:"user"`
}

// Login 用户登录
func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	// 1. 查询用户
	user, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, err
	}

	// 2. 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	// 3. 生成 JWT Token
	token, err := s.jwtSvc.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token: token,
		User:  user,
	}, nil
}

// HashPassword 密码加密
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
	Role       string `json:"role"`
	RealName   string `json:"real_name"`
	Department string `json:"department"`
	Phone      string `json:"phone"`
}

// CreateUser 创建用户
func (s *AuthService) CreateUser(ctx context.Context, req *CreateUserRequest) (*model.User, error) {
	// 检查用户名是否已存在
	_, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err == nil {
		return nil, errors.New("用户名已存在")
	}

	// 密码加密
	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Username:     req.Username,
		PasswordHash: passwordHash,
		Role:         req.Role,
		RealName:     req.RealName,
		Department:   req.Department,
		Phone:        req.Phone,
	}

	if user.Role == "" {
		user.Role = "inspector"
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// GetUserByID 根据 ID 获取用户
func (s *AuthService) GetUserByID(ctx context.Context, id int64) (*model.User, error) {
	return s.userRepo.GetByID(ctx, id)
}

// GetUserList 获取用户列表
func (s *AuthService) GetUserList(ctx context.Context, offset, limit int) ([]*model.User, int64, error) {
	return s.userRepo.List(ctx, offset, limit)
}

// BulkCreateUsers 批量创建用户
func (s *AuthService) BulkCreateUsers(ctx context.Context, users []*model.User) error {
	// 批量加密密码
	for _, user := range users {
		if user.Role == "" {
			user.Role = "inspector"
		}
		// 如果 PasswordHash 为空，说明传入的是明文密码，需要加密
		if user.PasswordHash == "" {
			return errors.New("密码不能为空")
		}
	}

	return s.userRepo.BulkCreate(ctx, users)
}

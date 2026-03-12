package handler

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/model"
	"github.com/kyeo-hub/eim/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// userHandler 用户 Handler
var userHandler *repository.UserRepository

// InitUserHandler 初始化用户 Handler
func InitUserHandler(repo *repository.UserRepository) {
	userHandler = repo
	log.Println("✅ UserHandler 已初始化")
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// ChangePassword 修改密码
// PUT /api/users/change-password
func ChangePassword(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	// 从 Token 中获取用户 ID
	userIDStr, exists := c.Get("user_id")
	if !exists {
		Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	userID, err := strconv.ParseInt(userIDStr.(string), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的用户 ID")
		return
	}

	// 获取用户信息
	user, err := userHandler.GetByID(context.Background(), userID)
	if err != nil {
		Error(c, http.StatusNotFound, "用户不存在")
		return
	}

	// 验证旧密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		Error(c, http.StatusBadRequest, "原密码错误")
		return
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("❌ 密码加密失败：%v", err)
		Error(c, http.StatusInternalServerError, "密码加密失败")
		return
	}

	// 更新密码
	if err := userHandler.UpdatePassword(context.Background(), userID, string(hashedPassword)); err != nil {
		log.Printf("❌ 更新密码失败：%v", err)
		Error(c, http.StatusInternalServerError, "更新密码失败")
		return
	}

	log.Printf("✅ 用户 %d 密码修改成功", userID)
	Success(c, gin.H{"message": "密码修改成功"})
}

// GetUserInfo 获取用户信息
// GET /api/users/me
func GetUserInfo(c *gin.Context) {
	// 从 Token 中获取用户 ID
	userIDStr, exists := c.Get("user_id")
	if !exists {
		Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	userID, err := strconv.ParseInt(userIDStr.(string), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的用户 ID")
		return
	}

	user, err := userHandler.GetByID(context.Background(), userID)
	if err != nil {
		Error(c, http.StatusNotFound, "用户不存在")
		return
	}

	Success(c, gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"role":       user.Role,
		"real_name":  user.RealName,
		"department": user.Department,
		"phone":      user.Phone,
	})
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username   string `json:"username" binding:"required,min=3"`
	Password   string `json:"password" binding:"required,min=6"`
	RealName   string `json:"real_name"`
	Department string `json:"department"`
	Phone      string `json:"phone"`
	RoleID     int64  `json:"role_id" binding:"required"`
}

// CreateUser 创建用户
// POST /api/users
func CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	// 检查用户名是否已存在
	existingUser, _ := userHandler.GetByUsername(context.Background(), req.Username)
	if existingUser != nil {
		Error(c, http.StatusBadRequest, "用户名已存在")
		return
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("❌ 密码加密失败：%v", err)
		Error(c, http.StatusInternalServerError, "密码加密失败")
		return
	}

	// 创建用户
	user := &model.User{
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		RealName:     req.RealName,
		Department:   req.Department,
		Phone:        req.Phone,
		RoleID:       &req.RoleID,
	}

	if err := userHandler.Create(context.Background(), user); err != nil {
		log.Printf("❌ 创建用户失败：%v", err)
		Error(c, http.StatusInternalServerError, "创建用户失败")
		return
	}

	log.Printf("✅ 用户 %s 创建成功", req.Username)
	Success(c, gin.H{
		"id":       user.ID,
		"username": user.Username,
	})
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	RealName   string `json:"real_name"`
	Department string `json:"department"`
	Phone      string `json:"phone"`
	RoleID     int64  `json:"role_id"`
	Password   string `json:"password"`
}

// UpdateUser 更新用户
// PUT /api/users/:id
func UpdateUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的用户 ID")
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	// 获取用户
	user, err := userHandler.GetByID(context.Background(), userID)
	if err != nil {
		Error(c, http.StatusNotFound, "用户不存在")
		return
	}

	// 更新字段
	if req.RealName != "" {
		user.RealName = req.RealName
	}
	if req.Department != "" {
		user.Department = req.Department
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.RoleID > 0 {
		user.RoleID = &req.RoleID
	}
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("❌ 密码加密失败：%v", err)
			Error(c, http.StatusInternalServerError, "密码加密失败")
			return
		}
		user.PasswordHash = string(hashedPassword)
	}

	if err := userHandler.Update(context.Background(), user); err != nil {
		log.Printf("❌ 更新用户失败：%v", err)
		Error(c, http.StatusInternalServerError, "更新用户失败")
		return
	}

	log.Printf("✅ 用户 %d 更新成功", userID)
	Success(c, gin.H{"message": "更新成功"})
}

// DeleteUser 删除用户
// DELETE /api/users/:id
func DeleteUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的用户 ID")
		return
	}

	if err := userHandler.Delete(context.Background(), userID); err != nil {
		log.Printf("❌ 删除用户失败：%v", err)
		Error(c, http.StatusInternalServerError, "删除用户失败")
		return
	}

	log.Printf("✅ 用户 %d 删除成功", userID)
	Success(c, gin.H{"message": "删除成功"})
}

// GetUser 获取用户详情
// GET /api/users/:id
func GetUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "无效的用户 ID")
		return
	}

	user, err := userHandler.GetByID(context.Background(), userID)
	if err != nil {
		Error(c, http.StatusNotFound, "用户不存在")
		return
	}

	Success(c, gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"real_name":  user.RealName,
		"department": user.Department,
		"phone":      user.Phone,
		"role":       user.Role,
		"role_id":    user.RoleID,
		"created_at": user.CreatedAt,
	})
}

// GetUsers 获取用户列表
// GET /api/users
func GetUsers(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "10")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)

	offset := (page - 1) * pageSize

	users, total, err := userHandler.List(context.Background(), offset, pageSize)
	if err != nil {
		log.Printf("❌ 获取用户列表失败：%v", err)
		Error(c, http.StatusInternalServerError, "获取用户列表失败")
		return
	}

	userList := make([]gin.H, 0, len(users))
	for _, user := range users {
		userList = append(userList, gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"real_name":  user.RealName,
			"department": user.Department,
			"phone":      user.Phone,
			"role":       user.Role,
			"role_id":    user.RoleID,
			"created_at": user.CreatedAt,
		})
	}

	Success(c, gin.H{
		"list":  userList,
		"total": total,
	})
}

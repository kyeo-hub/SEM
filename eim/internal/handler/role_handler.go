package handler

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/repository"
)

// roleHandler 角色 Handler
var roleHandler *repository.RoleRepository

// InitRoleHandler 初始化角色 Handler
func InitRoleHandler(repo *repository.RoleRepository) {
	roleHandler = repo
	log.Println("✅ RoleHandler 已初始化")
}

// GetRoles 获取角色列表
// GET /api/roles
func GetRoles(c *gin.Context) {
	roles, err := roleHandler.List(context.Background())
	if err != nil {
		Error(c, 500, "获取角色列表失败")
		return
	}

	roleList := make([]gin.H, 0, len(roles))
	for _, role := range roles {
		roleList = append(roleList, gin.H{
			"id":          role.ID,
			"code":        role.RoleCode,
			"name":        role.RoleName,
			"description": role.Description,
		})
	}

	Success(c, gin.H{
		"list": roleList,
	})
}

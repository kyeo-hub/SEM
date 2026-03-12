package middleware

import (
	"log"
	"net/http"
	"slices"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/handler"
	"github.com/kyeo-hub/eim/internal/repository"
)

// RequireRole 角色权限验证中间件
// 验证用户角色是否在允许的角色列表中
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从上下文中获取用户角色
		userRole, exists := c.Get("role")
		if !exists {
			handler.Error(c, http.StatusUnauthorized, "未登录或认证信息不完整")
			c.Abort()
			return
		}

		// 检查角色是否在允许列表中
		roleStr := userRole.(string)
		if !slices.Contains(allowedRoles, roleStr) {
			log.Printf("⚠️ 角色权限不足：用户角色=%s, 允许的角色=%v", roleStr, allowedRoles)
			handler.Error(c, http.StatusForbidden, "权限不足")
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyRole 任意角色验证中间件（支持通配符匹配）
// 用于更灵活的权限控制
func RequireAnyRole(roleRepo *repository.RoleRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从上下文中获取用户信息
		_, userIDExists := c.Get("user_id")
		_, roleExists := c.Get("role")

		if !userIDExists || !roleExists {
			handler.Error(c, http.StatusUnauthorized, "未登录或认证信息不完整")
			c.Abort()
			return
		}

		// 获取当前 API 路径和方法
		_ = c.Request.URL.Path
		_ = c.Request.Method

		// 从数据库查询该 API 的权限配置
		// TODO: 实现基于数据库的权限验证

		c.Next()
	}
}

// RolePermissionConfig 角色权限配置
type RolePermissionConfig struct {
	Path       string   // API 路径
	Method     string   // HTTP 方法
	AllowRoles []string // 允许的角色列表
}

// RolePermissionMiddleware 基于配置的权限中间件
func RolePermissionMiddleware(permissions []RolePermissionConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiPath := c.Request.URL.Path
		apiMethod := c.Request.Method

		// 从上下文中获取用户角色
		userRole, exists := c.Get("role")
		if !exists {
			handler.Error(c, http.StatusUnauthorized, "未登录或认证信息不完整")
			c.Abort()
			return
		}

		roleStr := userRole.(string)

		// 查找匹配的权限配置
		for _, perm := range permissions {
			if matchPath(apiPath, perm.Path) && matchMethod(apiMethod, perm.Method) {
				// 检查角色是否在允许列表中
				if !slices.Contains(perm.AllowRoles, roleStr) {
					log.Printf("⚠️ 角色权限不足：路径=%s, 方法=%s, 用户角色=%s, 允许的角色=%v",
						apiPath, apiMethod, roleStr, perm.AllowRoles)
					handler.Error(c, http.StatusForbidden, "权限不足")
					c.Abort()
					return
				}
				break
			}
		}

		c.Next()
	}
}

// matchPath 路径匹配（支持通配符 *）
func matchPath(actual, pattern string) bool {
	if pattern == actual {
		return true
	}

	// 处理通配符 *
	if strings.Contains(pattern, "*") {
		parts := strings.Split(pattern, "*")
		if len(parts) == 2 {
			// 前缀匹配
			if parts[1] == "" {
				return strings.HasPrefix(actual, parts[0])
			}
			// 后缀匹配
			if parts[0] == "" {
				return strings.HasSuffix(actual, parts[1])
			}
			// 前后缀匹配
			return strings.HasPrefix(actual, parts[0]) && strings.HasSuffix(actual, parts[1])
		}
	}

	return false
}

// matchMethod 方法匹配（支持 ALL）
func matchMethod(actual, pattern string) bool {
	if pattern == "ALL" {
		return true
	}
	return actual == pattern
}

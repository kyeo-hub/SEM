package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/internal/service"
	"github.com/kyeo-hub/eim/pkg/jwt"
)

// SSEClient 表示一个 SSE 客户端连接
type SSEClient struct {
	ID       string
	Channel  chan *SSEEvent
	Done     chan struct{}
	UserID   int64
	UserRole string
}

// SSEEvent SSE 事件结构
type SSEEvent struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

// SSEManager SSE 连接管理器
type SSEManager struct {
	clients map[string]*SSEClient
	mu      sync.RWMutex
}

var (
	sseManager     *SSEManager
	sseManagerOnce sync.Once
	equipmentSvc   *service.EquipmentService
)

// InitSSEHandler 初始化 SSE Handler
func InitSSEHandler(svc *service.EquipmentService) {
	equipmentSvc = svc
}

// GetSSEManager 获取 SSE 管理器单例
func GetSSEManager() *SSEManager {
	sseManagerOnce.Do(func() {
		sseManager = &SSEManager{
			clients: make(map[string]*SSEClient),
		}
	})
	return sseManager
}

// AddClient 添加客户端
func (m *SSEManager) AddClient(client *SSEClient) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.clients[client.ID] = client
	fmt.Printf("SSE 客户端已连接：%s, 当前连接数：%d\n", client.ID, len(m.clients))
}

// RemoveClient 移除客户端
func (m *SSEManager) RemoveClient(clientID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if client, exists := m.clients[clientID]; exists {
		close(client.Done)
		delete(m.clients, clientID)
		fmt.Printf("SSE 客户端已断开：%s, 当前连接数：%d\n", clientID, len(m.clients))
	}
}

// Broadcast 广播事件给所有客户端
func (m *SSEManager) Broadcast(event *SSEEvent) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, client := range m.clients {
		select {
		case client.Channel <- event:
		case <-client.Done:
			// 客户端已断开
		default:
			// 通道满了，跳过
		}
	}
}

// BroadcastEquipmentUpdate 广播设备更新
func BroadcastEquipmentUpdate(eventType string, data interface{}) {
	manager := GetSSEManager()
	manager.Broadcast(&SSEEvent{
		Event: eventType,
		Data:  data,
	})
}

// parseSSEToken 解析 SSE 连接的 token（支持 header 和 query 参数）
func parseSSEToken(c *gin.Context) (int64, string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "eim-secret-key-2026-change-in-production"
	}
	jwtSvc := jwt.New(secret, 168)

	var tokenString string

	// 优先从 Authorization header 获取
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			tokenString = parts[1]
		}
	}

	// 如果 header 中没有，尝试从 query 参数获取
	if tokenString == "" {
		tokenString = c.Query("token")
	}

	if tokenString == "" {
		return 0, "", fmt.Errorf("未提供认证信息")
	}

	// 解析 token
	claims, err := jwtSvc.ParseToken(tokenString)
	if err != nil {
		return 0, "", err
	}

	return claims.UserID, claims.Role, nil
}

// StreamEquipmentEvents SSE 流式推送设备事件
// GET /api/events/equipments
func StreamEquipmentEvents(c *gin.Context) {
	// 解析用户信息（支持 header 和 query 参数）
	userID, role, err := parseSSEToken(c)
	if err != nil {
		Error(c, http.StatusUnauthorized, "未授权："+err.Error())
		return
	}

	// 设置 SSE 响应头
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	// 创建客户端
	clientID := fmt.Sprintf("client_%d_%d", userID, time.Now().UnixNano())
	client := &SSEClient{
		ID:       clientID,
		Channel:  make(chan *SSEEvent, 100),
		Done:     make(chan struct{}),
		UserID:   userID,
		UserRole: role,
	}

	// 注册客户端
	GetSSEManager().AddClient(client)
	defer GetSSEManager().RemoveClient(clientID)

	// 发送初始连接成功事件
	c.SSEvent("connected", gin.H{
		"client_id": clientID,
		"timestamp": time.Now().Unix(),
	})
	c.Writer.Flush()

	// 发送当前设备列表
	if equipmentSvc != nil {
		equipments, _, err := equipmentSvc.GetEquipmentList(context.Background(), 1, 1000, nil)
		if err == nil {
			data, _ := json.Marshal(gin.H{
				"list":      equipments,
				"timestamp": time.Now().Unix(),
			})
			c.SSEvent("equipments-init", string(data))
			c.Writer.Flush()
		}
	}

	// 心跳定时器（每 30 秒一次，保持连接活跃）
	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-c.Request.Context().Done():
			// 客户端断开连接
			return

		case <-client.Done:
			// 客户端被移除
			return

		case event := <-client.Channel:
			// 发送事件（设备状态变化时由其他地方触发）
			data, err := json.Marshal(event.Data)
			if err != nil {
				continue
			}
			c.SSEvent(event.Event, string(data))
			c.Writer.Flush()

		case <-heartbeat.C:
			// 发送心跳
			c.SSEvent("heartbeat", gin.H{
				"timestamp": time.Now().Unix(),
			})
			c.Writer.Flush()
		}
	}
}

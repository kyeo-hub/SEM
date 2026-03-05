package handler

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/pkg/wechat"
)

// wechatBotHandler 企业微信机器人 Handler
var wechatBotHandler *wechat.WeChatBot

// InitWeChatBotHandler 初始化企业微信机器人 Handler
func InitWeChatBotHandler(bot *wechat.WeChatBot) {
	wechatBotHandler = bot
	log.Println("✅ WeChatBotHandler 已初始化")
}

// TestWeChatBot 测试企业微信机器人
// POST /api/wechat/test
func TestWeChatBot(c *gin.Context) {
	if wechatBotHandler == nil {
		Error(c, 500, "企业微信机器人未初始化")
		return
	}

	err := wechatBotHandler.SendMarkdown("## 测试消息\n\n这是一条测试消息，确认机器人配置正常。")
	if err != nil {
		Error(c, 500, err.Error())
		return
	}

	Success(c, gin.H{
		"message": "测试消息发送成功",
	})
}

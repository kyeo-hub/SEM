package wechat

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// WeChatBot 企业微信机器人
type WeChatBot struct {
	webhookURL string
	enabled    bool
}

// MarkdownMessage Markdown 格式消息
type MarkdownMessage struct {
	MsgType  string `json:"msgtype"`
	Markdown struct {
		Content string `json:"content"`
	} `json:"markdown"`
}

// NewWeChatBot 创建企业微信机器人
func NewWeChatBot(webhookURL string, enabled bool) *WeChatBot {
	return &WeChatBot{
		webhookURL: webhookURL,
		enabled:    enabled,
	}
}

// SendMarkdown 发送 Markdown 消息
func (w *WeChatBot) SendMarkdown(content string) error {
	if !w.enabled {
		log.Println("⚠️ 企业微信机器人未启用")
		return nil
	}

	if w.webhookURL == "" {
		return fmt.Errorf("webhook URL 未配置")
	}

	msg := MarkdownMessage{
		MsgType: "markdown",
	}
	msg.Markdown.Content = content

	jsonData, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("JSON 编码失败：%w", err)
	}

	resp, err := http.Post(w.webhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("发送请求失败：%w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("读取响应失败：%w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("解析响应失败：%w", err)
	}

	if errcode, ok := result["errcode"].(float64); ok && errcode != 0 {
		return fmt.Errorf("发送失败：errcode=%v, errmsg=%v", result["errcode"], result["errmsg"])
	}

	log.Printf("✅ 企业微信消息发送成功")
	return nil
}

// SendFaultDailyReport 发送故障设备日报
func (w *WeChatBot) SendFaultDailyReport(date string, faultCount int, equipments []map[string]interface{}) error {
	content := fmt.Sprintf("## 设备故障日报\n\n")
	content += fmt.Sprintf("**日期**: %s\n\n", date)
	content += fmt.Sprintf("**故障设备总数**: %d 台\n\n", faultCount)

	if len(equipments) > 0 {
		content += "### 故障详情\n\n"
		content += "| 设备名称 | 状态 | 故障等级 | 位置 |\n"
		content += "| --- | --- | --- | --- |\n"

		for _, eq := range equipments {
			name, _ := eq["name"].(string)
			status, _ := eq["status"].(string)
			faultLevel, _ := eq["fault_level"].(string)
			location, _ := eq["location"].(string)

			statusEmoji := "🔵"
			if status == "fault" {
				statusEmoji = "🔴"
			}

			content += fmt.Sprintf("| %s | %s %s | %s | %s |\n", name, statusEmoji, status, faultLevel, location)
		}
	}

	content += fmt.Sprintf("\n---\n")
	content += fmt.Sprintf("*发送时间：%s*", time.Now().Format("2006-01-02 15:04:05"))

	return w.SendMarkdown(content)
}

// SendFaultResolved 发送故障修复通知
func (w *WeChatBot) SendFaultResolved(equipmentName, faultLevel, repairContent string, durationHours float64) error {
	content := "## 🔧 故障修复通知\n\n"
	content += fmt.Sprintf("**设备名称**: %s\n\n", equipmentName)
	content += fmt.Sprintf("**故障等级**: %s\n\n", faultLevel)
	content += fmt.Sprintf("**维修内容**: %s\n\n", repairContent)
	content += fmt.Sprintf("**停机时长**: %.1f 小时\n\n", durationHours)
	content += fmt.Sprintf("**状态**: ✅ 已修复\n\n")
	content += fmt.Sprintf("---\n")
	content += fmt.Sprintf("*发送时间：%s*", time.Now().Format("2006-01-02 15:04:05"))

	return w.SendMarkdown(content)
}

// SendInspectionAbnormal 发送点检异常通知
func (w *WeChatBot) SendInspectionAbnormal(equipmentName, inspector, problems string, abnormalCount int) error {
	content := "## ⚠️ 点检异常通知\n\n"
	content += fmt.Sprintf("**设备名称**: %s\n\n", equipmentName)
	content += fmt.Sprintf("**点检人**: %s\n\n", inspector)
	content += fmt.Sprintf("**异常项数**: %d 项\n\n", abnormalCount)
	content += fmt.Sprintf("**问题描述**:\n%s\n\n", problems)
	content += fmt.Sprintf("---\n")
	content += fmt.Sprintf("*发送时间：%s*", time.Now().Format("2006-01-02 15:04:05"))

	return w.SendMarkdown(content)
}

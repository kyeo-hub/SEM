package qrcode

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"

	"github.com/skip2/go-qrcode"
)

// Generator 二维码生成器
type Generator struct {
	size int
}

// New 创建二维码生成器
func New(size int) *Generator {
	if size <= 0 {
		size = 300
	}
	return &Generator{
		size: size,
	}
}

// Generate 生成二维码图片（PNG 格式）
// content: 二维码内容
// 返回：base64 编码的 PNG 图片
func (g *Generator) Generate(content string) (string, error) {
	qr, err := qrcode.New(content, qrcode.Medium)
	if err != nil {
		return "", fmt.Errorf("生成二维码失败：%w", err)
	}

	qr.DisableBorder = true
	pngData, err := qr.PNG(g.size)
	if err != nil {
		return "", fmt.Errorf("生成 PNG 失败：%w", err)
	}

	// 转换为 base64
	base64Str := base64.StdEncoding.EncodeToString(pngData)
	return base64Str, nil
}

// GenerateToBuffer 生成二维码图片到缓冲区
func (g *Generator) GenerateToBuffer(content string) (*bytes.Buffer, error) {
	qr, err := qrcode.New(content, qrcode.Medium)
	if err != nil {
		return nil, fmt.Errorf("生成二维码失败：%w", err)
	}

	qr.DisableBorder = true
	pngData, err := qr.PNG(g.size)
	if err != nil {
		return nil, fmt.Errorf("生成 PNG 失败：%w", err)
	}

	return bytes.NewBuffer(pngData), nil
}

// GenerateImage 生成二维码图片对象
func (g *Generator) GenerateImage(content string) (image.Image, error) {
	qr, err := qrcode.New(content, qrcode.Medium)
	if err != nil {
		return nil, fmt.Errorf("生成二维码失败：%w", err)
	}

	qr.DisableBorder = true
	pngData, err := qr.PNG(g.size)
	if err != nil {
		return nil, fmt.Errorf("生成 PNG 失败：%w", err)
	}

	img, _, err := image.Decode(bytes.NewReader(pngData))
	if err != nil {
		return nil, fmt.Errorf("解码图片失败：%w", err)
	}

	return img, nil
}

package uploader

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// FileUploader 文件上传器
type FileUploader struct {
	uploadDir string
	maxSize   int64 // 最大文件大小 (bytes)
}

// UploadResult 上传结果
type UploadResult struct {
	URL       string `json:"url"`
	FileName  string `json:"file_name"`
	FileSize  int64  `json:"file_size"`
	FileType  string `json:"file_type"`
	Thumbnail string `json:"thumbnail,omitempty"`
}

// NewFileUploader 创建文件上传器
func NewFileUploader(uploadDir string, maxSizeMB int) *FileUploader {
	return &FileUploader{
		uploadDir: uploadDir,
		maxSize:   int64(maxSizeMB) * 1024 * 1024,
	}
}

// Upload 上传文件
func (u *FileUploader) Upload(file *multipart.FileHeader) (*UploadResult, error) {
	// 验证文件大小
	if file.Size > u.maxSize {
		return nil, fmt.Errorf("文件大小超过限制 (%d MB)", u.maxSize/1024/1024)
	}

	// 验证文件类型
	allowedTypes := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedTypes[ext] {
		return nil, fmt.Errorf("不支持的文件类型：%s", ext)
	}

	// 打开上传的文件
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("打开文件失败：%w", err)
	}
	defer src.Close()

	// 生成唯一文件名
	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	uploadPath := filepath.Join(u.uploadDir, fileName)

	// 确保上传目录存在
	if err := os.MkdirAll(u.uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("创建目录失败：%w", err)
	}

	// 创建目标文件
	dst, err := os.Create(uploadPath)
	if err != nil {
		return nil, fmt.Errorf("创建文件失败：%w", err)
	}
	defer dst.Close()

	// 复制文件内容
	if _, err := io.Copy(dst, src); err != nil {
		return nil, fmt.Errorf("保存文件失败：%w", err)
	}

	// 生成访问 URL (相对路径)
	fileURL := "/uploads/" + fileName

	return &UploadResult{
		URL:      fileURL,
		FileName: file.Filename,
		FileSize: file.Size,
		FileType: file.Header.Get("Content-Type"),
	}, nil
}

// GetUploadDir 获取上传目录
func (u *FileUploader) GetUploadDir() string {
	return u.uploadDir
}

// FormatFileSize 格式化文件大小
func FormatFileSize(size int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)

	switch {
	case size >= GB:
		return fmt.Sprintf("%.2f GB", float64(size)/GB)
	case size >= MB:
		return fmt.Sprintf("%.2f MB", float64(size)/MB)
	case size >= KB:
		return fmt.Sprintf("%.2f KB", float64(size)/KB)
	default:
		return fmt.Sprintf("%d B", size)
	}
}

// GetTimestampPath 获取带时间戳的路径 (按日期分类存储)
func (u *FileUploader) GetTimestampPath() string {
	now := time.Now()
	datePath := filepath.Join(u.uploadDir, now.Format("2006/01/02"))
	if err := os.MkdirAll(datePath, 0755); err != nil {
		return u.uploadDir
	}
	return datePath
}

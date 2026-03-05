package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kyeo-hub/eim/pkg/uploader"
)

// fileUploader 文件上传器实例
var fileUploader *uploader.FileUploader

// InitFileHandler 初始化文件上传 Handler
func InitFileHandler(uploader *uploader.FileUploader) {
	fileUploader = uploader
	log.Println("✅ FileHandler 已初始化")
}

// UploadFile 上传文件
// POST /api/files/upload
func UploadFile(c *gin.Context) {
	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		Error(c, http.StatusBadRequest, "请上传文件")
		return
	}

	if fileUploader == nil {
		Error(c, http.StatusInternalServerError, "服务未初始化")
		return
	}

	// 上传文件
	result, err := fileUploader.Upload(file)
	if err != nil {
		log.Printf("❌ 文件上传失败：%v", err)
		Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	log.Printf("✅ 文件上传成功：%s (%s)", result.URL, uploader.FormatFileSize(result.FileSize))
	Success(c, result)
}

// UploadFiles 批量上传文件
// POST /api/files/upload-multiple
func UploadFiles(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		Error(c, http.StatusBadRequest, "请上传文件")
		return
	}

	files := form.File["files[]"]
	if len(files) == 0 {
		Error(c, http.StatusBadRequest, "请上传至少一个文件")
		return
	}

	results := make([]*uploader.UploadResult, 0, len(files))
	for _, fileHeader := range files {
		result, err := fileUploader.Upload(fileHeader)
		if err != nil {
			log.Printf("⚠️ 文件 %s 上传失败：%v", fileHeader.Filename, err)
			continue
		}
		results = append(results, result)
	}

	if len(results) == 0 {
		Error(c, http.StatusInternalServerError, "所有文件上传失败")
		return
	}

	log.Printf("✅ 批量上传成功：%d/%d", len(results), len(files))
	Success(c, gin.H{
		"files": results,
		"total": len(results),
	})
}

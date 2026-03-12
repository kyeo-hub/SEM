'use client';

import { useState, useRef } from 'react';
import { Upload, message } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload/interface';

interface ImageUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
  maxCount?: number;
  maxSize?: number; // MB
  multiple?: boolean;
  value?: string | string[];
  onChange?: (url: string | string[]) => void;
}

export default function ImageUploader({
  maxCount = 1,
  maxSize = 5,
  multiple = false,
  value,
  onChange
}: ImageUploaderProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: RcFile): Promise<boolean> => {
    // 验证文件大小
    const isLimitExceeded = file.size / 1024 / 1024 > maxSize;
    if (isLimitExceeded) {
      message.error(`文件大小不能超过 ${maxSize}MB`);
      return false;
    }

    // 验证文件类型
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件');
      return false;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/files/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.code === 0) {
        message.success('上传成功');
        const fileUrl = result.data.url;

        // 更新文件列表
        const newFile = {
          uid: file.uid || Date.now().toString(),
          name: file.name,
          status: 'done',
          url: fileUrl,
        };
        
        const newList = multiple ? [...fileList, newFile] : [newFile];
        setFileList(newList);

        // 触发 onChange
        if (multiple) {
          onChange?.(newList.map(f => f.url!).filter(Boolean) as string[]);
        } else {
          onChange?.(fileUrl);
        }
        return true;
      } else {
        message.error(result.message || '上传失败');
        return false;
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败，请重试');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (file: UploadFile) => {
    const newList = fileList.filter(f => f.uid !== file.uid);
    setFileList(newList);
    if (multiple) {
      onChange?.(newList.map(f => f.url!).filter(Boolean) as string[]);
    } else {
      onChange?.('');
    }
  };

  const uploadProps: UploadProps = {
    accept: 'image/*',
    maxCount,
    fileList,
    listType: 'picture-card',
    onRemove: handleRemove,
    beforeUpload: handleUpload,
    multiple,
    onPreview: (file) => {
      if (file.url) {
        window.open(file.url, '_blank');
      }
    },
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <Upload {...uploadProps}>
        {fileList.length < maxCount && (
          <div>
            {multiple ? <PlusOutlined /> : <UploadOutlined />}
            <div style={{ marginTop: 8 }}>上传</div>
          </div>
        )}
      </Upload>
    </div>
  );
}

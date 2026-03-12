'use client';

import { useState } from 'react';
import { ImageUploader as AntdImageUploader, Toast } from 'antd-mobile';
import { ImageOutline } from 'antd-mobile-icons';

interface MobileImageUploaderProps {
  value?: string | string[];
  onChange?: (urls: string[]) => void;
  maxCount?: number;
  maxSize?: number; // MB
  multiple?: boolean;
}

export default function MobileImageUploader({
  maxCount = 3,
  maxSize = 5,
  multiple = false,
  value,
  onChange
}: MobileImageUploaderProps) {
  const [fileList, setFileList] = useState<{ url: string }[]>(
    value 
      ? (Array.isArray(value) ? value : [value]).map(url => ({ url }))
      : []
  );
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    // 验证文件大小
    const isLimitExceeded = file.size / 1024 / 1024 > maxSize;
    if (isLimitExceeded) {
      Toast.show({
        content: `文件大小不能超过 ${maxSize}MB`,
        icon: 'fail',
      });
      throw new Error('文件过大');
    }

    // 验证文件类型
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      Toast.show({
        content: '只能上传图片文件',
        icon: 'fail',
      });
      throw new Error('文件类型错误');
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/files/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (result.code === 0) {
        const fileUrl = result.data.url;
        const newFile = { url: fileUrl };
        const newList = multiple 
          ? [...fileList, newFile].slice(0, maxCount)
          : [newFile];
        
        setFileList(newList);
        
        if (onChange) {
          onChange(newList.map(f => f.url));
        }
        
        return { url: fileUrl };
      } else {
        Toast.show({
          content: result.message || '上传失败',
          icon: 'fail',
        });
        throw new Error(result.message || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      if (!(error instanceof Error && error.message === '文件过大' || error.message === '文件类型错误')) {
        Toast.show({
          content: '上传失败，请重试',
          icon: 'fail',
        });
      }
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (index: number) => {
    const newList = fileList.filter((_, i) => i !== index);
    setFileList(newList);
    if (onChange) {
      onChange(newList.map(f => f.url));
    }
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <AntdImageUploader
        fileList={fileList}
        onChange={(files) => {
          // 处理删除
          if (files.length < fileList.length) {
            const deletedIndex = fileList.findIndex(
              (f, i) => !files.some((newFile, j) => j === i)
            );
            if (deletedIndex >= 0) {
              handleDelete(deletedIndex);
            }
          }
        }}
        upload={handleUpload}
        maxCount={maxCount}
        multiple={multiple}
      >
        <div
          style={{
            width: 80,
            height: 80,
            border: '1px dashed #ccc',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
          }}
        >
          <ImageOutline style={{ fontSize: 32, color: '#999' }} />
        </div>
      </AntdImageUploader>
    </div>
  );
}

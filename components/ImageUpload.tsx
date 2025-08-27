"use client";
import React, { useState, ChangeEvent } from 'react';
import { uploadImagesToExistingTask } from '@/lib/upload';

interface ImageUploadProps {
  taskId: string;
  userId: string;
  onUploaded?: (uploadedCount: number) => void;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ taskId, userId, onUploaded, disabled }) => {
  const [uploading, setUploading] = useState(false);

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedImages = await uploadImagesToExistingTask(files, taskId, userId);
      onUploaded?.(uploadedImages.length);
    } catch (error) {
      console.error('上传图片时出错:', error);
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
        disabled={disabled || uploading}
        style={{ marginLeft: 8 }}
      />
      {uploading && <span style={{ marginLeft: 8, color: '#666' }}>上传中...</span>}
    </div>
  );
};



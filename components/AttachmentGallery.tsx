"use client";
import React from 'react';
import { TaskImage } from '@/lib/upload';

interface AttachmentGalleryProps {
  images: TaskImage[];
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({ images }) => {
  if (!images || images.length === 0) {
    return null;
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
      {images.map((image) => (
        <div key={image.id} style={{ position: 'relative' }}>
          <img
            src={image.image_url}
            alt={`清扫图片`}
            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
          />
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
            {new Date(image.uploaded_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};



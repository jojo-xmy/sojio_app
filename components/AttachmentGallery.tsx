"use client";
import React, { useState } from 'react';
import { TaskImage } from '@/lib/upload';
import { Image as ImageIcon, Clock, ZoomIn } from 'lucide-react';

interface AttachmentGalleryProps {
  images: TaskImage[];
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: 'var(--muted)',
        borderRadius: 'var(--radius)',
        border: '1px dashed var(--border)',
        color: 'var(--muted-foreground)',
        fontSize: '14px'
      }}>
        <ImageIcon size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
        <span>暂无图片附件</span>
      </div>
    );
  }

  return (
    <>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: 12,
        marginTop: 8
      }}>
        {images.map((image) => (
          <div 
            key={image.id} 
            style={{ 
              position: 'relative',
              cursor: 'pointer',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              transition: 'all 0.2s ease',
              background: 'var(--card)'
            }}
            onClick={() => setSelectedImage(image.image_url)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ position: 'relative', paddingBottom: '100%' }}>
              <img
                src={image.image_url}
                alt="任务图片"
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              {/* 悬停放大图标 */}
              <div style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'rgba(0, 0, 0, 0.6)',
                borderRadius: '4px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ZoomIn size={14} color="#ffffff" />
              </div>
            </div>
            <div style={{ 
              padding: '6px 8px',
              background: 'var(--muted)',
              borderTop: '1px solid var(--border)'
            }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '11px', 
                color: 'var(--muted-foreground)',
              }}>
                <Clock size={10} />
                <span>
                  {new Date(image.uploaded_at).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 图片预览模态框 */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            cursor: 'pointer'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="预览"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: 'var(--radius)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
          />
        </div>
      )}
    </>
  );
};



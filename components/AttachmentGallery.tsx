"use client";
import React, { useState } from 'react';
import { TaskImage, deleteImage } from '@/lib/upload';
import { Image as ImageIcon, Clock, ZoomIn, X } from 'lucide-react';
import { useUserStore } from '@/store/userStore';

interface AttachmentGalleryProps {
  images: TaskImage[];
  onImageDeleted?: () => void;
  canDelete?: boolean; // 是否可以删除图片
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({ 
  images, 
  onImageDeleted,
  canDelete = true 
}) => {
  const user = useUserStore(s => s.user);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteImage = async (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    
    if (!confirm('确定要删除这张图片吗？')) return;

    setDeletingId(imageId);
    try {
      const success = await deleteImage(imageId);
      if (success) {
        onImageDeleted?.();
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('删除图片失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  };

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
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
              {/* 右上角放大图标 */}
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
              {/* 右下角删除图标（仅清洁员工作中可见） */}
              {user?.role === 'cleaner' && canDelete && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    background: deletingId === image.id ? 'rgba(156, 163, 175, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                    borderRadius: '4px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: deletingId === image.id ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={(e) => !deletingId && handleDeleteImage(e, image.id)}
                  onMouseEnter={(e) => {
                    if (!deletingId) {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!deletingId) {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
                    }
                  }}
                >
                  {deletingId === image.id ? (
                    <div style={{
                      width: 14,
                      height: 14,
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                  ) : (
                    <X size={14} color="#ffffff" />
                  )}
                </div>
              )}
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



"use client";
import React, { useMemo } from 'react';

interface AnchoredDetailPopoverProps {
  anchorRect: DOMRect | null;
  width?: number;
  maxHeight?: number;
  onClose: () => void;
  children: React.ReactNode;
  centerOnPage?: boolean; // 新增：强制页面居中
}

export const AnchoredDetailPopover: React.FC<AnchoredDetailPopoverProps> = ({ anchorRect, width = 360, maxHeight = 600, onClose, children, centerOnPage = false }) => {
  const position = useMemo(() => {
    if (centerOnPage || !anchorRect) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
      const left = Math.max(12, (vw - width) / 2);
      const top = Math.max(12, (vh - Math.min(maxHeight, 520)) / 2);
      return { top, left };
    }
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const centerX = anchorRect.left + anchorRect.width / 2;
    const centerY = anchorRect.top + anchorRect.height / 2;
    const popoverWidth = width;
    const popoverHeight = Math.min(maxHeight, 520);
    let left = centerX - popoverWidth / 2;
    let top = centerY - popoverHeight / 2;
    left = Math.max(12, Math.min(left, vw - popoverWidth - 12));
    top = Math.max(12, Math.min(top, vh - popoverHeight - 12));
    return { top, left };
  }, [anchorRect, width, maxHeight]);

  return (
    <div className="fixed inset-0 z-[10000]" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.08)' }} />
      <div
        className="absolute bg-white border shadow-xl rounded"
        style={{ top: position.top, left: position.left, width, maxHeight, overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};



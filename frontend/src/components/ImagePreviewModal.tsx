// import React from 'react';
import { X } from 'lucide-react';
import { useUI } from '../hooks';
import { usePreviewImage } from '../contexts/AppContext';

export function ImagePreviewModal() {
  const { isImagePreviewOpen, closeImagePreviewModal } = useUI();
  const previewImage = usePreviewImage();

  if (!isImagePreviewOpen || !previewImage) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={closeImagePreviewModal}
    >
      <div className="relative max-w-4xl max-h-screen mx-4">
        <button
          onClick={closeImagePreviewModal}
          className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-75 z-10"
        >
          <X className="w-6 h-6" />
        </button>
        
        <img
          src={previewImage?.image_url}
          alt={previewImage?.title}
          className="max-w-full max-h-screen object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        
        {previewImage?.title && (
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-black bg-opacity-50 text-white rounded-lg">
            <h3 className="text-lg font-medium">{previewImage.title}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
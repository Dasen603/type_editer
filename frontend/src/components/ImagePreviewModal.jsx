import React from 'react';
import { X } from 'lucide-react';

const ImagePreviewModal = ({ isOpen, onClose, imageUrl, imageTitle }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none select-none"
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-800 truncate">{imageTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <img 
            src={imageUrl}
            alt={imageTitle}
            className="w-full h-auto rounded"
          />
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;

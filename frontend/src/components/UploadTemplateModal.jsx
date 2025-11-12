import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';

const UploadTemplateModal = ({ isOpen, onClose, onUpload }) => {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('conference');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // 文件大小限制：50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const categories = [
    { value: 'conference', label: 'Conference' },
    { value: 'journal', label: 'Journal' },
    { value: 'university', label: 'University' },
    { value: 'custom', label: 'Custom' }
  ];

  const handleFileSelect = (file) => {
    setUploadError('');
    
    if (!file) {
      return;
    }

    // 检查文件扩展名
    const validExtensions = ['.zip', '.tex', '.cls', '.sty'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setUploadError('Please select a valid template file (.zip, .tex, .cls, or .sty)');
      setSelectedFile(null);
      return;
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File size exceeds the maximum limit of ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`);
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setUploadError('The selected file is empty');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      // Reset form when closing
      setTemplateName('');
      setTemplateDescription('');
      setSelectedCategory('conference');
      setSelectedFile(null);
    }, 200);
  };

  const handleSubmit = async () => {
    setUploadError('');

    if (!templateName.trim()) {
      setUploadError('Please enter a template name');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please select a template file');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload({
        name: templateName,
        description: templateDescription,
        category: selectedCategory,
        file: selectedFile
      });
      handleClose();
    } catch (error) {
      setUploadError(error.message || 'Failed to upload template. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 3000 }}>
      <div 
        className={`relative bg-white rounded-lg shadow-2xl w-full max-w-2xl h-auto flex flex-col pointer-events-auto max-h-[90vh] ${isClosing ? 'animate-scaleOut' : 'animate-scaleIn'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Upload LaTeX Template</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* 错误提示 */}
          {uploadError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* 文件上传区域 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template File <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 font-normal ml-2">
                (Max {MAX_FILE_SIZE / 1024 / 1024}MB)
              </span>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                isDragging
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-xs">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-600 mb-1.5">
                    Drag and drop your template file here, or
                  </p>
                  <label className="inline-block">
                    <span className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer transition-colors">
                      Browse Files
                    </span>
                    <input
                      type="file"
                      accept=".zip,.tex,.cls,.sty"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: .zip, .tex, .cls, .sty
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 模板信息表单 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., My Custom Template"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 select-text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 select-text"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe your template..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none select-text"
              />
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!templateName.trim() || !selectedFile || isUploading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Uploading...
              </>
            ) : (
              'Upload Template'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadTemplateModal;


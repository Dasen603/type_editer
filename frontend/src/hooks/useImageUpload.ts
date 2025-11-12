import { useCallback, useState } from 'react';
import { useAppContext, useAppActions } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';

export function useImageUpload() {
  const { state } = useAppContext();
  const actions = useAppActions();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 上传图片
  const uploadImage = useCallback(async (file: File) => {
    if (!state.document) {
      throw new Error('No document selected');
    }

    setUploading(true);
    setError(null);

    try {
      // 上传文件
      const uploadResponse = await apiClient.upload.uploadFile(file);
      
      // 创建新的图片节点
      const newNodeData = {
        document_id: state.document.id,
        title: file.name,
        node_type: 'figure' as const,
        indent_level: 0,
        order_index: state.nodes.length,
        image_url: uploadResponse.url,
      };

      const newNode = await apiClient.nodes.create(newNodeData);
      actions.addNode(newNode);
      
      return newNode;
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to upload image';
      setError(errorMessage);
      actions.setError(errorMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [state.document, state.nodes.length, actions]);

  // 验证文件类型
  const validateFile = useCallback((file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      const errorMessage = 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.';
      setError(errorMessage);
      actions.setError(errorMessage);
      return false;
    }

    if (file.size > maxSize) {
      const errorMessage = 'File too large. Maximum file size is 10MB.';
      setError(errorMessage);
      actions.setError(errorMessage);
      return false;
    }

    return true;
  }, [actions]);

  // 处理拖拽上传
  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      const errorMessage = 'No image files found in drop.';
      setError(errorMessage);
      actions.setError(errorMessage);
      return;
    }

    // 只处理第一个图片文件
    const file = imageFiles[0];
    
    if (validateFile(file)) {
      try {
        await uploadImage(file);
      } catch (err) {
        // 错误已经在 uploadImage 中处理
      }
    }
  }, [uploadImage, validateFile, actions]);

  // 处理文件选择上传
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (validateFile(file)) {
      try {
        await uploadImage(file);
      } catch (err) {
        // 错误已经在 uploadImage 中处理
      }
    }

    // 清空 input 值，允许重复选择同一文件
    event.target.value = '';
  }, [uploadImage, validateFile]);

  return {
    uploading,
    error,
    uploadImage,
    validateFile,
    handleDrop,
    handleFileSelect,
  };
}
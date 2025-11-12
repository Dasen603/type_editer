import { useCallback, useEffect, useState } from 'react';
import { useAppContext, useAppActions } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';
import { Document } from '../types';

export function useDocument() {
  const { state } = useAppContext();
  const actions = useAppActions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化文档
  useEffect(() => {
    const initializeDocument = async () => {
      if (state.document) return; // 已经有文档，不需要重新加载

      setLoading(true);
      setError(null);

      try {
        const documents = await apiClient.documents.list();
        let document: Document;

        if (documents.length > 0) {
          document = documents[0];
        } else {
          // 创建新文档
          document = await apiClient.documents.create('New Document');
        }

        actions.setDocument(document);
      } catch (err: any) {
        const errorMessage = err.userMessage || 'Failed to initialize document';
        setError(errorMessage);
        actions.setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    initializeDocument();
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 更新文档标题
  const updateTitle = useCallback(async (title: string) => {
    if (!state.document) return;

    try {
      actions.setError(null);
      const updatedDocument = await apiClient.documents.update(state.document.id, title);
      actions.setDocument(updatedDocument);
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to update document title';
      setError(errorMessage);
      actions.setError(errorMessage);
      throw err;
    }
  }, [state.document, actions]);

  // 导出文档
  const exportDocument = useCallback(() => {
    // TODO: 实现导出功能
    console.log('Export functionality coming soon');
  }, []);

  return {
    document: state.document,
    loading,
    error,
    updateTitle,
    exportDocument,
  };
}
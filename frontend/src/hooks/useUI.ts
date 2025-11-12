import { useCallback } from 'react';
import { useAppContext, useAppActions } from '../contexts/AppContext';

export function useUI() {
  const { state } = useAppContext();
  const actions = useAppActions();

  // 错误处理
  const setError = useCallback((error: string | null) => {
    actions.setError(error);
  }, [actions]);

  const clearError = useCallback(() => {
    actions.setError(null);
  }, [actions]);

  // 保存状态
  const setSaving = useCallback((saving: boolean) => {
    actions.setSaving(saving);
  }, [actions]);

  // 格式化工具栏
  const toggleFormattingToolbar = useCallback(() => {
    actions.setFormattingToolbar(!state.ui.formattingToolbarEnabled);
  }, [actions, state.ui.formattingToolbarEnabled]);

  const setFormattingToolbar = useCallback((enabled: boolean) => {
    actions.setFormattingToolbar(enabled);
  }, [actions]);

  // 缩放级别
  const setZoomLevel = useCallback((level: number) => {
    // 验证缩放级别范围
    const validLevels = [80, 90, 100, 110, 120];
    if (validLevels.includes(level)) {
      actions.setZoomLevel(level);
    }
  }, [actions]);

  const zoomIn = useCallback(() => {
    const validLevels = [80, 90, 100, 110, 120];
    const currentIndex = validLevels.indexOf(state.ui.zoomLevel);
    if (currentIndex < validLevels.length - 1) {
      actions.setZoomLevel(validLevels[currentIndex + 1]);
    }
  }, [actions, state.ui.zoomLevel]);

  const zoomOut = useCallback(() => {
    const validLevels = [80, 90, 100, 110, 120];
    const currentIndex = validLevels.indexOf(state.ui.zoomLevel);
    if (currentIndex > 0) {
      actions.setZoomLevel(validLevels[currentIndex - 1]);
    }
  }, [actions, state.ui.zoomLevel]);

  const resetZoom = useCallback(() => {
    actions.setZoomLevel(100);
  }, [actions]);

  // BibTeX 模态框
  const openBibTeXModal = useCallback(() => {
    actions.setBibTeXModal(true);
  }, [actions]);

  const closeBibTeXModal = useCallback(() => {
    actions.setBibTeXModal(false);
  }, [actions]);

  // 图片预览模态框
  const openImagePreviewModal = useCallback((image?: any) => {
    if (image) {
      actions.setPreviewImage(image);
    }
    actions.setImagePreviewModal(true);
  }, [actions]);

  const closeImagePreviewModal = useCallback(() => {
    actions.setImagePreviewModal(false);
    actions.setPreviewImage(null);
  }, [actions]);

  return {
    // 状态
    uiState: state.ui,
    isSaving: state.ui.isSaving,
    error: state.ui.error,
    formattingToolbarEnabled: state.ui.formattingToolbarEnabled,
    zoomLevel: state.ui.zoomLevel,
    isBibTeXModalOpen: state.ui.isBibTeXModalOpen,
    isImagePreviewOpen: state.ui.isImagePreviewOpen,

    // 错误处理
    setError,
    clearError,

    // 保存状态
    setSaving,

    // 格式化工具栏
    toggleFormattingToolbar,
    setFormattingToolbar,

    // 缩放
    setZoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,

    // 模态框
    openBibTeXModal,
    closeBibTeXModal,
    openImagePreviewModal,
    closeImagePreviewModal,
  };
}
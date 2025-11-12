import { useCallback, useEffect, useState, useRef } from 'react';
import { useAppContext, useAppActions } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';
import { computeWordCount } from '../utils/wordCount';
import { WordCount } from '../types';

export function useContent() {
  const { state } = useAppContext();
  const actions = useAppActions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 防抖保存
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousCountsRef = useRef<WordCount>({ display: 0, tooltip: 0 });

  // 加载内容
  const loadContent = useCallback(async (nodeId: number): Promise<string | undefined> => {
    if (!nodeId) return;

    setLoading(true);
    setError(null);

    try {
      const contentData = await apiClient.content.get(nodeId);
      actions.setContent(contentData.content_json);
      
      // 计算字数
      const counts = computeWordCount(contentData.content_json) as WordCount;
      actions.setCurrentCounts(counts);
      previousCountsRef.current = counts;
      
      return contentData.content_json;
    } catch (err: any) {
      // 如果内容不存在，设置为空而不是报错
      if (err.response?.status === 404) {
        actions.setContent('');
        const emptyCounts = { display: 0, tooltip: 0 };
        actions.setCurrentCounts(emptyCounts);
        previousCountsRef.current = emptyCounts;
      } else {
        const errorMessage = err.userMessage || 'Failed to load content';
        setError(errorMessage);
        actions.setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
    return undefined;
  }, [actions]);

  // 当选中节点变化时，加载内容
  useEffect(() => {
    const selectedNode = state.editor.selectedNode;
    
    if (selectedNode && (selectedNode.node_type === 'section' || selectedNode.node_type === 'reference')) {
      loadContent(selectedNode.id);
    } else {
      // 清空内容和字数
      actions.setContent(null);
      const emptyCounts = { display: 0, tooltip: 0 };
      actions.setCurrentCounts(emptyCounts);
      previousCountsRef.current = emptyCounts;
    }
  }, [state.editor.selectedNode?.id, loadContent, actions]);

  // 提取标题从内容
  const extractTitleFromContent = useCallback((contentJson: string) => {
    try {
      const blocks = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
      if (!Array.isArray(blocks)) return null;

      for (const block of blocks) {
        if (block.type === 'heading' && block.content) {
          const textContent = block.content
            .map((item: any) => item.type === 'text' ? item.text : '')
            .join('')
            .trim();
          if (textContent) return textContent;
        }
      }
      return null;
    } catch (e) {
      console.error('Error extracting title:', e);
      return null;
    }
  }, []);

  // 更新内容（带防抖保存）
  const updateContent = useCallback((newContent: string) => {
    const selectedNode = state.editor.selectedNode;
    if (!selectedNode) return;

    // 立即更新本地状态
    actions.setContent(newContent);

    // 计算新的字数
    const newCounts = computeWordCount(newContent) as WordCount;
    const oldCounts = previousCountsRef.current;
    
    // 计算增量并更新总字数
    const displayDiff = newCounts.display - oldCounts.display;
    const tooltipDiff = newCounts.tooltip - oldCounts.tooltip;
    
    actions.setCurrentCounts(newCounts);
    previousCountsRef.current = newCounts;
    
    if (displayDiff !== 0 || tooltipDiff !== 0) {
      const currentTotalCounts = state.editor.totalCounts;
      actions.setTotalCounts({
        display: currentTotalCounts.display + displayDiff,
        tooltip: currentTotalCounts.tooltip + tooltipDiff,
      });
    }

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 设置新的保存定时器
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        actions.setSaving(true);
        actions.setError(null);

        // 检查节点是否仍然存在
        const currentNodes = state.nodes;
        const nodeStillExists = currentNodes.some(n => n.id === selectedNode.id);
        
        if (!nodeStillExists) {
          console.log('Node was deleted, skipping save');
          return;
        }

        await apiClient.content.save(selectedNode.id, newContent);

        // 如果是 section 类型，检查是否需要更新标题
        if (selectedNode.node_type === 'section') {
          const extractedTitle = extractTitleFromContent(newContent);
          if (extractedTitle && extractedTitle !== selectedNode.title) {
            // 使用 useNodes 中的 updateNode 方法会更好，但这里先直接调用 API
            try {
              await apiClient.nodes.update(selectedNode.id, { title: extractedTitle });
              actions.updateNode(selectedNode.id, { title: extractedTitle });
            } catch (titleUpdateError: any) {
              console.warn('Failed to update node title:', titleUpdateError.userMessage);
              // 标题更新失败不应该阻止内容保存
            }
          }
        }

      } catch (err: any) {
        // 如果是"Node not found"错误，说明节点在保存前被删除了
        if (err.response?.status === 404 && err.response?.data?.error === 'Node not found') {
          console.log('Node was deleted before save completed, ignoring error');
        } else {
          const errorMessage = err.userMessage || 'Failed to save content';
          setError(errorMessage);
          actions.setError(errorMessage);
        }
      } finally {
        actions.setSaving(false);
      }
    }, 2000); // 2秒防抖延迟
  }, [
    state.editor.selectedNode, 
    state.editor.totalCounts,
    state.nodes, 
    actions, 
    extractTitleFromContent
  ]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    content: state.editor.content,
    currentCounts: state.editor.currentCounts,
    totalCounts: state.editor.totalCounts,
    loading,
    error,
    updateContent,
    loadContent,
  };
}
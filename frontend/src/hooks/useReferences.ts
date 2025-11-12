import { useCallback, useEffect, useState, useRef } from 'react';
import { useAppContext, useAppActions } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';
import { BibTeXData } from '../types';

export function useReferences() {
  const { state } = useAppContext();
  const actions = useAppActions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 编辑器引用，用于插入引用
  const editorRef = useRef<any>(null);
  
  // 引用导航索引
  const citationNavigationIndex = useRef<{ [key: string]: number }>({});

  // 计算引用使用次数
  const calculateCitationCounts = useCallback((sectionContents: (string | null)[]) => {
    const citationCounts: { [key: string]: number } = {};
    
    sectionContents.forEach((contentData) => {
      if (contentData) {
        try {
          const parsed = typeof contentData === 'string' ? JSON.parse(contentData) : contentData;
          
          if (Array.isArray(parsed)) {
            for (const block of parsed) {
              if (block.content && Array.isArray(block.content)) {
                for (const item of block.content) {
                  if (item.type === 'citation' && item.props?.citationKey) {
                    const key = item.props.citationKey;
                    citationCounts[key] = (citationCounts[key] || 0) + 1;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error parsing section content:', error);
        }
      }
    });
    
    return citationCounts;
  }, []);

  // 更新引用使用计数
  const updateCitationCounts = useCallback(async () => {
    try {
      const sectionNodes = state.nodes.filter(n => n.node_type === 'section');
      
      const sectionContents = await Promise.all(
        sectionNodes.map(async (node) => {
          try {
            const contentResponse = await apiClient.content.get(node.id);
            return contentResponse.content_json;
          } catch (error) {
            console.error(`Error loading content for section ${node.id}:`, error);
            return null;
          }
        })
      );
      
      const citationCounts = calculateCitationCounts(sectionContents);
      
      const updatedReferences = state.references.map(ref => ({
        ...ref,
        usageCount: citationCounts[ref.title] || 0
      }));
      
      actions.setReferences(updatedReferences);
    } catch (err: any) {
      console.error('Error updating citation counts:', err);
    }
  }, [state.nodes, state.references, actions, calculateCitationCounts]);

  // 加载引用列表
  const loadReferences = useCallback(async () => {
    if (!state.document?.id) return;

    setLoading(true);
    setError(null);

    try {
      const nodes = await apiClient.nodes.list(state.document.id);
      const referenceNodes = nodes.filter(n => n.node_type === 'reference');
      const sectionNodes = nodes.filter(n => n.node_type === 'section');
      
      // 并行加载所有引用内容
      const [referencesWithContent, sectionContents] = await Promise.all([
        Promise.all(
          referenceNodes.map(async (node) => {
            try {
              const contentResponse = await apiClient.content.get(node.id);
              const contentData = contentResponse.content_json;
              let bibtex = '';
              
              if (contentData) {
                const parsed = typeof contentData === 'string' ? JSON.parse(contentData) : contentData;
                bibtex = parsed.bibtex || '';
              }
              
              return {
                id: node.id,
                title: node.title,
                content: bibtex,
                usageCount: 0, // 初始为0，后面会计算
              };
            } catch (error) {
              console.error(`Error loading content for reference ${node.id}:`, error);
              return {
                id: node.id,
                title: node.title,
                content: '',
                usageCount: 0,
              };
            }
          })
        ),
        Promise.all(
          sectionNodes.map(async (node) => {
            try {
              const contentResponse = await apiClient.content.get(node.id);
              return contentResponse.content_json;
            } catch (error) {
              console.error(`Error loading content for section ${node.id}:`, error);
              return null;
            }
          })
        )
      ]);

      // 计算引用使用次数
      const citationCounts = calculateCitationCounts(sectionContents);
      
      const referencesWithCounts = referencesWithContent.map(ref => ({
        ...ref,
        usageCount: citationCounts[ref.title] || 0
      }));

      actions.setReferences(referencesWithCounts);
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to load references';
      setError(errorMessage);
      actions.setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [state.document?.id, actions, calculateCitationCounts]);

  // 当文档或节点变化时，重新加载引用
  useEffect(() => {
    if (state.document?.id) {
      loadReferences();
    }
  }, [state.document?.id, loadReferences]);

  // 添加新引用
  const addReference = useCallback(async (data: BibTeXData) => {
    if (!state.document) return;

    try {
      actions.setError(null);
      
      const newNodeData = {
        document_id: state.document.id,
        title: data.citationKey,
        node_type: 'reference' as const,
        indent_level: 0,
        order_index: state.nodes.length,
      };

      const newNode = await apiClient.nodes.create(newNodeData);
      await apiClient.content.save(newNode.id, JSON.stringify({ bibtex: data.bibtex }));
      
      // 重新加载引用列表
      await loadReferences();
      
      return newNode;
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to add reference';
      setError(errorMessage);
      actions.setError(errorMessage);
      throw err;
    }
  }, [state.document, state.nodes.length, actions, loadReferences]);

  // 更新引用
  const updateReference = useCallback(async (id: number, data: BibTeXData) => {
    try {
      actions.setError(null);
      
      // 更新节点标题
      await apiClient.nodes.update(id, { title: data.citationKey });
      
      // 更新内容
      await apiClient.content.save(id, JSON.stringify({ bibtex: data.bibtex }));
      
      // 重新加载引用列表
      await loadReferences();
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to update reference';
      setError(errorMessage);
      actions.setError(errorMessage);
      throw err;
    }
  }, [actions, loadReferences]);

  // 删除引用
  const deleteReference = useCallback(async (id: number) => {
    try {
      actions.setError(null);
      await apiClient.nodes.delete(id);
      
      // 更新本地状态
      const updatedReferences = state.references.filter(ref => ref.id !== id);
      actions.setReferences(updatedReferences);
      
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to delete reference';
      setError(errorMessage);
      actions.setError(errorMessage);
      throw err;
    }
  }, [actions, state.references]);

  // 设置编辑器引用
  const setEditorRef = useCallback((ref: any) => {
    editorRef.current = ref;
  }, []);

  // 插入引用
  const insertCitation = useCallback((citationKey: string) => {
    if (editorRef.current && state.editor.selectedNode?.node_type === 'section') {
      editorRef.current.insertCitation(citationKey);
    }
  }, [state.editor.selectedNode]);

  // 导航到引用
  const navigateToCitation = useCallback((citationKey: string) => {
    if (editorRef.current) {
      // 获取当前引用的导航索引，如果不存在则初始化为 0
      const currentIndex = citationNavigationIndex.current[citationKey] || 0;
      
      // 调用 editor 的导航方法，返回该引用的总数量
      const totalCount = editorRef.current.navigateToCitation(citationKey, currentIndex);
      
      // 更新索引，循环到下一个
      if (totalCount > 0) {
        citationNavigationIndex.current[citationKey] = (currentIndex + 1) % totalCount;
      }
    }
  }, []);

  return {
    references: state.references,
    loading,
    error,
    addReference,
    updateReference,
    deleteReference,
    insertCitation,
    navigateToCitation,
    updateCitationCounts,
    setEditorRef,
    loadReferences,
  };
}
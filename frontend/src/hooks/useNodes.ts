import { useCallback, useEffect, useState } from 'react';
import { useAppContext, useAppActions } from '../contexts/AppContext';
import { apiClient } from '../services/apiClient';
import { Node, NodeType } from '../types';

export function useNodes() {
  const { state } = useAppContext();
  const actions = useAppActions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载节点列表
  const loadNodes = useCallback(async (documentId: number) => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const nodes = await apiClient.nodes.list(documentId);
      actions.setNodes(nodes);

      // 如果没有选中的节点且有可用节点，选中第一个
      if (!state.editor.selectedNode && nodes.length > 0) {
        const firstSectionNode = nodes.find(n => n.node_type === 'section') || nodes[0];
        actions.setSelectedNode(firstSectionNode);
      }

      return nodes;
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to load nodes';
      setError(errorMessage);
      actions.setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [actions, state.editor.selectedNode]);

  // 当文档变化时，加载节点
  useEffect(() => {
    if (state.document?.id) {
      loadNodes(state.document.id);
    }
  }, [state.document?.id, loadNodes]);

  // 选择节点
  const selectNode = useCallback((node: Node | null) => {
    actions.setSelectedNode(node);
  }, [actions]);

  // 添加节点
  const addNode = useCallback(async (nodeType: NodeType) => {
    if (!state.document) return;

    try {
      actions.setError(null);
      
      const titleMap = {
        'section': 'New Section',
        'reference': 'New Reference',
        'figure': 'New Picture',
        'equation': 'New Equation',
      };

      const newNodeData = {
        document_id: state.document.id,
        title: titleMap[nodeType],
        node_type: nodeType,
        indent_level: 0,
        order_index: state.nodes.length,
      };

      const newNode = await apiClient.nodes.create(newNodeData);
      actions.addNode(newNode);

      // 如果是 section 类型，自动选中新创建的节点
      if (nodeType === 'section') {
        actions.setSelectedNode(newNode);
      }

      return newNode;
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to create node';
      setError(errorMessage);
      actions.setError(errorMessage);
      throw err;
    }
  }, [state.document, state.nodes.length, actions]);

  // 更新节点
  const updateNode = useCallback(async (id: number, updates: Partial<Node>) => {
    try {
      actions.setError(null);
      const updatedNode = await apiClient.nodes.update(id, updates);
      actions.updateNode(id, updatedNode);

      // 如果更新的是当前选中的节点，也更新选中状态
      if (state.editor.selectedNode?.id === id) {
        actions.setSelectedNode(updatedNode);
      }

      return updatedNode;
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to update node';
      setError(errorMessage);
      actions.setError(errorMessage);
      throw err;
    }
  }, [actions, state.editor.selectedNode]);

  // 删除节点
  const deleteNode = useCallback(async (id: number) => {
    try {
      actions.setError(null);
      await apiClient.nodes.delete(id);
      actions.removeNode(id);

      // 如果删除的是当前选中的节点，选择下一个可用的 section
      if (state.editor.selectedNode?.id === id) {
        const remainingSections = state.nodes
          .filter(n => n.id !== id && n.node_type === 'section');
        
        if (remainingSections.length > 0) {
          actions.setSelectedNode(remainingSections[0]);
        } else {
          actions.setSelectedNode(null);
          actions.setContent(null);
        }
      }
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to delete node';
      setError(errorMessage);
      actions.setError(errorMessage);
      throw err;
    }
  }, [actions, state.editor.selectedNode, state.nodes]);

  // 重新排序节点
  const reorderNodes = useCallback(async (reorderedNodes: Node[]) => {
    try {
      actions.setError(null);
      
      // 批量更新节点的 order_index
      const updates = reorderedNodes.map((node, index) => ({
        id: node.id,
        order_index: index,
      }));

      // 并行更新所有节点
      await Promise.all(
        updates.map(update => 
          apiClient.nodes.update(update.id, { order_index: update.order_index })
        )
      );

      // 重新加载节点以确保顺序正确
      if (state.document?.id) {
        await loadNodes(state.document.id);
      }
    } catch (err: any) {
      const errorMessage = err.userMessage || 'Failed to reorder nodes';
      setError(errorMessage);
      actions.setError(errorMessage);
      throw err;
    }
  }, [actions, state.document?.id, loadNodes]);

  return {
    nodes: state.nodes,
    selectedNode: state.editor.selectedNode,
    loading,
    error,
    selectNode,
    addNode,
    updateNode,
    deleteNode,
    reorderNodes,
    loadNodes,
  };
}
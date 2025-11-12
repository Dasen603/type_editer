import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import TopBar from './TopBar';
import EditorToolbar from './EditorToolbar';
import Editor from './Editor';
import { EmptyState } from './EmptyState';
import { 
  useDocument, 
  useNodes, 
  useContent, 
  useReferences,
  useUI 
} from '../hooks';

export const EditorArea = React.memo(() => {
  const { document, updateTitle, exportDocument } = useDocument();
  const { nodes, selectedNode, addNode } = useNodes();
  const { content, currentCounts, totalCounts, updateContent } = useContent();
  const { setEditorRef } = useReferences();
  const { 
    isSaving, 
    formattingToolbarEnabled, 
    zoomLevel, 
    toggleFormattingToolbar,
    setZoomLevel 
  } = useUI();
  
  const editorRef = useRef(null);

  // 设置编辑器引用到 references hook
  useEffect(() => {
    setEditorRef(editorRef.current);
  }, [setEditorRef]);

  // 撤销重做操作 - 使用 useCallback 优化
  const handleUndo = useCallback(() => {
    if (editorRef.current) {
      (editorRef.current as any).undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (editorRef.current) {
      (editorRef.current as any).redo();
    }
  }, []);

  // 获取当前节点标题 - 使用 useMemo 优化
  const currentNodeTitle = useMemo(() => {
    if (!selectedNode) return undefined;
    
    // 对于 section 类型，显示标题；对于其他类型，显示类型名称
    switch (selectedNode.node_type) {
      case 'section':
        return selectedNode.title;
      case 'reference':
        return `Reference: ${selectedNode.title}`;
      case 'figure':
        return `Figure: ${selectedNode.title}`;
      default:
        return selectedNode.title;
    }
  }, [selectedNode]);

  // 检查是否有 section 节点
  const sectionNodes = nodes.filter(n => n.node_type === 'section');
  const hasNoSections = sectionNodes.length === 0;

  if (hasNoSections) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <TopBar
          documentTitle={document?.title || 'Loading...'}
          isSaving={isSaving}
          onTitleChange={updateTitle}
          onExport={exportDocument}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-8">
            <EmptyState onAddFirstSection={() => addNode('section')} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
        <TopBar
          documentTitle={document?.title || 'Loading...'}
          {...(currentNodeTitle && { currentNodeTitle })}
          isSaving={isSaving}
          onTitleChange={updateTitle}
          onExport={exportDocument}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">
          <EditorToolbar 
            key={selectedNode?.id || 'default'}
            currentCounts={currentCounts}
            totalCounts={totalCounts}
            editorRef={editorRef}
            formattingToolbarEnabled={formattingToolbarEnabled}
            onToggleFormattingToolbar={toggleFormattingToolbar}
            {...(selectedNode?.id && { selectedNodeId: selectedNode.id })}
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
          />
          
          <div className="bg-white rounded-lg shadow-sm px-8 py-12">
            <Editor
              ref={editorRef}
              key={selectedNode?.id || 'default'}
              content={content || ''}
              onChange={(blocks) => updateContent(JSON.stringify(blocks))}
              formattingToolbarEnabled={formattingToolbarEnabled}
              zoomLevel={zoomLevel}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

EditorArea.displayName = 'EditorArea';
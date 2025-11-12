import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import TopBar from './components/TopBar';
import EditorToolbar from './components/EditorToolbar';
import BibTeXModal from './components/BibTeXModal';
import ImagePreviewModal from './components/ImagePreviewModal';
import ErrorNotification from './components/ErrorNotification';
import { documentAPI, nodeAPI, contentAPI, uploadAPI } from './services/api';
import { computeWordCount } from './utils/wordCount';

function App() {
  const [document, setDocument] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [content, setContent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [isBibTeXModalOpen, setIsBibTeXModalOpen] = useState(false);
  const [editingReference, setEditingReference] = useState(null);
  const [references, setReferences] = useState([]);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [formattingToolbarEnabled, setFormattingToolbarEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100); // 缩放级别: 80, 90, 100, 110, 120
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const citationNavigationIndex = useRef({});
  
  // Request deduplication: track ongoing requests
  const ongoingRequestsRef = useRef(new Map());
  
  // Helper function to handle errors consistently
  const handleError = useCallback((error, customMessage = null) => {
    // In development, show more detailed error information
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    let message = error?.userMessage || customMessage || error?.message || 'An unexpected error occurred';
    
    // Add more details in development mode
    if (isDevelopment && error?.response?.data?.details) {
      console.error('Error details:', error.response.data.details);
    }
    
    if (isDevelopment && error?.response) {
      console.error('Full error response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    setError(message);
    console.error('Error:', error);
  }, []);
  
  // Helper function for request deduplication
  const deduplicateRequest = useCallback((key, requestFn) => {
    // If request is already in progress, return the existing promise
    if (ongoingRequestsRef.current.has(key)) {
      return ongoingRequestsRef.current.get(key);
    }
    
    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Remove from ongoing requests when done
        ongoingRequestsRef.current.delete(key);
      });
    
    ongoingRequestsRef.current.set(key, promise);
    return promise;
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const response = await documentAPI.list();
        let doc;
        
        if (response.data.length > 0) {
          doc = response.data[0];
        } else {
          const createResponse = await documentAPI.create('New Document');
          doc = createResponse.data;
        }
        
        setDocument(doc);
        await loadNodes(doc.id);
      } catch (error) {
        handleError(error, 'Failed to initialize application');
      }
    };

    initApp();
  }, []);

  const calculateCitationCounts = (sectionContents) => {
    const citationCounts = {};
    
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
  };

  const updateCitationCounts = async () => {
    try {
      const sectionNodes = nodes.filter(n => n.node_type === 'section');
      
      const sectionContents = await Promise.all(
        sectionNodes.map(async (node) => {
          try {
            const contentResponse = await contentAPI.get(node.id);
            return contentResponse.data.content_json;
          } catch (error) {
            console.error(`Error loading content for section ${node.id}:`, error);
            return null;
          }
        })
      );
      
      const citationCounts = calculateCitationCounts(sectionContents);
      
      setReferences(prev => prev.map(ref => ({
        ...ref,
        usageCount: citationCounts[ref.title] || 0
      })));
    } catch (error) {
      console.error('Error updating citation counts:', error);
    }
  };

  const loadNodes = useCallback(async (documentId) => {
    // Use request deduplication to prevent multiple simultaneous loads
    return deduplicateRequest(`loadNodes-${documentId}`, async () => {
      try {
        const response = await nodeAPI.list(documentId);
        setNodes(response.data);
        
        const sectionNodes = response.data.filter(n => n.node_type === 'section');
        
        // Batch load section contents in parallel
        const sectionContents = await Promise.all(
          sectionNodes.map(async (node) => {
            try {
              const contentResponse = await contentAPI.get(node.id);
              return contentResponse.data.content_json;
            } catch (error) {
              console.error(`Error loading content for section ${node.id}:`, error);
              return null;
            }
          })
        );
        
        const citationCounts = calculateCitationCounts(sectionContents);
        
        const referenceNodes = response.data.filter(n => n.node_type === 'reference');
        const referencesWithContent = await Promise.all(
          referenceNodes.map(async (node) => {
            try {
              const contentResponse = await contentAPI.get(node.id);
              const contentData = contentResponse.data.content_json;
              let bibtex = '';
              
              if (contentData) {
                const parsed = typeof contentData === 'string' ? JSON.parse(contentData) : contentData;
                bibtex = parsed.bibtex || '';
              }
              
              return {
                id: node.id,
                title: node.title,
                content: bibtex,
                usageCount: citationCounts[node.title] || 0
              };
            } catch (error) {
              console.error(`Error loading content for reference ${node.id}:`, error);
              return {
                id: node.id,
                title: node.title,
                content: '',
                usageCount: 0
              };
            }
          })
        );
        
        setReferences(referencesWithContent);
        
        if (response.data.length > 0 && !selectedNode) {
          setSelectedNode(response.data[0]);
        }
        
        // 返回加载的节点数据，供调用者使用
        return response.data;
      } catch (error) {
        handleError(error, 'Failed to load nodes');
        return [];
      }
    });
  }, [deduplicateRequest, selectedNode, handleError]);

  useEffect(() => {
    if (selectedNode) {
      // Only load content for sections and references, not for figures
      if (selectedNode.node_type === 'section' || selectedNode.node_type === 'reference') {
        loadContent(selectedNode.id);
      } else {
        setContent(null);
      }
    }
  }, [selectedNode]);

  const loadContent = async (nodeId) => {
    try {
      const response = await contentAPI.get(nodeId);
      setContent(response.data.content_json);
    } catch (error) {
      console.error('Error loading content:', error);
      setContent(null);
    }
  };

  const extractTitleFromContent = (contentJson) => {
    try {
      const blocks = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
      if (!Array.isArray(blocks)) return null;

      for (const block of blocks) {
        if (block.type === 'heading' && block.content) {
          const textContent = block.content
            .map(item => item.type === 'text' ? item.text : '')
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
  };

  const handleContentChange = useCallback((newContent) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(async () => {
      if (selectedNode) {
        setIsSaving(true);
        try {
          // 检查节点是否仍然存在（可能在延迟期间被删除）
          const currentNodes = nodes;
          const nodeStillExists = currentNodes.some(n => n.id === selectedNode.id);
          
          if (!nodeStillExists) {
            console.log('Node was deleted, skipping save');
            setIsSaving(false);
            return;
          }
          
          await contentAPI.save(selectedNode.id, newContent);
          
          if (selectedNode.node_type === 'section') {
            const extractedTitle = extractTitleFromContent(newContent);
            if (extractedTitle && extractedTitle !== selectedNode.title) {
              await nodeAPI.update(selectedNode.id, { title: extractedTitle });
              await loadNodes(document.id);
              setSelectedNode(prev => ({ ...prev, title: extractedTitle }));
            } else {
              await updateCitationCounts();
            }
          }
        } catch (error) {
          // 如果是"Node not found"错误，说明节点在保存前被删除了，这是正常情况，静默处理
          if (error.response?.status === 404 && error.response?.data?.error === 'Node not found') {
            console.log('Node was deleted before save completed, ignoring error');
          } else {
            // 其他错误才显示给用户
            handleError(error, 'Failed to save content');
          }
        } finally {
          setIsSaving(false);
        }
      }
    }, 2000); // Increased from 500ms to 2000ms for better performance

    setSaveTimeout(timeout);
  }, [selectedNode, saveTimeout, document, nodes]);

  const handleAddNode = async (nodeType = 'section') => {
    console.log('Adding node of type:', nodeType);
    if (!document) return;
    
    if (nodeType === 'reference') {
      setEditingReference(null);
      setIsBibTeXModalOpen(true);
      return;
    }
    
    const titleMap = {
      'section': 'New Section',
      'figure': 'New Picture'
    };
    const title = titleMap[nodeType] || 'New Node';
    
    try {
      const response = await nodeAPI.create({
        document_id: document.id,
        title,
        node_type: nodeType,
        indent_level: 0,
        order_index: nodes.length
      });
      
      await loadNodes(document.id);
      setSelectedNode(response.data);
    } catch (error) {
      handleError(error, 'Failed to create node');
    }
  };

  const handleSaveBibTeX = async (bibtexData) => {
    try {
      if (editingReference) {
        await nodeAPI.update(editingReference.id, { title: bibtexData.citationKey });
        await contentAPI.save(editingReference.id, JSON.stringify({ bibtex: bibtexData.bibtex }));
        await loadNodes(document.id);
      } else {
        const response = await nodeAPI.create({
          document_id: document.id,
          title: bibtexData.citationKey,
          node_type: 'reference',
          indent_level: 0,
          order_index: nodes.length
        });
        
        await contentAPI.save(response.data.id, JSON.stringify({ bibtex: bibtexData.bibtex }));
        await loadNodes(document.id);
        // 不自动跳转到新创建的Reference，保持当前选中的Section
      }
    } catch (error) {
      handleError(error, 'Failed to save reference');
    }
  };

  const handleUploadImage = async (file) => {
    if (!document) return;
    
    try {
      // Upload the image file
      const uploadResponse = await uploadAPI.uploadFile(file);
      const imageUrl = uploadResponse.data.url;
      
      // Create a new figure node with the image URL
      await nodeAPI.create({
        document_id: document.id,
        title: file.name,
        node_type: 'figure',
        indent_level: 0,
        order_index: nodes.length,
        image_url: imageUrl
      });
      
      // Reload nodes but keep current selection
      await loadNodes(document.id);
    } catch (error) {
      handleError(error, 'Failed to upload image');
    }
  };

  const handlePreviewImage = (node) => {
    setPreviewImage(node);
    setIsImagePreviewOpen(true);
  };

  const handleEditReference = async (node) => {
    try {
      const response = await contentAPI.get(node.id);
      const contentData = typeof response.data.content_json === 'string' 
        ? JSON.parse(response.data.content_json) 
        : response.data.content_json;
      
      setEditingReference({
        ...node,
        bibtex: contentData?.bibtex || ''
      });
      setIsBibTeXModalOpen(true);
    } catch (error) {
      handleError(error, 'Failed to load reference');
      setEditingReference(node);
      setIsBibTeXModalOpen(true);
    }
  };

  const handleDeleteReference = async (nodeId) => {
    if (!window.confirm('Are you sure you want to delete this reference?')) {
      return;
    }
    
    try {
      // 清除待处理的保存操作，防止删除后尝试保存已删除的节点
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        setSaveTimeout(null);
      }
      
      await nodeAPI.delete(nodeId);
      await loadNodes(document.id);
      
      // 如果删除的是当前选中的节点，清除选中状态和内容
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(null);
        setContent(null);
      }
    } catch (error) {
      handleError(error, 'Failed to delete reference');
    }
  };

  const handleInsertCitation = (citationKey) => {
    if (editorRef.current && selectedNode?.node_type === 'section') {
      editorRef.current.insertCitation(citationKey);
    }
  };

  const handleUpdateBibTeX = async (referenceId, newBibtexContent) => {
    try {
      await contentAPI.save(referenceId, JSON.stringify({ bibtex: newBibtexContent }));
      await loadNodes(document.id);
    } catch (error) {
      console.error('Error updating BibTeX:', error);
    }
  };

  const handleDeleteNode = async (nodeId) => {
    if (!window.confirm('Are you sure you want to delete this section?')) {
      return;
    }
    
    try {
      // 清除待处理的保存操作，防止删除后尝试保存已删除的节点
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        setSaveTimeout(null);
      }
      
      // 如果删除的是当前选中的节点，先清除选中状态和内容
      const isDeletingSelectedNode = selectedNode && selectedNode.id === nodeId;
      if (isDeletingSelectedNode) {
        setSelectedNode(null);
        setContent(null);
      }
      
      await nodeAPI.delete(nodeId);
      const updatedNodes = await loadNodes(document.id);
      
      // 如果删除的是当前选中的节点，尝试选择下一个可用的 section
      if (isDeletingSelectedNode && updatedNodes) {
        const remainingSections = updatedNodes.filter(n => n.node_type === 'section');
        if (remainingSections.length > 0) {
          setSelectedNode(remainingSections[0]);
        }
      }
    } catch (error) {
      handleError(error, 'Failed to delete section');
    }
  };

  const handleReorderNodes = async (reorderedNodes) => {
    try {
      const updates = reorderedNodes.map((node, index) => ({
        id: node.id,
        order_index: index
      }));

      for (const update of updates) {
        await nodeAPI.update(update.id, { order_index: update.order_index });
      }

      await loadNodes(document.id);
    } catch (error) {
      handleError(error, 'Failed to reorder nodes');
    }
  };

  const handleTitleChange = async (newTitle) => {
    if (!document) return;
    
    try {
      await documentAPI.update(document.id, newTitle);
      setDocument({ ...document, title: newTitle });
    } catch (error) {
      handleError(error, 'Failed to update document title');
    }
  };

  const handleExport = () => {
    console.log('Export functionality coming soon');
  };

  // 缓存所有sections的内容和字数
  const [sectionCountsCache, setSectionCountsCache] = useState(new Map());
  const [totalCounts, setTotalCounts] = useState({ display: 0, tooltip: 0 });
  const [currentCounts, setCurrentCounts] = useState({ display: 0, tooltip: 0 });
  const previousCountsRef = useRef({ display: 0, tooltip: 0 });
  
  // 只在nodes变化时重新加载缓存和计算总字数
  useEffect(() => {
    const loadCache = async () => {
      if (nodes.length === 0) {
        setSectionCountsCache(new Map());
        setTotalCounts({ display: 0, tooltip: 0 });
        return;
      }
      
      const sectionNodes = nodes.filter(n => n.node_type === 'section');
      const newCache = new Map();
      
      // 批量并行加载所有section
      const results = await Promise.all(
        sectionNodes.map(async (node) => {
          try {
            const contentResponse = await contentAPI.get(node.id);
            if (contentResponse.data.content_json) {
              return {
                id: node.id,
                counts: computeWordCount(contentResponse.data.content_json)
              };
            }
          } catch (error) {
            console.error(`Error loading section ${node.id}:`, error);
          }
          return null;
        })
      );
      
      // 一次性构建缓存
      let totalDisplay = 0;
      let totalTooltip = 0;
      
      results.forEach((result) => {
        if (result) {
          newCache.set(result.id, result.counts);
          totalDisplay += result.counts.display;
          totalTooltip += result.counts.tooltip;
        }
      });
      
      // 一次性更新状态
      setSectionCountsCache(newCache);
      setTotalCounts({ display: totalDisplay, tooltip: totalTooltip });
    };
    
    loadCache();
  }, [nodes]);
  
  // 当content变化时，使用增量更新总字数
  useEffect(() => {
    if (!selectedNode || selectedNode.node_type !== 'section' || !content) {
      if (!selectedNode || selectedNode.node_type !== 'section') {
        setCurrentCounts({ display: 0, tooltip: 0 });
        previousCountsRef.current = { display: 0, tooltip: 0 };
      }
      return;
    }
    
    const newCounts = computeWordCount(content);
    const oldCounts = previousCountsRef.current;
    
    // 计算增量
    const displayDiff = newCounts.display - oldCounts.display;
    const tooltipDiff = newCounts.tooltip - oldCounts.tooltip;
    
    // 更新当前字数
    setCurrentCounts(newCounts);
    previousCountsRef.current = newCounts;
    
    // 增量更新总字数
    if (displayDiff !== 0 || tooltipDiff !== 0) {
      setTotalCounts(prev => ({
        display: prev.display + displayDiff,
        tooltip: prev.tooltip + tooltipDiff
      }));
      
      // 更新缓存
      setSectionCountsCache(prev => {
        const updated = new Map(prev);
        updated.set(selectedNode.id, newCounts);
        return updated;
      });
    }
  }, [content, selectedNode?.id]);
  
  // 切换section时，从缓存读取字数
  useEffect(() => {
    if (!selectedNode || selectedNode.node_type !== 'section') {
      setCurrentCounts({ display: 0, tooltip: 0 });
      previousCountsRef.current = { display: 0, tooltip: 0 };
      return;
    }
    
    const cached = sectionCountsCache.get(selectedNode.id);
    if (cached) {
      setCurrentCounts(cached);
      previousCountsRef.current = cached;
    } else {
      setCurrentCounts({ display: 0, tooltip: 0 });
      previousCountsRef.current = { display: 0, tooltip: 0 };
    }
  }, [selectedNode?.id]);

  const referenceCounts = references.reduce((acc, ref) => {
    acc[ref.title] = ref.usageCount || 0;
    return acc;
  }, {});

  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.redo();
    }
  };

  const handleNavigateToCitation = (citationKey) => {
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
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <ErrorNotification 
        error={error} 
        onDismiss={() => setError(null)} 
      />
      <BibTeXModal
        isOpen={isBibTeXModalOpen}
        onClose={() => {
          setIsBibTeXModalOpen(false);
          setEditingReference(null);
        }}
        onSave={handleSaveBibTeX}
        initialData={editingReference ? {
          bibtex: editingReference.bibtex,
          citationKey: editingReference.title
        } : null}
      />
      
      <ImagePreviewModal
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        imageUrl={previewImage?.image_url}
        imageTitle={previewImage?.title}
      />
      
      <Sidebar
        nodes={nodes}
        selectedNodeId={selectedNode?.id}
        onNodeSelect={setSelectedNode}
        onAddNode={handleAddNode}
        onDeleteNode={handleDeleteNode}
        onReorderNodes={handleReorderNodes}
        onEditReference={handleEditReference}
        onDeleteReference={handleDeleteReference}
        onInsertCitation={handleInsertCitation}
        canInsertCitation={selectedNode?.node_type === 'section'}
        referenceCounts={referenceCounts}
        onUploadImage={handleUploadImage}
        onNavigateToCitation={handleNavigateToCitation}
        onPreviewImage={handlePreviewImage}
      />
      
      <div className="flex-1 flex flex-col bg-gray-50">
        <TopBar
          documentTitle={document?.title || 'Loading...'}
          currentNodeTitle={selectedNode?.title}
          isSaving={isSaving}
          onTitleChange={handleTitleChange}
          onExport={handleExport}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-8">
            {nodes.filter(n => n.node_type === 'section').length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="text-center text-gray-400 py-20">
                  <p className="text-2xl mb-4">No sections yet</p>
                  <p className="mb-6">Add a section from the Outline to start editing</p>
                  <button
                    onClick={() => handleAddNode('section')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add First Section
                  </button>
                </div>
              </div>
            ) : (
              <>
                <EditorToolbar 
                  key={selectedNode?.id || 'default'}
                  currentCounts={currentCounts}
                  totalCounts={totalCounts}
                  editorRef={editorRef}
                  formattingToolbarEnabled={formattingToolbarEnabled}
                  onToggleFormattingToolbar={() => setFormattingToolbarEnabled(!formattingToolbarEnabled)}
                  selectedNodeId={selectedNode?.id}
                  zoomLevel={zoomLevel}
                  onZoomChange={setZoomLevel}
                />
                <div className="bg-white rounded-lg shadow-sm px-8 py-12">
                  <Editor
                    ref={editorRef}
                    key={selectedNode?.id || 'default'}
                    content={content}
                    onChange={handleContentChange}
                    references={references}
                    formattingToolbarEnabled={formattingToolbarEnabled}
                    zoomLevel={zoomLevel}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

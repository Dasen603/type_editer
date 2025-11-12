import React, { useState, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  FileText, 
  Image, 
  GripVertical, 
  X, 
  Edit2 
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NavigationSidebar } from './NavigationSidebar';
import { 
  useNodes, 
  useReferences, 
  useImageUpload,
  useUI 
} from '../hooks';
import { Node, NodeType } from '../types';

// 可排序的大纲项组件
interface SortableOutlineItemProps {
  node: Node;
  selectedNodeId?: number;
  onNodeSelect: (node: Node) => void;
  onDeleteNode: (nodeId: number) => void;
}

const SortableOutlineItem = React.memo<SortableOutlineItemProps>(({ 
  node, 
  selectedNodeId, 
  onNodeSelect, 
  onDeleteNode 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this section?')) {
      onDeleteNode(node.id);
    }
  }, [node.id, onDeleteNode]);

  const handleNodeClick = useCallback(() => {
    onNodeSelect(node);
  }, [node, onNodeSelect]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center text-sm py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer ${
        selectedNodeId === node.id ? 'ring-2 ring-green-500' : ''
      }`}
      onClick={handleNodeClick}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing mr-1"
      >
        <GripVertical className="w-3 h-3 text-gray-400" />
      </div>
      <FileText className="w-4 h-4 mr-2 text-blue-500" />
      <span className="flex-1 truncate">{node.title}</span>
      <button
        onClick={handleDeleteClick}
        className="opacity-0 group-hover:opacity-100 ml-1 p-1 hover:bg-red-100 rounded transition-opacity"
        title="Delete section"
      >
        <X className="w-3 h-3 text-red-500" />
      </button>
    </div>
  );
});

SortableOutlineItem.displayName = 'SortableOutlineItem';

// 主 Sidebar 组件
export const Sidebar = React.memo(() => {
  const { nodes, selectedNode, selectNode, addNode, deleteNode, reorderNodes } = useNodes();
  const { 
    references, 
    insertCitation, 
    navigateToCitation,
    deleteReference 
  } = useReferences();
  const { handleFileSelect, handleDrop, uploading } = useImageUpload();
  const { openBibTeXModal, openImagePreviewModal } = useUI();
  
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(true);
  const [isReferencesExpanded, setIsReferencesExpanded] = useState(true);
  const [isFiguresExpanded, setIsFiguresExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 处理拖拽结束
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = nodes.findIndex(node => node.id === active.id);
      const newIndex = nodes.findIndex(node => node.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedNodes = arrayMove(nodes, oldIndex, newIndex);
        reorderNodes(reorderedNodes);
      }
    }
  }, [nodes, reorderNodes]);

  // 处理预览图片
  const handlePreviewImage = useCallback((figure: Node) => {
    openImagePreviewModal(figure);
  }, [openImagePreviewModal]);

  // 获取各类型节点
  const sectionNodes = React.useMemo(() => 
    nodes.filter(n => n.node_type === 'section'), [nodes]
  );
  const figureNodes = React.useMemo(() => 
    nodes.filter(n => n.node_type === 'figure'), [nodes]
  );
  const canInsertCitation = selectedNode?.node_type === 'section';

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen">
      <NavigationSidebar />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Outline Section */}
        <div className="bg-gray-50 rounded-lg p-3">
          <button
            onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 mb-3"
          >
            <span>Outline</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addNode('section');
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Add section"
              >
                <Plus className="w-4 h-4" />
              </button>
              {isOutlineExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </button>

          {isOutlineExpanded && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sectionNodes.map(node => node.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {sectionNodes.map((node) => (
                    <SortableOutlineItem
                      key={node.id}
                      node={node}
                      selectedNodeId={selectedNode?.id}
                      onNodeSelect={selectNode}
                      onDeleteNode={deleteNode}
                    />
                  ))}
                  
                  {sectionNodes.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-4">
                      No sections yet
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* References Section */}
        <div className="bg-gray-50 rounded-lg p-3">
          <button
            onClick={() => setIsReferencesExpanded(!isReferencesExpanded)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 mb-3"
          >
            <span>References</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openBibTeXModal();
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Add reference"
              >
                <Plus className="w-4 h-4" />
              </button>
              {isReferencesExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </button>

          {isReferencesExpanded && (
            <div className="space-y-1">
              {references.map((reference) => (
                <div key={reference.id} className="group flex items-center text-sm py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                  <FileText className="w-4 h-4 mr-2 text-purple-500" />
                  <span className="flex-1 truncate">{reference.title}</span>
                  <span className="text-xs text-gray-500 mr-2">({reference.usageCount})</span>
                  
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                    {canInsertCitation && (
                      <button
                        onClick={() => insertCitation(reference.title)}
                        className="p-1 hover:bg-blue-100 rounded text-blue-600"
                        title="Insert citation"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    
                    {reference.usageCount > 0 && (
                      <button
                        onClick={() => navigateToCitation(reference.title)}
                        className="p-1 hover:bg-green-100 rounded text-green-600"
                        title="Navigate to citation"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => deleteReference(reference.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-500"
                      title="Delete reference"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              
              {references.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-4">
                  No references yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Figures Section */}
        <div className="bg-gray-50 rounded-lg p-3">
          <button
            onClick={() => setIsFiguresExpanded(!isFiguresExpanded)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 mb-3"
          >
            <span>Figures</span>
            <div className="flex items-center space-x-1">
              <label className="p-1 hover:bg-gray-200 rounded cursor-pointer" title="Upload image">
                <Plus className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {isFiguresExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </button>

          {isFiguresExpanded && (
            <div 
              className="space-y-1"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {figureNodes.map((figure) => (
                <div key={figure.id} className="group flex items-center text-sm py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                  <Image className="w-4 h-4 mr-2 text-green-500" />
                  <span 
                    className="flex-1 truncate cursor-pointer hover:text-blue-600" 
                    onClick={() => handlePreviewImage(figure)}
                    title="Click to preview"
                  >
                    {figure.title}
                  </span>
                  
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                    <button
                      onClick={() => handlePreviewImage(figure)}
                      className="p-1 hover:bg-blue-100 rounded text-blue-600"
                      title="Preview image"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    
                    <button
                      onClick={() => deleteNode(figure.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-500"
                      title="Delete image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              
              {figureNodes.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-4">
                  No figures yet
                  <br />
                  <span className="text-xs">Drag & drop images here</span>
                </div>
              )}
              
              {uploading && (
                <div className="text-xs text-blue-500 text-center py-2">
                  Uploading...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
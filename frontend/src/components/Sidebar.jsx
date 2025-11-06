import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, FileText, Image, GripVertical, X, Edit2 } from 'lucide-react';
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

const SortableOutlineItem = ({ node, selectedNodeId, onNodeSelect, onDeleteNode }) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center text-sm py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer ${
        selectedNodeId === node.id ? 'ring-2 ring-green-500' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing mr-1"
      >
        <GripVertical className="w-3 h-3 text-gray-400" />
      </div>
      <div
        onClick={() => onNodeSelect(node)}
        className="flex-1 truncate"
        style={{ paddingLeft: `${node.indent_level * 12}px` }}
      >
        {node.title}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteNode(node.id);
        }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 ml-1"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

const Sidebar = ({ nodes, onNodeSelect, selectedNodeId, onAddNode, onDeleteNode, onReorderNodes, onEditReference, onDeleteReference, onInsertCitation, canInsertCitation, referenceCounts, onUploadImage, onPreviewImage, onNavigateToCitation }) => {
  // 在 citation key 中自动添加空格（在数字和字母之间、大小写变化处）
  const formatCitationKey = (key) => {
    return key
      // 在小写字母后跟大写字母的位置加空格 (camelCase)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // 在字母后跟数字的位置加空格
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      // 在数字后跟字母的位置加空格
      .replace(/(\d)([a-zA-Z])/g, '$1 $2');
  };

  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      await onUploadImage(file);
      e.target.value = ''; // Reset input
    }
  };

  const [expandedSections, setExpandedSections] = useState({
    outline: true,
    references: true,
    pictures: true,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const outlineNodes = nodes.filter(n => n.node_type === 'section');
  const referenceNodes = nodes.filter(n => n.node_type === 'reference');
  const pictureNodes = nodes.filter(n => n.node_type === 'figure');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = outlineNodes.findIndex(n => n.id === active.id);
      const newIndex = outlineNodes.findIndex(n => n.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedNodes = arrayMove(outlineNodes, oldIndex, newIndex);
        onReorderNodes(reorderedNodes);
      }
    }
  };

  return (
    <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full select-none">
      {/* Logo and Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="mb-4">
          <img src="/logo.png" alt="Type" className="w-8 h-8 rounded" />
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Library Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold mb-4 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          Library
        </h2>

        {/* Outline Section */}
        <div className="mb-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 rounded p-1"
            onClick={() => toggleSection('outline')}
          >
            <div className="flex items-center text-sm font-medium text-gray-700">
              {expandedSections.outline ? (
                <ChevronDown className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              Outline
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddNode('section');
              }}
              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {expandedSections.outline && (
            <div className="ml-4 mt-2 space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={outlineNodes.map(n => n.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {outlineNodes.map((node) => (
                    <SortableOutlineItem
                      key={node.id}
                      node={node}
                      selectedNodeId={selectedNodeId}
                      onNodeSelect={onNodeSelect}
                      onDeleteNode={onDeleteNode}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {outlineNodes.length === 0 && (
                <div className="text-xs text-gray-400 italic px-2">
                  No sections yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* References Section */}
        <div className="mb-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 rounded p-1"
            onClick={() => toggleSection('references')}
          >
            <div className="flex items-center text-sm font-medium text-gray-700">
              {expandedSections.references ? (
                <ChevronDown className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              References
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddNode('reference');
              }}
              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {expandedSections.references && (
            <div className="ml-4 mt-2 space-y-2">
              {referenceNodes.map((node) => (
                <div
                  key={node.id}
                  draggable={canInsertCitation}
                  onDragStart={(e) => {
                    if (canInsertCitation) {
                      e.dataTransfer.setData('citationKey', node.title);
                      e.dataTransfer.effectAllowed = 'copy';
                    }
                  }}
                  className={`group flex items-center text-sm py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 ${
                    selectedNodeId === node.id ? 'ring-2 ring-green-500' : ''
                  } ${canInsertCitation ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div
                      onClick={() => {
                        if (canInsertCitation) {
                          onInsertCitation(node.title);
                        } else {
                          onNodeSelect(node);
                        }
                      }}
                      className="flex-1 cursor-pointer truncate"
                      title={canInsertCitation ? 'Click to insert citation or drag to editor' : 'Click to view'}
                    >
                      [{formatCitationKey(node.title)}]
                    </div>
                    {canInsertCitation && (referenceCounts?.[node.title] || 0) > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToCitation?.(node.title);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-1 py-0.5 rounded hover:bg-gray-300 transition-colors shrink-0"
                        title={`${referenceCounts?.[node.title]} citation${referenceCounts?.[node.title] > 1 ? 's' : ''} in document - click to navigate`}
                      >
                        {referenceCounts?.[node.title]}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 shrink-0">
                        {referenceCounts?.[node.title] || 0}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditReference(node);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit reference"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReference(node.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete reference"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {referenceNodes.length === 0 && (
                <div className="text-xs text-gray-400 italic px-2">
                  No references yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pictures Section */}
        <div className="mb-4">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 rounded p-1"
            onClick={() => toggleSection('pictures')}
          >
            <div className="flex items-center text-sm font-medium text-gray-700">
              {expandedSections.pictures ? (
                <ChevronDown className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              Pictures
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
              title="Upload image"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {expandedSections.pictures && (
            <div className="ml-4 mt-2">
              <div className="grid grid-cols-2 gap-2">
                {pictureNodes.map((node) => (
                  <div
                    key={node.id}
                    draggable={!!node.image_url}
                    onDragStart={(e) => {
                      if (node.image_url) {
                        console.log('Starting drag with:', node.image_url, node.title);
                        e.dataTransfer.setData('imageUrl', node.image_url);
                        e.dataTransfer.setData('imageTitle', node.title);
                        e.dataTransfer.effectAllowed = 'copy';
                        // 清除任何已选中的文本
                        window.getSelection()?.removeAllRanges();
                      }
                    }}
                    className={`group relative aspect-square bg-gray-200 rounded border-2 overflow-hidden select-none cursor-grab active:cursor-grabbing ${
                      selectedNodeId === node.id
                        ? 'border-blue-500'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    title="Drag to insert into editor"
                  >
                    {node.image_url ? (
                      <div 
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url(${node.image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode(node.id);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white rounded p-1 shadow-sm text-gray-400 hover:text-red-600"
                      title="Delete picture"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {pictureNodes.length === 0 && (
                <div className="text-xs text-gray-400 italic px-2 mt-2">
                  No pictures yet
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

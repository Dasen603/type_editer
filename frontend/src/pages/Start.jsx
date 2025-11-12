import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Zap, 
  Upload, 
  Settings, 
  FileText, 
  Building2, 
  BookOpen, 
  MoreVertical,
  X,
  Edit,
  Trash2,
  Star,
  StarOff,
  Download
} from 'lucide-react';
import UploadTemplateModal from '../components/UploadTemplateModal';
import EditTemplateModal from '../components/EditTemplateModal';
import { 
  getAllTemplates, 
  getDefaultTemplates,
  saveCustomTemplate, 
  deleteCustomTemplate, 
  setDefaultTemplate,
  getDefaultTemplateId,
  generateTemplateId,
  saveTemplateFile,
  storeTemplateFile,
  downloadTemplateFile,
  getTemplateFile
} from '../utils/templateManager';

const Start = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(() => getAllTemplates());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 刷新模板列表
  const refreshTemplates = useCallback(() => {
    setTemplates(getAllTemplates());
  }, []);

  // 监听模板变化（当管理模态框关闭时刷新）
  useEffect(() => {
    if (!isManageModalOpen && !isEditModalOpen && !isUploadModalOpen) {
      refreshTemplates();
    }
  }, [isManageModalOpen, isEditModalOpen, isUploadModalOpen, refreshTemplates]);

  // 过滤模板
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  // 获取默认模板
  const defaultTemplate = useMemo(() => {
    const defaultId = getDefaultTemplateId();
    return templates.find(t => t.id === defaultId) || templates.find(t => t.isDefault) || templates[0];
  }, [templates]);

  // 快速开始
  const handleQuickStart = () => {
    const templateId = defaultTemplate?.id;
    if (templateId) {
      navigate(`/editor/new?template=${templateId}`);
    } else {
      navigate('/editor/new');
    }
  };

  // 选择模板
  const handleSelectTemplate = (templateId) => {
    navigate(`/editor/new?template=${templateId}`);
  };

  // 分类列表
  const categories = ['all', 'conference', 'journal', 'university', 'custom'];

  // 获取分类显示名称
  const getCategoryLabel = (category) => {
    const labels = {
      all: 'All',
      conference: 'Conference',
      journal: 'Journal',
      university: 'University',
      custom: 'Custom'
    };
    return labels[category] || category;
  };

  // 获取分类图标
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'university':
        return Building2;
      case 'journal':
        return BookOpen;
      default:
        return FileText;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* 快速开始区域 */}
      <div 
        className="relative px-8 overflow-hidden flex items-center"
        style={{
          background: 'linear-gradient(135deg, #2d5016 0%, #4a7c1f 50%, #6b9d2c 100%)',
          minHeight: '140px'
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-12 w-20 h-20 bg-yellow-200/40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-4 left-12 w-24 h-24 bg-green-400/30 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto w-full flex items-center justify-between py-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Start Writing</h1>
            <p className="text-green-100 text-sm max-w-2xl">
              Choose a template or start with the default template
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleQuickStart}
              className="flex items-center gap-2 px-6 py-3 bg-white text-green-700 rounded-lg hover:bg-green-50 transition-colors font-semibold shadow-lg text-sm"
            >
              <Zap className="w-5 h-5" />
              Quick Start
            </button>
            
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-green-600/20 text-white border-2 border-white/30 rounded-lg hover:bg-green-600/30 transition-colors font-medium text-sm"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* 搜索框 */}
            <div className="flex-1 relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            {/* 分类筛选 */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    selectedCategory === category
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getCategoryLabel(category)}
                </button>
              ))}
            </div>
            
            {/* 管理模板按钮 */}
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
              Manage Templates
            </button>
          </div>
        </div>
      </div>

      {/* 模板网格 */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {filteredTemplates.length > 0 ? (
            <div 
              style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '12px',
                columnGap: '12px', 
                rowGap: '12px'
              }}
            >
              {filteredTemplates.map(template => {
                const CategoryIcon = getCategoryIcon(template.category);
                return (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    CategoryIcon={CategoryIcon}
                    onSelect={() => handleSelectTemplate(template.id)}
                    onEdit={(template) => {
                      setEditingTemplate(template);
                      setIsEditModalOpen(true);
                    }}
                    onDelete={(template) => {
                      if (window.confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
                        deleteCustomTemplate(template.id);
                        refreshTemplates();
                      }
                    }}
                    onRefresh={refreshTemplates}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl mb-2">No templates found</p>
              <p className="mb-6">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 上传模板模态框 */}
      <UploadTemplateModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={async (templateData) => {
          try {
            const templateId = generateTemplateId();
            const fileData = await saveTemplateFile(templateData.file);
            
            const newTemplate = {
              id: templateId,
              name: templateData.name,
              description: templateData.description || '',
              category: templateData.category,
              isDefault: false,
              isCustom: true
            };
            
            const saved = saveCustomTemplate(newTemplate);
            if (!saved) {
              throw new Error('Failed to save template information');
            }
            
            const fileStored = storeTemplateFile(templateId, fileData);
            if (!fileStored) {
              // 如果文件存储失败，删除已保存的模板信息
              deleteCustomTemplate(templateId);
              throw new Error('Failed to store template file');
            }
            
            refreshTemplates();
            setIsUploadModalOpen(false);
          } catch (error) {
            console.error('Error uploading template:', error);
            throw error; // 重新抛出错误，让 UploadTemplateModal 处理
          }
        }}
      />

      {/* 编辑模板模态框 */}
      <EditTemplateModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSave={(updatedTemplate) => {
          saveCustomTemplate(updatedTemplate);
          refreshTemplates();
          setIsEditModalOpen(false);
          setEditingTemplate(null);
        }}
      />

      {/* 管理模板模态框 */}
      <ManageTemplatesModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        templates={templates}
        onRefresh={refreshTemplates}
        onEdit={(template) => {
          setEditingTemplate(template);
          setIsEditModalOpen(true);
        }}
      />
    </div>
  );
};

// 模板卡片组件
const TemplateCard = ({ template, CategoryIcon, onSelect, onEdit, onDelete, onRefresh }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div 
      className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
      style={{ 
        width: '180px',
        height: '280px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 预览区域 */}
      <div 
        className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center relative cursor-pointer"
        onClick={onSelect}
      >
        <CategoryIcon className="w-16 h-16 text-gray-300" />
      </div>
      
      {/* 信息区域 */}
      <div className="p-3 flex-1 flex flex-col cursor-pointer min-h-0" onClick={onSelect}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-sm flex-1 line-clamp-2 leading-tight">{template.name}</h3>
        </div>
        <p 
          className="text-xs text-gray-600 mb-2 line-clamp-3 leading-relaxed cursor-help"
          title={template.description}
        >
          {template.description}
        </p>
        <div className="flex items-center gap-2 mt-auto">
          <span className={`text-xs px-2 py-1 rounded capitalize ${
            template.category === 'conference' ? 'bg-blue-100 text-blue-700' :
            template.category === 'journal' ? 'bg-purple-100 text-purple-700' :
            template.category === 'university' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {template.category}
          </span>
        </div>
      </div>
      
      {/* 操作区域 */}
      <div className="px-3 pb-3 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
        >
          Use Template
        </button>
        
        {template.isCustom && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px]" style={{ zIndex: 2100 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    if (onEdit) {
                      onEdit(template);
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    if (onDelete) {
                      onDelete(template);
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 管理模板模态框组件
const ManageTemplatesModal = ({ isOpen, onClose, templates, onRefresh, onEdit }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const defaultTemplateId = getDefaultTemplateId();

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setSearchQuery('');
      setSelectedCategory('all');
    }, 200);
  };

  const handleDelete = (template) => {
    if (!template.isCustom) {
      alert('Cannot delete default templates.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.\n\nThis will delete both the template information and the uploaded file.`)) {
      const success = deleteCustomTemplate(template.id);
      if (success) {
        onRefresh();
      } else {
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  const handleDownload = (template) => {
    if (template.isCustom) {
      const success = downloadTemplateFile(template.id, template.name);
      if (!success) {
        alert('Failed to download template file. The file may not exist.');
      }
    } else {
      alert('Default templates cannot be downloaded. Please use the template directly.');
    }
  };

  const handleSetDefault = (template) => {
    setDefaultTemplate(template.id);
    onRefresh();
  };

  const handleRemoveDefault = () => {
    setDefaultTemplate('basic-article');
    onRefresh();
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  const categories = ['all', 'conference', 'journal', 'university', 'custom'];

  const getCategoryLabel = (category) => {
    const labels = {
      all: 'All',
      conference: 'Conference',
      journal: 'Journal',
      university: 'University',
      custom: 'Custom'
    };
    return labels[category] || category;
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 3000 }}>
      <div 
        className={`relative bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col pointer-events-auto ${isClosing ? 'animate-scaleOut' : 'animate-scaleIn'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Manage Templates</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-colors capitalize ${
                    selectedCategory === category
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {getCategoryLabel(category)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 模板列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTemplates.length > 0 ? (
            <div className="space-y-2">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                      {template.id === defaultTemplateId && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <Star className="w-3 h-3 fill-current" />
                          Default
                        </span>
                      )}
                      {!template.isCustom && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          Built-in
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{template.description}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded capitalize ${
                        template.category === 'conference' ? 'bg-blue-100 text-blue-700' :
                        template.category === 'journal' ? 'bg-purple-100 text-purple-700' :
                        template.category === 'university' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {template.category}
                      </span>
                      {template.isCustom && getTemplateFile(template.id) && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          File Available
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {template.id !== defaultTemplateId && (
                      <button
                        onClick={() => handleSetDefault(template)}
                        className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    {template.id === defaultTemplateId && (
                      <button
                        onClick={handleRemoveDefault}
                        className="p-2 text-yellow-500 hover:text-gray-400 transition-colors"
                        title="Remove default"
                      >
                        <StarOff className="w-4 h-4" />
                      </button>
                    )}
                    {template.isCustom && (
                      <>
                        <button
                          onClick={() => handleDownload(template)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Download template file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(template)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit template"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No templates found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Total: {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}</span>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Start;


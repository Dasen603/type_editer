import React, { useState } from 'react';
import {
  ChevronRight,
  Undo2,
  Redo2,
  Check,
  Download,
  Square,
  Minus,
  X,
  ChevronDown,
} from 'lucide-react';

const TopBar = ({ 
  documentTitle, 
  currentNodeTitle, 
  onExport,
  isSaving,
  onUndo,
  onRedo,
  onTitleChange
}) => {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('ieee');

  const templates = [
    { id: 'ieee', name: 'IEEE Conference' },
    { id: 'acm', name: 'ACM Article' },
    { id: 'springer', name: 'Springer LNCS' },
    { id: 'article', name: 'Basic Article' },
    { id: 'report', name: 'Technical Report' }
  ];

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    setShowTemplateMenu(false);
    if (onExport) {
      onExport(templateId);
    }
  };

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 select-none">
      {/* Left: Document Path with Save Indicator */}
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-gray-600 font-medium">{documentTitle}</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span 
          className="font-medium text-gray-800 max-w-xs truncate" 
          title={currentNodeTitle || 'Body'}
        >
          {currentNodeTitle || 'Body'}
        </span>
        <div className="flex items-center justify-center ml-2">
          <div className={`flex items-center justify-center w-4 h-4 rounded-full transition-all duration-300 ${
            isSaving ? 'bg-yellow-500' : 'bg-green-600'
          }`}>
            {isSaving ? (
              <div className="flex items-center justify-center gap-0.5 animate-fade-in-scale">
                <span className="w-0.5 h-0.5 bg-white rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }}></span>
                <span className="w-0.5 h-0.5 bg-white rounded-full animate-pulse-dot" style={{ animationDelay: '150ms' }}></span>
                <span className="w-0.5 h-0.5 bg-white rounded-full animate-pulse-dot" style={{ animationDelay: '300ms' }}></span>
              </div>
            ) : (
              <Check className="w-2.5 h-2.5 text-white animate-fade-in-scale" strokeWidth={3} />
            )}
          </div>
        </div>
      </div>

      {/* Center: Actions */}
      <div className="flex items-center space-x-1">
        <button 
          onClick={onUndo}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="撤回 (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4 text-gray-600" />
        </button>
        <button 
          onClick={onRedo}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="重做 (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Right: Export and Window Controls */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <button
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">
              {templates.find(t => t.id === selectedTemplate)?.name || 'Template'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </button>

          {showTemplateMenu && (
            <>
              <div 
                className="fixed inset-0" 
                style={{ zIndex: 99998 }}
                onClick={() => setShowTemplateMenu(false)}
              ></div>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-48" style={{ zIndex: 99999 }}>
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                      selectedTemplate === template.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span>{template.name}</span>
                    {selectedTemplate === template.id && <span className="text-blue-700">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center ml-2">
          <button className="p-2 hover:bg-gray-100 rounded transition-colors">
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded transition-colors">
            <Square className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;

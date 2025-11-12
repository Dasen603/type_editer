import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  Undo2,
  Redo2,
  Check,
  Download,
} from 'lucide-react';

interface TopBarProps {
  documentTitle: string;
  currentNodeTitle?: string;
  onExport?: () => void;
  isSaving?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onTitleChange?: (newTitle: string) => void;
  onBackToDocs?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  documentTitle, 
  currentNodeTitle, 
  onExport,
  isSaving,
  onUndo,
  onRedo,
  onTitleChange,
  onBackToDocs
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(documentTitle);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditedTitle(documentTitle);
  }, [documentTitle]);

  // 当进入编辑模式时，选中所有文本
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleTitleClick = () => {
    // 清除之前的定时器
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    // 延迟执行单击操作，等待可能的双击
    clickTimerRef.current = setTimeout(() => {
      // 单击：返回文档列表
      if (onBackToDocs) {
        onBackToDocs();
      }
    }, 300); // 300ms延迟，等待双击事件
  };

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // 清除单击定时器
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    // 双击：编辑文档名称
    setIsEditingTitle(true);
  };

  const handleSave = () => {
    if (editedTitle.trim() && editedTitle !== documentTitle && onTitleChange) {
      onTitleChange(editedTitle.trim());
    } else {
      setEditedTitle(documentTitle);
    }
    setIsEditingTitle(false);
  };

  const handleCancel = () => {
    setEditedTitle(documentTitle);
    setIsEditingTitle(false);
  };

  const handleTitleBlur = () => {
    handleSave();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 select-none">
      {/* Left: Document Path with Save Indicator */}
      <div className="flex items-center space-x-2 text-sm">
        {isEditingTitle ? (
          <input
            ref={inputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="text-gray-800 font-medium bg-blue-50 border border-blue-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px] max-w-[300px] text-sm shadow-sm transition-all duration-200"
            autoFocus
            placeholder="Document name"
          />
        ) : (
          <span 
            className="text-gray-600 font-medium cursor-pointer hover:text-gray-800 transition-colors px-2 py-1 rounded hover:bg-gray-100" 
            onClick={handleTitleClick}
            onDoubleClick={handleTitleDoubleClick}
            title="Click to go back to Docs, Double-click to edit document name"
          >
            {documentTitle}
          </span>
        )}
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
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4 text-gray-600" />
        </button>
        <button 
          onClick={onRedo}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Right: Export */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onExport}
          className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          title="Export document"
        >
          <Download className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Export</span>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
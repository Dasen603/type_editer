import React, { useState, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline,
  List,
  ListOrdered,
  Link,
  Search,
  MoreHorizontal,
  Maximize2,
  ZoomIn,
  ZoomOut,
  WandSparkles
} from 'lucide-react';

const EditorToolbar = ({ currentCounts, totalCounts, editorRef, formattingToolbarEnabled, onToggleFormattingToolbar, selectedNodeId, zoomLevel, onZoomChange }) => {
  const [activeStyles, setActiveStyles] = useState({ bold: false, italic: false, underline: false });
  const [currentBlock, setCurrentBlock] = useState({ type: null, level: null });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPosition, setLinkPosition] = useState({ top: 0, left: 0 });
  const [linkError, setLinkError] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  // 监听鼠标和键盘事件来更新按钮状态
  useEffect(() => {
    const updateStates = () => {
      // 只有在用户与编辑器交互后才更新状态
      if (!hasInteracted) return;
      
      if (editorRef?.current?.getActiveStyles) {
        const styles = editorRef.current.getActiveStyles();
        setActiveStyles(styles);
      }
      if (editorRef?.current?.getCurrentBlockType) {
        const blockType = editorRef.current.getCurrentBlockType();
        setCurrentBlock(blockType);
      }
    };

    // 监听鼠标和键盘事件
    const handleMouseDown = (e) => {
      // 检查是否点击在编辑器区域
      const editorContainer = document.querySelector('.bn-container');
      if (editorContainer && editorContainer.contains(e.target)) {
        setHasInteracted(true);
      }
    };

    const handleKeyDown = (e) => {
      // 检查焦点是否在编辑器内
      const editorContainer = document.querySelector('.bn-container');
      if (editorContainer && editorContainer.contains(document.activeElement)) {
        setHasInteracted(true);
      }
    };

    const handleUpdate = () => {
      setTimeout(updateStates, 10);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mouseup', handleUpdate);
    document.addEventListener('keyup', handleUpdate);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseup', handleUpdate);
      document.removeEventListener('keyup', handleUpdate);
    };
  }, [editorRef, hasInteracted]);

  const handleHeading = (level) => {
    if (editorRef?.current?.setHeading) {
      editorRef.current.setHeading(level);
    }
  };

  const handleBold = () => {
    if (editorRef?.current?.toggleBold) {
      editorRef.current.toggleBold();
    }
  };

  const handleItalic = () => {
    if (editorRef?.current?.toggleItalic) {
      editorRef.current.toggleItalic();
    }
  };

  const handleUnderline = () => {
    if (editorRef?.current?.toggleUnderline) {
      editorRef.current.toggleUnderline();
    }
  };

  const handleBulletList = () => {
    if (editorRef?.current?.toggleBulletList) {
      editorRef.current.toggleBulletList();
    }
  };

  const handleNumberedList = () => {
    if (editorRef?.current?.toggleNumberedList) {
      editorRef.current.toggleNumberedList();
    }
  };

  const handleLinkClick = () => {
    if (editorRef?.current?.openLinkEditor) {
      const result = editorRef.current.openLinkEditor();
      if (result) {
        // 获取选区的位置
        const coords = editorRef.current.getSelectionCoords();
        if (coords) {
          setLinkPosition({
            top: coords.top - 60, // 在选中文字上方60px
            left: coords.left
          });
          setLinkUrl('');
          setSelectedText(result.selectedText || '');
          setShowLinkInput(true);
        }
      }
    }
  };

  const handleLinkSubmit = (e) => {
    e.preventDefault();
    
    // 验证URL格式
    if (!linkUrl.trim()) {
      setLinkError('Please enter a URL');
      return;
    }
    
    // 如果URL不以http://或https://开头，自动添加https://
    let finalUrl = linkUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    
    // 使用URL构造函数验证URL格式
    try {
      new URL(finalUrl);
    } catch (error) {
      setLinkError('Please enter a valid URL (e.g., www.example.com)');
      return;
    }
    
    if (editorRef?.current?.insertLink) {
      editorRef.current.insertLink(finalUrl);
      setShowLinkInput(false);
      setLinkUrl('');
      setLinkError('');
      setSelectedText('');
    }
  };

  const handleLinkCancel = () => {
    // 取消时也要移除临时高亮
    if (editorRef?.current?.clearLinkHighlight) {
      editorRef.current.clearLinkHighlight();
    }
    setShowLinkInput(false);
    setLinkUrl('');
    setLinkError('');
    setSelectedText('');
  };

  const handleLinkInputChange = (e) => {
    setLinkUrl(e.target.value);
    // 清除错误提示
    if (linkError) {
      setLinkError('');
    }
  };

  return (
    <>
      {showLinkInput && (
        <div 
          className="fixed z-50"
          style={{
            top: `${linkPosition.top}px`,
            left: `${linkPosition.left}px`,
          }}
        >
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 animate-scaleIn">
            {/* 小箭头指向选中文字 */}
            <div className="absolute left-4 -bottom-2 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
            
            <form onSubmit={handleLinkSubmit} noValidate className="p-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center flex-1 bg-gray-50 rounded-md border transition-all ${
                    linkError 
                      ? 'border-red-300 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100' 
                      : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
                  }`}>
                    <span className={`pl-3 pr-2 ${linkError ? 'text-red-400' : 'text-gray-400'}`}>
                      <Link className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={handleLinkInputChange}
                      placeholder="Paste link here..."
                      className="flex-1 px-2 py-2 bg-transparent text-sm focus:outline-none w-64"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Insert
                  </button>
                  <button
                    type="button"
                    onClick={handleLinkCancel}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
                {linkError && (
                  <div className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-md border border-red-200">
                    {linkError}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="sticky top-0 flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm mb-4 select-none" style={{ zIndex: 9999 }}>
      {/* Left: Formatting Tools */}
      <div className="flex items-center space-x-0.5">
        <button 
          onClick={() => handleHeading(1)}
          className={`px-2.5 py-1 text-sm font-medium rounded transition-colors ${
            currentBlock.type === 'heading' && currentBlock.level === 1
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          H1
        </button>
        <button 
          onClick={() => handleHeading(2)}
          className={`px-2.5 py-1 text-sm font-medium rounded transition-colors ${
            currentBlock.type === 'heading' && currentBlock.level === 2
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          H2
        </button>
        <button 
          onClick={() => handleHeading(3)}
          className={`px-2.5 py-1 text-sm font-medium rounded transition-colors ${
            currentBlock.type === 'heading' && currentBlock.level === 3
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          H3
        </button>
        
        <div className="w-px h-5 bg-gray-300 mx-1.5"></div>
        
        <button 
          onClick={handleBold}
          className={`p-1.5 rounded transition-colors ${
            activeStyles.bold 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button 
          onClick={handleItalic}
          className={`p-1.5 rounded transition-colors ${
            activeStyles.italic 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button 
          onClick={handleUnderline}
          className={`p-1.5 rounded transition-colors ${
            activeStyles.underline 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        
        <div className="w-px h-5 bg-gray-300 mx-1.5"></div>
        
        <button 
          onClick={handleBulletList}
          className={`p-1.5 rounded transition-colors ${
            currentBlock.type === 'bulletListItem'
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button 
          onClick={handleNumberedList}
          className={`p-1.5 rounded transition-colors ${
            currentBlock.type === 'numberedListItem'
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        
        <div className="w-px h-5 bg-gray-300 mx-1.5"></div>
        
        <button 
          onClick={handleLinkClick}
          className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors" 
          title="Link"
        >
          <Link className="w-4 h-4" />
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors" 
            title="More"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {showMoreMenu && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setShowMoreMenu(false)}
              ></div>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 min-w-48 animate-scaleIn">
                <button
                  onClick={() => {
                    onToggleFormattingToolbar();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
                >
                  <WandSparkles className="w-4 h-4" />
                  <span>{formattingToolbarEnabled ? 'Hide Floating Toolbar' : 'Show Floating Toolbar'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Stats and Tools */}
      <div className="flex items-center space-x-3">
        <span className="text-sm text-gray-600 font-medium">
          {currentCounts?.display || 0} / {totalCounts?.display || 0} words
        </span>
        
        <div className="w-px h-5 bg-gray-300"></div>
        
        <div className="relative">
          <button
            onClick={() => setShowZoomMenu(!showZoomMenu)}
            className="px-2.5 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Adjust zoom level"
          >
            {zoomLevel}%
          </button>
          
          {showZoomMenu && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setShowZoomMenu(false)}
              ></div>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 min-w-32 animate-scaleIn">
                {[70, 80, 90, 100, 110, 120, 130, 140, 150].map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      onZoomChange(level);
                      setShowZoomMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                      zoomLevel === level ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span>{level}%</span>
                    {zoomLevel === level && <span className="text-blue-700">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default EditorToolbar;

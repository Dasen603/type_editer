import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useUI, useReferences } from '../hooks';

export function BibTeXModal() {
  const { isBibTeXModalOpen, closeBibTeXModal } = useUI();
  const { addReference, updateReference } = useReferences();
  
  const [bibtex, setBibtex] = useState('');
  const [citationKey, setCitationKey] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [editingReference, setEditingReference] = useState<any>(null);

  // 重置表单
  const resetForm = () => {
    setBibtex('');
    setCitationKey('');
    setEditingReference(null);
  };

  // 当模态框打开/关闭时重置表单
  useEffect(() => {
    if (!isBibTeXModalOpen) {
      resetForm();
    }
  }, [isBibTeXModalOpen]);

  // 从BibTeX文本中提取引用键
  const extractCitationKey = (bibtexText: string): string => {
    const match = bibtexText.match(/@\\w+\\{([^,]+),/);
    return match ? match[1].trim() : '';
  };

  // 格式化引用键
  const formatCitationKey = (key: string): string => {
    if (!key) return '';
    
    const hasUnderscore = key.includes('_');
    const hasDash = key.includes('-');
    // const hasDigits = /\\d/.test(key);
    const hasUpperCase = /[A-Z]/.test(key);
    const hasLowerCase = /[a-z]/.test(key);
    
    // 如果包含下划线或连字符，保持原样
    if (hasUnderscore || hasDash) {
      return key;
    }
    
    // 如果已经是驼峰命名，保持原样
    if (hasUpperCase && hasLowerCase) {
      return key;
    }
    
    // 如果全是小写，尝试智能转换为驼峰命名
    if (hasLowerCase && !hasUpperCase) {
      const parts = key.match(/^([a-z]+)(\\d{4})([a-z]*)$/i);
      if (parts) {
        const [, author, year, keyword] = parts;
        const formattedAuthor = author.charAt(0).toUpperCase() + author.slice(1).toLowerCase();
        const formattedKeyword = keyword ? keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase() : '';
        return `${formattedAuthor}${year}${formattedKeyword}`;
      }
      
      // 简单首字母大写
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    
    return key;
  };

  // 处理BibTeX变化
  const handleBibtexChange = (value: string) => {
    setBibtex(value);
    
    // 自动提取和格式化引用键
    const extractedKey = extractCitationKey(value);
    if (extractedKey) {
      const formattedKey = formatCitationKey(extractedKey);
      setCitationKey(formattedKey);
    }
  };

  // 处理保存
  const handleSave = async () => {
    if (!bibtex.trim() || !citationKey.trim()) {
      alert('Please fill in both BibTeX content and citation key.');
      return;
    }

    try {
      const data = {
        bibtex: bibtex.trim(),
        citationKey: citationKey.trim(),
      };

      if (editingReference) {
        await updateReference(editingReference.id, data);
      } else {
        await addReference(data);
      }

      handleClose();
    } catch (error) {
      console.error('Failed to save reference:', error);
    }
  };

  // 处理关闭
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeBibTeXModal();
      setIsClosing(false);
    }, 150);
  };

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  if (!isBibTeXModalOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-150 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 transition-transform duration-150 ${
          isClosing ? 'scale-95' : 'scale-100'
        }`}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingReference ? 'Edit Reference' : 'Add Reference'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Citation Key Input */}
          <div>
            <label htmlFor="citationKey" className="block text-sm font-medium mb-2">
              Citation Key
            </label>
            <input
              id="citationKey"
              type="text"
              value={citationKey}
              onChange={(e) => setCitationKey(e.target.value)}
              placeholder="e.g., Smith2023Deep"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be used as the citation key in your document
            </p>
          </div>

          {/* BibTeX Input */}
          <div>
            <label htmlFor="bibtex" className="block text-sm font-medium mb-2">
              BibTeX Entry
            </label>
            <textarea
              id="bibtex"
              value={bibtex}
              onChange={(e) => handleBibtexChange(e.target.value)}
              placeholder={`@article{Smith2023Deep,
  title={Deep Learning for Document Analysis},
  author={Smith, John and Doe, Jane},
  journal={Journal of AI Research},
  volume={45},
  number={2},
  pages={123--145},
  year={2023},
  publisher={AI Press}
}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows={12}
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste your BibTeX entry here. The citation key will be automatically extracted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!bibtex.trim() || !citationKey.trim()}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingReference ? 'Update' : 'Add'} Reference
          </button>
        </div>
      </div>
    </div>
  );
}
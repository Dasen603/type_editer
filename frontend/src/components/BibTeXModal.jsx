import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BibTeXModal = ({ isOpen, onClose, onSave, initialData = null }) => {
  const [bibtex, setBibtex] = useState('');
  const [citationKey, setCitationKey] = useState('');

  useEffect(() => {
    if (initialData) {
      setBibtex(initialData.bibtex || '');
      setCitationKey(initialData.citationKey || '');
    } else {
      setBibtex('');
      setCitationKey('');
    }
  }, [initialData, isOpen]);

  const extractCitationKey = (bibtexText) => {
    const match = bibtexText.match(/@\w+\{([^,]+),/);
    return match ? match[1].trim() : '';
  };

  const formatCitationKey = (key) => {
    if (!key) return '';
    
    // 检测并格式化 citation key
    const hasUnderscore = key.includes('_');
    const hasDash = key.includes('-');
    const hasDigits = /\d/.test(key);
    const hasUpperCase = /[A-Z]/.test(key);
    const hasLowerCase = /[a-z]/.test(key);
    
    // 如果包含下划线或连字符，保持原样
    if (hasUnderscore || hasDash) {
      return key;
    }
    
    // 如果已经是驼峰命名（包含大写和小写字母），保持原样
    if (hasUpperCase && hasLowerCase) {
      return key;
    }
    
    // 如果全是小写，尝试智能转换为驼峰命名
    if (hasLowerCase && !hasUpperCase) {
      // 检测常见模式：author + year + keyword
      // 例如：smith2023deep -> Smith2023Deep
      const parts = key.match(/^([a-z]+)(\d{4})([a-z]*)$/i);
      if (parts) {
        const [, author, year, keyword] = parts;
        const formattedAuthor = author.charAt(0).toUpperCase() + author.slice(1).toLowerCase();
        const formattedKeyword = keyword ? keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase() : '';
        return formattedAuthor + year + formattedKeyword;
      }
      
      // 简单首字母大写
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    
    // 如果全是大写，转换为首字母大写其余小写
    if (hasUpperCase && !hasLowerCase) {
      const parts = key.match(/^([A-Z]+)(\d{4})([A-Z]*)$/);
      if (parts) {
        const [, author, year, keyword] = parts;
        const formattedAuthor = author.charAt(0).toUpperCase() + author.slice(1).toLowerCase();
        const formattedKeyword = keyword ? keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase() : '';
        return formattedAuthor + year + formattedKeyword;
      }
      return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    }
    
    return key;
  };

  const handleBibtexChange = (value) => {
    setBibtex(value);
    const key = extractCitationKey(value);
    if (key) {
      const formatted = formatCitationKey(key);
      setCitationKey(formatted);
    }
  };

  const handleSave = () => {
    if (bibtex.trim()) {
      const key = citationKey || extractCitationKey(bibtex) || 'Unknown';
      onSave({
        bibtex: bibtex.trim(),
        citationKey: key
      });
      setBibtex('');
      setCitationKey('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none select-none">
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl h-auto flex flex-col animate-scaleIn pointer-events-auto" style={{ aspectRatio: '16/9', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {initialData ? 'Edit BibTeX Entry' : 'Add BibTeX Entry'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto grid grid-cols-2 gap-6">
          <div className="flex flex-col">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Citation Key
              </label>
              <input
                type="text"
                value={citationKey}
                onChange={(e) => setCitationKey(e.target.value)}
                placeholder="e.g., Smith2023"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
              />
            </div>

            <div className="text-xs text-gray-500 flex-1">
              <p className="mb-2 font-medium">Smart Formatting:</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><span className="font-mono text-gray-700">smith2023deep</span> → <span className="font-mono text-blue-600">Smith2023Deep</span></li>
                <li><span className="font-mono text-gray-700">SMITH2023</span> → <span className="font-mono text-blue-600">Smith2023</span></li>
                <li><span className="font-mono text-gray-700">smith_2023</span> → <span className="font-mono text-blue-600">smith_2023</span> (preserved)</li>
                <li>Paste BibTeX from any source</li>
                <li>Manually edit the key anytime</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              BibTeX Entry
            </label>
            <textarea
              value={bibtex}
              onChange={(e) => handleBibtexChange(e.target.value)}
              placeholder={`@article{Smith2023,
  author = {John Smith},
  title = {Example Article},
  journal = {Journal Name},
  year = {2023},
  volume = {1},
  pages = {1-10}
}`}
              className="w-full flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none select-text"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!bibtex.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {initialData ? 'Update' : 'Add'} Reference
          </button>
        </div>
      </div>
    </div>
  );
};

export default BibTeXModal;

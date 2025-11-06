import React, { useState } from 'react';
import { X } from 'lucide-react';

const BibTeXDetailModal = ({ isOpen, onClose, citation, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  if (!isOpen || !citation) return null;

  const handleEdit = () => {
    setEditedContent(citation.content || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave(citation.id, editedContent);
      citation.content = editedContent;
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-11/12 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {citation.title || 'Reference Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Citation Key
            </h3>
            <div className="bg-gray-50 rounded p-3 font-mono text-sm text-gray-800">
              {citation.title}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">
                BibTeX
              </h3>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditing ? (
              <div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-64 bg-gray-50 rounded p-4 font-mono text-sm text-gray-800 border border-gray-300 focus:outline-none focus:border-blue-500"
                  style={{ resize: 'vertical' }}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded p-4 overflow-x-auto border border-gray-200">
                <pre className="text-gray-800 font-mono text-sm whitespace-pre-wrap">
                  {citation.content || 'No BibTeX content available'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BibTeXDetailModal;

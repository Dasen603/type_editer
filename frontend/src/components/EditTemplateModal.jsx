import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const EditTemplateModal = ({ isOpen, onClose, template, onSave }) => {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('conference');
  const [isClosing, setIsClosing] = useState(false);

  const categories = [
    { value: 'conference', label: 'Conference' },
    { value: 'journal', label: 'Journal' },
    { value: 'university', label: 'University' },
    { value: 'custom', label: 'Custom' }
  ];

  useEffect(() => {
    if (template) {
      setTemplateName(template.name || '');
      setTemplateDescription(template.description || '');
      setSelectedCategory(template.category || 'conference');
    }
  }, [template]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      // Reset form
      setTemplateName('');
      setTemplateDescription('');
      setSelectedCategory('conference');
    }, 200);
  };

  const handleSubmit = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    onSave({
      ...template,
      name: templateName,
      description: templateDescription,
      category: selectedCategory
    });

    handleClose();
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 3000 }}>
      <div 
        className={`relative bg-white rounded-lg shadow-2xl w-full max-w-2xl h-auto flex flex-col pointer-events-auto max-h-[90vh] ${isClosing ? 'animate-scaleOut' : 'animate-scaleIn'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Edit Template</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., My Custom Template"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 select-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Describe your template..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none select-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 select-text"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!templateName.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTemplateModal;


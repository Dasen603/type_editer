import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Download } from 'lucide-react';

const templates = [
  {
    id: 'dlithesis',
    name: 'DLI Thesis',
    description: 'Dalian University of Technology, Leicester International Institute thesis template',
    category: 'Academic',
    preview: null,
    params: ['Title', 'StudentName', 'StudentID', 'Major', 'SupervisorName']
  },
  {
    id: 'ieee',
    name: 'IEEE Conference',
    description: 'IEEE conference paper template with two-column layout',
    category: 'Academic',
    preview: null,
    params: ['Title', 'Authors', 'Abstract']
  },
  {
    id: 'acm',
    name: 'ACM Article',
    description: 'ACM article template for journals and transactions',
    category: 'Academic',
    preview: null,
    params: ['Title', 'Authors', 'Abstract']
  },
  {
    id: 'springer',
    name: 'Springer LNCS',
    description: 'Springer Lecture Notes in Computer Science template',
    category: 'Academic',
    preview: null,
    params: ['Title', 'Authors', 'Institute']
  },
  {
    id: 'basic',
    name: 'Basic Article',
    description: 'Simple article template for general use',
    category: 'General',
    preview: null,
    params: ['Title', 'Author']
  }
];

const TemplateLibrary = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();

  const categories = ['All', ...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = async (templateId) => {
    try {
      // TODO: Create a new project with this template
      navigate('/editor/new?template=' + templateId);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const TemplateCard = ({ template }) => (
    <div className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
        <FileText className="w-16 h-16 text-gray-300" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{template.name}</h3>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
            {template.category}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleUseTemplate(template.id)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Use Template
          </button>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Template Library</h1>
          
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="flex gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p className="text-xl">No templates found</p>
              <p className="mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;

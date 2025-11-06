import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MoreHorizontal, FolderOpen } from 'lucide-react';
import { documentAPI } from '../services/api';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await documentAPI.list();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/editor/${projectId}`);
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ProjectCard = ({ project }) => {
    const date = new Date(project.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    return (
      <div 
        onClick={() => handleProjectClick(project.id)}
        className="group bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-all aspect-[3/4] flex flex-col"
      >
        <div className="flex-1 bg-white/50 rounded mb-3"></div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm truncate">{project.title}</div>
            <div className="text-xs text-gray-500">{date}</div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 hover:bg-gray-300 rounded">
              <Star className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-1 hover:bg-gray-300 rounded">
              <MoreHorizontal className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="px-8 py-6 border-b border-gray-200">
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div 
          className="relative mb-8 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #2d5016 0%, #4a7c1f 50%, #6b9d2c 100%)',
            minHeight: '200px'
          }}
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 right-20 w-32 h-32 bg-yellow-200/40 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 left-20 w-40 h-40 bg-green-400/30 rounded-full blur-3xl"></div>
          </div>
          <div className="relative px-12 py-10 flex items-center justify-between">
            <h1 className="text-5xl font-bold text-white">Projects</h1>
            <div className="opacity-60">
              <FolderOpen className="w-32 h-32 text-yellow-200/60" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {filteredProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Recents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProjects.slice(0, 8).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}

        {filteredProjects.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl">No projects found</p>
            <p className="mt-2">Start by creating a new project from the Template Library</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;

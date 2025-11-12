import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Star, FolderOpen, Trash2 } from 'lucide-react';
import { documentAPI } from '../services/api';

const Starred = () => {
  const [projects, setProjects] = useState([]);
  const [starredProjects, setStarredProjects] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const loadProjects = async () => {
    try {
      const response = await documentAPI.list();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // 当路由变化到 Starred 页面时，刷新项目列表和收藏状态
  useEffect(() => {
    loadProjects();
    // 从 localStorage 加载收藏状态
    const savedStarred = localStorage.getItem('starredProjects');
    if (savedStarred) {
      try {
        setStarredProjects(new Set(JSON.parse(savedStarred)));
      } catch (e) {
        console.error('Error loading starred projects:', e);
      }
    }
  }, [location.pathname]);

  // 监听 localStorage 变化和自定义事件（当其他页面修改收藏状态时）
  useEffect(() => {
    const handleStorageChange = () => {
      // 重新加载项目列表和收藏状态
      loadProjects();
      const savedStarred = localStorage.getItem('starredProjects');
      if (savedStarred) {
        try {
          setStarredProjects(new Set(JSON.parse(savedStarred)));
        } catch (e) {
          console.error('Error loading starred projects:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // 自定义事件，用于同页面内的更新
    window.addEventListener('starredUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('starredUpdated', handleStorageChange);
    };
  }, []);

  const handleProjectClick = (projectId) => {
    navigate(`/editor/${projectId}`);
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation(); // 阻止触发卡片点击事件
    
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await documentAPI.delete(projectId);
      // Remove from list
      setProjects(prev => prev.filter(p => p.id !== projectId));
      // Remove from starred
      setStarredProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        localStorage.setItem('starredProjects', JSON.stringify(Array.from(newSet)));
        window.dispatchEvent(new Event('starredUpdated'));
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleToggleStar = (e, projectId) => {
    e.stopPropagation(); // 阻止触发卡片点击事件
    
    setStarredProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      localStorage.setItem('starredProjects', JSON.stringify(Array.from(newSet)));
      window.dispatchEvent(new Event('starredUpdated'));
      return newSet;
    });
  };

  // 过滤出收藏的文档
  const starredProjectsList = projects.filter(project => 
    starredProjects.has(project.id)
  );

  // 再根据搜索查询过滤
  const filteredProjects = starredProjectsList.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ProjectCard = ({ project }) => {
    const date = new Date(project.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const isStarred = starredProjects.has(project.id);

    return (
      <div 
        onClick={() => handleProjectClick(project.id)}
        className="group bg-gray-100 rounded-lg p-3 cursor-pointer hover:bg-gray-200 transition-all aspect-[3/4] flex flex-col"
        style={{ maxWidth: '180px' }}
      >
        <div className="flex-1 bg-white/50 rounded mb-2"></div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-xs truncate">{project.title}</div>
            <div className="text-[10px] text-gray-500">{date}</div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => handleDeleteProject(e, project.id)}
              className="p-1 hover:bg-gray-300 rounded text-gray-600 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => handleToggleStar(e, project.id)}
              className={`p-1 hover:bg-gray-300 rounded transition-colors ${
                isStarred ? 'text-yellow-500 opacity-100' : 'text-gray-600 opacity-0 group-hover:opacity-100'
              }`}
              title={isStarred ? 'Unstar' : 'Star'}
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="px-8 py-4 border-b border-gray-200">
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div 
          className="relative mb-8 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #facc15 100%)',
            minHeight: '140px'
          }}
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-8 right-16 w-24 h-24 bg-yellow-300/40 rounded-full blur-3xl"></div>
            <div className="absolute bottom-8 left-16 w-32 h-32 bg-yellow-400/30 rounded-full blur-3xl"></div>
          </div>
          <div className="relative px-12 py-6 flex items-center justify-between">
            <h1 className="text-4xl font-bold text-white">Starred</h1>
            <div className="opacity-60">
              <Star className="w-24 h-24 text-yellow-100/80" strokeWidth={1.5} fill="currentColor" />
            </div>
          </div>
        </div>

        {filteredProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Starred Documents</h2>
            <div 
              style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '12px',
                columnGap: '12px', 
                rowGap: '12px'
              }}
            >
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}

        {filteredProjects.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl">No starred documents</p>
            <p className="mt-2">Click the star icon in the document list to star documents</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Starred;


import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Plus, Star, ArrowUpCircle, User, Headphones, Settings } from 'lucide-react';

const NavigationSidebar = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/projects', icon: FileText, label: 'Docs', tooltip: 'My Documents' },
    { path: '/templates', icon: Plus, label: 'Start', tooltip: 'Template Library' },
    { path: '/starred', icon: Star, label: 'Starred', tooltip: 'Starred Documents' },
  ];

  const bottomItems = [
    { path: '/upgrade', icon: ArrowUpCircle, label: 'Upgrade', tooltip: 'Upgrade Plan' },
    { path: '/user', icon: User, label: 'User', tooltip: 'User Profile' },
    { path: '/contact', icon: Headphones, label: 'Contact', tooltip: 'Contact Support' },
    { path: '/settings', icon: Settings, label: 'Settings', tooltip: 'Settings' },
  ];

  const NavButton = ({ path, icon: Icon, label, tooltip }) => (
    <Link
      to={path}
      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors group relative ${
        isActive(path)
          ? 'bg-green-100 text-green-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      title={tooltip}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs">{label}</span>
    </Link>
  );

  return (
    <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-4">
      <div className="mb-6">
        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          TYPE
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <NavButton key={item.path} {...item} />
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        {bottomItems.map((item) => (
          <NavButton key={item.path} {...item} />
        ))}
      </div>
    </div>
  );
};

export default NavigationSidebar;

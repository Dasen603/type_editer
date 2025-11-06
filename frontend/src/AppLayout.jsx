import React from 'react';
import { Outlet } from 'react-router-dom';
import NavigationSidebar from './components/NavigationSidebar.jsx';

function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationSidebar />
      <Outlet />
    </div>
  );
}

export default AppLayout;

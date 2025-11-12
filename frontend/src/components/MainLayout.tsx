import React from 'react';
import { Sidebar } from './Sidebar';
import { EditorArea } from './EditorArea';

export const MainLayout = React.memo(() => {
  return (
    <>
      <Sidebar />
      <EditorArea />
    </>
  );
});

MainLayout.displayName = 'MainLayout';
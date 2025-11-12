import React from 'react';
import { AppProvider } from '@/contexts/AppContext';
import { MainLayout } from '@/components/MainLayout';
import ErrorNotification from '@/components/ErrorNotification';
import { BibTeXModal } from '@/components/BibTeXModal';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { useUI } from '@/hooks/useUI';

// 内部应用组件
const AppContent: React.FC = () => {
  const { error, clearError } = useUI();
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="flex h-screen bg-gray-50">
      <ErrorNotification 
        error={error} 
        onDismiss={clearError} 
      />
      
      <MainLayout />
      
      <BibTeXModal />
      <ImagePreviewModal />
      
      {/* 性能监控（仅开发模式） */}
      {isDevelopment && <PerformanceMonitor enabled={true} />}
    </div>
  );
}

// 主应用组件
function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
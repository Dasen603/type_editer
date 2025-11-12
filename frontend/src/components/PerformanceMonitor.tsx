import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  updateCount: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  enabled = false, 
  onMetrics 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    updateCount: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      const newMetrics: PerformanceMetrics = {
        renderTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
        updateCount: metrics.updateCount + 1,
      };
      
      setMetrics(newMetrics);
      onMetrics?.(newMetrics);
    };
  });

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-sm font-mono">
      <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
      {metrics.memoryUsage && (
        <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
      )}
      <div>Updates: {metrics.updateCount}</div>
    </div>
  );
};

// Hook 版本
export function usePerformanceMonitor(enabled = false) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    updateCount: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        renderTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
        updateCount: prev.updateCount + 1,
      }));
    };
  });

  return metrics;
}
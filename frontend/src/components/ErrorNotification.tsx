import React, { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ErrorNotificationProps {
  error: string | null;
  onDismiss: () => void;
}

/**
 * Error notification component
 */
const ErrorNotification: React.FC<ErrorNotificationProps> = ({ error, onDismiss }) => {
  useEffect(() => {
    if (error) {
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, onDismiss]);
  
  if (!error) return null;
  
  return (
    <div className="fixed top-4 right-4 max-w-md animate-slide-in" style={{ zIndex: 5000 }}>
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ErrorNotification;
import React from 'react';

interface EmptyStateProps {
  onAddFirstSection: () => void;
}

export const EmptyState = React.memo<EmptyStateProps>(({ onAddFirstSection }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="text-center text-gray-400 py-20">
        <p className="text-2xl mb-4">No sections yet</p>
        <p className="mb-6">Add a section from the Outline to start editing</p>
        <button
          onClick={onAddFirstSection}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add First Section
        </button>
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
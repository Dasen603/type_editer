import React from 'react';

const PlaceholderPage = ({ title }) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600">This page is coming soon...</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;

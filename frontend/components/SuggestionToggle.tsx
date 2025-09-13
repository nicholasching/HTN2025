'use client';

import React from 'react';

interface SuggestionToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  hasNewSuggestions?: boolean;
}

export default function SuggestionToggle({ 
  isVisible, 
  onToggle, 
  hasNewSuggestions = false 
}: SuggestionToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`fixed right-4 top-4 z-40 p-3 rounded-full shadow-lg transition-all duration-200 ${
        isVisible 
          ? 'bg-gray-600 text-white hover:bg-gray-700' 
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
      title={isVisible ? 'Hide Chat Assistant' : 'Show Chat Assistant'}
    >
      <div className="relative">
        {isVisible ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
        
        {hasNewSuggestions && !isVisible && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
        )}
      </div>
    </button>
  );
}

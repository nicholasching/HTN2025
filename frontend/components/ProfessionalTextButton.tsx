'use client';

import { useState } from 'react';

interface ProfessionalTextButtonProps {
  currentText: string;
  onTextUpdate: (text: string) => void;
  disabled?: boolean;
}

export default function ProfessionalTextButton({ 
  currentText, 
  onTextUpdate, 
  disabled = false 
}: ProfessionalTextButtonProps) {
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [originalText, setOriginalText] = useState<string>('');
  const [professionalText, setProfessionalText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateProfessionalText = async (text: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-professional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setOriginalText(data.originalText);
      setProfessionalText(data.professionalText);
    } catch (err) {
      console.error('Error generating professional text:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate professional text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = async () => {
    if (!currentText.trim()) {
      setError('Please enter some text first');
      return;
    }

    setShowPopup(true);
    await generateProfessionalText(currentText.trim());
  };

  const handleUseProfessional = () => {
    if (professionalText) {
      onTextUpdate(professionalText);
      closePopup();
    }
  };

  const handleUseOriginal = () => {
    if (originalText) {
      onTextUpdate(originalText);
      closePopup();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setError(null);
    setProfessionalText('');
    setOriginalText('');
  };

  return (
    <>
      {/* Professional Text Button */}
      <button
        onClick={handleButtonClick}
        disabled={disabled || !currentText.trim()}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
          currentText.trim() && !disabled
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
            : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
        }`}
        title="Convert to Professional Text"
      >
        <span className="text-sm">💼</span>
      </button>

      {/* Inline Dropdown Panel */}
      {showPopup && (
        <div className="absolute bottom-12 right-0 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl z-50 animate-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <span className="text-sm">💼</span>
              <span className="text-sm font-medium text-white">Professional Text</span>
            </div>
            <button
              onClick={closePopup}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            {/* Error State */}
            {error && (
              <div className="p-2 bg-red-900/50 border border-red-700/50 rounded text-xs text-red-300 mb-3">
                ❌ {error}
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded mb-3">
                <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-xs text-gray-300">Converting...</span>
              </div>
            )}

            {/* Text Comparison */}
            {originalText && professionalText && !isLoading && (
              <div className="space-y-3">
                {/* Original Text */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-gray-400">Original</h3>
                    <button
                      onClick={() => copyToClipboard(originalText)}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      📋
                    </button>
                  </div>
                  <div className="p-2 bg-gray-800/50 border border-gray-700/50 rounded text-xs text-gray-300 leading-relaxed">
                    {originalText}
                  </div>
                </div>

                {/* Professional Text */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-blue-300">Professional</h3>
                    <button
                      onClick={() => copyToClipboard(professionalText)}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      📋
                    </button>
                  </div>
                  <div className="p-2 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded text-xs text-white leading-relaxed">
                    {professionalText}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleUseOriginal}
                    className="flex-1 px-2 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                  >
                    📝 Use Original
                  </button>
                  <button
                    onClick={handleUseProfessional}
                    className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    ✨ Use Professional
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

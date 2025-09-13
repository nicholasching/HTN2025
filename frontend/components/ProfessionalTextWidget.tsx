'use client';

import { useState } from 'react';

interface ProfessionalTextWidgetProps {
  onSend?: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ProfessionalTextWidget({ 
  onSend, 
  placeholder = "Type your message here...",
  className = ""
}: ProfessionalTextWidgetProps) {
  const [inputText, setInputText] = useState<string>('');
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

  const handleWidgetClick = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text first');
      return;
    }

    setShowPopup(true);
    await generateProfessionalText(inputText.trim());
  };

  const handleSendProfessional = () => {
    if (professionalText && onSend) {
      onSend(professionalText);
      setShowPopup(false);
      setInputText('');
      setProfessionalText('');
      setOriginalText('');
      setError(null);
    }
  };

  const handleSendOriginal = () => {
    if (originalText && onSend) {
      onSend(originalText);
      setShowPopup(false);
      setInputText('');
      setProfessionalText('');
      setOriginalText('');
      setError(null);
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
  };

  return (
    <>
      {/* Main Widget */}
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 p-3 bg-[#1a1a1a] border border-gray-800/50 rounded-lg">
          {/* Text Input */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-white placeholder-gray-400 resize-none outline-none min-h-[24px] max-h-[120px]"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleWidgetClick();
              }
            }}
          />
          
          {/* Professional Text Button */}
          <button
            onClick={handleWidgetClick}
            disabled={!inputText.trim()}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
              inputText.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            }`}
            title="Convert to Professional Text"
          >
            <span className="text-sm">💼</span>
          </button>
        </div>
      </div>

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-gray-800/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">💼</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Professional Text Converter</h2>
                  <p className="text-xs text-gray-400">Convert your text to professional format</p>
                </div>
              </div>
              <button
                onClick={closePopup}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Error State */}
              {error && (
                <div className="p-3 bg-red-900/50 border border-red-700/50 rounded-lg text-sm text-red-300">
                  ❌ {error}
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center p-8">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-gray-300">Converting to professional text...</span>
                  </div>
                </div>
              )}

              {/* Text Comparison */}
              {originalText && professionalText && !isLoading && (
                <div className="space-y-4">
                  {/* Original Text */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-300">Original Text</h3>
                      <button
                        onClick={() => copyToClipboard(originalText)}
                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-gray-300 leading-relaxed">
                      {originalText}
                    </div>
                  </div>

                  {/* Professional Text */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-blue-300">Professional Version</h3>
                      <button
                        onClick={() => copyToClipboard(professionalText)}
                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg text-sm text-white leading-relaxed">
                      {professionalText}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {originalText && professionalText && !isLoading && (
              <div className="p-4 border-t border-gray-800/50 flex gap-3">
                <button
                  onClick={handleSendOriginal}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                >
                  📝 Send Original
                </button>
                <button
                  onClick={handleSendProfessional}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg transition-all"
                >
                  ✨ Send Professional
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import type { Message } from '@/lib/beeper';

interface InlineAIWingmanProps {
  messages: Message[];
  messageIndex: number;
  onSuggestionSelect?: (suggestion: string) => void;
}

type ResponseLength = 'short' | 'medium' | 'long';

export default function InlineAIWingman({ messages, messageIndex, onSuggestionSelect }: InlineAIWingmanProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [suggestion, setSuggestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseLength, setResponseLength] = useState<ResponseLength>('medium');

  const generateFlirtingSuggestion = async (lengthOverride?: ResponseLength) => {
    if (!messages.length) {
      setError('No chat context available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extract context up to the current message
      const contextMessages = messages.slice(0, messageIndex + 1).slice(-10).map((msg: any) => {
        const senderName = msg.senderName || msg.sender?.displayName || 'Unknown';
        const content = msg.text || msg.content?.text || msg.body || '';
        const isMe = msg.isSender || senderName.toLowerCase().includes('nicholas') || senderName.toLowerCase().includes('you');
        
        return {
          sender: isMe ? 'You' : senderName,
          message: content
        };
      });

      const response = await fetch('/api/generate-flirt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: contextMessages,
          responseLength: lengthOverride || responseLength,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setSuggestion(data.suggestion);
    } catch (err) {
      console.error('Error generating flirting suggestion:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWingmanClick = () => {
    if (!isVisible) {
      setIsVisible(true);
      generateFlirtingSuggestion();
    } else {
      setIsVisible(false);
      setSuggestion('');
      setError(null);
    }
  };

  const handleUseSuggestion = () => {
    if (suggestion && onSuggestionSelect) {
      onSuggestionSelect(suggestion);
      setIsVisible(false);
      setSuggestion('');
    }
  };

  const copyToClipboard = async () => {
    if (suggestion) {
      try {
        await navigator.clipboard.writeText(suggestion);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  return (
    <div className="relative inline-block ml-2">
      {/* AI Wingman Trigger Button - GitHub Copilot style */}
      <button
        onClick={handleWingmanClick}
        className={`inline-flex items-center justify-center w-6 h-6 rounded transition-all duration-200 ${
          isVisible 
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
            : 'bg-gray-600/50 text-gray-400 hover:bg-gray-500/70 hover:text-gray-300'
        }`}
        title="AI Wingman - Get flirting suggestions"
      >
        <span className="text-xs">💕</span>
      </button>

      {/* Inline Suggestion Panel - GitHub Copilot style */}
      {isVisible && (
        <div className="absolute top-8 right-0 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl z-50 animate-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <span className="text-sm">💕</span>
              <span className="text-sm font-medium text-white">AI Wingman</span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            {/* Response Length Controls */}
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-2">Length:</div>
              <div className="flex gap-1">
                {(['short', 'medium', 'long'] as ResponseLength[]).map((length) => (
                  <button
                    key={length}
                    onClick={() => {
                      setResponseLength(length);
                      if (messages.length > 0) {
                        setSuggestion('');
                        setError(null);
                        generateFlirtingSuggestion(length);
                      }
                    }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      responseLength === length
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {length.charAt(0).toUpperCase() + length.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="p-2 bg-red-900/50 border border-red-700/50 rounded text-xs text-red-300 mb-3">
                ❌ {error}
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded mb-3">
                <div className="animate-spin w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                <span className="text-xs text-gray-300">Generating...</span>
              </div>
            )}

            {/* Suggestion Display */}
            {suggestion && !isLoading && (
              <div className="space-y-2">
                <div className="p-3 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-700/50 rounded text-sm text-white leading-relaxed">
                  {suggestion}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUseSuggestion}
                    className="flex-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                  >
                    ✨ Use
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="px-2 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => generateFlirtingSuggestion()}
                    className="px-2 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                  >
                    🔄
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!suggestion && !isLoading && !error && (
              <div className="text-center py-2">
                <div className="text-gray-400 text-xs mb-2">Ready to help! 😉</div>
                <button
                  onClick={() => generateFlirtingSuggestion()}
                  className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-xs rounded transition-all"
                >
                  Get Suggestion
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

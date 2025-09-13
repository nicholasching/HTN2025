'use client';

import { useState, useEffect } from 'react';
import type { Message } from '@/lib/beeper';

interface FlirtingWingmanProps {
  messages: Message[];
}

type ResponseLength = 'short' | 'medium' | 'long';

export default function FlirtingWingman({ messages }: FlirtingWingmanProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
      // Extract recent messages for context (last 10 messages)
      const recentMessages = messages.slice(-10).map((msg: any) => {
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
          context: recentMessages,
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

  const copyToClipboard = async () => {
    if (suggestion) {
      try {
        await navigator.clipboard.writeText(suggestion);
        // Could add a toast notification here
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  const handleWingmanClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      if (messages.length > 0) {
        generateFlirtingSuggestion();
      }
    } else {
      setIsExpanded(false);
      setSuggestion('');
      setError(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main Widget Button */}
      <div className="relative">
        <button
          onClick={handleWingmanClick}
          className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
            isExpanded 
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="AI Flirting Wingman - Click to get suggestions"
        >
          <span className="text-2xl">💕</span>
        </button>
        
        {/* Active indicator */}
        {isExpanded && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
        )}
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💕</span>
              <h3 className="text-sm font-semibold text-white">AI Wingman</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Response Length Control */}
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-2">Response Length:</div>
            <div className="flex gap-1">
              {(['short', 'medium', 'long'] as ResponseLength[]).map((length) => (
                <button
                  key={length}
                  onClick={() => {
                    setResponseLength(length);
                    if (messages.length > 0) {
                      // Clear current suggestion and generate new one with the selected length
                      setSuggestion('');
                      setError(null);
                      // Pass the length directly to avoid state timing issues
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

          {/* Content Area */}
          <div className="space-y-3">
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <div className="text-sm text-red-300">❌ {error}</div>
              </div>
            )}

            {isLoading && (
              <div className="p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-300">Crafting the perfect response...</span>
                </div>
              </div>
            )}

            {suggestion && !isLoading && (
              <div className="space-y-2">
                <div className="p-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-700 rounded-lg">
                  <div className="text-sm text-white leading-relaxed">
                    {suggestion}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => generateFlirtingSuggestion()}
                    className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                  >
                    🔄 New
                  </button>
                </div>
              </div>
            )}

            {!suggestion && !isLoading && !error && (
              <div className="text-center py-4">
                <div className="text-gray-400 text-sm mb-2">Ready to help you flirt! 😉</div>
                <button
                  onClick={() => generateFlirtingSuggestion()}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-sm rounded-lg transition-all"
                >
                  ✨ Get Suggestion
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

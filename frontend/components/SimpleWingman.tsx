'use client';

import { useState } from 'react';
import type { Message } from '@/lib/beeper';

interface SimpleWingmanProps {
  messages: Message[];
  onSuggestionGenerated: (suggestion: string) => void;
}

type FlirtIntensity = 'mild' | 'medium' | 'hot';

export default function SimpleWingman({ messages, onSuggestionGenerated }: SimpleWingmanProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [customContext, setCustomContext] = useState('');
  const [flirtIntensity, setFlirtIntensity] = useState<FlirtIntensity>('medium');

  const generateAndFillSuggestion = async () => {
    if (!messages.length) return;

    setIsLoading(true);
    setClickCount(prev => prev + 1);

    try {
      // Extract recent messages for context (more context on subsequent clicks)
      const contextLimit = 5 + (clickCount * 3); // Start with 5, add 3 more each click, no max limit
      const recentMessages = messages.slice(-contextLimit).map((msg: any) => {
        const senderName = msg.senderName || msg.sender?.displayName || 'Unknown';
        const content = msg.text || msg.content?.text || msg.body || '';
        const isMe = msg.isSender || senderName.toLowerCase().includes('nicholas') || senderName.toLowerCase().includes('you');
        
        return {
          sender: isMe ? 'You' : senderName,
          message: content
        };
      });

      // Create a custom API call for intensity-based responses
      const intensityPrompts = {
        mild: `1 sentence. Neutral and friendly.
                Acknowledge what they said; no compliments, no invites.
                No questions unless they asked one.`,
        medium: `1–2 short sentences. Warm, lightly interested.
                Use EITHER one soft compliment OR one light question (not both).
                No invites.`,
        hot: `1–2 short sentences. Very flirty and confident (PG).
                Use EITHER a specific compliment + quick invite OR a playful tease + curious follow-up.
                Make attraction obvious.`
      };

      // Build conversation history for the prompt
      const conversationHistory = recentMessages
        .map(msg => `${msg.sender}: ${msg.message}`)
        .join('\n');

      // Get the last message to identify who to respond to
      const lastMessage = recentMessages[recentMessages.length - 1];
      const respondingTo = lastMessage?.sender === 'You' ? 'the other person' : lastMessage?.sender || 'them';

      const fullPrompt = `${intensityPrompts[flirtIntensity]}

${customContext ? `Additional context: ${customContext}\n\n` : ''}Conversation context:
${conversationHistory}

You are the user. Write your response to ${respondingTo}:`;

      const response = await fetch('/api/generate-flirt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: [{ sender: 'System', message: fullPrompt }],
          responseLength: 'short',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      // Remove quotation marks from the suggestion
      const cleanSuggestion = data.suggestion.replace(/^["']|["']$/g, '');
      onSuggestionGenerated(cleanSuggestion);
    } catch (err) {
      console.error('Error generating flirting suggestion:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Expanded Context Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl animate-in slide-in-from-bottom-2">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">AI Wingman Settings</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Flirt Intensity Slider */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Flirt Intensity
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">😊</span>
                  <div className="flex-1 flex gap-1">
                    {(['mild', 'medium', 'hot'] as FlirtIntensity[]).map((intensity) => (
                      <button
                        key={intensity}
                        onClick={() => setFlirtIntensity(intensity)}
                        className={`flex-1 px-2 py-1.5 text-xs rounded transition-all ${
                          flirtIntensity === intensity
                            ? intensity === 'mild' ? 'bg-green-600 text-white' :
                              intensity === 'medium' ? 'bg-yellow-600 text-white' :
                              'bg-red-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">🔥</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {flirtIntensity === 'mild' && 'Normal conversation'}
                  {flirtIntensity === 'medium' && 'Friendly & warm'}
                  {flirtIntensity === 'hot' && 'Talking to your crush'}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Custom Context (optional)
                </label>
                <textarea
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="e.g., 'Be more playful', 'Reference our shared interest in music', 'Keep it casual'"
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded text-white placeholder-gray-500 text-xs resize-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={generateAndFillSuggestion}
                  disabled={isLoading || !messages.length}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-xs rounded transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Generating...' : '✨ Generate'}
                </button>
                <button
                  onClick={() => setCustomContext('')}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                >
                  Clear
                </button>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* Main Wingman Button */}
      <div className="flex items-center gap-2">
        {/* Settings Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all flex items-center justify-center"
          title="Wingman Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        
        {/* Main Wingman Button */}
        <button
          onClick={generateAndFillSuggestion}
          disabled={isLoading || !messages.length}
          className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
            isLoading 
              ? 'bg-purple-600 animate-pulse' 
              : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 hover:scale-110'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="AI Wingman - Click to auto-fill message"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="text-2xl">💕</span>
          )}
        </button>
      </div>
      
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  TalkingPoint, 
  ConversationStarter, 
  ContextItem, 
  FutureReminder, 
  SuggestionResponse 
} from '@/lib/agents/suggestion';

interface SuggestionSidebarProps {
  chatId: string;
  accountId: string;
  accessToken: string;
  cohereApiKey: string;
  isVisible: boolean;
  onToggle: () => void;
}

export default function SuggestionSidebar({
  chatId,
  accountId,
  accessToken,
  cohereApiKey,
  isVisible,
  onToggle
}: SuggestionSidebarProps) {
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'talking-points' | 'starters' | 'context' | 'reminders'>('talking-points');

  // Fetch suggestions when chat changes
  useEffect(() => {
    if (isVisible && chatId && accountId) {
      fetchSuggestions();
    }
  }, [chatId, accountId, isVisible]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          accountId,
          accessToken,
          cohereApiKey,
          limit: 200
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      pet: '🐕',
      hobby: '🎨',
      show: '📺',
      project: '💼',
      sports_team: '⚽',
      interest: '💡',
      work: '🏢',
      family: '👨‍👩‍👧‍👦',
      other: '💬'
    };
    return icons[category] || '💬';
  };

  const getImportanceColor = (importance: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[importance];
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">💡 Chat Assistant</h2>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex mt-3 space-x-1">
          {[
            { id: 'talking-points', label: 'Topics', icon: '🎯' },
            { id: 'starters', label: 'Starters', icon: '💬' },
            { id: 'context', label: 'Context', icon: '📝' },
            { id: 'reminders', label: 'Reminders', icon: '⏰' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id as any)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                activePanel === tab.id
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Analyzing conversation...</p>
          </div>
        )}

        {error && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchSuggestions}
                className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {suggestions && !loading && (
          <>
            {/* Talking Points Panel */}
            {activePanel === 'talking-points' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">🎯 Talking Points</h3>
                {suggestions.talkingPoints.length === 0 ? (
                  <p className="text-sm text-gray-500">No talking points found yet. Chat more to build context!</p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.talkingPoints.map((point, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getCategoryIcon(point.category)}</span>
                              <span className="font-medium text-sm text-gray-900">{point.topic}</span>
                              <span className={`px-2 py-1 text-xs rounded-full border ${getImportanceColor(point.importance)}`}>
                                {point.importance}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{point.details}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>🕒 {new Date(point.lastMentioned).toLocaleDateString()}</span>
                              <span>📊 {point.frequency}x mentioned</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversation Starters Panel */}
            {activePanel === 'starters' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">💬 Conversation Starters</h3>
                {suggestions.conversationStarters.length === 0 ? (
                  <p className="text-sm text-gray-500">No conversation starters available yet.</p>
                ) : (
                  <div className="space-y-2">
                    {suggestions.conversationStarters.map((starter, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                        <p className="text-sm text-gray-900 mb-1">{starter.text}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-600 capitalize">{starter.category.replace('_', ' ')}</span>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-gray-500">{Math.round(starter.confidence * 100)}%</span>
                          </div>
                        </div>
                        {starter.relatedTopic && (
                          <p className="text-xs text-gray-600 mt-1">Related: {starter.relatedTopic}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Past Context Panel */}
            {activePanel === 'context' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">📝 Past Context</h3>
                {suggestions.pastContext.length === 0 ? (
                  <p className="text-sm text-gray-500">No past context available yet.</p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.pastContext.map((context, index) => (
                      <div key={index} className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm text-gray-900">{context.topic}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getImportanceColor(context.importance)}`}>
                            {context.importance}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{context.summary}</p>
                        <p className="text-xs text-yellow-700">Last mentioned: {context.timeAgo}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Future Reminders Panel */}
            {activePanel === 'reminders' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">⏰ Remember This</h3>
                {suggestions.futureReminders.length === 0 ? (
                  <p className="text-sm text-gray-500">No reminders set yet.</p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.futureReminders.map((reminder, index) => (
                      <div key={index} className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm text-gray-900">{reminder.topic}</h4>
                          {reminder.recurring && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full border border-green-300">
                              Recurring
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{reminder.notes}</p>
                        <p className="text-xs text-green-700">Check in: {reminder.nextCheckIn}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {suggestions && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{suggestions.chatInfo.participantCount} participant(s)</span>
            <span>Processed in {suggestions.processingTime}ms</span>
          </div>
          <button
            onClick={fetchSuggestions}
            className="w-full mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh Suggestions
          </button>
        </div>
      )}
    </div>
  );
}

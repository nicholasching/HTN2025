'use client';

import { useState, useEffect } from 'react';
import type { Message } from '@/lib/beeper';

interface ChatSummaryOverlayProps {
  chatId: string;
  chatName: string;
  messages: Message[];
  unreadCount: number;
  onDismiss: () => void;
}

interface SummaryData {
  summary: string;
  unreadCount: number;
  messageCount: number;
}

// Simple cache to prevent duplicate API calls
const summaryCache = new Map<string, string>();

export default function ChatSummaryOverlay({ 
  chatId, 
  chatName, 
  messages, 
  unreadCount,
  onDismiss
}: ChatSummaryOverlayProps) {
  // Add safety checks for props
  if (!chatId || !messages || typeof unreadCount !== 'number') {
    return null;
  }
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Generate summary when component mounts
  useEffect(() => {
    if (unreadCount < 5 || !messages || messages.length === 0 || !chatId) {
      return;
    }

    // Check cache first
    const cacheKey = `${chatId}-${unreadCount}`;
    const cached = summaryCache.get(cacheKey);
    
    if (cached) {
      setSummary(cached);
      return;
    }

    const generateSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        // Only get unread messages for summary
        const unreadMessages = messages.filter(message => {
          if (!message) return false;
          const messageData = message as any;
          return messageData.isUnread === true;
        });

        if (unreadMessages.length === 0) {
          setSummary('');
          return;
        }

        // Prepare message context for the API
        const messageContext = unreadMessages.map(message => {
          if (!message) return null;
          const messageData = message as any;
          const senderName = 
            messageData.senderName ||
            messageData.sender?.displayName ||
            messageData.sender?.name ||
            messageData.sender?.fullName ||
            messageData.senderDisplayName ||
            messageData.fromName ||
            messageData.author?.name ||
            messageData.user?.displayName ||
            'Unknown Sender';

          const content = message.text || messageData.content?.text || messageData.body || 'No text content';

          return {
            sender: senderName,
            message: content,
            timestamp: message.timestamp,
            isUnread: true
          };
        }).filter(Boolean);

        if (messageContext.length === 0) {
          setSummary('');
          return;
        }

        const response = await fetch('/api/generate-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messageContext,
            chatName: chatName || 'Unknown Chat',
            unreadCount: unreadCount
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to generate summary');
        }

        const data: SummaryData = await response.json();
        
        // Cache the result
        summaryCache.set(cacheKey, data.summary);
        
        setSummary(data.summary);
      } catch (error) {
        console.error('Error generating summary:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate summary');
        setSummary('');
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, [chatId, chatName, messages, unreadCount]);

  // Only show if there are unread messages and valid data
  if (unreadCount === 0 || !chatId || !messages) {
    console.log('ChatSummaryOverlay: Not showing -', { unreadCount, chatId: !!chatId, messages: !!messages });
    return null;
  }

  // Check if summary needs truncation (roughly 2 lines at 12px font size)
  const shouldTruncate = summary && summary.length > 120;

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mx-4 mb-3">
      {/* Summary Overlay Card - Glassmorphic Dark Design */}
      <div className={`bg-gray-900/80 backdrop-blur-md border border-gray-700/30 rounded-lg shadow-lg shadow-black/20 px-3 transition-all duration-300 ease-in-out hover:bg-gray-900/85 hover:shadow-xl hover:shadow-black/25 ${
        isExpanded ? 'py-3' : 'py-2'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs opacity-60">✨</span>
              <span className="text-xs font-medium text-gray-200">AI Summary</span>
            </div>
            
            {/* Summary Content */}
            <div className="text-xs text-gray-300">
              {loading ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-400">Generating...</span>
                </div>
              ) : error ? (
                <span className="text-red-400">Unable to generate summary</span>
              ) : summary ? (
                <div className="space-y-1">
                  <div className={`${isExpanded ? 'leading-relaxed' : 'line-clamp-2'}`}>
                    {isExpanded ? summary : (shouldTruncate ? `${summary.substring(0, 120)}...` : summary)}
                  </div>
                  
                  {/* Toggle Button */}
                  {shouldTruncate && (
                    <button
                      onClick={handleToggleExpand}
                      className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">No summary available</span>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-2 flex-shrink-0 mt-0.5">
            {/* Unread Badge - Pill-shaped on right */}
            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full font-medium border border-blue-500/30">
              {unreadCount}
            </span>
            
            {/* Dismiss Button */}
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors group"
              title="Dismiss summary"
            >
              <svg 
                className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

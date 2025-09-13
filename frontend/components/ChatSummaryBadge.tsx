'use client';

import { useState, useEffect } from 'react';
import type { Message } from '@/lib/beeper';

interface ChatSummaryBadgeProps {
  chatId: string;
  chatName: string;
  messages: Message[];
  unreadCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSummaryGenerated?: (summary: string) => void;
}

interface SummaryData {
  summary: string;
  unreadCount: number;
  messageCount: number;
}

// Simple cache to prevent duplicate API calls
const summaryCache = new Map<string, string>();

export default function ChatSummaryBadge({ 
  chatId, 
  chatName, 
  messages, 
  unreadCount,
  isExpanded,
  onToggle,
  onSummaryGenerated
}: ChatSummaryBadgeProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  // Generate summary when expanded and not already generated
  useEffect(() => {
    if (!isExpanded || unreadCount === 0 || messages.length === 0 || hasGenerated) {
      return;
    }

    // Check cache first
    const cacheKey = `${chatId}-${unreadCount}`;
    const cached = summaryCache.get(cacheKey);
    
    if (cached) {
      setSummary(cached);
      setHasGenerated(true);
      onSummaryGenerated?.(cached);
      return;
    }

    const generateSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        // Only get unread messages for summary
        const unreadMessages = messages.filter(message => {
          const messageData = message as any;
          return messageData.isUnread === true;
        });

        if (unreadMessages.length === 0) {
          setSummary('');
          return;
        }

        // Prepare message context for the API
        const messageContext = unreadMessages.map(message => {
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
        });

        const response = await fetch('/api/generate-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messageContext,
            chatName: chatName,
            unreadCount: unreadCount
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate summary');
        }

        const data: SummaryData = await response.json();
        
        // Cache the result
        summaryCache.set(cacheKey, data.summary);
        
        setSummary(data.summary);
        setHasGenerated(true);
        onSummaryGenerated?.(data.summary);
      } catch (error) {
        console.error('Error generating summary:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate summary');
        setSummary('');
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, [isExpanded, chatId, unreadCount, hasGenerated]);

  // Only show if there are unread messages
  if (unreadCount === 0) return null;

  return (
    <div className="mt-2">
      {/* Summary Header - Always visible */}
      <div 
        className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-pointer hover:bg-blue-500/20 transition-all duration-200 ease-in-out"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0"></div>
          <div className="flex-1">
            <span className="text-xs text-blue-300 font-medium">
              AI Summary ({unreadCount} unread)
            </span>
          </div>
          <div className="text-blue-300 text-xs">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>
      
      {/* Summary Content - Only visible when expanded */}
      {isExpanded && (
        <div className="mt-1 p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-blue-400">Generating...</span>
            </div>
          ) : error ? (
            <div className="text-xs text-red-400">
              Unable to generate summary
            </div>
          ) : summary ? (
            <div className="text-xs text-gray-300 leading-relaxed">
              {summary}
            </div>
          ) : (
            <div className="text-xs text-blue-400">
              Click to generate summary...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

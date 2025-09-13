'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message } from '@/lib/beeper';

interface ChatSummaryBadgeProps {
  chatId: string;
  chatName: string;
  messages: Message[];
  unreadCount: number;
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
  unreadCount 
}: ChatSummaryBadgeProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const hasGeneratedRef = useRef<boolean>(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Only generate summary on hover and if not already generated
  useEffect(() => {
    if (!isHovered || unreadCount === 0 || messages.length === 0) {
      return;
    }

    // Check cache first
    const cacheKey = `${chatId}-${unreadCount}`;
    const cached = summaryCache.get(cacheKey);
    
    if (cached) {
      setSummary(cached);
      return;
    }

    // Prevent duplicate calls
    if (hasGeneratedRef.current) {
      return;
    }

    const generateSummary = async () => {
      hasGeneratedRef.current = true;
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
      } catch (error) {
        console.error('Error generating summary:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate summary');
        setSummary('');
      } finally {
        setLoading(false);
        hasGeneratedRef.current = false;
      }
    };

    generateSummary();
  }, [isHovered, chatId, unreadCount]);

  const handleMouseEnter = () => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Add a small delay before hiding to prevent flickering when moving between chats
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150); // 150ms delay
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Only show if there are unread messages
  if (unreadCount === 0) return null;

  return (
    <div 
      className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-pointer hover:bg-blue-500/20 transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0 mt-0.5"></div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-blue-300 font-medium mb-1">
            AI Summary ({unreadCount} unread) {isHovered ? '▼' : '▶'}
          </div>
          
          {/* Only show summary content when hovered */}
          {isHovered && (
            <div className="mt-1">
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
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

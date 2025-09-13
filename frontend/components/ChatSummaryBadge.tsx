'use client';

import { useState, useEffect } from 'react';
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

export default function ChatSummaryBadge({ 
  chatId, 
  chatName, 
  messages, 
  unreadCount 
}: ChatSummaryBadgeProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generate summary when component mounts or when messages/unreadCount changes
  useEffect(() => {
    if (messages.length === 0 || unreadCount === 0) {
      setSummary('');
      return;
    }

    const generateSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        // Prepare message context for the API
        const messageContext = messages.map(message => {
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
          const isUnread = messageData.isUnread === true;

          return {
            sender: senderName,
            message: content,
            timestamp: message.timestamp,
            isUnread: isUnread
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
  }, [messages, unreadCount, chatId, chatName]);

  if (unreadCount === 0 || !summary) return null;

  return (
    <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div className="flex items-start gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0 mt-0.5"></div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-blue-300 font-medium mb-1">
            AI Summary ({unreadCount} unread)
          </div>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-blue-400">Generating...</span>
            </div>
          ) : error ? (
            <div className="text-xs text-red-400">
              Unable to generate summary
            </div>
          ) : (
            <div className="text-xs text-gray-300 leading-relaxed">
              {summary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

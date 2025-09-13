'use client';

import { useState, useEffect } from 'react';
import type { Message } from '@/lib/beeper';

interface ChatSummaryProps {
  chatId: string;
  chatName: string;
  messages: Message[];
  unreadCount: number;
  isOpen: boolean;
  onClose: () => void;
}

interface SummaryData {
  summary: string;
  unreadCount: number;
  messageCount: number;
}

export default function ChatSummary({ 
  chatId, 
  chatName, 
  messages, 
  unreadCount, 
  isOpen, 
  onClose 
}: ChatSummaryProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generate summary when component mounts or when messages/unreadCount changes
  useEffect(() => {
    if (messages.length === 0) return;

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
        setSummary('Unable to generate summary at this time.');
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, [messages, unreadCount, chatId, chatName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-gray-800/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">📋</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Chat Summary</h2>
              <p className="text-sm text-gray-400">{chatName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-400">Generating summary...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <div className="text-red-300 text-sm">{error}</div>
            </div>
          ) : (
            <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
              <div className="text-gray-200 text-sm leading-relaxed">
                {summary}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-800/50">
            <div className="flex items-center gap-4">
              <span>{messages.length} total messages</span>
              {unreadCount > 0 && (
                <span className="text-blue-400">{unreadCount} unread</span>
              )}
            </div>
            <div className="text-gray-600">
              AI Generated
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
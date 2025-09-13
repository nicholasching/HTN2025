'use client';

import { useState, useEffect } from 'react';
import { fetchAccounts, fetchChats, fetchMessages } from '@/lib/beeper';
import type { Account, Chat, Message } from '@/lib/beeper';
import { sendMessage } from '@/lib/beeper/postMessages';
import SimpleWingman from './SimpleWingman';

export default function BeeperExample() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [workflowStep, setWorkflowStep] = useState<string>('Initializing...');
  const [workflowCompleted, setWorkflowCompleted] = useState<boolean>(false);
  const [messageInput, setMessageInput] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Load access token from environment variable on component mount
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN;
    
    if (token && token !== 'your_access_token_here') {
      setAccessToken(token);
      // Automatically run the full workflow when token is loaded
      runFullWorkflow(token);
    }
  }, []);

  // Filter chats based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat => {
        const chatData = chat as any;
        const chatName = (chatData.name || chatData.title || '').toLowerCase();
        return chatName.includes(searchQuery.toLowerCase());
      });
      setFilteredChats(filtered);
    }
  }, [chats, searchQuery]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 0);
    }
  }, [messages, selectedChat]);

  // Calculate unread messages count
  useEffect(() => {
    const unreadMessages = messages.filter(message => {
      const messageData = message as any;
      return messageData.isUnread === true;
    });
    setUnreadCount(unreadMessages.length);
  }, [messages]);

  // Full workflow function that mimics test.ts behavior
  const runFullWorkflow = async (token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Fetch all available accounts
      setWorkflowStep('Fetching accounts...');
      const accountsData = await fetchAccounts(token);
      setAccounts(accountsData);
      
      if (accountsData.length === 0) {
        return;
      }
      
      // Step 2: Find the Instagram account
      setWorkflowStep('Finding Instagram account...');
      const instagramAccount = accountsData.find(account => account.accountID === 'instagramgo');
      
      if (!instagramAccount) {
        // If no Instagram, use the last account as fallback
        const fallbackAccount = accountsData[accountsData.length - 1];
        setSelectedAccount(fallbackAccount.accountID);
        
        // Step 3: Fetch chats for fallback account
        setWorkflowStep(`Fetching chats for ${fallbackAccount.network}...`);
        const chatsData = await fetchChats(fallbackAccount.accountID, token);
        setChats(chatsData);
        
        if (chatsData.length > 0) {
          // Step 4: Get messages from first chat
          const firstChat = chatsData[0];
          setSelectedChat(firstChat.id);
          setWorkflowStep('Fetching messages from first chat...');
          const messagesData = await fetchMessages(firstChat.id, 100, token);
          setMessages(messagesData);
        }
        return;
      }
      
      setSelectedAccount(instagramAccount.accountID);
      
      // Step 3: Fetch chats for Instagram account
      setWorkflowStep('Fetching Instagram chats...');
      const chatsData = await fetchChats(instagramAccount.accountID, token);
      setChats(chatsData);
      
      if (chatsData.length === 0) {
        return;
      }
      
      // Step 4: Get the first chat
      const firstChat = chatsData[0];
      setSelectedChat(firstChat.id);
      
      // Step 5: Fetch messages from the first chat
      setWorkflowStep('Fetching messages from first chat...');
      const messagesData = await fetchMessages(firstChat.id, 100, token);
      setMessages(messagesData);
      
      setWorkflowStep('Workflow completed successfully! 🎉');
      setWorkflowCompleted(true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Workflow failed: ${errorMessage}`);
      setWorkflowStep('Workflow failed ❌');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAccounts = async (token?: string) => {
    const currentToken = token || accessToken;
    if (!currentToken) {
      return;
    }

    setLoading(true);
    try {
      const accountsData = await fetchAccounts(currentToken);
      setAccounts(accountsData);
    } catch (error) {
      // Handle error silently in production
    } finally {
      setLoading(false);
    }
  };

  const handleFetchChats = async (accountID: string) => {
    if (!accessToken) return;
    
    // Clear previous chats and messages when selecting a new account
    if (selectedAccount !== accountID) {
      setChats([]);
      setMessages([]);
      setSelectedChat('');
      setSelectedAccount(accountID);
    }

    setLoading(true);
    setError(null);
    try {
      const chatsData = await fetchChats(accountID, accessToken);
      setChats(chatsData);
      
      // Auto-select the first chat if none is selected
      if (chatsData.length > 0 && !selectedChat) {
        const firstChat = chatsData[0];
        handleFetchMessages(firstChat.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to fetch chats: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMessages = async (chatID: string) => {
    if (!accessToken) {
      return;
    }
    
    // Clear previous messages immediately when selecting a new chat
    if (selectedChat !== chatID) {
      setMessages([]);
    }
    
    // Always set the selected chat, even if we fail to load messages
    setSelectedChat(chatID);

    setLoading(true);
    try {
      const messagesData = await fetchMessages(chatID, 100, accessToken);
      setMessages(messagesData);
      // Ensure we scroll to bottom after loading messages
      setTimeout(scrollToBottom, 100);
      
      // Mark messages as read after a short delay (simulating read receipt)
      setTimeout(() => {
        setMessages(prevMessages => 
          prevMessages.map(message => ({
            ...message,
            isUnread: false
          }))
        );
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to fetch messages: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!accessToken || !selectedChat || !messageInput.trim()) {
      return;
    }

    setSendingMessage(true);
    setError(null);

    try {
      const response = await sendMessage({
        chatID: selectedChat,
        text: messageInput.trim()
      }, accessToken);
      
      // Clear the input and refresh messages
      setMessageInput('');
      setTimeout(() => {
        handleFetchMessages(selectedChat);
        // Ensure we scroll to bottom after refreshing messages
        setTimeout(scrollToBottom, 100);
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to send message: ${errorMessage}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Enter key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle AI wingman suggestion generation and auto-fill
  const handleWingmanSuggestion = (suggestion: string) => {
    setMessageInput(suggestion);
    // Trigger resize after setting the value
    setTimeout(() => {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = newHeight + 'px';
        
        // Enable scrolling if content exceeds max height
        if (textarea.scrollHeight > 120) {
          textarea.style.overflowY = 'auto';
        } else {
          textarea.style.overflowY = 'hidden';
        }
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100">
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
      {/* Modern Header */}
      <div className="bg-[#1a1a1a] border-b border-gray-800/50 backdrop-blur-lg">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1a1a1a] animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Beeper Desktop API</h1>
                <p className="text-xs text-gray-400">Testing Dashboard v2.0</p>
              </div>
            </div>
            
            {/* Status and Actions */}
            <div className="flex items-center gap-4">
              {accessToken ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400 font-medium">API Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm text-red-400 font-medium">Disconnected</span>
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="p-2 hover:bg-gray-800/50 rounded-lg transition-all hover:scale-105"
                title="Refresh Dashboard"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          {loading && (
            <div className="mt-3">
              <div className="w-full bg-gray-800/50 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-shimmer" 
                     style={{ width: '60%', animation: 'shimmer 2s ease-in-out infinite' }}></div>
            </div>
            <div className="text-xs text-gray-400 mt-1">{workflowStep}</div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="max-w-6xl mx-auto mt-2 p-3 bg-red-900/50 border border-red-700 rounded-lg">
            <div className="text-sm text-red-300">❌ {error}</div>
            <div className="text-xs text-red-400 mt-1">Check browser console for details</div>
          </div>
        )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6">
        {/* Main Content Grid - Production Layout */}
        <div className="flex gap-4 h-[calc(100vh-200px)]">

          {/* Network Sidebar - Compact Icon Bar */}
          <div className="w-16 bg-[#1a1a1a] rounded-xl border border-gray-800/50 flex flex-col items-center py-4 space-y-3">
            {accounts.map((account) => (
              <button
                key={account.accountID}
                onClick={() => handleFetchChats(account.accountID)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-110 ${
                  selectedAccount === account.accountID 
                    ? 'bg-purple-500 shadow-lg shadow-purple-500/30' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={account.network}
              >
                {account.network === 'Instagram' ? '📷' :
                 account.network === 'WhatsApp' ? '💬' :
                 account.network === 'Discord' ? '🎮' :
                 account.network === 'Google Messages' ? '📱' :
                 account.network === 'Google Chat' ? '💼' :
                 account.network === 'LinkedIn' ? '💼' :
                 account.network.charAt(0)}
              </button>
            ))}
          </div>

          {/* Chats Panel - Compact Design */}
          {chats.length > 0 && (
            <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-gray-800/50 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-800/50">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-white">
                    {accounts.find(a => a.accountID === selectedAccount)?.network} Chats
                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                      {filteredChats.length}
                    </span>
                  </h2>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                  />
                  <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    <div className="text-sm">
                      {searchQuery ? `No chats found matching "${searchQuery}"` : 'No chats available'}
                    </div>
                  </div>
                ) : (
                  filteredChats.map((chat, index) => {
                  const chatData = chat as any;
                  const chatName = chatData.name || chatData.title || 'Unnamed Chat';
                  const lastMessage = chatData.lastMessage?.text || chatData.lastMessage?.content;
                  
                  return (
                    <div
                      key={chat.id}
                      className={`p-3 border-b border-gray-800/30 cursor-pointer transition-all hover:bg-gray-800/30 ${
                        selectedChat === chat.id 
                          ? 'bg-green-500/10 border-l-4 border-l-green-500' 
                          : 'hover:pl-4'
                      }`}
                      onClick={() => handleFetchMessages(chat.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Chat Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          chat.type === 'group' ? 'bg-blue-600' : 'bg-gray-600'
                        }`}>
                          {chat.type === 'group' ? '#' : chatName.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white truncate text-sm">{chatName}</span>
                            {selectedChat === chat.id && (
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            )}
                          </div>
                          {lastMessage && (
                            <div className="text-xs text-gray-500 truncate mt-1">
                              {lastMessage.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Messages Panel - Compact Design */}
          <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-gray-800/50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                 <h2 className="text-lg font-semibold text-white">
                   Messages
                   {unreadCount > 0 && (
                     <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full">
                       {unreadCount} unread
                     </span>
                   )}
                 </h2>
                {loading && (
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Loading...</span>
                  </div>
                )}
              </div>
            </div>
            <div id="messages-container" className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {loading && selectedChat && messages.length === 0 ? (
                  // Loading state for messages
                  <div className="p-4 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-sm text-gray-400">Loading messages...</div>
                  </div>
                ) : messages.length === 0 && selectedChat ? (
                  // Empty state
                  <div className="p-4 text-center text-gray-400">
                    <div className="text-sm">No messages found in this chat</div>
                  </div>
                ) : (
                  messages.map((message, index) => {
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
                   const isMe = messageData.isSender || senderName.toLowerCase().includes('nicholas') || senderName.toLowerCase().includes('you');
                   const isUnread = messageData.isUnread === true;
                  
                  // Format timestamp properly
                  const timestamp = messageData.timestamp;
                  let formattedTime = 'Now';
                  try {
                    if (typeof timestamp === 'number') {
                      const date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
                      formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else if (typeof timestamp === 'string') {
                      const date = new Date(timestamp);
                      formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                  } catch {
                    formattedTime = 'Unknown';
                  }
                  
                   return (
                     <div key={message.id || index} className={`p-2 hover:bg-gray-800/30 transition-colors border-b border-gray-800/30 ${
                       isUnread ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                     }`}>
                       <div className="flex items-start gap-2">
                         {/* Sender Avatar */}
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                           isMe ? 'bg-purple-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'
                         }`}>
                           {senderName.charAt(0).toUpperCase()}
                         </div>
                         
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <span className={`text-xs font-medium ${isMe ? 'text-purple-400' : 'text-gray-300'}`}>
                               {senderName}
                             </span>
                             <span className="text-xs text-gray-500">
                               {formattedTime}
                             </span>
                             {isMe && (
                               <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                                 You
                               </span>
                             )}
                             {isUnread && !isMe && (
                               <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                                 New
                               </span>
                             )}
                           </div>
                           <div className={`text-sm leading-relaxed break-words ${
                             isUnread ? 'text-white font-medium' : 'text-gray-200'
                           }`}>
                             {content}
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                  })
                )}
            </div>
            
            {/* Message Input - Production Design */}
            <div className="p-4 border-t border-gray-800/50 bg-gray-800/30">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={(textarea) => {
                    if (textarea) {
                      textarea.addEventListener('input', () => {
                        textarea.style.height = 'auto';
                        const newHeight = Math.min(textarea.scrollHeight, 120);
                        textarea.style.height = newHeight + 'px';
                        
                        // Enable scrolling if content exceeds max height
                        if (textarea.scrollHeight > 120) {
                          textarea.style.overflowY = 'auto';
                        } else {
                          textarea.style.overflowY = 'hidden';
                        }
                      });
                    }
                  }}
                  placeholder={selectedChat 
                    ? `Send a message to ${((chats.find(c => c.id === selectedChat) as any)?.name || 
                                         (chats.find(c => c.id === selectedChat) as any)?.title || 
                                         'this chat')}...`
                    : 'Select a chat first...'}
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                  }}
                  onKeyPress={selectedChat ? handleKeyPress : undefined}
                  disabled={!selectedChat || sendingMessage}
                  rows={1}
                  className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm resize-none"
                  style={{
                    minHeight: '40px',
                    height: '40px',
                    overflowY: 'hidden',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#6B7280 #374151'
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!selectedChat || sendingMessage || !messageInput.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {sendingMessage ? (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Sending...</span>
                    </div>
                  ) : (
                    '📤 Send'
                  )}
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Simple AI Wingman - Bottom Right Corner */}
      <SimpleWingman 
        messages={messages}
        onSuggestionGenerated={handleWingmanSuggestion}
      />
    </div>
  );
}

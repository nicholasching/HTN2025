'use client';

import { useState, useEffect } from 'react';
import { fetchAccounts, fetchChats, fetchMessages } from '@/lib/beeper';
import type { Account, Chat, Message } from '@/lib/beeper';

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

  // Load access token from environment variable on component mount
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN;
    console.log('🔍 Debug: Token check:', token ? 'Token found' : 'No token found');
    console.log('🔍 Debug: Token value:', token?.substring(0, 20) + '...' || 'undefined');
    
    if (token && token !== 'your_access_token_here') {
      console.log('✅ Valid token found, setting state and running workflow');
      setAccessToken(token);
      // Automatically run the full workflow when token is loaded
      runFullWorkflow(token);
    } else {
      console.warn('⚠️  No Beeper access token found. Please set NEXT_PUBLIC_BEEPER_ACCESS_TOKEN in your .env.local file');
      console.log('🔍 Debug: Current token value:', token);
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

  // Full workflow function that mimics test.ts behavior
  const runFullWorkflow = async (token: string) => {
    console.log('🚀 Starting runFullWorkflow with token:', token.substring(0, 20) + '...');
    setLoading(true);
    setError(null);
    
    try {
      console.log('🧪 Starting Beeper API Workflow...');
      console.log('Workflow: All Accounts → Instagram Chats → First Chat Messages (100)');
      
      // Step 1: Fetch all available accounts
      setWorkflowStep('Fetching accounts...');
      console.log('\n📋 STEP 1: Fetching all available accounts...');
      const accountsData = await fetchAccounts(token);
      setAccounts(accountsData);
      
      if (accountsData.length === 0) {
        console.log('❌ No connected accounts found.');
        return;
      }
      
      // Step 2: Find the Instagram account
      setWorkflowStep('Finding Instagram account...');
      console.log('\n🎯 STEP 2: Finding Instagram account...');
      const instagramAccount = accountsData.find(account => account.accountID === 'instagramgo');
      
      if (!instagramAccount) {
        console.log('❌ Instagram account not found. Available accounts:');
        accountsData.forEach(acc => console.log(`  - ${acc.network} (${acc.accountID})`));
        
        // If no Instagram, use the last account as fallback
        const fallbackAccount = accountsData[accountsData.length - 1];
        console.log(`🔄 Using fallback account: ${fallbackAccount.network} (${fallbackAccount.accountID})`);
        setSelectedAccount(fallbackAccount.accountID);
        
        // Step 3: Fetch chats for fallback account
        setWorkflowStep(`Fetching chats for ${fallbackAccount.network}...`);
        console.log(`\n💬 STEP 3: Fetching chats for ${fallbackAccount.network}...`);
        const chatsData = await fetchChats(fallbackAccount.accountID, token);
        setChats(chatsData);
        
        if (chatsData.length > 0) {
          // Step 4: Get messages from first chat
          const firstChat = chatsData[0];
          setSelectedChat(firstChat.id);
          setWorkflowStep('Fetching messages from first chat...');
          console.log(`\n📨 STEP 4: Fetching messages from first chat...`);
          const messagesData = await fetchMessages(firstChat.id, 100, token);
          setMessages(messagesData);
          
          console.log(`✅ Workflow completed with ${fallbackAccount.network}!`);
          console.log(`Total: ${accountsData.length} accounts → ${chatsData.length} chats → ${messagesData.length} messages`);
        }
        return;
      }
      
      console.log(`✅ Found Instagram account: ${instagramAccount.network} (ID: ${instagramAccount.accountID})`);
      setSelectedAccount(instagramAccount.accountID);
      
      // Step 3: Fetch chats for Instagram account
      setWorkflowStep('Fetching Instagram chats...');
      console.log('\n💬 STEP 3: Fetching chats for Instagram account...');
      const chatsData = await fetchChats(instagramAccount.accountID, token);
      setChats(chatsData);
      
      if (chatsData.length === 0) {
        console.log(`❌ No chats found for Instagram account.`);
        return;
      }
      
      // Step 4: Get the first chat
      console.log('\n🎯 STEP 4: Selecting the first chat from Instagram...');
      const firstChat = chatsData[0];
      const chatData = firstChat as any;
      const chatName = chatData.name || chatData.title || 'Unnamed Chat';
      console.log(`Selected first chat: ${chatName} (ID: ${firstChat.id})`);
      setSelectedChat(firstChat.id);
      
      // Step 5: Fetch messages from the first chat
      setWorkflowStep('Fetching messages from first chat...');
      console.log('\n📨 STEP 5: Fetching the last 100 messages from the first chat...');
      const messagesData = await fetchMessages(firstChat.id, 100, token);
      setMessages(messagesData);
      
      // Step 6: Display results
      console.log('\n📊 STEP 6: Workflow completed!');
      console.log(`🎉 Results Summary:`);
      console.log(`Selected Account: ${instagramAccount.network} (${instagramAccount.accountID})`);
      console.log(`Selected Chat: ${chatName} (${firstChat.id})`);
      console.log(`Messages Fetched: ${messagesData.length}`);
      console.log(`Total workflow: ${accountsData.length} accounts → ${chatsData.length} chats → ${messagesData.length} messages`);
      
      setWorkflowStep('Workflow completed successfully! 🎉');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Workflow failed:', errorMessage);
      setError(`Workflow failed: ${errorMessage}`);
      setWorkflowStep('Workflow failed ❌');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAccounts = async (token?: string) => {
    const currentToken = token || accessToken;
    if (!currentToken) {
      console.error('No access token available');
      return;
    }

    setLoading(true);
    try {
      const accountsData = await fetchAccounts(currentToken);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error fetching accounts:', error);
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
      console.log(`🔄 Fetching chats for account: ${accountID}`);
      const chatsData = await fetchChats(accountID, accessToken);
      setChats(chatsData);
      console.log(`✅ Loaded ${chatsData.length} chats for account ${accountID}`);
    } catch (error) {
      console.error('Error fetching chats:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to fetch chats: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMessages = async (chatID: string) => {
    if (!accessToken) return;
    
    // Clear previous messages immediately when selecting a new chat
    if (selectedChat !== chatID) {
      setMessages([]);
      setSelectedChat(chatID);
    }

    setLoading(true);
    try {
      console.log(`🔄 Fetching messages for chat: ${chatID}`);
      const messagesData = await fetchMessages(chatID, 100, accessToken); // Increased to 100 messages
      setMessages(messagesData);
      console.log(`✅ Loaded ${messagesData.length} messages for chat ${chatID}`);
    } catch (error) {
      console.error('Error fetching messages:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to fetch messages: ${errorMessage}`);
      // Don't clear selectedChat on error, so user can try again
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <h1 className="text-xl font-semibold">Beeper API Demo</h1>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {accessToken ? (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-green-400">Connected</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-sm text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>
        
        {/* Loading Bar */}
        {loading && (
          <div className="max-w-6xl mx-auto mt-2">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div className="bg-purple-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
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

      <div className="max-w-6xl mx-auto p-4">
        {/* Workflow Stats */}
        {accounts.length > 0 && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">
                🔄 Workflow Progress: 
                <span className="text-purple-400 ml-2">
                  {accounts.length} accounts → {chats.length} chats → {messages.length} messages
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {!loading && workflowStep}
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">

          {/* Accounts Panel */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                Accounts ({accounts.length})
              </h2>
              {selectedAccount && (
                <div className="text-sm text-purple-400 mt-1">
                  Active: {accounts.find(a => a.accountID === selectedAccount)?.network}
                </div>
              )}
            </div>
            <div className="overflow-y-auto max-h-96">
              {accounts.map((account) => (
                <div
                  key={account.accountID}
                  className={`p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-750 ${
                    selectedAccount === account.accountID 
                      ? 'bg-purple-900/30 border-l-4 border-l-purple-500' 
                      : ''
                  }`}
                  onClick={() => handleFetchChats(account.accountID)}
                >
                  <div className="flex items-center gap-3">
                    {/* Network Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      account.network === 'Instagram' ? 'bg-pink-600' :
                      account.network === 'WhatsApp' ? 'bg-green-600' :
                      account.network === 'Discord' ? 'bg-indigo-600' :
                      account.network === 'Telegram' ? 'bg-blue-600' :
                      'bg-gray-600'
                    }`}>
                      {account.network.charAt(0)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{account.network}</span>
                        {account.accountID === 'instagramgo' && (
                          <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                            Target
                          </span>
                        )}
                        {selectedAccount === account.accountID && (
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        )}
                      </div>
                      {account.user && (
                        <div className="text-sm text-gray-400">
                          {account.user.displayName || account.user.name || 'Unknown'}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">ID: {account.accountID}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chats Panel */}
          {chats.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">
                  {accounts.find(a => a.accountID === selectedAccount)?.network} Chats ({filteredChats.length}{chats.length !== filteredChats.length ? ` of ${chats.length}` : ''})
                </h2>
                {selectedChat && (
                  <div className="text-sm text-green-400 mt-1">
                    Active: {((chats.find(c => c.id === selectedChat) as any)?.name || 
                             (chats.find(c => c.id === selectedChat) as any)?.title || 
                             'Unnamed Chat')}
                  </div>
                )}
                
                {/* Search Bar */}
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-96">
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
                      className={`p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-750 ${
                        selectedChat === chat.id 
                          ? 'bg-green-900/30 border-l-4 border-l-green-500' 
                          : ''
                      }`}
                      onClick={() => handleFetchMessages(chat.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Chat Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          chat.type === 'group' ? 'bg-blue-600' : 'bg-gray-600'
                        }`}>
                          {chat.type === 'group' ? '#' : chatName.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white truncate">{chatName}</span>
                            {index === 0 && (
                              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                                First
                              </span>
                            )}
                            {selectedChat === chat.id && (
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 capitalize">{chat.type} chat</div>
                          {lastMessage && (
                            <div className="text-sm text-gray-500 truncate mt-1">
                              {lastMessage.substring(0, 40)}...
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

          {/* Messages Panel */}
          {messages.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">
                  Messages ({messages.length})
                </h2>
                <div className="text-sm text-blue-400 mt-1">
                  From: {((chats.find(c => c.id === selectedChat) as any)?.name || 
                         (chats.find(c => c.id === selectedChat) as any)?.title || 
                         'Selected Chat')}
                </div>
              </div>
              <div className="overflow-y-auto max-h-96 space-y-1">
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
                    <div key={message.id || index} className="p-3 hover:bg-gray-750 transition-colors border-b border-gray-700/50">
                      <div className="flex items-start gap-3">
                        {/* Sender Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isMe ? 'bg-purple-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'
                        }`}>
                          {senderName.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${isMe ? 'text-purple-400' : 'text-gray-300'}`}>
                              {senderName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formattedTime}
                            </span>
                            {isMe && (
                              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-200 leading-relaxed break-words">
                            {content}
                          </div>
                          {/* Show message metadata on hover */}
                          <div className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            ID: {message.id || messageData.messageID || messageData.guid}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

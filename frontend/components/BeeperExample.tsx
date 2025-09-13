'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAccounts, fetchChats, fetchMessages, fetchMessagesLimited } from '@/lib/beeper';
import type { Account, Chat, Message } from '@/lib/beeper';
import { sendMessage } from '@/lib/beeper/postMessages';
import SimpleWingman from './SimpleWingman';
// Remove ChatSummary import since we're deleting that file
// import ChatSummary from './ChatSummary';
import ChatSummaryBadge from './ChatSummaryBadge';
import HoverableText from './HoverableText';
import ProfessionalTextFloatingWidget from './ProfessionalTextFloatingWidget';

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
  
  // AI Agent states
  const [agentEnabled, setAgentEnabled] = useState<boolean>(false);
  const [agentInstructions, setAgentInstructions] = useState<string>('');
  const [showAgentSettings, setShowAgentSettings] = useState<boolean>(false);
  const [agentInstructionsMap, setAgentInstructionsMap] = useState<Record<string, string>>({});
  const [isGeneratingResponse, setIsGeneratingResponse] = useState<boolean>(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showSummaryOverlay, setShowSummaryOverlay] = useState<boolean>(false);
  const [chatSummaries, setChatSummaries] = useState<Record<string, { messages: Message[], unreadCount: number }>>({});
  
  // Auto-draft response states
  const [autoDraftResponse, setAutoDraftResponse] = useState<string>('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState<boolean>(false);
  const [showDraftIndicator, setShowDraftIndicator] = useState<boolean>(false);
  const [aiNotConfident, setAiNotConfident] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [messageLoadProgress, setMessageLoadProgress] = useState<string>('');
  const draftGeneratedForChat = useRef<string>('');
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null);

  // Load access token from environment variable on component mount
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN;
    
    if (token && token !== 'your_access_token_here') {
      setAccessToken(token);
      // Automatically run the full workflow when token is loaded
      runFullWorkflow(token);
    }
  }, []);

  // Load agent instructions from localStorage on component mount
  useEffect(() => {
    const savedInstructions = localStorage.getItem('beeper-agent-instructions');
    if (savedInstructions) {
      try {
        const parsed = JSON.parse(savedInstructions);
        setAgentInstructionsMap(parsed);
      } catch (error) {
        console.error('Error loading agent instructions:', error);
      }
    }
  }, []);

  // Save agent instructions to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(agentInstructionsMap).length > 0) {
      localStorage.setItem('beeper-agent-instructions', JSON.stringify(agentInstructionsMap));
    }
  }, [agentInstructionsMap]);

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
      }, 100);
    }
  }, [messages, selectedChat]);

  // Calculate unread messages count and update chat summaries
  useEffect(() => {
    const unreadMessages = messages.filter(message => {
      const messageData = message as any;
      return messageData.isUnread === true;
    });
    setUnreadCount(unreadMessages.length);

    // Update chat summaries for the current chat
    if (selectedChat) {
      setChatSummaries(prev => ({
        ...prev,
        [selectedChat]: {
          messages: messages,
          unreadCount: unreadMessages.length
        }
      }));
    }
  }, [messages, selectedChat]);

  // Show summary overlay when a chat is first opened
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      const chatSummary = chatSummaries[selectedChat];
      if (chatSummary && chatSummary.unreadCount > 0) {
        setShowSummaryOverlay(true);
      }
    }
  }, [selectedChat, messages, chatSummaries]);

  // Generate auto-draft response when a chat is opened (if last message wasn't from user)
  useEffect(() => {
    const generateDraftForNewChat = async () => {
      if (!selectedChat || messages.length === 0 || isGeneratingDraft) {
        return;
      }

      // Only generate draft if message input is empty
      if (messageInput.trim()) {
        return;
      }

      // Don't generate if we already generated a draft for this chat
      if (draftGeneratedForChat.current === selectedChat) {
        return;
      }

      console.log('🤖 Checking if auto-draft should be generated...');
      setIsGeneratingDraft(true);
      setShowDraftIndicator(true);

      try {
        const draftResponse = await generateAutoDraftResponse(messages);
        if (draftResponse.trim()) {
          setAutoDraftResponse(draftResponse);
          setAiNotConfident(false);
          draftGeneratedForChat.current = selectedChat; // Mark that we've generated a draft for this chat
          console.log('✅ Auto-draft generated:', draftResponse.substring(0, 50) + '...');
        } else {
          setShowDraftIndicator(false);
          setAiNotConfident(true);
          console.log('⏭️ No auto-draft generated (AI not confident or last message was from user)');
        }
      } catch (error) {
        console.error('❌ Error generating auto-draft:', error);
        setShowDraftIndicator(false);
        setAiNotConfident(true);
      } finally {
        setIsGeneratingDraft(false);
      }
    };

    // Add a small delay to ensure messages are fully loaded
    const timeoutId = setTimeout(generateDraftForNewChat, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedChat, messages, messageInput, isGeneratingDraft]);

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
          const messagesData = await fetchMessages(firstChat.id, 100, token, {}, true);
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
      const messagesData = await fetchMessages(firstChat.id, 100, token, {}, true);
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
      setChatSummaries({});
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
      // Clear any existing auto-draft when switching chats
      setAutoDraftResponse('');
      setShowDraftIndicator(false);
      setIsGeneratingDraft(false);
      setAiNotConfident(false);
      draftGeneratedForChat.current = ''; // Reset the draft tracking
    }
    
    // Always set the selected chat, even if we fail to load messages
    setSelectedChat(chatID);

    setLoading(true);
    setIsLoadingMessages(true);
    setMessageLoadProgress('Loading messages...');
    try {
      const messagesData = await fetchMessages(chatID, 100, accessToken, {}, true);
      setMessages(messagesData);
      setMessageLoadProgress(`Loaded ${messagesData.length} messages`);
      // Ensure we scroll to bottom after loading messages
      setTimeout(scrollToBottom, 100);
      
      // Mark messages as read after a short delay (simulating read receipt)
      // Commented out to prevent AI summaries from disappearing
      // setTimeout(() => {
      //   setMessages(prevMessages => 
      //     prevMessages.map(message => ({
      //       ...message,
      //       isUnread: false
      //     }))
      //   );
      // }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to fetch messages: ${errorMessage}`);
    } finally {
      setLoading(false);
      setIsLoadingMessages(false);
      // Clear progress message after a delay
      setTimeout(() => setMessageLoadProgress(''), 2000);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        // Add a small delay to ensure content is rendered
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
      }
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
      // Clear any auto-draft when message is sent
      setAutoDraftResponse('');
      setShowDraftIndicator(false);
      setAiNotConfident(false);
      draftGeneratedForChat.current = ''; // Reset so we can generate a new draft if needed
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

  // Handle keydown events for Ctrl+Space
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' && e.ctrlKey && showDraftIndicator && autoDraftResponse.trim()) {
      e.preventDefault();
      // Accept the auto-draft with Ctrl+Space
      acceptAutoDraft();
    }
  };

  // Accept the auto-draft response
  const acceptAutoDraft = () => {
    setMessageInput(autoDraftResponse);
    setAutoDraftResponse('');
    setShowDraftIndicator(false);
    setAiNotConfident(false);
    draftGeneratedForChat.current = ''; // Reset so we can generate a new draft if needed
    
    // Trigger textarea resize
    setTimeout(() => {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = newHeight + 'px';
        
        if (textarea.scrollHeight > 120) {
          textarea.style.overflowY = 'auto';
        } else {
          textarea.style.overflowY = 'hidden';
        }
      }
    }, 50);
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

  // Generate AI response using Cohere API
  const generateAIResponse = async (message: string, contextMessages: Message[] = []): Promise<{ response: string; confidence: number }> => {
    try {
      // Format context messages as a string
      const contextString = contextMessages.slice(0, 25).map(msg => {
        const senderName = msg.senderName || 
                         msg.sender?.name || 
                         msg.sender?.displayName || 
                         (msg.isSender ? 'You' : 'Other');
        const text = msg.text || '';
        return `${senderName}: ${text}`;
      }).join('\n');

      const response = await fetch('/api/cohere/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          instructions: agentInstructionsMap[selectedChat] || '',
          contextMessages: contextString
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return { response: '', confidence: 0 };
    }
  };

  // Generate auto-draft response for new chat
  const generateAutoDraftResponse = async (messages: Message[]): Promise<string> => {
    try {
      if (messages.length === 0) {
        return '';
      }

      // Sort messages by timestamp (newest first) to find the latest message
      const sortedMessages = messages.sort((a, b) => {
        const aTime = new Date(a.timestamp || 0).getTime();
        const bTime = new Date(b.timestamp || 0).getTime();
        return bTime - aTime;
      });

      // Get the latest message
      const latestMessage = sortedMessages[0];
      if (!latestMessage) {
        return '';
      }

      // Check if the latest message is from the user
      const isFromUser = latestMessage.isSender || 
                        latestMessage.isMe || 
                        (latestMessage.senderName && latestMessage.senderName.toLowerCase().includes('you')) ||
                        (latestMessage.sender && latestMessage.sender.isSelf);

      // Only generate draft if the latest message is NOT from the user
      if (isFromUser) {
        return '';
      }

      // Format context for draft generation
      const contextString = messages.slice(0, 10).map(msg => {
        const senderName = msg.senderName || 
                         msg.sender?.name || 
                         msg.sender?.displayName || 
                         (msg.isSender ? 'You' : 'Other');
        const text = msg.text || '';
        return `${senderName}: ${text}`;
      }).join('\n');

      const response = await fetch('/api/cohere/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: latestMessage.text || '',
          instructions: `You are helping draft a response to a message. Generate a brief, helpful, and natural response that the user can send to the recipient.

IMPORTANT RULES:
- Write the response as if YOU are the user responding to the recipient
- Keep it conversational and appropriate for the context
- Be helpful and engaging
- Keep responses concise (1-2 sentences typically)
- If you're not confident you can provide a good response, return exactly: "NO_CONFIDENT_RESPONSE"
- Do not include any meta-commentary or explanations
- Write in first person ("I", "me", "my") as if you are the user

Context of recent conversation:
${contextString}

Message to respond to: ${latestMessage.text || ''}

Generate a natural response:`,
          contextMessages: contextString
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.response || '';
      
      // Check if the AI is not confident enough to respond
      if (responseText.trim() === 'NO_CONFIDENT_RESPONSE') {
        return '';
      }
      
      return responseText;
    } catch (error) {
      console.error('Error generating auto-draft response:', error);
      return '';
    }
  };

  // Check for unread messages and respond to the latest one
  const checkForUnreadMessages = async () => {
    if (!selectedChat || !agentEnabled || !agentInstructionsMap[selectedChat]) {
      console.log('AI Agent check skipped:', { selectedChat, agentEnabled, hasInstructions: !!agentInstructionsMap[selectedChat] });
      return;
    }

    if (isGeneratingResponse) {
      console.log('⏭️ Skipping check - already generating response');
      return;
    }

    try {
      console.log('🔍 Checking for unread messages...');
      
      // Fetch recent messages from the chat (last 25 for context)
      const messages = await fetchMessagesLimited(selectedChat, 25, accessToken!);
      console.log('📨 Fetched', messages.length, 'messages from chat');
      
      if (messages.length === 0) {
        console.log('📭 No messages found');
        return;
      }

      // Sort messages by timestamp (newest first)
      const sortedMessages = messages.sort((a: Message, b: Message) => {
        const aTime = new Date(a.timestamp || 0).getTime();
        const bTime = new Date(b.timestamp || 0).getTime();
        return bTime - aTime;
      });
      
      // Find the latest unread message that's not from the user
      let latestUnreadMessage = null;
      for (const message of sortedMessages) {
        // Check if message is unread (if the API provides this info)
        const isUnread = (message as any).isUnread === true;
        
        // Check if this message is from the user
        const isFromUser = message.isSender || 
                          message.isMe || 
                          (message.senderName && message.senderName.toLowerCase().includes('you')) ||
                          (message.sender && message.sender.isSelf);
        
        // If it's unread and not from user, this is our target
        if (isUnread && !isFromUser) {
          latestUnreadMessage = message;
          break;
        }
      }
      
      // If no unread messages found, check the latest message anyway (fallback)
      if (!latestUnreadMessage) {
        const latestMessage = sortedMessages[0];
        const isFromUser = latestMessage.isSender || 
                          latestMessage.isMe || 
                          (latestMessage.senderName && latestMessage.senderName.toLowerCase().includes('you')) ||
                          (latestMessage.sender && latestMessage.sender.isSelf);
        
        if (!isFromUser) {
          latestUnreadMessage = latestMessage;
          console.log('📝 Using latest message as fallback (no unread flag detected)');
        }
      }
      
      if (!latestUnreadMessage) {
        console.log('📭 No unread messages from other users found');
        return;
      }

      console.log('📝 Latest unread message:', {
        id: latestUnreadMessage.id,
        text: latestUnreadMessage.text,
        timestamp: latestUnreadMessage.timestamp,
        isSender: latestUnreadMessage.isSender,
        senderName: latestUnreadMessage.senderName,
        isUnread: (latestUnreadMessage as any).isUnread
      });

      const messageText = latestUnreadMessage.text || '';
      
      if (!messageText.trim()) {
        console.log('⏭️ Skipping empty message');
        return;
      }

      console.log('✅ New unread message detected, generating response...');
      setIsGeneratingResponse(true);
      
      try {
        // Generate AI response with context
        const { response, confidence } = await generateAIResponse(messageText, sortedMessages);
        
        console.log('🤖 AI Response generated:', { response: response.substring(0, 100) + '...', confidence });
        
        if (confidence >= 0.7 && response.trim()) {
          console.log('📤 Sending AI response...');
          
          // Send the AI response
          const sendResult = await sendMessage({
            chatID: selectedChat,
            text: response.trim()
          }, accessToken!);
          
          console.log('📤 Send result:', sendResult);
          
          if (sendResult.success) {
            // Refresh messages to show the response
            setTimeout(async () => {
              await handleFetchMessages(selectedChat);
            }, 1500);
          } else {
            console.error('❌ Failed to send AI response:', sendResult.error);
          }
        } else {
          console.log('⏭️ AI not confident enough to respond:', { confidence, response: response.substring(0, 50) });
        }
      } catch (error) {
        console.error('❌ Error generating AI response:', error);
      } finally {
        setIsGeneratingResponse(false);
      }
    } catch (error) {
      console.error('❌ Error checking for unread messages:', error);
    }
  };

  // Recursive function to check for unread messages
  const scheduleNextCheck = () => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }
    
    checkTimeoutRef.current = setTimeout(async () => {
      // Only proceed if agent is still enabled
      if (!agentEnabled || !selectedChat || !agentInstructionsMap[selectedChat]) {
        console.log('❌ Agent disabled, stopping message checking');
        return;
      }
      
      await checkForUnreadMessages();
      // Schedule the next check only after this one completes
      scheduleNextCheck();
    }, 3000); // 3 seconds delay
  };

  // Set up recursive message checking
  useEffect(() => {
    console.log('🔄 Setting up message checking:', {
      agentEnabled,
      selectedChat,
      hasInstructions: !!agentInstructionsMap[selectedChat]
    });
    
    if (agentEnabled && selectedChat && agentInstructionsMap[selectedChat]) {
      console.log('✅ Starting recursive message checking (3 seconds between checks)');
      scheduleNextCheck();
      return () => {
        console.log('🛑 Clearing message checking timeout');
        if (checkTimeoutRef.current) {
          clearTimeout(checkTimeoutRef.current);
          checkTimeoutRef.current = null;
        }
      };
    } else {
      console.log('❌ Not starting message checking');
      // Clear any existing timeout
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
    }
  }, [agentEnabled, selectedChat, agentInstructionsMap]);

  // Handle agent toggle
  const handleAgentToggle = () => {
    if (!selectedChat) return;
    
    console.log('🔄 Agent toggle clicked:', {
      selectedChat,
      agentEnabled,
      hasInstructions: !!agentInstructionsMap[selectedChat]
    });
    
    if (agentEnabled) {
      // Disable agent
      console.log('🛑 Disabling AI agent');
      setAgentEnabled(false);
      setShowAgentSettings(false);
    } else {
      // Check if there are existing instructions for this chat
      if (agentInstructionsMap[selectedChat]) {
        // Enable agent with existing instructions
        console.log('✅ Enabling AI agent with existing instructions');
        setAgentEnabled(true);
        setShowAgentSettings(false);
      } else {
        // Show settings to create new instructions
        console.log('⚙️ Showing agent settings modal');
        setShowAgentSettings(true);
      }
    }
  };

  // Save agent instructions
  const handleSaveAgentInstructions = () => {
    if (!selectedChat || !agentInstructions.trim()) return;
    
    console.log('💾 Saving agent instructions:', {
      selectedChat,
      instructions: agentInstructions.trim(),
      length: agentInstructions.trim().length
    });
    
    setAgentInstructionsMap(prev => ({
      ...prev,
      [selectedChat]: agentInstructions.trim()
    }));
    
    setAgentEnabled(true);
    setShowAgentSettings(false);
    setAgentInstructions('');
    
    console.log('✅ Agent instructions saved and enabled');
  };

  // Edit existing instructions
  const handleEditInstructions = () => {
    if (selectedChat && agentInstructionsMap[selectedChat]) {
      setAgentInstructions(agentInstructionsMap[selectedChat]);
      setShowAgentSettings(true);
    }
  };

  // Delete agent instructions
  const handleDeleteInstructions = () => {
    if (!selectedChat) return;
    
    setAgentInstructionsMap(prev => {
      const newMap = { ...prev };
      delete newMap[selectedChat];
      return newMap;
    });
    
    setAgentEnabled(false);
    setShowAgentSettings(false);
    setAgentInstructions('');
  };
  // Get current chat data
  const currentChat = chats.find(chat => chat.id === selectedChat);
  const currentChatName = currentChat ? 
    (currentChat as any).name || (currentChat as any).title || 'Unnamed Chat' : 
    'Unknown Chat';

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
                <h1 className="text-xl font-semibold text-white">Wingman AI</h1>
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
        <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>

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
                  const chatSummary = chatSummaries[chat.id];
                  
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
                      
                      {/* AI Summary Badge */}
                      {chatSummary && chatSummary.unreadCount > 0 && (
                        <ChatSummaryBadge
                          chatId={chat.id}
                          chatName={chatName}
                          messages={chatSummary.messages}
                          unreadCount={chatSummary.unreadCount}
                          isExpanded={expandedSummaryId === chat.id}
                          onToggle={() => setExpandedSummaryId(
                            expandedSummaryId === chat.id ? null : chat.id
                          )}
                        />
                      )}
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
                 <div className="flex items-center gap-2">
                   {isGeneratingResponse && (
                     <div className="flex items-center gap-2 text-blue-400">
                       <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                       <span className="text-xs">AI Thinking...</span>
                     </div>
                   )}
                   {loading && (
                     <div className="flex items-center gap-2 text-green-400">
                       <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                       <span className="text-xs">Loading...</span>
                     </div>
                   )}
                   {isLoadingMessages && messageLoadProgress && (
                     <div className="flex items-center gap-2 text-blue-400">
                       <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                       <span className="text-xs">{messageLoadProgress}</span>
                     </div>
                   )}
                   {selectedChat && (
                     <div className="flex items-center gap-2">
                       <button
                         onClick={handleAgentToggle}
                         className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                           agentEnabled 
                             ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                             : 'bg-gray-600/20 text-gray-400 border border-gray-600/30 hover:bg-gray-500/20'
                         }`}
                         title={agentEnabled ? 'Disable AI Agent' : 'Enable AI Agent'}
                       >
                         {agentEnabled ? '🤖 AI ON' : '🤖 AI OFF'}
                       </button>
                       {agentInstructionsMap[selectedChat] && (
                         <button
                           onClick={handleEditInstructions}
                           className="px-2 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
                           title="Edit AI Agent Instructions"
                         >
                           ✏️ Edit
                         </button>
                       )}
                     </div>
                   )}
                 </div>
               </div>
             </div>
             
             {/* AI Agent Status Bar */}
             {selectedChat && agentEnabled && agentInstructionsMap[selectedChat] && (
               <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                   <span className="text-xs text-blue-300 font-medium">AI Agent Active</span>
                   <span className="text-xs text-blue-400/70">•</span>
                   <span className="text-xs text-blue-400/70">
                     {agentInstructionsMap[selectedChat].length} chars
                   </span>
                   <span className="text-xs text-blue-400/70">•</span>
                   <span className="text-xs text-blue-400/70 truncate max-w-xs">
                     {agentInstructionsMap[selectedChat].length > 50 
                       ? `${agentInstructionsMap[selectedChat].substring(0, 50)}...` 
                       : agentInstructionsMap[selectedChat]
                     }
                   </span>
                   <span className="text-xs text-blue-400/70">•</span>
                   <span className="text-xs text-blue-400/70">
                     Checking every 3s
                   </span>
                 </div>
                 <div className="flex items-center gap-2">
                   {isGeneratingResponse && (
                     <div className="flex items-center gap-1 text-xs text-blue-400">
                       <div className="w-2 h-2 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                       <span>AI Thinking...</span>
                     </div>
                   )}
                   <button
                     onClick={handleEditInstructions}
                     className="text-xs text-blue-400 hover:text-blue-300 underline"
                   >
                     Edit Instructions
                   </button>
                 </div>
               </div>
             )}
             
            <div id="messages-container" className="flex-1 overflow-y-auto space-y-1 min-h-0 pb-4">
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
                  // Sort messages by timestamp (oldest first) for display
                  messages.sort((a, b) => {
                    const aTime = new Date(a.timestamp || 0).getTime();
                    const bTime = new Date(b.timestamp || 0).getTime();
                    return aTime - bTime;
                  }).map((message, index, array) => {
                  const messageData = message as any;
                  const isLastMessage = index === array.length - 1;
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
                      <div 
                        key={message.id || index} 
                        ref={isLastMessage ? lastMessageRef : null}
                        className={`p-2 hover:bg-gray-800/30 transition-colors border-b border-gray-800/30 ${
                          isUnread ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                        }`}
                      >
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
                           <HoverableText 
                             text={content}
                             accountId={selectedAccount}
                             chatId={selectedChat}
                             className={`text-sm leading-relaxed break-words ${
                               isUnread ? 'text-white font-medium' : 'text-gray-200'
                             }`}
                           />
                         </div>
                       </div>
                     </div>
                   );
                  })
                )}
            </div>
            
            {/* Message Input - Production Design */}
            <div className="p-4 border-t border-gray-800/50 bg-gray-800/30">
              {/* Auto-draft indicator */}
              {isGeneratingDraft && (
                <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-300 font-medium">Generating AI draft...</span>
                  </div>
                </div>
              )}
              
              {showDraftIndicator && !isGeneratingDraft && (
                <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                       <span className="text-sm text-blue-300 font-medium">AI Response Draft</span>
                      <span className="text-xs text-blue-400/70">Ctrl+Space to accept</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={acceptAutoDraft}
                        className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded transition-colors"
                      >
                        ✓ Accept
                      </button>
                       <button
                         onClick={() => {
                           setShowDraftIndicator(false);
                           setAutoDraftResponse('');
                           setAiNotConfident(false);
                           draftGeneratedForChat.current = ''; // Reset so we can generate a new draft if needed
                         }}
                         className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                       >
                         ✕ Dismiss
                       </button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-300 italic">
                    "{autoDraftResponse}"
                  </div>
                </div>
              )}

              {aiNotConfident && !isGeneratingDraft && !showDraftIndicator && (
                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-sm text-yellow-300 font-medium">AI Not Confident</span>
                    <span className="text-xs text-yellow-400/70">No auto-response generated</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-300">
                    The AI wasn't confident enough to generate a response. You can type your own message.
                  </div>
                </div>
              )}
              
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
                    ? (isGeneratingDraft 
                        ? 'Generating AI draft...'
                        : showDraftIndicator 
                           ? 'Press Ctrl+Space to accept AI response, or type your own message...'
                          : `Send a message to ${((chats.find(c => c.id === selectedChat) as any)?.name || 
                                               (chats.find(c => c.id === selectedChat) as any)?.title || 
                                               'this chat')}...`)
                    : 'Select a chat first...'}
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    // Clear auto-draft when user starts typing
                    if (showDraftIndicator && e.target.value.trim()) {
                      setShowDraftIndicator(false);
                      setAutoDraftResponse('');
                      setAiNotConfident(false);
                      draftGeneratedForChat.current = ''; // Reset so we can generate a new draft if needed
                    }
                  }}
                  onKeyPress={selectedChat ? handleKeyPress : undefined}
                  onKeyDown={selectedChat ? handleKeyDown : undefined}
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

       {/* AI Agent Settings Modal */}
       {showAgentSettings && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-[#1a1a1a] rounded-xl border border-gray-800/50 p-6 w-full max-w-2xl mx-4">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold text-white">
                 🤖 AI Agent Settings
                 {agentInstructionsMap[selectedChat] && (
                   <span className="ml-2 text-sm text-blue-400">(Editing)</span>
                 )}
               </h3>
               <button
                 onClick={() => setShowAgentSettings(false)}
                 className="text-gray-400 hover:text-white transition-colors"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-300 mb-2">
                   Chat: {((chats.find(c => c.id === selectedChat) as any)?.name || 
                           (chats.find(c => c.id === selectedChat) as any)?.title || 
                           'Selected Chat')}
                 </label>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-300 mb-2">
                   AI Agent Instructions
                 </label>
                 <textarea
                   value={agentInstructions}
                   onChange={(e) => setAgentInstructions(e.target.value)}
                   placeholder="Enter detailed instructions for the AI agent. For example: 'I am selling a 6x2 foot brown table with absolutely no damage for $150 on Facebook marketplace. Please respond to all messages to drive sales. Be friendly, professional, and focus on highlighting the table's condition and value.'"
                   className="w-full h-32 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
                 />
                 <div className="text-xs text-gray-500 mt-1">
                   The AI will only respond if it&apos;s confident (&gt;70%) it can provide a good answer.
                 </div>
               </div>
               
               <div className="flex items-center gap-4">
                 <button
                   onClick={handleSaveAgentInstructions}
                   disabled={!agentInstructions.trim()}
                   className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                 >
                   {agentInstructionsMap[selectedChat] ? 'Update Instructions' : 'Enable AI Agent'}
                 </button>
                 <button
                   onClick={() => setShowAgentSettings(false)}
                   className="px-4 py-2 bg-gray-600/50 text-white rounded-lg hover:bg-gray-500/50 focus:outline-none transition-all"
                 >
                   Cancel
                 </button>
                 {agentInstructionsMap[selectedChat] && (
                   <button
                     onClick={handleDeleteInstructions}
                     className="px-4 py-2 bg-red-600/50 text-white rounded-lg hover:bg-red-500/50 focus:outline-none transition-all"
                   >
                     Delete Agent
                   </button>
                 )}
               </div>
               
               {agentInstructionsMap[selectedChat] && !agentInstructions && (
                 <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                   <div className="flex items-center justify-between mb-2">
                     <div className="text-sm text-blue-300 font-medium">Current Instructions:</div>
                     <button
                       onClick={handleEditInstructions}
                       className="text-xs text-blue-400 hover:text-blue-300 underline"
                     >
                       Edit
                     </button>
                   </div>
                   <div className="text-xs text-blue-200">{agentInstructionsMap[selectedChat]}</div>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}

<SimpleWingman 
        messages={messages}
        onSuggestionGenerated={handleWingmanSuggestion}
></SimpleWingman>

<ProfessionalTextFloatingWidget
        messageInput={messageInput}
        onTextUpdate={setMessageInput}
        disabled={!selectedChat || sendingMessage}
></ProfessionalTextFloatingWidget>
{
    /* Remove the ChatSummary popup component */}
      {/* <ChatSummary
        chatId={selectedChat}
        chatName={currentChatName}
        messages={messages}
        unreadCount={unreadCount}
        isOpen={showSummaryOverlay}
        onClose={() => setShowSummaryOverlay(false)}
      /> */}
    </div>
  );
}

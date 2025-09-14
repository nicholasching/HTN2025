'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAccounts, fetchChats, fetchMessages, fetchMessagesLimited } from '@/lib/beeper';
import type { Account, Chat, Message } from '@/lib/beeper';
import { sendMessage } from '@/lib/beeper/postMessages';
import HoverableText from './HoverableText';
import ChatSummaryOverlay from './ChatSummaryOverlay';
import NetworkIcon from './NetworkIcon';
import SettingsPage from './SettingsPage';

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
  const [dismissedSummaries, setDismissedSummaries] = useState<Set<string>>(new Set());
  const [chatSummaries, setChatSummaries] = useState<Record<string, { messages: Message[], unreadCount: number }>>({});
  
  // Settings states
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [flirtIntensity, setFlirtIntensity] = useState<'mild' | 'medium' | 'hot'>('medium');
  const [responseLength, setResponseLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [customContext, setCustomContext] = useState<string>('');
  
  // Unified autocomplete states
  const [autocompleteMode, setAutocompleteMode] = useState<'general' | 'flirty' | 'professional'>('general');
  const [showAutocompleteSettings, setShowAutocompleteSettings] = useState<boolean>(false);
  const [isGeneratingAutocomplete, setIsGeneratingAutocomplete] = useState<boolean>(false);
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);
  const [professionalText, setProfessionalText] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>('');
  const [showProfessionalPopup, setShowProfessionalPopup] = useState<boolean>(false);
  
  // Professional mode debounce
  const professionalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedTextRef = useRef<string>('');
  
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

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedFlirtIntensity = localStorage.getItem('beeper-flirt-intensity');
    if (savedFlirtIntensity) {
      setFlirtIntensity(savedFlirtIntensity as 'mild' | 'medium' | 'hot');
    }
    
    const savedResponseLength = localStorage.getItem('beeper-response-length');
    if (savedResponseLength) {
      setResponseLength(savedResponseLength as 'short' | 'medium' | 'long');
    }
    
    const savedCustomContext = localStorage.getItem('beeper-custom-context');
    if (savedCustomContext) {
      setCustomContext(savedCustomContext);
    }
  }, []);

  // Save agent instructions to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(agentInstructionsMap).length > 0) {
      localStorage.setItem('beeper-agent-instructions', JSON.stringify(agentInstructionsMap));
    }
  }, [agentInstructionsMap]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('beeper-flirt-intensity', flirtIntensity);
  }, [flirtIntensity]);

  useEffect(() => {
    localStorage.setItem('beeper-response-length', responseLength);
  }, [responseLength]);

  useEffect(() => {
    localStorage.setItem('beeper-custom-context', customContext);
  }, [customContext]);

  // Professional mode: Auto-generate when user stops typing for 3 seconds (minimum 25 characters)
  useEffect(() => {
    if (autocompleteMode !== 'professional' || !messageInput.trim() || !selectedChat) {
      return;
    }

    // Only generate if there are at least 25 characters
    if (messageInput.trim().length < 25) {
      return;
    }

    // Clear existing timeout
    if (professionalTimeoutRef.current) {
      clearTimeout(professionalTimeoutRef.current);
    }

    // Don't process if text hasn't changed
    if (messageInput.trim() === lastProcessedTextRef.current) {
      return;
    }

    // Set new timeout
    professionalTimeoutRef.current = setTimeout(async () => {
      if (messageInput.trim() && messageInput.trim() !== lastProcessedTextRef.current && messageInput.trim().length >= 25) {
        lastProcessedTextRef.current = messageInput.trim();
        await generateProfessionalTextForDraft(messageInput.trim());
      }
    }, 3000);

    return () => {
      if (professionalTimeoutRef.current) {
        clearTimeout(professionalTimeoutRef.current);
      }
    };
  }, [messageInput, autocompleteMode, selectedChat]);

  // Stop generation when user starts typing in general/flirt modes
  // For professional mode, also clear states when input is less than 25 characters
  useEffect(() => {
    if (messageInput.trim()) {
      if (autocompleteMode === 'general' || autocompleteMode === 'flirty') {
        // User started typing, clear any existing draft and stop generation
        setAutoDraftResponse('');
        setShowDraftIndicator(false);
        setAiNotConfident(false);
        setAutocompleteError(null);
        // Reset the draft generation flag so we can generate again when input is cleared
        draftGeneratedForChat.current = '';
      } else if (autocompleteMode === 'professional' && messageInput.trim().length < 25) {
        // For professional mode, clear states when input is less than 25 characters
        setAutoDraftResponse('');
        setShowDraftIndicator(false);
        setAiNotConfident(false);
        setAutocompleteError(null);
      }
    }
  }, [messageInput, autocompleteMode]);

  // Trigger generation when message input is cleared (like original route.ts behavior)
  useEffect(() => {
    const triggerGenerationOnClear = async () => {
      // Only trigger if message input is empty, we have messages, and we're not already generating
      if (!messageInput.trim() && messages.length > 0 && !isGeneratingDraft && !isGeneratingAutocomplete && selectedChat) {
        // Don't generate if we already generated a draft for this chat
        if (draftGeneratedForChat.current === selectedChat) {
          return;
        }

        console.log('🤖 Message input cleared, triggering generation...');
        
        if (autocompleteMode === 'general') {
          try {
            const result = await generateAutoDraftResponse(messages);
            if (result.response.trim()) {
              setAutoDraftResponse(result.response);
              setShowDraftIndicator(true);
              setAiNotConfident(false);
              draftGeneratedForChat.current = selectedChat;
    } else {
              setShowDraftIndicator(false);
              setAiNotConfident(result.shouldShowNotConfident);
            }
          } catch (error) {
            console.error('Error generating draft on clear:', error);
            setShowDraftIndicator(false);
            setAiNotConfident(true);
          }
        } else if (autocompleteMode === 'flirty') {
          await generateFlirtySuggestion();
        }
        // Professional mode doesn't need to trigger on clear since it works on input
      }
    };

    // Add a small delay to ensure the clear action is complete
    const timeoutId = setTimeout(triggerGenerationOnClear, 200);
    return () => clearTimeout(timeoutId);
  }, [messageInput, messages, selectedChat, autocompleteMode, isGeneratingDraft, isGeneratingAutocomplete]);

  // Filter chats based on search query and sort by unread count
  useEffect(() => {
    let filtered = chats;
    
    if (searchQuery.trim()) {
      filtered = chats.filter(chat => {
        const chatData = chat as any;
        const chatName = (chatData.name || chatData.title || '').toLowerCase();
        return chatName.includes(searchQuery.toLowerCase());
      });
    }
    
    // Keep original order (no sorting)
    
      setFilteredChats(filtered);
  }, [chats, searchQuery]);


  // Poll current chat for new messages every 3 seconds
  useEffect(() => {
    if (!accessToken || !selectedChat) {
      return;
    }

    const pollCurrentChat = async () => {
      try {
        const newMessages = await fetchMessages(selectedChat, 100, accessToken, {}, true);
        if (newMessages && newMessages.length !== messages.length) {
          setMessages(newMessages);
          console.log('📨 New messages detected in current chat, updated message list');
        }
      } catch (error) {
        console.error('Error polling current chat:', error);
      }
    };

    // Poll immediately, then every 3 seconds
    pollCurrentChat();
    const interval = setInterval(pollCurrentChat, 3000);

    return () => clearInterval(interval);
  }, [accessToken, selectedChat, messages.length]);

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
  // Auto-show summary overlay when chat has unread messages - disabled for now
  // useEffect(() => {
  //   if (selectedChat && messages.length > 0) {
  //     const chatSummary = chatSummaries[selectedChat];
  //     if (chatSummary && chatSummary.unreadCount > 0) {
  //       // Summary overlay is now handled by ChatSummaryOverlay component
  //     }
  //   }
  // }, [selectedChat, messages, chatSummaries]);

  // Generate auto-draft response when a chat is opened (if last message wasn't from user)
  useEffect(() => {
    const generateDraftForNewChat = async () => {
      if (!selectedChat || messages.length === 0 || isGeneratingDraft || isGeneratingAutocomplete) {
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
        if (autocompleteMode === 'general') {
          const result = await generateAutoDraftResponse(messages);
          if (result.response.trim()) {
            setAutoDraftResponse(result.response);
          setAiNotConfident(false);
          draftGeneratedForChat.current = selectedChat; // Mark that we've generated a draft for this chat
            console.log('✅ Auto-draft generated:', result.response.substring(0, 50) + '...');
        } else {
          setShowDraftIndicator(false);
            setAiNotConfident(result.shouldShowNotConfident);
          console.log('⏭️ No auto-draft generated (AI not confident or last message was from user)');
          }
        } else if (autocompleteMode === 'flirty') {
          // Generate flirty suggestion automatically
          await generateFlirtySuggestion();
          return; // generateFlirtySuggestion handles its own state
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
  }, [selectedChat, messages, messageInput, isGeneratingDraft, isGeneratingAutocomplete, autocompleteMode]);

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
    if (autocompleteMode === 'professional') {
      // For professional mode, replace the current content
    setMessageInput(autoDraftResponse);
    } else {
      // For general and flirty modes, fill the input
      setMessageInput(autoDraftResponse);
    }
    
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
        
        // Update button height to match textarea
        const sendButton = textarea.parentElement?.querySelector('button') as HTMLButtonElement;
        if (sendButton) {
          sendButton.style.height = newHeight + 'px';
        }
        
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
        
        // Update button height to match textarea
        const sendButton = textarea.parentElement?.querySelector('button') as HTMLButtonElement;
        if (sendButton) {
          sendButton.style.height = newHeight + 'px';
        }
        
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
  const generateAutoDraftResponse = async (messages: Message[]): Promise<{response: string, shouldShowNotConfident: boolean}> => {
    try {
      if (messages.length === 0) {
        return { response: '', shouldShowNotConfident: false };
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
        return { response: '', shouldShowNotConfident: false };
      }

      // Check if the latest message is from the user
      const isFromUser = latestMessage.isSender || 
                        latestMessage.isMe || 
                        (latestMessage.senderName && latestMessage.senderName.toLowerCase().includes('you')) ||
                        (latestMessage.sender && latestMessage.sender.isSelf);

      // Only generate draft if the latest message is NOT from the user
      if (isFromUser) {
        return { response: '', shouldShowNotConfident: false };
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
          instructions: `Please provide a brief, conversational response to this message. Focus on being brief and natural. Keep it very concise and appropriate for the context:

${contextString}

Message to respond to: ${latestMessage.text || ''}

Response:`,
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
        return { response: '', shouldShowNotConfident: true };
      }
      
      return { response: responseText, shouldShowNotConfident: false };
    } catch (error) {
      console.error('Error generating auto-draft response:', error);
      return { response: '', shouldShowNotConfident: true };
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

  // Handle dismissing summary overlay
  const handleDismissSummary = () => {
    if (selectedChat) {
      setDismissedSummaries(prev => new Set(prev).add(selectedChat));
    }
  };

  // Settings update functions
  const handleUpdateAgentInstructions = (chatId: string, instructions: string) => {
    setAgentInstructionsMap(prev => ({
      ...prev,
      [chatId]: instructions
    }));
  };

  const handleDeleteAgentInstructions = (chatId: string) => {
    setAgentInstructionsMap(prev => {
      const newMap = { ...prev };
      delete newMap[chatId];
      return newMap;
    });
  };

  const handleUpdateFlirtIntensity = (intensity: 'mild' | 'medium' | 'hot') => {
    setFlirtIntensity(intensity);
  };

  const handleUpdateResponseLength = (length: 'short' | 'medium' | 'long') => {
    setResponseLength(length);
  };

  const handleUpdateCustomContext = (context: string) => {
    setCustomContext(context);
  };


  const generateFlirtySuggestion = async () => {
    if (!messages.length) {
      setAutocompleteError('No chat context available');
      return;
    }

    setIsGeneratingAutocomplete(true);
    setAutocompleteError(null);

    try {
      // Extract recent messages for context
      const recentMessages = messages.slice(-10).map((msg: any) => {
        const senderName = msg.senderName || msg.sender?.displayName || 'Unknown';
        const content = msg.text || msg.content?.text || msg.body || '';
        const isMe = msg.isSender || senderName.toLowerCase().includes('nicholas') || senderName.toLowerCase().includes('you');
        
        return {
          sender: isMe ? 'You' : senderName,
          message: content
        };
      });

      // Create intensity-based prompts
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
          responseLength: responseLength,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const cleanSuggestion = data.suggestion.replace(/^["']|["']$/g, '');
      setAutoDraftResponse(cleanSuggestion);
      setShowDraftIndicator(true);
      setAiNotConfident(false);
      draftGeneratedForChat.current = selectedChat || ''; // Mark that we've generated a draft for this chat
    } catch (err) {
      console.error('Error generating flirty suggestion:', err);
      setAutocompleteError(err instanceof Error ? err.message : 'Failed to generate suggestion');
    } finally {
      setIsGeneratingAutocomplete(false);
    }
  };

  const generateProfessionalText = async (text: string) => {
    setIsGeneratingAutocomplete(true);
    setAutocompleteError(null);

    try {
      const response = await fetch('/api/generate-professional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setOriginalText(data.originalText);
      setProfessionalText(data.professionalText);
      setShowProfessionalPopup(true);
    } catch (err) {
      console.error('Error generating professional text:', err);
      setAutocompleteError(err instanceof Error ? err.message : 'Failed to generate professional text');
    } finally {
      setIsGeneratingAutocomplete(false);
    }
  };

  const generateProfessionalTextForDraft = async (text: string) => {
    setIsGeneratingAutocomplete(true);
    setAutocompleteError(null);

    try {
      const response = await fetch('/api/generate-professional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const professionalText = data.professionalText;
      
      if (professionalText.trim()) {
        setAutoDraftResponse(professionalText);
        setShowDraftIndicator(true);
        setAiNotConfident(false);
        console.log('✅ Professional draft generated:', professionalText.substring(0, 50) + '...');
      } else {
        setShowDraftIndicator(false);
        setAiNotConfident(true);
        console.log('⏭️ No professional draft generated');
      }
    } catch (err) {
      console.error('Error generating professional text for draft:', err);
      setAutocompleteError(err instanceof Error ? err.message : 'Failed to generate professional text');
      setShowDraftIndicator(false);
      setAiNotConfident(true);
    } finally {
      setIsGeneratingAutocomplete(false);
    }
  };

  const handleAutocompleteModeChange = (newMode: 'general' | 'flirty' | 'professional') => {
    setAutocompleteMode(newMode);
    setAutoDraftResponse('');
    setShowDraftIndicator(false);
    setAutocompleteError(null);
    setAiNotConfident(false);
    
    // Clear professional popup when switching away from professional mode
    if (newMode !== 'professional') {
      setShowProfessionalPopup(false);
      setProfessionalText('');
      setOriginalText('');
    }
    
    // For professional mode, clear states if input is empty or less than 25 characters
    if (newMode === 'professional') {
      if (!messageInput.trim() || messageInput.trim().length < 25) {
        setAutoDraftResponse('');
        setShowDraftIndicator(false);
        setAiNotConfident(false);
        setAutocompleteError(null);
        draftGeneratedForChat.current = '';
        return; // Don't trigger generation for professional mode with insufficient text
      }
    }
    
    // Reset the draft generation flag so we can generate a new draft for this mode
    draftGeneratedForChat.current = '';
    
    // If message input is empty and we have messages, trigger generation for the new mode
    if (!messageInput.trim() && messages.length > 0) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        if (newMode === 'general') {
          // Trigger general mode generation
          const generateGeneralDraft = async () => {
            try {
              const result = await generateAutoDraftResponse(messages);
              if (result.response.trim()) {
                setAutoDraftResponse(result.response);
                setShowDraftIndicator(true);
                setAiNotConfident(false);
                draftGeneratedForChat.current = selectedChat || '';
              } else {
                setShowDraftIndicator(false);
                setAiNotConfident(result.shouldShowNotConfident);
              }
            } catch (error) {
              console.error('Error generating general draft:', error);
              setShowDraftIndicator(false);
              setAiNotConfident(true);
            }
          };
          generateGeneralDraft();
        } else if (newMode === 'flirty') {
          // Trigger flirty mode generation
          generateFlirtySuggestion();
        }
        // Professional mode will be handled by the existing useEffect when user types
      }, 100);
    }
  };


  const handleUseProfessional = () => {
    if (professionalText) {
      setMessageInput(professionalText);
      setShowProfessionalPopup(false);
      setProfessionalText('');
      setOriginalText('');
    }
  };

  const handleUseOriginal = () => {
    if (originalText) {
      setMessageInput(originalText);
      setShowProfessionalPopup(false);
      setProfessionalText('');
      setOriginalText('');
    }
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

      <div className="max-w-[1600px] mx-auto p-6">
        {/* Main Content Grid - Production Layout */}
        <div className="flex gap-4" style={{ height: 'calc(100vh - 3rem)' }}>

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
                <NetworkIcon 
                  network={account.network} 
                  size={24} 
                  className="text-white"
                />
              </button>
            ))}
          </div>

          {/* Chats Panel - Compact Design */}
          {chats.length > 0 && (
            <div className="w-80 bg-[#1a1a1a] rounded-xl border border-gray-800/50 overflow-hidden flex flex-col">
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
                         {agentEnabled ? '🤖 OTTO ON' : '🤖 OTTO OFF'}
                       </button>
                         <button
                         onClick={() => setShowSettings(true)}
                         className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600/50 rounded transition-all"
                         title="Settings"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         </svg>
                         </button>
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
             
            {/* Chat Summary Overlay */}
            {selectedChat && !dismissedSummaries.has(selectedChat) && unreadCount >= 5 && (
              <>
                {console.log('Rendering ChatSummaryOverlay with:', { 
                  selectedChat, 
                  dismissed: dismissedSummaries.has(selectedChat), 
                  unreadCount, 
                  messagesCount: messages.length 
                })}
                <ChatSummaryOverlay
                  chatId={selectedChat}
                  chatName={currentChatName}
                  messages={messages}
                  unreadCount={unreadCount}
                  onDismiss={handleDismissSummary}
                />
              </>
            )}
             
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
              {/* Autocomplete Mode Selector */}
              <div className="mb-3">
                <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1 w-full">
                  {(['general', 'flirty', 'professional'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleAutocompleteModeChange(mode)}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
                        autocompleteMode === mode
                          ? mode === 'general' ? 'bg-blue-600 text-white' :
                            mode === 'flirty' ? 'bg-pink-600 text-white' :
                            'bg-purple-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-600/50'
                      }`}
                    >
                      {mode === 'general' ? '💬 General' :
                       mode === 'flirty' ? '💕 Flirty' :
                       '💼 Professional'}
                    </button>
                  ))}
                </div>
              </div>


              {/* Auto-draft indicator */}
              {(isGeneratingDraft || isGeneratingAutocomplete) && (
                <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-300 font-medium">
                      {autocompleteMode === 'professional' ? 'Converting to professional...' : 'Generating AI draft...'}
                    </span>
                  </div>
                </div>
              )}
              
              {showDraftIndicator && !isGeneratingDraft && !isGeneratingAutocomplete && (
                // Hide draft indicator for general/flirty modes when user has text in input
                // For professional mode, only show if input has 25+ characters AND there's actual content
                (autocompleteMode === 'professional' ? 
                  (messageInput.trim().length >= 25 && autoDraftResponse.trim()) :
                  !messageInput.trim()) && (
                <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-blue-300 font-medium">
                          {autocompleteMode === 'general' ? 'General AI Response' : 
                           autocompleteMode === 'flirty' ? 'Flirty AI Response' : 
                           'Professional AI Response'}
                        </span>
                      <span className="text-xs text-blue-400/70">Ctrl+Space to accept</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-300 italic">
                    "{autoDraftResponse}"
                  </div>
                </div>
                )
              )}

              {aiNotConfident && !isGeneratingDraft && !showDraftIndicator && !isGeneratingAutocomplete && (
                // Hide "AI Not Confident" for general/flirty modes when user has text in input
                // For professional mode, only show if input has 25+ characters
                (autocompleteMode === 'professional' ? 
                  messageInput.trim().length >= 25 :
                  !messageInput.trim()) && (
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
                )
              )}

              {/* Autocomplete Error Display */}
              {autocompleteError && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-sm text-red-300 font-medium">Error</span>
                    <button
                      onClick={() => setAutocompleteError(null)}
                      className="text-xs text-red-400 hover:text-red-300 ml-auto underline"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="mt-1 text-sm text-red-200">
                    {autocompleteError}
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
                        
                        // Update button height to match textarea
                        const sendButton = textarea.parentElement?.querySelector('button') as HTMLButtonElement;
                        if (sendButton) {
                          sendButton.style.height = newHeight + 'px';
                        }
                        
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
                  className="px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  style={{ height: '40px' }}
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

      {/* Professional Text Popup */}
      {showProfessionalPopup && originalText && professionalText && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-gray-800/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">💼</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Professional Text Converter</h2>
                  <p className="text-xs text-gray-400">Convert your text to professional format</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfessionalPopup(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Text Comparison */}
              <div className="space-y-4">
                {/* Original Text */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-300">Original Text</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(originalText)}
                      className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-gray-300 leading-relaxed">
                    {originalText}
                  </div>
                </div>

                {/* Professional Text */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-blue-300">Professional Version</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(professionalText)}
                      className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg text-sm text-white leading-relaxed">
                    {professionalText}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-800/50 flex gap-3">
              <button
                onClick={handleUseOriginal}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
              >
                📝 Use Original
              </button>
              <button
                onClick={handleUseProfessional}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg transition-all"
              >
                ✨ Use Professional
              </button>
            </div>
          </div>
        </div>
      )}

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

      <SettingsPage
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        selectedChat={selectedChat}
        chatName={currentChatName}
        agentInstructionsMap={agentInstructionsMap}
        onUpdateAgentInstructions={handleUpdateAgentInstructions}
        onDeleteAgentInstructions={handleDeleteAgentInstructions}
        flirtIntensity={flirtIntensity}
        onUpdateFlirtIntensity={handleUpdateFlirtIntensity}
        responseLength={responseLength}
        onUpdateResponseLength={handleUpdateResponseLength}
        customContext={customContext}
        onUpdateCustomContext={handleUpdateCustomContext}
      />
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

/**
 * fetchMessages.ts
 * 
 * Function to fetch messages from a specific chat via API route
 */

export interface Message {
  id: string;
  chatID: string;
  text?: string;
  timestamp?: string | number;
  sender?: {
    displayName?: string;
    name?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface MessageSearchOptions {
  accountIDs?: string[];
  chatIDs?: string[];
  chatType?: 'group' | 'single';
  cursor?: string;
  dateAfter?: string;
  dateBefore?: string;
  direction?: 'after' | 'before';
  excludeLowPriority?: boolean;
  includeMuted?: boolean;
  limit?: number;
  mediaTypes?: string[];
  query?: string;
  sender?: 'me' | 'others' | string;
}

/**
 * Fetch messages from a specific chat via API route with pagination
 * 
 * @param chatID - The chat ID to fetch messages from
 * @param limit - Number of messages to fetch per page (default: 100)
 * @param accessToken - Required access token
 * @param options - Additional search options
 * @param fetchAll - Whether to fetch all messages (true) or just the specified limit (false)
 * @returns Promise<Message[]> - Array of messages from the specified chat
 */
export async function fetchMessages(
  chatID: string,
  limit: number = 100,
  accessToken: string,
  options: Omit<MessageSearchOptions, 'chatIDs' | 'limit'> = {},
  fetchAll: boolean = true
): Promise<Message[]> {
  if (!accessToken) {
    throw new Error('Access token is required.');
  }
  
  try {
    console.log(`\n📨 Fetching messages from chat: ${chatID} via API route...`);
    
    if (!fetchAll) {
      // For limited fetching, use the original approach
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('direction', 'before');
      
      if (options.accountIDs) params.set('accountIDs', JSON.stringify(options.accountIDs));
      if (options.chatType) params.set('chatType', options.chatType);
      if (options.dateAfter) params.set('dateAfter', options.dateAfter);
      if (options.dateBefore) params.set('dateBefore', options.dateBefore);
      if (options.excludeLowPriority !== undefined) params.set('excludeLowPriority', String(options.excludeLowPriority));
      if (options.includeMuted !== undefined) params.set('includeMuted', String(options.includeMuted));
      if (options.mediaTypes) params.set('mediaTypes', JSON.stringify(options.mediaTypes));
      if (options.query) params.set('query', options.query);
      if (options.sender) params.set('sender', options.sender);
      
      const response = await fetch(`/api/beeper/messages?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const pageMessages = data.items || data;
      const chatMessages = pageMessages.filter((message: Message) => message.chatID === chatID);
      
      console.log(`📨 Fetched ${chatMessages.length} messages from chat ${chatID} (limited)`);
      return chatMessages;
    }
    
    // For fetching all messages, use date-based pagination
    const allMessages: Message[] = [];
    let currentDate = new Date();
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 100; // Increased limit for date-based pagination
    const daysPerPage = 30; // Fetch messages from 30 days at a time
    
    while (hasMore && pageCount < maxPages) {
      pageCount++;
      const endDate = new Date(currentDate);
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - daysPerPage);
      
      console.log(`📄 Fetching page ${pageCount} (${startDate.toISOString()} to ${endDate.toISOString()})...`);
      
      // Build query parameters for this date range
      const params = new URLSearchParams();
      params.set('limit', String(limit * 2)); // Get more messages per page for date-based approach
      params.set('direction', 'before');
      params.set('dateAfter', startDate.toISOString());
      params.set('dateBefore', endDate.toISOString());
      
      if (options.accountIDs) params.set('accountIDs', JSON.stringify(options.accountIDs));
      if (options.chatType) params.set('chatType', options.chatType);
      if (options.excludeLowPriority !== undefined) params.set('excludeLowPriority', String(options.excludeLowPriority));
      if (options.includeMuted !== undefined) params.set('includeMuted', String(options.includeMuted));
      if (options.mediaTypes) params.set('mediaTypes', JSON.stringify(options.mediaTypes));
      if (options.query) params.set('query', options.query);
      if (options.sender) params.set('sender', options.sender);
      
      const response = await fetch(`/api/beeper/messages?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const pageMessages = data.items || data;
      
      if (!pageMessages || pageMessages.length === 0) {
        console.log(`📄 No more messages found in date range ${pageCount}`);
        hasMore = false;
        break;
      }
      
      // Filter by chatID for this page
      const chatMessages = pageMessages.filter((message: Message) => message.chatID === chatID);
      allMessages.push(...chatMessages);
      
      console.log(`📄 Page ${pageCount}: Found ${chatMessages.length} messages for chat ${chatID} (${pageMessages.length} total on page)`);
      console.log(`📄 Total messages so far: ${allMessages.length}`);
      
      // Move to the next date range
      currentDate = startDate;
      
      // If we got fewer messages than expected, we might be reaching the end
      if (chatMessages.length < 10) {
        console.log(`📄 Few messages found (${chatMessages.length}), might be reaching end of history`);
        // Continue for a few more pages to be sure
        if (pageCount > 5) {
          hasMore = false;
        }
      }
    }
    
    if (pageCount >= maxPages) {
      console.warn(`⚠️ Reached maximum page limit (${maxPages}), stopping pagination`);
    }
    
    // Sort messages by timestamp (newest first for consistency with API)
    const sortedMessages = allMessages.sort((a: Message, b: Message) => {
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      
      // Convert to numbers if they're strings
      const numA = typeof timestampA === 'string' ? parseFloat(timestampA) : timestampA;
      const numB = typeof timestampB === 'string' ? parseFloat(timestampB) : timestampB;
      
      // Sort in descending order (newest first)
      return numB - numA;
    });
    
    console.log(`✅ Fetched ${sortedMessages.length} total messages from chat ${chatID} across ${pageCount} pages`);
    
    return sortedMessages;
  } catch (error) {
    console.error(`Failed to fetch messages from chat ${chatID}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Fetch a limited number of messages from a specific chat (no pagination)
 * 
 * @param chatID - The chat ID to fetch messages from
 * @param limit - Number of messages to fetch (default: 100)
 * @param accessToken - Required access token
 * @param options - Additional search options
 * @returns Promise<Message[]> - Array of messages from the specified chat
 */
export async function fetchMessagesLimited(
  chatID: string,
  limit: number = 100,
  accessToken: string,
  options: Omit<MessageSearchOptions, 'chatIDs' | 'limit'> = {}
): Promise<Message[]> {
  return fetchMessages(chatID, limit, accessToken, options, false);
}

/**
 * Format a message for display
 * 
 * @param message - The message to format
 * @param chatName - Optional chat name for context
 * @returns string - Formatted message string
 */
export function formatMessage(message: Message, chatName?: string): string {
  const timestamp = message.timestamp || 'Unknown';
  
  // Try multiple ways to get sender name from the API response
  const messageData = message as any;
  const senderName = 
    messageData.senderName ||                           // Direct senderName field
    messageData.sender?.displayName ||                  // Nested sender.displayName
    messageData.sender?.name ||                         // Nested sender.name
    messageData.sender?.fullName ||                     // Nested sender.fullName
    messageData.senderDisplayName ||                    // Alternative field name
    messageData.fromName ||                             // Alternative field name
    messageData.author?.name ||                         // Alternative nested structure
    messageData.user?.displayName ||                    // Alternative nested structure
    'Unknown Sender';
  
  const content = message.text || messageData.content?.text || messageData.body || 'No text content';
  const messageId = message.id || messageData.guid || messageData.messageID || 'Unknown';
  
  // Format timestamp
  let formattedTime: string;
  try {
    if (typeof timestamp === 'number') {
      // Handle both seconds and milliseconds timestamps
      const date = timestamp > 1e12 
        ? new Date(timestamp) 
        : new Date(timestamp * 1000);
      formattedTime = date.toLocaleString();
    } else if (typeof timestamp === 'string') {
      // Try to parse string timestamp
      const parsed = parseFloat(timestamp);
      if (!isNaN(parsed)) {
        const date = parsed > 1e12 
          ? new Date(parsed) 
          : new Date(parsed * 1000);
        formattedTime = date.toLocaleString();
      } else {
        // If it's not a numeric string, treat as ISO date or display as-is
        try {
          formattedTime = new Date(timestamp).toLocaleString();
        } catch {
          formattedTime = timestamp;
        }
      }
    } else {
      formattedTime = String(timestamp);
    }
  } catch {
    formattedTime = String(timestamp);
  }
  
  return `
Message ID: ${messageId}
${chatName ? `Chat: ${chatName}` : `Chat ID: ${message.chatID}`}
Sender: ${senderName}
Time: ${formattedTime}
Content: ${content}
${'='.repeat(60)}`;
}

/**
 * Display messages in a formatted way
 * 
 * @param messages - Array of messages to display
 * @param chatName - Optional chat name for context
 * @param maxDisplay - Maximum number of messages to display (default: 10)
 */
export function displayMessages(messages: Message[], chatName?: string, maxDisplay: number = 10): void {
  if (messages.length === 0) {
    console.log('No messages to display.');
    return;
  }
  
  console.log(`\n📋 Displaying ${Math.min(messages.length, maxDisplay)} of ${messages.length} messages:`);
  console.log('='.repeat(80));
  
  messages.slice(0, maxDisplay).forEach((message, index) => {
    console.log(`\n--- Message ${index + 1} ---`);
    console.log(formatMessage(message, chatName));
  });
  
  if (messages.length > maxDisplay) {
    console.log(`\n... and ${messages.length - maxDisplay} more messages`);
  }
}

/**
 * fetchMessages.ts
 * 
 * Function to fetch messages from a specific chat
 */

import BeeperDesktop from '@beeper/desktop-api';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '.env') });

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
 * Fetch messages from a specific chat
 * Since the API has issues with array parameters, we fetch without chatIDs filter
 * and manually filter the results
 * 
 * @param chatID - The chat ID to fetch messages from
 * @param limit - Number of messages to fetch (default: 100)
 * @param accessToken - Optional access token (will use env var if not provided)
 * @param options - Additional search options
 * @returns Promise<Message[]> - Array of messages from the specified chat
 */
export async function fetchMessages(
  chatID: string,
  limit: number = 100,
  accessToken?: string,
  options: Omit<MessageSearchOptions, 'chatIDs' | 'limit'> = {}
): Promise<Message[]> {
  const token = accessToken || process.env.BEEPER_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error('Access token is required. Provide it as a parameter or set BEEPER_ACCESS_TOKEN in your .env file.');
  }
  
  const client = new BeeperDesktop({
    accessToken: token,
  });
  
  try {
    console.log(`\n📨 Fetching messages from chat: ${chatID}...`);
    
    // Build search parameters WITHOUT chatIDs to avoid the array serialization issue
    const searchParams: any = {
      limit: Math.min(limit * 5, 500)  // Get more messages but respect API limit of 500
    };
    
    // Add optional parameters only if they are defined
    if (options.accountIDs !== undefined) searchParams.accountIDs = options.accountIDs;
    if (options.chatType !== undefined) searchParams.chatType = options.chatType;
    if (options.cursor !== undefined) searchParams.cursor = options.cursor;
    if (options.dateAfter !== undefined) searchParams.dateAfter = options.dateAfter;
    if (options.dateBefore !== undefined) searchParams.dateBefore = options.dateBefore;
    if (options.direction !== undefined) searchParams.direction = options.direction;
    if (options.excludeLowPriority !== undefined) searchParams.excludeLowPriority = options.excludeLowPriority;
    if (options.includeMuted !== undefined) searchParams.includeMuted = options.includeMuted;
    if (options.mediaTypes !== undefined) searchParams.mediaTypes = options.mediaTypes;
    if (options.query !== undefined) searchParams.query = options.query;
    if (options.sender !== undefined) searchParams.sender = options.sender;
    
    const messages: Message[] = [];
    let totalFetched = 0;
    
    // Use the async iterator to fetch messages
    for await (const message of client.messages.search(searchParams)) {
      totalFetched++;
      
      // Filter by chatID manually
      if (message.chatID === chatID) {
        messages.push(message as Message);
        
        // Stop when we have enough messages from the target chat
        if (messages.length >= limit) {
          break;
        }
      }
      
      // Stop if we've fetched too many messages overall
      if (totalFetched >= searchParams.limit) {
        break;
      }
    }
    
    console.log(`Fetched ${messages.length} messages from chat ${chatID} (scanned ${totalFetched} total messages)`);
    
    return messages;
  } catch (error) {
    console.error(`Failed to fetch messages from chat ${chatID}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
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
  const senderName = message.sender?.displayName || message.sender?.name || 'Unknown Sender';
  const content = message.text || (message as any).content?.text || (message as any).body || 'No text content';
  const messageId = message.id || (message as any).guid || 'Unknown';
  
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
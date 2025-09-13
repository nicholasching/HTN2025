/**
 * fetchChats.ts
 * 
 * Function to fetch chats for a specific Beeper account/network
 */

import BeeperDesktop from '@beeper/desktop-api';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '.env') });

export interface Chat {
  id: string;
  accountID: string;
  type: string;
  name?: string;
  title?: string;
  lastMessage?: {
    text?: string;
    content?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ChatSearchOptions {
  accountIDs?: string[];
  limit?: number;
  cursor?: string;
  direction?: 'after' | 'before';
  inbox?: 'primary' | 'low-priority' | 'archive';
  includeMuted?: boolean;
  lastActivityAfter?: string;
  lastActivityBefore?: string;
  participantQuery?: string;
  query?: string;
  type?: 'single' | 'group' | 'channel' | 'any';
  unreadOnly?: boolean;
}

/**
 * Fetch ALL chats (not filtered by account)
 * 
 * @param accessToken - Optional access token (will use env var if not provided)
 * @param options - Search options
 * @returns Promise<Chat[]> - Array of all chats
 */
export async function fetchAllChats(
  accessToken?: string, 
  options: ChatSearchOptions = {}
): Promise<Chat[]> {
  const token = accessToken || process.env.BEEPER_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error('Access token is required. Provide it as a parameter or set BEEPER_ACCESS_TOKEN in your .env file.');
  }
  
  const client = new BeeperDesktop({
    accessToken: token,
  });
  
  try {
    console.log(`\n💬 Fetching all chats...`);
    
    const searchParams: any = {
      limit: options.limit || 200  // Get more chats to ensure we have enough from each account
    };
    
    // Add optional parameters only if they are defined
    if (options.cursor !== undefined) searchParams.cursor = options.cursor;
    if (options.direction !== undefined) searchParams.direction = options.direction;
    if (options.inbox !== undefined) searchParams.inbox = options.inbox;
    if (options.includeMuted !== undefined) searchParams.includeMuted = options.includeMuted;
    if (options.lastActivityAfter !== undefined) searchParams.lastActivityAfter = options.lastActivityAfter;
    if (options.lastActivityBefore !== undefined) searchParams.lastActivityBefore = options.lastActivityBefore;
    if (options.participantQuery !== undefined) searchParams.participantQuery = options.participantQuery;
    if (options.query !== undefined) searchParams.query = options.query;
    if (options.type !== undefined) searchParams.type = options.type;
    if (options.unreadOnly !== undefined) searchParams.unreadOnly = options.unreadOnly;
    
    const chats: Chat[] = [];
    
    // Call the API without accountIDs filter
    for await (const chat of client.chats.search(searchParams)) {
      chats.push(chat as Chat);
      
      if (chats.length >= searchParams.limit) {
        break;
      }
    }
    
    console.log(`Found ${chats.length} total chats`);
    return chats;
  } catch (error) {
    console.error(`Failed to fetch chats:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Fetch chats for a specific Beeper account/network
 * This function fetches ALL chats and then filters by accountID
 * 
 * @param accountID - The account ID to fetch chats for
 * @param accessToken - Optional access token (will use env var if not provided)
 * @param options - Additional search options
 * @returns Promise<Chat[]> - Array of chats for the specified account
 */
export async function fetchChats(
  accountID: string, 
  accessToken?: string, 
  options: Omit<ChatSearchOptions, 'accountIDs'> = {}
): Promise<Chat[]> {
  try {
    console.log(`\n💬 Fetching chats for account: ${accountID}...`);
    
    // Fetch all chats first
    const allChats = await fetchAllChats(accessToken, options);
    
    // Filter chats by accountID
    const chats = allChats.filter(chat => chat.accountID === accountID);
    
    console.log(`Found ${chats.length} chats for account ${accountID}:`);
    chats.slice(0, 10).forEach((chat, index) => { // Show first 10 chats
      const chatData = chat as any;
      const chatName = chatData.name || chatData.title || 'Unnamed Chat';
      console.log(`  ${index + 1}. ${chatName} (ID: ${chat.id})`);
      console.log(`     Type: ${chat.type}`);
      if (chatData.lastMessage) {
        const lastMsg = chatData.lastMessage.text || chatData.lastMessage.content || 'No text';
        console.log(`     Last: ${lastMsg.substring(0, 50)}${lastMsg.length > 50 ? '...' : ''}`);
      }
    });
    
    if (chats.length > 10) {
      console.log(`     ... and ${chats.length - 10} more chats`);
    }
    
    return chats;
  } catch (error) {
    console.error(`Failed to fetch chats for account ${accountID}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get the first chat from the chats array
 * 
 * @param chats - Array of chats
 * @returns Chat - The first chat in the array
 */
export function getFirstChat(chats: Chat[]): Chat {
  if (chats.length === 0) {
    throw new Error('No chats available');
  }
  
  const firstChat = chats[0];
  const chatData = firstChat as any;
  const chatName = chatData.name || chatData.title || 'Unnamed Chat';
  
  console.log(`\n🎯 Selected first chat: ${chatName} (ID: ${firstChat.id})`);
  
  return firstChat;
}

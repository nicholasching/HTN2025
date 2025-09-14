/**
 * fetchChats.ts
 * 
 * Function to fetch chats for a specific Beeper account/network via API route
 */

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
 * Fetch ALL chats (not filtered by account) via API route
 * 
 * @param accessToken - Required access token
 * @param options - Search options
 * @returns Promise<Chat[]> - Array of all chats
 */
export async function fetchAllChats(
  accessToken: string, 
  options: ChatSearchOptions = {}
): Promise<Chat[]> {
  if (!accessToken) {
    throw new Error('Access token is required.');
  }
  
  try {
    console.log(`\n💬 Fetching all chats via API route...`);
    
    // Build query parameters
    const params = new URLSearchParams();
    params.set('limit', String(options.limit || 200));
    
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.direction) params.set('direction', options.direction);
    if (options.inbox) params.set('inbox', options.inbox);
    if (options.includeMuted !== undefined) params.set('includeMuted', String(options.includeMuted));
    if (options.lastActivityAfter) params.set('lastActivityAfter', options.lastActivityAfter);
    if (options.lastActivityBefore) params.set('lastActivityBefore', options.lastActivityBefore);
    if (options.participantQuery) params.set('participantQuery', options.participantQuery);
    if (options.query) params.set('query', options.query);
    if (options.type) params.set('type', options.type);
    if (options.unreadOnly !== undefined) params.set('unreadOnly', String(options.unreadOnly));
    
    const response = await fetch(`http://localhost:3000/api/beeper/chats?${params}`, {
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
    const chats = data.items || data; // Handle both response formats
    
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
 * @param accessToken - Required access token
 * @param options - Additional search options
 * @returns Promise<Chat[]> - Array of chats for the specified account
 */
export async function fetchChats(
  accountID: string, 
  accessToken: string, 
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
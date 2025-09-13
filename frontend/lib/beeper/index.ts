/**
 * Beeper API Library
 * 
 * Exports all Beeper Desktop API functions for use in the frontend
 */

// Export account functions
export { fetchAccounts, getLastAccount } from './fetchAccounts';
export type { Account } from './fetchAccounts';

// Export chat functions
export { fetchAllChats, fetchChats, getFirstChat } from './fetchChats';
export type { Chat, ChatSearchOptions } from './fetchChats';

// Export message functions
export { fetchMessages, fetchMessagesLimited, formatMessage, displayMessages } from './fetchMessages';
export type { Message, MessageSearchOptions } from './fetchMessages';

// Export message sending functions
export { sendMessage, sendReply } from './postMessages';
export type { MessageSendParams, MessageSendResponse } from './postMessages';

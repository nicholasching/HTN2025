#!/usr/bin/env node
/**
 * test.ts
 * 
 * Main test script that follows the workflow:
 * 1. Fetch all available accounts
 * 2. Fetch all chats for the LAST connected account
 * 3. Fetch the last 100 messages from the FIRST chat on that network
 */

import { fetchAccounts, getLastAccount, Account } from './fetchAccounts';
import { fetchChats, getFirstChat, Chat } from './fetchChats';
import { fetchMessages, displayMessages, Message } from './fetchMessages';

/**
 * Main test workflow
 */
async function runTest(): Promise<void> {
  console.log('🧪 Beeper API Test Workflow');
  console.log('='.repeat(60));
  console.log('Workflow: All Accounts → Instagram Chats → First Chat Messages (100)');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Fetch all available accounts
    console.log('\n📋 STEP 1: Fetching all available accounts...');
    const accounts: Account[] = await fetchAccounts();
    
    if (accounts.length === 0) {
      console.log('❌ No connected accounts found. Please connect some accounts in Beeper Desktop.');
      process.exit(1);
    }
    
    // Step 2: Find the Instagram account
    console.log('\n🎯 STEP 2: Finding Instagram account...');
    const instagramAccount = accounts.find(account => account.accountID === 'instagramgo');
    
    if (!instagramAccount) {
      console.log('❌ Instagram account not found. Available accounts:');
      accounts.forEach(acc => console.log(`  - ${acc.network} (${acc.accountID})`));
      process.exit(1);
    }
    
    console.log(`✅ Found Instagram account: ${instagramAccount.network} (ID: ${instagramAccount.accountID})`);
    const selectedAccount = instagramAccount;
    
    // Step 3: Fetch all chats for the Instagram account
    console.log('\n💬 STEP 3: Fetching chats for Instagram account...');
    const chats: Chat[] = await fetchChats(selectedAccount.accountID);
    
    if (chats.length === 0) {
      console.log(`❌ No chats found for account ${selectedAccount.network} (${selectedAccount.accountID}).`);
      process.exit(1);
    }
    
    // Step 4: Get the first chat from that network
    console.log('\n🎯 STEP 4: Selecting the first chat from that network...');
    const firstChat: Chat = getFirstChat(chats);
    
    // Step 5: Fetch the last 100 messages from the first chat
    console.log('\n📨 STEP 5: Fetching the last 100 messages from the first chat...');
    const messages: Message[] = await fetchMessages(firstChat.id, 100);
    
    // Step 6: Display the results
    console.log('\n📊 STEP 6: Displaying results...');
    const chatData = firstChat as any;
    const chatName = chatData.name || chatData.title || 'Unnamed Chat';
    
    console.log(`\n🎉 Test Results Summary:`);
    console.log('='.repeat(50));
    console.log(`Selected Account: ${selectedAccount.network} (${selectedAccount.accountID})`);
    console.log(`Selected Chat: ${chatName} (${firstChat.id})`);
    console.log(`Messages Fetched: ${messages.length}`);
    
    // Display first 5 messages as preview
    displayMessages(messages, chatName, 5);
    
    console.log(`\n✅ Test completed successfully!`);
    console.log(`Total workflow: ${accounts.length} accounts → ${chats.length} chats → ${messages.length} messages`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
    console.log('\nTroubleshooting:');
    console.log('1. Make sure Beeper Desktop is running');
    console.log('2. Check that the Desktop API is enabled in Beeper settings');
    console.log('3. Verify your access token is correct in the .env file');
    console.log('4. Ensure you have connected accounts and active chats');
    process.exit(1);
  }
}

/**
 * Export the test function for potential external use
 */
export { runTest };

// Run if called directly
if (require.main === module) {
  runTest().catch(console.error);
}

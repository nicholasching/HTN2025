/**
 * fetchAccounts.ts
 * 
 * Function to fetch all connected Beeper accounts
 */

import BeeperDesktop from '@beeper/desktop-api';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '.env') });

export interface Account {
  accountID: string;
  network: string;
  user?: {
    displayName?: string;
    name?: string;
    fullName?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Fetch all connected Beeper accounts
 * 
 * @param accessToken - Optional access token (will use env var if not provided)
 * @returns Promise<Account[]> - Array of connected accounts
 */
export async function fetchAccounts(accessToken?: string): Promise<Account[]> {
  const token = accessToken || process.env.BEEPER_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error('Access token is required. Provide it as a parameter or set BEEPER_ACCESS_TOKEN in your .env file.');
  }
  
  const client = new BeeperDesktop({
    accessToken: token,
  });
  
  try {
    console.log('📋 Fetching connected accounts...');
    const accounts = await client.accounts.list();
    
    console.log(`Found ${accounts.length} connected accounts:`);
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.network} (ID: ${account.accountID})`);
      if (account.user) {
        const user = account.user as any;
        console.log(`     User: ${user.displayName || user.name || user.fullName || 'Unknown'}`);
      }
    });
    
    return accounts as Account[];
  } catch (error) {
    console.error('Failed to fetch accounts:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get the last connected account from the accounts array
 * 
 * @param accounts - Array of accounts
 * @returns Account - The last account in the array
 */
export function getLastAccount(accounts: Account[]): Account {
  if (accounts.length === 0) {
    throw new Error('No accounts available');
  }
  
  const lastAccount = accounts[accounts.length - 1];
  console.log(`\n🎯 Selected last account: ${lastAccount.network} (ID: ${lastAccount.accountID})`);
  
  return lastAccount;
}

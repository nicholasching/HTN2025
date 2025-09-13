/**
 * fetchAccounts.ts
 * 
 * Function to fetch all connected Beeper accounts via API route
 */

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
 * Fetch all connected Beeper accounts via Next.js API route
 * 
 * @param accessToken - Required access token
 * @returns Promise<Account[]> - Array of connected accounts
 */
export async function fetchAccounts(accessToken: string): Promise<Account[]> {
  if (!accessToken) {
    throw new Error('Access token is required.');
  }
  
  try {
    console.log('📋 Fetching connected accounts via API route...');
    
    const response = await fetch('/api/beeper/accounts', {
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

    const accounts = await response.json();
    
    console.log(`Found ${accounts.length} connected accounts:`);
    accounts.forEach((account: Account, index: number) => {
      console.log(`  ${index + 1}. ${account.network} (ID: ${account.accountID})`);
      if (account.user) {
        const user = account.user as any;
        console.log(`     User: ${user.displayName || user.name || user.fullName || 'Unknown'}`);
      }
    });
    
    return accounts;
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
/**
 * Enhanced Mock Bank Connector for Testing
 * Production-quality mock implementation with deterministic behavior
 */

import { BaseBankConnector } from './BaseConnector';
import {
  BankCredentials,
  AuthToken,
  Transaction,
  Account,
  ConnectorConfig,
  ConnectorError,
  ConnectorErrorCode,
  SyncResult
} from './types';

/**
 * Mock bank connector for testing and development
 * 
 * Features:
 * - Deterministic mock data generation
 * - Simulated network delays
 * - Configurable success/failure scenarios
 * - Realistic transaction patterns
 * 
 * Demo credentials: username='demo', password='demo'
 */
export class MockBankConnector extends BaseBankConnector {
  private mockAccounts: Account[];
  private transactionCounter: number = 0;
  private static readonly DEMO_USERNAME = 'demo';
  private static readonly DEMO_PASSWORD = 'demo';

  constructor(config?: Partial<ConnectorConfig>) {
    super({
      name: 'Mock Bank',
      institutionId: 'mock-bank' as any,
      debug: false,
      ...config
    });

    // Initialize mock accounts with realistic data
    this.mockAccounts = [
      {
        id: 'mock-acc-checking-001' as any,
        institutionId: this.config.institutionId as any,
        name: 'Primary Checking',
        officialName: 'Mock Bank Primary Checking Account',
        type: 'checking',
        subtype: 'checking',
        balance: 5247.83,
        availableBalance: 5247.83,
        currency: 'USD',
        mask: '1234',
        status: 'active',
        metadata: {
          accountNumber: '****1234',
          openedDate: '2020-01-15'
        }
      },
      {
        id: 'mock-acc-savings-001' as any,
        institutionId: this.config.institutionId as any,
        name: 'High Yield Savings',
        officialName: 'Mock Bank High Yield Savings',
        type: 'savings',
        subtype: 'savings',
        balance: 15420.50,
        availableBalance: 15420.50,
        currency: 'USD',
        mask: '5678',
        status: 'active',
        metadata: {
          accountNumber: '****5678',
          interestRate: '4.25%'
        }
      },
      {
        id: 'mock-acc-credit-001' as any,
        institutionId: this.config.institutionId as any,
        name: 'Cash Rewards Credit Card',
        officialName: 'Mock Bank Cash Rewards Visa',
        type: 'credit',
        subtype: 'credit card',
        balance: -1250.50,
        availableBalance: 8749.50,
        currency: 'USD',
        mask: '9012',
        status: 'active',
        metadata: {
          creditLimit: 10000,
          dueDate: '2026-02-28'
        }
      }
    ];
  }

  /**
   * Authenticate with mock credentials
   * 
   * Valid credentials:
   * - username: 'demo'
   * - password: 'demo'
   */
  async authenticate(credentials: BankCredentials): Promise<AuthToken> {
    this.log('Authenticating with mock bank...');
    
    // Simulate network delay
    await this.simulateDelay(300, 800);

    // Validate credentials
    if (!credentials.username || !credentials.password) {
      throw new ConnectorError(
        'Username and password are required',
        ConnectorErrorCode.INVALID_CREDENTIALS,
        this.config.institutionId
      );
    }

    // Check credentials
    const isValid = 
      credentials.username === MockBankConnector.DEMO_USERNAME &&
      credentials.password === MockBankConnector.DEMO_PASSWORD;

    if (!isValid) {
      this.log('Authentication failed: invalid credentials');
      throw new ConnectorError(
        `Invalid credentials. Use username: '${MockBankConnector.DEMO_USERNAME}', password: '${MockBankConnector.DEMO_PASSWORD}'`,
        ConnectorErrorCode.INVALID_CREDENTIALS,
        this.config.institutionId
      );
    }

    // Generate consistent token based on timestamp
    const timestamp = Date.now();
    const token: AuthToken = {
      accessToken: `mock_access_${this.config.institutionId}_${timestamp}`,
      refreshToken: `mock_refresh_${this.config.institutionId}_${timestamp}`,
      expiresAt: new Date(timestamp + 3600000), // 1 hour from now
      tokenType: 'Bearer',
      itemId: `mock_item_${this.config.institutionId}_${timestamp}`
    };

    this.log('Authentication successful');
    return token;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(token: AuthToken): Promise<AuthToken> {
    this.log('Refreshing token...');
    
    await this.simulateDelay(200, 500);

    if (!token.refreshToken) {
      throw new ConnectorError(
        'No refresh token available',
        ConnectorErrorCode.TOKEN_REFRESH_FAILED,
        this.config.institutionId
      );
    }

    // Generate new token
    const timestamp = Date.now();
    const newToken: AuthToken = {
      accessToken: `mock_access_${this.config.institutionId}_${timestamp}_refreshed`,
      refreshToken: token.refreshToken, // Keep same refresh token
      expiresAt: new Date(timestamp + 3600000),
      tokenType: 'Bearer',
      itemId: token.itemId
    };

    this.log('Token refreshed successfully');
    return newToken;
  }

  /**
   * Fetch all accounts
   */
  async fetchAccounts(): Promise<Account[]> {
    this.ensureAuthenticated();
    this.log('Fetching accounts...');
    
    await this.simulateDelay(500, 1200);

    // Return deep copy to prevent mutation
    const accounts = JSON.parse(JSON.stringify(this.mockAccounts));
    
    this.log(`Returning ${accounts.length} accounts`);
    return accounts;
  }

  /**
   * Fetch transactions for an account
   */
  async fetchTransactions(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Transaction[]> {
    this.ensureAuthenticated();
    this.log('Fetching transactions...', { accountId, startDate, endDate });
    
    await this.simulateDelay(800, 1500);

    // Validate account exists
    const account = this.mockAccounts.find(a => a.id === accountId);
    if (!account) {
      throw new ConnectorError(
        `Account ${accountId} not found`,
        ConnectorErrorCode.ACCOUNT_NOT_FOUND,
        this.config.institutionId
      );
    }

    // Generate deterministic transactions
    const transactions = this.generateTransactions(accountId, startDate, endDate);
    
    this.log(`Returning ${transactions.length} transactions for account ${accountId}`);
    return transactions;
  }

  /**
   * Generate realistic mock transactions
   * Uses deterministic generation based on account and date range
   */
  private generateTransactions(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Transaction[] {
    const transactions: Transaction[] = [];
    
    // Default date range: last 30 days
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Determine account type for realistic transactions
    const account = this.mockAccounts.find(a => a.id === accountId);
    const isCreditCard = account?.type === 'credit';
    const isSavings = account?.type === 'savings';
    
    // Transaction templates by category
    const transactionTemplates = [
      { category: 'Food & Dining', merchants: ['Starbucks', 'Chipotle', 'Whole Foods', 'Trader Joe\'s'], amountRange: [5, 150] },
      { category: 'Transportation', merchants: ['Shell', 'Uber', 'Lyft', 'Exxon'], amountRange: [10, 60] },
      { category: 'Shopping', merchants: ['Amazon', 'Target', 'Costco', 'Best Buy'], amountRange: [20, 500] },
      { category: 'Entertainment', merchants: ['Netflix', 'Spotify', 'AMC Theaters', 'Steam'], amountRange: [9.99, 75] },
      { category: 'Utilities', merchants: ['Electric Company', 'Water Dept', 'Internet Provider', 'Phone Carrier'], amountRange: [50, 200] },
      { category: 'Healthcare', merchants: ['CVS Pharmacy', 'Walgreens', 'Urgent Care', 'Dental Office'], amountRange: [15, 300] }
    ];

    // Generate transactions for each day in range
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const numTransactions = Math.min(Math.max(daysDiff * 2, 10), 50); // 2 per day, min 10, max 50
    
    for (let i = 0; i < numTransactions; i++) {
      // Deterministic date within range
      const date = new Date(start.getTime() + (i / numTransactions) * (end.getTime() - start.getTime()));
      
      // Select template deterministically
      const template = transactionTemplates[i % transactionTemplates.length];
      const merchant = template.merchants[i % template.merchants.length];
      
      // Generate amount
      const [min, max] = template.amountRange;
      const amount = parseFloat((min + (max - min) * ((i * 7) % 100) / 100).toFixed(2));
      
      // Determine transaction type
      let txType: 'debit' | 'credit' | 'transfer';
      let txAmount = amount;
      
      if (isCreditCard) {
        // Credit cards: mostly debits (purchases)
        txType = i % 10 === 0 ? 'credit' : 'debit'; // 10% credits (payments)
        txAmount = txType === 'credit' ? -Math.abs(amount) : Math.abs(amount);
      } else if (isSavings) {
        // Savings: mostly credits (deposits/interest)
        txType = i % 5 === 0 ? 'debit' : 'credit'; // 20% debits (withdrawals)
        txAmount = txType === 'credit' ? Math.abs(amount) : -Math.abs(amount);
      } else {
        // Checking: mix of both
        txType = i % 3 === 0 ? 'credit' : 'debit';
        txAmount = txType === 'credit' ? Math.abs(amount) : -Math.abs(amount);
      }

      this.transactionCounter++;
      
      transactions.push({
        id: `mock-tx-${accountId}-${this.transactionCounter}` as any,
        accountId: accountId as any,
        amount: txAmount,
        currency: 'USD',
        description: `${merchant} - ${template.category}`,
        category: template.category,
        date: date,
        merchantName: merchant,
        pending: false,
        transactionType: txType,
        metadata: {
          originalAmount: Math.abs(amount),
          paymentMethod: isCreditCard ? 'Credit Card' : 'Bank Transfer'
        }
      });
    }

    // Sort by date descending
    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Simulate network delay with randomization
   */
  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Override sync to add mock-specific logging
   */
  async sync(
    credentials: BankCredentials,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<SyncResult> {
    this.log('Starting mock sync operation', {
      username: credentials.username,
      startDate: options?.startDate,
      endDate: options?.endDate
    });

    const result = await super.sync(credentials, options);

    if (result.success) {
      this.log('Mock sync completed successfully', {
        accounts: result.accounts.length,
        transactions: result.transactions.length
      });
    } else {
      this.log('Mock sync failed', { error: result.error });
    }

    return result;
  }
}

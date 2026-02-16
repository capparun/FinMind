/**
 * Mock Bank Connector for Testing
 * Simulates bank interactions without real API calls
 */

import { BaseBankConnector } from './BaseConnector';
import {
  BankCredentials,
  AuthToken,
  Transaction,
  Account,
  ConnectorConfig
} from './types';

export class MockBankConnector extends BaseBankConnector {
  private mockAccounts: Account[] = [
    {
      id: 'mock-checking-001',
      institutionId: 'mock-bank',
      name: 'Mock Checking Account',
      type: 'checking',
      balance: 5000.00,
      currency: 'USD',
      mask: '1234',
      status: 'active'
    },
    {
      id: 'mock-savings-001',
      institutionId: 'mock-bank',
      name: 'Mock Savings Account',
      type: 'savings',
      balance: 15000.00,
      currency: 'USD',
      mask: '5678',
      status: 'active'
    },
    {
      id: 'mock-credit-001',
      institutionId: 'mock-bank',
      name: 'Mock Credit Card',
      type: 'credit',
      balance: -1250.50,
      currency: 'USD',
      mask: '9012',
      status: 'active'
    }
  ];

  constructor(config?: Partial<ConnectorConfig>) {
    super({
      name: 'Mock Bank',
      institutionId: 'mock-bank',
      ...config
    });
  }

  async authenticate(credentials: BankCredentials): Promise<AuthToken> {
    // Simulate API delay
    await this.delay(500);

    // Validate mock credentials
    if (credentials.username === 'demo' && credentials.password === 'demo') {
      return {
        accessToken: 'mock-token-' + Date.now(),
        refreshToken: 'mock-refresh-' + Date.now(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        tokenType: 'Bearer'
      };
    }

    throw new Error('Invalid credentials. Use username: demo, password: demo');
  }

  async refreshToken(token: AuthToken): Promise<AuthToken> {
    await this.delay(300);
    
    return {
      accessToken: 'mock-token-refreshed-' + Date.now(),
      refreshToken: token.refreshToken,
      expiresAt: new Date(Date.now() + 3600000),
      tokenType: 'Bearer'
    };
  }

  async fetchAccounts(): Promise<Account[]> {
    await this.delay(800);
    return [...this.mockAccounts];
  }

  async fetchTransactions(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Transaction[]> {
    await this.delay(1000);

    const account = this.mockAccounts.find(a => a.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Generate mock transactions
    return this.generateMockTransactions(accountId, 20, startDate, endDate);
  }

  private generateMockTransactions(
    accountId: string,
    count: number,
    startDate?: Date,
    endDate?: Date
  ): Transaction[] {
    const transactions: Transaction[] = [];
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const categories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Income'];
    const merchants = ['Supermarket', 'Gas Station', 'Restaurant', 'Online Store', 'Utility Co', 'Employer'];

    for (let i = 0; i < count; i++) {
      const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      const category = categories[Math.floor(Math.random() * categories.length)];
      const isIncome = category === 'Income';
      
      transactions.push({
        id: `mock-tx-${accountId}-${i}`,
        accountId,
        amount: isIncome ? Math.random() * 2000 + 1000 : -(Math.random() * 100 + 10),
        currency: 'USD',
        description: `${merchants[Math.floor(Math.random() * merchants.length)]} - ${category}`,
        category,
        date,
        merchantName: merchants[Math.floor(Math.random() * merchants.length)],
        pending: false,
        transactionType: isIncome ? 'credit' : 'debit'
      });
    }

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

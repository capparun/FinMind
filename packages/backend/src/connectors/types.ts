/**
 * Bank Sync Connector Types
 * Define the core interfaces for bank integrations
 */

export interface BankCredentials {
  institutionId: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  [key: string]: any;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  category?: string;
  date: Date;
  merchantName?: string;
  pending: boolean;
  transactionType: 'debit' | 'credit' | 'transfer';
  metadata?: Record<string, any>;
}

export interface Account {
  id: string;
  institutionId: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan';
  balance: number;
  currency: string;
  accountNumber?: string;
  mask?: string;
  status: 'active' | 'inactive' | 'closed';
}

export interface SyncResult {
  success: boolean;
  accounts: Account[];
  transactions: Transaction[];
  error?: string;
  nextSyncToken?: string;
}

export interface ConnectorConfig {
  name: string;
  institutionId: string;
  baseUrl?: string;
  apiVersion?: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Enhanced Bank Sync Connector Types
 * Strictly typed interfaces for bank integrations
 */

// Reusable branded types for type safety
export type InstitutionId = string & { readonly __brand: unique symbol };
export type AccountId = string & { readonly __brand: unique symbol };
export type TransactionId = string & { readonly __brand: unique symbol };

// Currency codes (ISO 4217)
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | string;

// Account types
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'mortgage';

// Transaction types
export type TransactionType = 'debit' | 'credit' | 'transfer' | 'fee' | 'interest';

// Account status
export type AccountStatus = 'active' | 'inactive' | 'closed' | 'frozen';

/**
 * Bank credentials with strict validation
 */
export interface BankCredentials {
  /** Unique identifier for the financial institution */
  institutionId: InstitutionId;
  
  /** Username for basic authentication */
  username?: string;
  
  /** Password for basic authentication (should be handled securely) */
  password?: string;
  
  /** OAuth access token */
  accessToken?: string;
  
  /** OAuth refresh token */
  refreshToken?: string;
  
  /** API key for direct API access */
  apiKey?: string;
  
  /** API secret for direct API access */
  apiSecret?: string;
  
  /** Public token (e.g., from Plaid Link) */
  publicToken?: string;
}

/**
 * Authentication token returned after successful authentication
 */
export interface AuthToken {
  /** Access token for API calls */
  accessToken: string;
  
  /** Refresh token for obtaining new access tokens */
  refreshToken?: string;
  
  /** Token expiration time */
  expiresAt: Date;
  
  /** Token type (e.g., 'Bearer', 'OAuth') */
  tokenType: string;
  
  /** Optional item/connection identifier */
  itemId?: string;
}

/**
 * Financial transaction
 */
export interface Transaction {
  /** Unique transaction identifier */
  id: TransactionId;
  
  /** Associated account ID */
  accountId: AccountId;
  
  /** Transaction amount (positive for credit, negative for debit) */
  amount: number;
  
  /** Currency code (ISO 4217) */
  currency: CurrencyCode;
  
  /** Transaction description */
  description: string;
  
  /** Transaction category (e.g., 'Food', 'Transport') */
  category?: string;
  
  /** Transaction date */
  date: Date;
  
  /** Merchant or counterparty name */
  merchantName?: string;
  
  /** Whether the transaction is pending */
  pending: boolean;
  
  /** Transaction type */
  transactionType: TransactionType;
  
  /** ISO 4217 currency code of original amount if different */
  isoCurrencyCode?: string;
  
  /** Unofficial currency code if applicable */
  unofficialCurrencyCode?: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Bank account information
 */
export interface Account {
  /** Unique account identifier */
  id: AccountId;
  
  /** Institution identifier */
  institutionId: InstitutionId;
  
  /** Account name */
  name: string;
  
  /** Official account name from the institution */
  officialName?: string;
  
  /** Account type */
  type: AccountType;
  
  /** Account subtype (e.g., 'checking', 'savings') */
  subtype?: string;
  
  /** Current balance */
  balance: number;
  
  /** Available balance (may differ from current balance) */
  availableBalance?: number;
  
  /** Currency code */
  currency: CurrencyCode;
  
  /** Full account number (sensitive, handle with care) */
  accountNumber?: string;
  
  /** Masked account number (last 4 digits) */
  mask?: string;
  
  /** Account status */
  status: AccountStatus;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Whether the sync was successful */
  success: boolean;
  
  /** Fetched accounts */
  accounts: Account[];
  
  /** Fetched transactions */
  transactions: Transaction[];
  
  /** Error message if sync failed */
  error?: string;
  
  /** Error code for programmatic handling */
  errorCode?: string;
  
  /** Token for next sync (cursor-based pagination) */
  nextSyncToken?: string;
  
  /** Number of accounts synced */
  accountsSynced?: number;
  
  /** Number of transactions synced */
  transactionsSynced?: number;
}

/**
 * Configuration for a bank connector
 */
export interface ConnectorConfig {
  /** Human-readable connector name */
  name: string;
  
  /** Unique institution identifier */
  institutionId: InstitutionId;
  
  /** Base URL for API calls */
  baseUrl?: string;
  
  /** API version */
  apiVersion?: string;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Number of retry attempts for failed requests */
  retryAttempts?: number;
  
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  
  /** Whether to enable debug logging */
  debug?: boolean;
}

/**
 * Options for sync operations
 */
export interface SyncOptions {
  /** Start date for transaction fetching */
  startDate?: Date;
  
  /** End date for transaction fetching */
  endDate?: Date;
  
  /** Maximum number of transactions to fetch */
  maxTransactions?: number;
  
  /** Cursor for pagination */
  cursor?: string;
  
  /** Whether to include pending transactions */
  includePending?: boolean;
}

/**
 * Error codes for standardized error handling
 */
export enum ConnectorErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Custom error class for connector errors
 */
export class ConnectorError extends Error {
  constructor(
    message: string,
    public code: ConnectorErrorCode,
    public institutionId?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ConnectorError';
    Object.setPrototypeOf(this, ConnectorError.prototype);
  }
}

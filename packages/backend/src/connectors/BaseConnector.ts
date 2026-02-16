/**
 * Base Bank Connector Abstract Class
 * Defines the contract for all bank connectors
 */

import {
  BankCredentials,
  AuthToken,
  Transaction,
  Account,
  SyncResult,
  ConnectorConfig
} from './types';

export abstract class BaseBankConnector {
  protected config: ConnectorConfig;
  protected credentials: BankCredentials | null = null;
  protected authToken: AuthToken | null = null;

  constructor(config: ConnectorConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config
    };
  }

  /**
   * Authenticate with the bank
   * @param credentials - Bank login credentials
   * @returns AuthToken for subsequent requests
   */
  abstract authenticate(credentials: BankCredentials): Promise<AuthToken>;

  /**
   * Refresh the authentication token
   * @param token - Current auth token
   * @returns New auth token
   */
  abstract refreshToken(token: AuthToken): Promise<AuthToken>;

  /**
   * Fetch all accounts for the authenticated user
   * @returns Array of accounts
   */
  abstract fetchAccounts(): Promise<Account[]>;

  /**
   * Fetch transactions for a specific account
   * @param accountId - Account identifier
   * @param startDate - Start date for transactions
   * @param endDate - End date for transactions
   * @returns Array of transactions
   */
  abstract fetchTransactions(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Transaction[]>;

  /**
   * Full sync operation: authenticate + fetch accounts + fetch transactions
   * @param credentials - Bank credentials
   * @param options - Sync options
   * @returns Complete sync result
   */
  async sync(credentials: BankCredentials, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<SyncResult> {
    try {
      // Step 1: Authenticate
      this.authToken = await this.authenticate(credentials);
      this.credentials = credentials;

      // Step 2: Fetch accounts
      const accounts = await this.fetchAccounts();

      // Step 3: Fetch transactions for all accounts
      const allTransactions: Transaction[] = [];
      for (const account of accounts) {
        if (account.status === 'active') {
          const transactions = await this.fetchTransactions(
            account.id,
            options?.startDate,
            options?.endDate
          );
          allTransactions.push(...transactions);
        }
      }

      return {
        success: true,
        accounts,
        transactions: allTransactions
      };
    } catch (error) {
      return {
        success: false,
        accounts: [],
        transactions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate if the connector is properly configured
   */
  validateConfig(): boolean {
    return !!this.config.institutionId && !!this.config.name;
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorConfig {
    return this.config;
  }
}

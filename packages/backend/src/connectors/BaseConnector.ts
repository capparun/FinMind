/**
 * Enhanced Base Bank Connector Abstract Class
 * Production-ready foundation for all bank connectors
 */

import {
  BankCredentials,
  AuthToken,
  Transaction,
  Account,
  SyncResult,
  ConnectorConfig,
  SyncOptions,
  ConnectorError,
  ConnectorErrorCode
} from './types';

/**
 * Abstract base class that all bank connectors must extend
 * 
 * @example
 * ```typescript
 * class ChaseConnector extends BaseBankConnector {
 *   async authenticate(credentials: BankCredentials): Promise<AuthToken> {
 *     // Implementation
 *   }
 *   // ... implement other abstract methods
 * }
 * ```
 */
export abstract class BaseBankConnector {
  protected config: Required<ConnectorConfig>;
  protected credentials: BankCredentials | null = null;
  protected authToken: AuthToken | null = null;
  private _isAuthenticated: boolean = false;
  private _lastError: Error | null = null;

  constructor(config: ConnectorConfig) {
    // Validate required config
    if (!config.institutionId) {
      throw new ConnectorError(
        'institutionId is required',
        ConnectorErrorCode.UNKNOWN_ERROR
      );
    }
    
    if (!config.name) {
      throw new ConnectorError(
        'name is required',
        ConnectorErrorCode.UNKNOWN_ERROR
      );
    }

    // Set defaults
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      debug: false,
      baseUrl: '',
      apiVersion: 'v1',
      ...config
    };
  }

  /**
   * Logger utility for debug output
   */
  protected log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[${this.config.name}] ${message}`, data || '');
    }
  }

  /**
   * Check if currently authenticated
   */
  get isAuthenticated(): boolean {
    return this._isAuthenticated && this.authToken !== null;
  }

  /**
   * Get the last error that occurred
   */
  get lastError(): Error | null {
    return this._lastError;
  }

  /**
   * Authenticate with the bank
   * 
   * @param credentials - Bank login credentials
   * @returns AuthToken for subsequent requests
   * @throws ConnectorError if authentication fails
   */
  abstract authenticate(credentials: BankCredentials): Promise<AuthToken>;

  /**
   * Refresh the authentication token
   * 
   * @param token - Current auth token
   * @returns New auth token
   * @throws ConnectorError if refresh fails
   */
  abstract refreshToken(token: AuthToken): Promise<AuthToken>;

  /**
   * Fetch all accounts for the authenticated user
   * 
   * @returns Array of accounts
   * @throws ConnectorError if not authenticated or request fails
   */
  abstract fetchAccounts(): Promise<Account[]>;

  /**
   * Fetch transactions for a specific account
   * 
   * @param accountId - Account identifier
   * @param startDate - Start date for transactions (inclusive)
   * @param endDate - End date for transactions (inclusive)
   * @returns Array of transactions
   * @throws ConnectorError if not authenticated, account not found, or request fails
   */
  abstract fetchTransactions(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Transaction[]>;

  /**
   * Ensure the connector is authenticated before making requests
   * @throws ConnectorError if not authenticated
   */
  protected ensureAuthenticated(): void {
    if (!this.isAuthenticated) {
      throw new ConnectorError(
        'Not authenticated. Call authenticate() first.',
        ConnectorErrorCode.AUTHENTICATION_FAILED,
        this.config.institutionId
      );
    }
  }

  /**
   * Check if token needs refresh (expires within 5 minutes)
   */
  protected needsTokenRefresh(): boolean {
    if (!this.authToken) return true;
    
    const fiveMinutes = 5 * 60 * 1000;
    return this.authToken.expiresAt.getTime() - Date.now() < fiveMinutes;
  }

  /**
   * Execute with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        this.log(`${operationName} - attempt ${attempt}`);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this._lastError = lastError;
        
        this.log(`${operationName} - attempt ${attempt} failed:`, lastError.message);
        
        // Don't retry on authentication errors
        if (error instanceof ConnectorError) {
          if (error.code === ConnectorErrorCode.INVALID_CREDENTIALS ||
              error.code === ConnectorErrorCode.AUTHENTICATION_FAILED) {
            throw error;
          }
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          this.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError || new Error(`${operationName} failed after ${this.config.retryAttempts} attempts`);
  }

  /**
   * Sleep/delay utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Full sync operation: authenticate + fetch accounts + fetch transactions
   * 
   * This is a convenience method that orchestrates the entire sync process.
   * It handles authentication, account fetching, transaction fetching, and
   * comprehensive error handling.
   * 
   * @param credentials - Bank credentials (required for initial auth)
   * @param options - Sync options including date ranges
   * @returns Complete sync result with accounts and transactions
   */
  async sync(
    credentials: BankCredentials,
    options?: SyncOptions
  ): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Validate credentials
      if (!credentials || !credentials.institutionId) {
        throw new ConnectorError(
          'Valid credentials with institutionId are required',
          ConnectorErrorCode.INVALID_CREDENTIALS
        );
      }

      this.log('Starting sync operation', { institutionId: credentials.institutionId });

      // Step 1: Authenticate (or use existing token)
      if (!this.isAuthenticated || this.needsTokenRefresh()) {
        this.log('Authenticating...');
        this.authToken = await this.withRetry(
          () => this.authenticate(credentials),
          'authenticate'
        );
        this.credentials = credentials;
        this._isAuthenticated = true;
        this.log('Authentication successful');
      } else {
        this.log('Using existing authentication');
      }

      // Step 2: Fetch accounts
      this.log('Fetching accounts...');
      const accounts = await this.withRetry(
        () => this.fetchAccounts(),
        'fetchAccounts'
      );
      this.log(`Fetched ${accounts.length} accounts`);

      // Validate accounts
      if (!Array.isArray(accounts)) {
        throw new ConnectorError(
          'Invalid response: accounts is not an array',
          ConnectorErrorCode.INVALID_RESPONSE
        );
      }

      // Step 3: Fetch transactions for all active accounts
      this.log('Fetching transactions...');
      const allTransactions: Transaction[] = [];
      
      for (const account of accounts) {
        // Skip inactive/closed accounts
        if (account.status !== 'active') {
          this.log(`Skipping ${account.status} account: ${account.id}`);
          continue;
        }

        try {
          const transactions = await this.withRetry(
            () => this.fetchTransactions(
              account.id,
              options?.startDate,
              options?.endDate
            ),
            `fetchTransactions(${account.id})`
          );

          // Validate and limit transactions
          if (Array.isArray(transactions)) {
            let filteredTransactions = transactions;
            
            // Apply max transactions limit if specified
            if (options?.maxTransactions && filteredTransactions.length > options.maxTransactions) {
              filteredTransactions = filteredTransactions.slice(0, options.maxTransactions);
              this.log(`Limited transactions to ${options.maxTransactions}`);
            }
            
            allTransactions.push(...filteredTransactions);
            this.log(`Fetched ${filteredTransactions.length} transactions for account ${account.id}`);
          }
        } catch (error) {
          this.log(`Failed to fetch transactions for account ${account.id}:`, error);
          // Continue with other accounts instead of failing completely
          // This allows partial sync success
        }
      }

      const duration = Date.now() - startTime;
      this.log(`Sync completed in ${duration}ms`, {
        accounts: accounts.length,
        transactions: allTransactions.length
      });

      return {
        success: true,
        accounts,
        transactions: allTransactions,
        accountsSynced: accounts.length,
        transactionsSynced: allTransactions.length
      };

    } catch (error) {
      // Reset authentication on critical errors
      if (error instanceof ConnectorError) {
        if (error.code === ConnectorErrorCode.AUTHENTICATION_FAILED ||
            error.code === ConnectorErrorCode.INVALID_CREDENTIALS) {
          this._isAuthenticated = false;
          this.authToken = null;
        }
      }

      const duration = Date.now() - startTime;
      this.log(`Sync failed after ${duration}ms:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = error instanceof ConnectorError ? error.code : ConnectorErrorCode.UNKNOWN_ERROR;

      return {
        success: false,
        accounts: [],
        transactions: [],
        error: errorMessage,
        errorCode
      };
    }
  }

  /**
   * Validate if the connector is properly configured
   */
  validateConfig(): boolean {
    return !!this.config.institutionId && 
           !!this.config.name && 
           this.config.timeout > 0 &&
           this.config.retryAttempts >= 0;
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorConfig {
    return { ...this.config };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.log('Disconnecting...');
    this._isAuthenticated = false;
    this.authToken = null;
    this.credentials = null;
    this._lastError = null;
  }
}

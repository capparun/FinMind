/**
 * Bank Connectors Module - Enhanced Edition
 * Production-ready pluggable architecture for bank integrations
 * 
 * @module connectors
 * @version 2.0.0
 */

// Core exports
export { BaseBankConnector } from './BaseConnector';
export { MockBankConnector } from './MockBankConnector';
export { ConnectorManager } from './ConnectorManager';

// Type exports
export type {
  BankCredentials,
  AuthToken,
  Transaction,
  Account,
  SyncResult,
  ConnectorConfig,
  SyncOptions,
  InstitutionId,
  AccountId,
  TransactionId,
  CurrencyCode,
  AccountType,
  TransactionType,
  AccountStatus
} from './types';

// Error handling
export { ConnectorError, ConnectorErrorCode } from './types';

// Default export for convenience
export { ConnectorManager as default } from './ConnectorManager';

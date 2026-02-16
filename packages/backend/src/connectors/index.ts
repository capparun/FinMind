/**
 * Bank Connectors Module
 * Main entry point for bank integrations
 */

export { BaseBankConnector } from './BaseConnector';
export { MockBankConnector } from './MockBankConnector';
export { ConnectorManager } from './ConnectorManager';
export * from './types';

// Default export
import { ConnectorManager } from './ConnectorManager';
export default new ConnectorManager();

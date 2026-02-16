/**
 * Connector Manager
 * Manages multiple bank connectors
 */

import { BaseBankConnector } from './BaseBankConnector';
import { MockBankConnector } from './MockBankConnector';
import { ConnectorConfig, BankCredentials, SyncResult } from './types';

export class ConnectorManager {
  private connectors: Map<string, BaseBankConnector> = new Map();

  constructor() {
    // Register built-in connectors
    this.register('mock-bank', new MockBankConnector());
  }

  /**
   * Register a new connector
   */
  register(institutionId: string, connector: BaseBankConnector): void {
    this.connectors.set(institutionId, connector);
  }

  /**
   * Get a connector by institution ID
   */
  getConnector(institutionId: string): BaseBankConnector | undefined {
    return this.connectors.get(institutionId);
  }

  /**
   * List all registered connectors
   */
  listConnectors(): Array<{ institutionId: string; name: string }> {
    return Array.from(this.connectors.entries()).map(([id, connector]) => ({
      institutionId: id,
      name: connector.getMetadata().name
    }));
  }

  /**
   * Check if a connector exists
   */
  hasConnector(institutionId: string): boolean {
    return this.connectors.has(institutionId);
  }

  /**
   * Sync data from a bank
   */
  async sync(
    institutionId: string,
    credentials: BankCredentials,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<SyncResult> {
    const connector = this.getConnector(institutionId);
    
    if (!connector) {
      return {
        success: false,
        accounts: [],
        transactions: [],
        error: `Connector not found for institution: ${institutionId}`
      };
    }

    return connector.sync(credentials, options);
  }
}

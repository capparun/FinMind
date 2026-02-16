/**
 * Usage Example
 * Demonstrates how to use the Bank Sync Connector
 */

import { ConnectorManager } from './ConnectorManager';
import { MockBankConnector } from './MockBankConnector';

async function example() {
  // Initialize manager
  const manager = new ConnectorManager();

  // List available connectors
  console.log('Available connectors:', manager.listConnectors());

  // Sync with mock bank
  const result = await manager.sync('mock-bank', {
    username: 'demo',
    password: 'demo'
  });

  if (result.success) {
    console.log('✅ Sync successful');
    console.log('Accounts:', result.accounts);
    console.log('Transactions:', result.transactions.length);
  } else {
    console.error('❌ Sync failed:', result.error);
  }
}

// Run example
example().catch(console.error);

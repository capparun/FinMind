# Bank Sync Connectors

Pluggable architecture for bank integrations in FinMind.

## Architecture

```
connectors/
├── types.ts              # Core type definitions
├── BaseConnector.ts      # Abstract base class
├── MockBankConnector.ts  # Mock implementation for testing
├── ConnectorManager.ts   # Connector registry and management
├── example.ts            # Usage examples
└── __tests__/            # Test files
```

## Quick Start

### Using the Mock Connector

```typescript
import { ConnectorManager } from './connectors/ConnectorManager';

const manager = new ConnectorManager();

// Sync with mock bank
const result = await manager.sync('mock-bank', {
  username: 'demo',
  password: 'demo'
});

if (result.success) {
  console.log('Accounts:', result.accounts);
  console.log('Transactions:', result.transactions);
}
```

### Creating a New Connector

```typescript
import { BaseBankConnector } from './connectors/BaseConnector';

class ChaseBankConnector extends BaseBankConnector {
  async authenticate(credentials) {
    // Implement Chase authentication
  }

  async refreshToken(token) {
    // Implement token refresh
  }

  async fetchAccounts() {
    // Implement account fetching
  }

  async fetchTransactions(accountId, startDate, endDate) {
    // Implement transaction fetching
  }
}

// Register the connector
const manager = new ConnectorManager();
manager.register('chase', new ChaseBankConnector());
```

## Features

- ✅ **Pluggable Architecture** - Easy to add new bank connectors
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Mock Connector** - Test without real bank APIs
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Token Management** - Automatic token refresh
- ✅ **Retry Logic** - Built-in retry mechanisms

## Testing

```bash
npm test -- connectors
```

## Future Connectors

- [ ] Plaid Integration
- [ ] Yodlee Integration
- [ ] Chase Bank
- [ ] Bank of America
- [ ] Wells Fargo

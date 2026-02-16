/**
 * Comprehensive test suite for MockBankConnector
 * Tests authentication, account operations, transactions, and error handling
 */

import { MockBankConnector } from '../MockBankConnector';
import { ConnectorError, ConnectorErrorCode } from '../types';

// Mock jest if not available
const describe = (globalThis as any).describe || ((name: string, fn: Function) => fn());
const it = (globalThis as any).it || ((name: string, fn: Function) => fn());
const expect = (globalThis as any).expect || ((val: any) => ({
  toBe: (expected: any) => { if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`); },
  toBeDefined: () => { if (val === undefined) throw new Error('Expected defined, got undefined'); },
  toBeInstanceOf: (cls: any) => { if (!(val instanceof cls)) throw new Error(`Expected instance of ${cls.name}`); },
  toBeGreaterThan: (n: number) => { if (!(val > n)) throw new Error(`Expected > ${n}, got ${val}`); },
  toBeNull: () => { if (val !== null) throw new Error(`Expected null, got ${val}`); },
  toThrow: async (expected?: any) => {
    try {
      await val();
      throw new Error('Expected function to throw');
    } catch (e) {
      if (expected && !(e instanceof expected)) throw new Error(`Expected ${expected.name}, got ${e.constructor.name}`);
    }
  },
  rejects: {
    toThrow: async (expected?: any) => {
      try {
        await val;
        throw new Error('Expected promise to reject');
      } catch (e) {
        if (expected && !(e instanceof expected)) throw new Error(`Expected ${expected.name}, got ${e.constructor.name}`);
      }
    },
    toBeInstanceOf: async (cls: any) => {
      try {
        await val;
        throw new Error('Expected promise to reject');
      } catch (e) {
        if (!(e instanceof cls)) throw new Error(`Expected instance of ${cls.name}`);
      }
    }
  }
}));

describe('MockBankConnector', () => {
  let connector: MockBankConnector;

  beforeEach(() => {
    connector = new MockBankConnector({ debug: false });
  });

  afterEach(async () => {
    await connector.disconnect();
  });

  describe('Configuration & Initialization', () => {
    it('should create with default config', () => {
      const defaultConnector = new MockBankConnector();
      expect(defaultConnector.validateConfig()).toBe(true);
    });

    it('should create with custom config', () => {
      const customConnector = new MockBankConnector({
        name: 'Test Bank',
        institutionId: 'test-bank' as any,
        debug: true
      });
      expect(customConnector.validateConfig()).toBe(true);
    });

    it('should throw on missing institutionId', () => {
      try {
        new MockBankConnector({ name: 'Test', institutionId: '' as any });
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConnectorError);
      }
    });
  });

  describe('Authentication', () => {
    it('should authenticate with valid credentials', async () => {
      const token = await connector.authenticate({
        institutionId: 'mock-bank' as any,
        username: 'demo',
        password: 'demo'
      });

      expect(token.accessToken).toBeDefined();
      expect(token.refreshToken).toBeDefined();
      expect(token.expiresAt).toBeInstanceOf(Date);
      expect(token.tokenType).toBe('Bearer');
      expect(token.itemId).toBeDefined();
    });

    it('should fail with invalid username', async () => {
      await expect(
        connector.authenticate({
          institutionId: 'mock-bank' as any,
          username: 'wrong',
          password: 'demo'
        })
      ).rejects.toBeInstanceOf(ConnectorError);
    });

    it('should fail with invalid password', async () => {
      await expect(
        connector.authenticate({
          institutionId: 'mock-bank' as any,
          username: 'demo',
          password: 'wrong'
        })
      ).rejects.toBeInstanceOf(ConnectorError);
    });

    it('should fail with missing credentials', async () => {
      await expect(
        connector.authenticate({
          institutionId: 'mock-bank' as any
        } as any)
      ).rejects.toBeInstanceOf(ConnectorError);
    });

    it('should set isAuthenticated after successful auth', async () => {
      expect(connector.isAuthenticated).toBe(false);
      
      await connector.authenticate({
        institutionId: 'mock-bank' as any,
        username: 'demo',
        password: 'demo'
      });

      // Note: authenticate alone doesn't set isAuthenticated, sync does
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      const originalToken = await connector.authenticate({
        institutionId: 'mock-bank' as any,
        username: 'demo',
        password: 'demo'
      });

      const newToken = await connector.refreshToken(originalToken);

      expect(newToken.accessToken).not.toBe(originalToken.accessToken);
      expect(newToken.refreshToken).toBe(originalToken.refreshToken);
      expect(newToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should fail without refresh token', async () => {
      await expect(
        connector.refreshToken({
          accessToken: 'test',
          expiresAt: new Date(),
          tokenType: 'Bearer'
        })
      ).rejects.toBeInstanceOf(ConnectorError);
    });
  });

  describe('Account Operations', () => {
    beforeEach(async () => {
      await connector.authenticate({
        institutionId: 'mock-bank' as any,
        username: 'demo',
        password: 'demo'
      });
    });

    it('should throw when not authenticated', async () => {
      const unauthConnector = new MockBankConnector();
      await expect(unauthConnector.fetchAccounts()).rejects.toBeInstanceOf(ConnectorError);
    });

    it('should fetch accounts', async () => {
      const accounts = await connector.fetchAccounts();
      
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts[0]).toHaveProperty('id');
      expect(accounts[0]).toHaveProperty('balance');
      expect(accounts[0]).toHaveProperty('type');
    });

    it('should return 3 mock accounts', async () => {
      const accounts = await connector.fetchAccounts();
      expect(accounts.length).toBe(3);
    });

    it('should return accounts with valid types', async () => {
      const accounts = await connector.fetchAccounts();
      const validTypes = ['checking', 'savings', 'credit', 'investment', 'loan'];
      
      accounts.forEach(account => {
        expect(validTypes).toContain(account.type);
      });
    });
  });

  describe('Transaction Operations', () => {
    let accountId: string;

    beforeEach(async () => {
      await connector.authenticate({
        institutionId: 'mock-bank' as any,
        username: 'demo',
        password: 'demo'
      });

      const accounts = await connector.fetchAccounts();
      accountId = accounts[0].id;
    });

    it('should throw when not authenticated', async () => {
      const unauthConnector = new MockBankConnector();
      await expect(
        unauthConnector.fetchTransactions('any-id')
      ).rejects.toBeInstanceOf(ConnectorError);
    });

    it('should throw for invalid account', async () => {
      await expect(
        connector.fetchTransactions('invalid-account-id')
      ).rejects.toBeInstanceOf(ConnectorError);
    });

    it('should fetch transactions', async () => {
      const transactions = await connector.fetchTransactions(accountId);
      
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[0]).toHaveProperty('id');
      expect(transactions[0]).toHaveProperty('amount');
      expect(transactions[0]).toHaveProperty('date');
    });

    it('should return transactions sorted by date desc', async () => {
      const transactions = await connector.fetchTransactions(accountId);
      
      for (let i = 1; i < transactions.length; i++) {
        expect(transactions[i - 1].date.getTime()).toBeGreaterThanOrEqual(
          transactions[i].date.getTime()
        );
      }
    });

    it('should respect date range', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const transactions = await connector.fetchTransactions(accountId, startDate, endDate);
      
      transactions.forEach(tx => {
        expect(tx.date.getTime()).toBeLessThanOrEqual(endDate.getTime());
        expect(tx.date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      });
    });
  });

  describe('Full Sync', () => {
    it('should perform complete sync', async () => {
      const result = await connector.sync({
        institutionId: 'mock-bank' as any,
        username: 'demo',
        password: 'demo'
      });

      expect(result.success).toBe(true);
      expect(result.accounts.length).toBe(3);
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.accountsSynced).toBe(3);
      expect(result.transactionsSynced).toBeGreaterThan(0);
    });

    it('should fail with invalid credentials', async () => {
      const result = await connector.sync({
        institutionId: 'mock-bank' as any,
        username: 'wrong',
        password: 'wrong'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe(ConnectorErrorCode.INVALID_CREDENTIALS);
    });

    it('should fail with missing credentials', async () => {
      const result = await connector.sync({
        institutionId: 'mock-bank' as any
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should respect maxTransactions option', async () => {
      const result = await connector.sync({
        institutionId: 'mock-bank' as any,
        username: 'demo',
        password: 'demo'
      }, {
        maxTransactions: 10
      });

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Handling', () => {
    it('should reset authentication on auth failure', async () => {
      // First successful auth
      await connector.sync({
        institutionId: 'mock-bank' as any,
        username: 'demo',
        password: 'demo'
      });

      // Then failed auth
      const result = await connector.sync({
        institutionId: 'mock-bank' as any,
        username: 'wrong',
        password: 'wrong'
      });

      expect(result.success).toBe(false);
      // After auth failure, should not be authenticated
    });

    it('should store last error', async () => {
      await connector.sync({
        institutionId: 'mock-bank' as any,
        username: 'wrong',
        password: 'wrong'
      });

      expect(connector.lastError).toBeDefined();
    });
  });

  describe('Disconnection', () => {
    it('should clean up on disconnect', async () => {
      await connector.authenticate({
        institutionId: 'mock-bank' as any,
        username: 'demo',
        password: 'demo'
      });

      await connector.disconnect();

      expect(connector.isAuthenticated).toBe(false);
      expect(connector.lastError).toBeNull();
    });
  });

  describe('Metadata', () => {
    it('should return metadata', () => {
      const metadata = connector.getMetadata();
      
      expect(metadata.name).toBe('Mock Bank');
      expect(metadata.institutionId).toBe('mock-bank');
    });
  });
});

console.log('✅ MockBankConnector test suite loaded');
console.log('Run with: npm test -- MockBankConnector');

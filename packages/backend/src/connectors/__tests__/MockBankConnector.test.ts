import { MockBankConnector } from '../MockBankConnector';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('MockBankConnector', () => {
  let connector: MockBankConnector;

  beforeEach(() => {
    connector = new MockBankConnector();
  });

  describe('authentication', () => {
    it('should authenticate with valid credentials', async () => {
      const token = await connector.authenticate({
        username: 'demo',
        password: 'demo'
      });

      expect(token.accessToken).toBeDefined();
      expect(token.expiresAt).toBeInstanceOf(Date);
    });

    it('should reject invalid credentials', async () => {
      await expect(
        connector.authenticate({ username: 'wrong', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('account operations', () => {
    beforeEach(async () => {
      await connector.authenticate({ username: 'demo', password: 'demo' });
    });

    it('should fetch accounts', async () => {
      const accounts = await connector.fetchAccounts();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts[0]).toHaveProperty('id');
      expect(accounts[0]).toHaveProperty('balance');
    });

    it('should fetch transactions', async () => {
      const accounts = await connector.fetchAccounts();
      const transactions = await connector.fetchTransactions(accounts[0].id);
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[0]).toHaveProperty('amount');
      expect(transactions[0]).toHaveProperty('description');
    });
  });

  describe('full sync', () => {
    it('should perform complete sync', async () => {
      const result = await connector.sync({
        username: 'demo',
        password: 'demo'
      });

      expect(result.success).toBe(true);
      expect(result.accounts.length).toBeGreaterThan(0);
      expect(result.transactions.length).toBeGreaterThan(0);
    });
  });

  describe('token refresh', () => {
    it('should refresh token', async () => {
      const token = await connector.authenticate({
        username: 'demo',
        password: 'demo'
      });

      const newToken = await connector.refreshToken(token);
      expect(newToken.accessToken).not.toBe(token.accessToken);
    });
  });
});

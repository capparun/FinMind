"""
Comprehensive test suite for MockBankConnector
"""

import unittest
from datetime import datetime, timedelta

from app.connectors import (
    MockBankConnector,
    BankCredentials,
    ConnectorError,
    ConnectorErrorCode
)


class TestMockBankConnector(unittest.TestCase):
    """Test cases for MockBankConnector"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.connector = MockBankConnector()
    
    def tearDown(self):
        """Clean up after tests"""
        self.connector.disconnect()
    
    def test_configuration(self):
        """Test connector configuration"""
        # Default config
        default_connector = MockBankConnector()
        self.assertTrue(default_connector.validate_config())
        self.assertEqual(default_connector.config.name, 'Mock Bank')
        
        # Custom config
        from app.connectors.base import ConnectorConfig
        custom = MockBankConnector(ConnectorConfig(
            name='Test Bank',
            institution_id='test-bank'
        ))
        self.assertEqual(custom.config.name, 'Test Bank')
    
    def test_authentication_success(self):
        """Test successful authentication"""
        token = self.connector.authenticate(BankCredentials(
            institution_id='mock-bank',
            username='demo',
            password='demo'
        ))
        
        self.assertIsNotNone(token.access_token)
        self.assertIsNotNone(token.refresh_token)
        self.assertIsNotNone(token.expires_at)
        self.assertEqual(token.token_type, 'Bearer')
        self.assertIsNotNone(token.item_id)
    
    def test_authentication_failure_wrong_username(self):
        """Test authentication failure with wrong username"""
        with self.assertRaises(ConnectorError) as context:
            self.connector.authenticate(BankCredentials(
                institution_id='mock-bank',
                username='wrong',
                password='demo'
            ))
        
        self.assertEqual(context.exception.code, ConnectorErrorCode.INVALID_CREDENTIALS)
    
    def test_authentication_failure_wrong_password(self):
        """Test authentication failure with wrong password"""
        with self.assertRaises(ConnectorError) as context:
            self.connector.authenticate(BankCredentials(
                institution_id='mock-bank',
                username='demo',
                password='wrong'
            ))
        
        self.assertEqual(context.exception.code, ConnectorErrorCode.INVALID_CREDENTIALS)
    
    def test_authentication_failure_missing_credentials(self):
        """Test authentication failure with missing credentials"""
        with self.assertRaises(ConnectorError):
            self.connector.authenticate(BankCredentials(
                institution_id='mock-bank'
            ))
    
    def test_token_refresh(self):
        """Test token refresh"""
        original_token = self.connector.authenticate(BankCredentials(
            institution_id='mock-bank',
            username='demo',
            password='demo'
        ))
        
        new_token = self.connector.refresh_token(original_token)
        
        self.assertNotEqual(new_token.access_token, original_token.access_token)
        self.assertEqual(new_token.refresh_token, original_token.refresh_token)
        self.assertGreater(new_token.expires_at, datetime.utcnow())
    
    def test_fetch_accounts(self):
        """Test fetching accounts"""
        # Authenticate first
        self.connector.authenticate(BankCredentials(
            institution_id='mock-bank',
            username='demo',
            password='demo'
        ))
        
        accounts = self.connector.fetch_accounts()
        
        self.assertEqual(len(accounts), 3)
        self.assertTrue(all(hasattr(a, 'id') for a in accounts))
        self.assertTrue(all(hasattr(a, 'balance') for a in accounts))
    
    def test_fetch_accounts_not_authenticated(self):
        """Test fetching accounts without authentication"""
        with self.assertRaises(ConnectorError) as context:
            self.connector.fetch_accounts()
        
        self.assertEqual(context.exception.code, ConnectorErrorCode.AUTHENTICATION_FAILED)
    
    def test_fetch_transactions(self):
        """Test fetching transactions"""
        # Authenticate and get accounts
        self.connector.authenticate(BankCredentials(
            institution_id='mock-bank',
            username='demo',
            password='demo'
        ))
        
        accounts = self.connector.fetch_accounts()
        account_id = accounts[0].id
        
        transactions = self.connector.fetch_transactions(account_id)
        
        self.assertGreater(len(transactions), 0)
        self.assertTrue(all(hasattr(t, 'id') for t in transactions))
        self.assertTrue(all(hasattr(t, 'amount') for t in transactions))
    
    def test_fetch_transactions_invalid_account(self):
        """Test fetching transactions for invalid account"""
        self.connector.authenticate(BankCredentials(
            institution_id='mock-bank',
            username='demo',
            password='demo'
        ))
        
        with self.assertRaises(ConnectorError) as context:
            self.connector.fetch_transactions('invalid-account-id')
        
        self.assertEqual(context.exception.code, ConnectorErrorCode.ACCOUNT_NOT_FOUND)
    
    def test_full_sync(self):
        """Test complete sync operation"""
        result = self.connector.sync(BankCredentials(
            institution_id='mock-bank',
            username='demo',
            password='demo'
        ))
        
        self.assertTrue(result.success)
        self.assertEqual(len(result.accounts), 3)
        self.assertGreater(len(result.transactions), 0)
        self.assertEqual(result.accounts_synced, 3)
        self.assertGreater(result.transactions_synced, 0)
    
    def test_sync_invalid_credentials(self):
        """Test sync with invalid credentials"""
        result = self.connector.sync(BankCredentials(
            institution_id='mock-bank',
            username='wrong',
            password='wrong'
        ))
        
        self.assertFalse(result.success)
        self.assertIsNotNone(result.error)
        self.assertEqual(result.error_code, ConnectorErrorCode.INVALID_CREDENTIALS)
    
    def test_sync_missing_credentials(self):
        """Test sync with missing credentials"""
        result = self.connector.sync(BankCredentials(
            institution_id='mock-bank'
        ))
        
        self.assertFalse(result.success)
        self.assertIsNotNone(result.error)
    
    def test_sync_with_date_range(self):
        """Test sync with date range"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        result = self.connector.sync(
            BankCredentials(
                institution_id='mock-bank',
                username='demo',
                password='demo'
            ),
            start_date=start_date,
            end_date=end_date
        )
        
        self.assertTrue(result.success)
        
        # Check transactions are within date range
        for tx in result.transactions:
            self.assertGreaterEqual(tx.date, start_date)
            self.assertLessEqual(tx.date, end_date)
    
    def test_sync_with_max_transactions(self):
        """Test sync with max transactions limit"""
        result = self.connector.sync(
            BankCredentials(
                institution_id='mock-bank',
                username='demo',
                password='demo'
            ),
            max_transactions=10
        )
        
        self.assertTrue(result.success)
        self.assertLessEqual(len(result.transactions), 10)
    
    def test_disconnect(self):
        """Test disconnect cleanup"""
        # Authenticate first
        self.connector.authenticate(BankCredentials(
            institution_id='mock-bank',
            username='demo',
            password='demo'
        ))
        
        # Disconnect
        self.connector.disconnect()
        
        self.assertFalse(self.connector.is_authenticated)
        self.assertIsNone(self.connector.last_error)


class TestConnectorManager(unittest.TestCase):
    """Test cases for ConnectorManager"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.manager = ConnectorManager()
    
    def test_list_connectors(self):
        """Test listing connectors"""
        connectors = self.manager.list_connectors()
        
        self.assertGreater(len(connectors), 0)
        self.assertTrue(any(c['institution_id'] == 'mock-bank' for c in connectors))
    
    def test_has_connector(self):
        """Test checking if connector exists"""
        self.assertTrue(self.manager.has_connector('mock-bank'))
        self.assertFalse(self.manager.has_connector('non-existent'))
    
    def test_sync_via_manager(self):
        """Test sync through manager"""
        result = self.manager.sync(
            'mock-bank',
            {
                'institution_id': 'mock-bank',
                'username': 'demo',
                'password': 'demo'
            }
        )
        
        self.assertTrue(result.success)
    
    def test_sync_invalid_institution(self):
        """Test sync with invalid institution"""
        result = self.manager.sync(
            'non-existent',
            {'institution_id': 'non-existent'}
        )
        
        self.assertFalse(result.success)


if __name__ == '__main__':
    unittest.main()

"""
Mock Bank Connector for Testing
Production-quality mock implementation with deterministic behavior
"""

from datetime import datetime, timedelta
from typing import List, Optional
import random
import time

from .base import (
    BaseBankConnector,
    BankCredentials,
    AuthToken,
    Transaction,
    Account,
    ConnectorConfig,
    ConnectorError,
    ConnectorErrorCode
)


class MockBankConnector(BaseBankConnector):
    """
    Mock bank connector for testing and development
    
    Features:
    - Deterministic mock data generation
    - Simulated network delays
    - Configurable success/failure scenarios
    - Realistic transaction patterns
    
    Demo credentials: username='demo', password='demo'
    """
    
    DEMO_USERNAME = 'demo'
    DEMO_PASSWORD = 'demo'
    
    def __init__(self, config: Optional[ConnectorConfig] = None):
        if config is None:
            config = ConnectorConfig(
                name='Mock Bank',
                institution_id='mock-bank'
            )
        
        super().__init__(config)
        
        # Initialize mock accounts with realistic data
        self._mock_accounts = [
            Account(
                id='mock-acc-checking-001',
                institution_id=self.config.institution_id,
                name='Primary Checking',
                official_name='Mock Bank Primary Checking Account',
                type='checking',
                subtype='checking',
                balance=5247.83,
                available_balance=5247.83,
                currency='USD',
                mask='1234',
                status='active',
                metadata={
                    'account_number': '****1234',
                    'opened_date': '2020-01-15'
                }
            ),
            Account(
                id='mock-acc-savings-001',
                institution_id=self.config.institution_id,
                name='High Yield Savings',
                official_name='Mock Bank High Yield Savings',
                type='savings',
                subtype='savings',
                balance=15420.50,
                available_balance=15420.50,
                currency='USD',
                mask='5678',
                status='active',
                metadata={
                    'account_number': '****5678',
                    'interest_rate': '4.25%'
                }
            ),
            Account(
                id='mock-acc-credit-001',
                institution_id=self.config.institution_id,
                name='Cash Rewards Credit Card',
                official_name='Mock Bank Cash Rewards Visa',
                type='credit',
                subtype='credit card',
                balance=-1250.50,
                available_balance=8749.50,
                currency='USD',
                mask='9012',
                status='active',
                metadata={
                    'credit_limit': 10000,
                    'due_date': '2026-02-28'
                }
            )
        ]
        
        self._transaction_counter = 0
    
    def _simulate_delay(self, min_ms: int, max_ms: int):
        """Simulate network delay with randomization"""
        delay_ms = random.randint(min_ms, max_ms)
        time.sleep(delay_ms / 1000)  # Convert to seconds
    
    def authenticate(self, credentials: BankCredentials) -> AuthToken:
        """
        Authenticate with mock credentials
        
        Valid credentials:
        - username: 'demo'
        - password: 'demo'
        """
        self._log('Authenticating with mock bank...')
        
        # Simulate network delay
        self._simulate_delay(300, 800)
        
        # Validate credentials
        if not credentials.username or not credentials.password:
            raise ConnectorError(
                'Username and password are required',
                ConnectorErrorCode.INVALID_CREDENTIALS,
                self.config.institution_id
            )
        
        # Check credentials
        is_valid = (
            credentials.username == self.DEMO_USERNAME and
            credentials.password == self.DEMO_PASSWORD
        )
        
        if not is_valid:
            self._log('Authentication failed: invalid credentials')
            raise ConnectorError(
                f"Invalid credentials. Use username: '{self.DEMO_USERNAME}', password: '{self.DEMO_PASSWORD}'",
                ConnectorErrorCode.INVALID_CREDENTIALS,
                self.config.institution_id
            )
        
        # Generate token
        timestamp = int(time.time())
        token = AuthToken(
            access_token=f'mock_access_{self.config.institution_id}_{timestamp}',
            refresh_token=f'mock_refresh_{self.config.institution_id}_{timestamp}',
            expires_at=datetime.utcnow() + timedelta(hours=1),
            token_type='Bearer',
            item_id=f'mock_item_{self.config.institution_id}_{timestamp}'
        )
        
        self._log('Authentication successful')
        return token
    
    def refresh_token(self, token: AuthToken) -> AuthToken:
        """Refresh authentication token"""
        self._log('Refreshing token...')
        
        self._simulate_delay(200, 500)
        
        if not token.refresh_token:
            raise ConnectorError(
                'No refresh token available',
                ConnectorErrorCode.TOKEN_REFRESH_FAILED,
                self.config.institution_id
            )
        
        # Generate new token
        timestamp = int(time.time())
        new_token = AuthToken(
            access_token=f'mock_access_{self.config.institution_id}_{timestamp}_refreshed',
            refresh_token=token.refresh_token,  # Keep same refresh token
            expires_at=datetime.utcnow() + timedelta(hours=1),
            token_type='Bearer',
            item_id=token.item_id
        )
        
        self._log('Token refreshed successfully')
        return new_token
    
    def fetch_accounts(self) -> List[Account]:
        """Fetch all accounts"""
        self._ensure_authenticated()
        self._log('Fetching accounts...')
        
        self._simulate_delay(500, 1200)
        
        # Return deep copy to prevent mutation
        import copy
        accounts = copy.deepcopy(self._mock_accounts)
        
        self._log(f'Returning {len(accounts)} accounts')
        return accounts
    
    def fetch_transactions(
        self,
        account_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Transaction]:
        """Fetch transactions for an account"""
        self._ensure_authenticated()
        self._log('Fetching transactions...', {'account_id': account_id})
        
        self._simulate_delay(800, 1500)
        
        # Validate account exists
        account = next(
            (a for a in self._mock_accounts if a.id == account_id),
            None
        )
        if not account:
            raise ConnectorError(
                f'Account {account_id} not found',
                ConnectorErrorCode.ACCOUNT_NOT_FOUND,
                self.config.institution_id
            )
        
        # Generate deterministic transactions
        transactions = self._generate_transactions(account_id, start_date, end_date)
        
        self._log(f'Returning {len(transactions)} transactions for account {account_id}')
        return transactions
    
    def _generate_transactions(
        self,
        account_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Transaction]:
        """Generate realistic mock transactions"""
        transactions = []
        
        # Default date range: last 30 days
        end = end_date or datetime.utcnow()
        start = start_date or (end - timedelta(days=30))
        
        # Determine account type for realistic transactions
        account = next(
            (a for a in self._mock_accounts if a.id == account_id),
            None
        )
        is_credit_card = account.type == 'credit' if account else False
        is_savings = account.type == 'savings' if account else False
        
        # Transaction templates by category
        templates = [
            {
                'category': 'Food & Dining',
                'merchants': ['Starbucks', 'Chipotle', 'Whole Foods', "Trader Joe's"],
                'amount_range': (5, 150)
            },
            {
                'category': 'Transportation',
                'merchants': ['Shell', 'Uber', 'Lyft', 'Exxon'],
                'amount_range': (10, 60)
            },
            {
                'category': 'Shopping',
                'merchants': ['Amazon', 'Target', 'Costco', 'Best Buy'],
                'amount_range': (20, 500)
            },
            {
                'category': 'Entertainment',
                'merchants': ['Netflix', 'Spotify', 'AMC Theaters', 'Steam'],
                'amount_range': (9.99, 75)
            },
            {
                'category': 'Utilities',
                'merchants': ['Electric Company', 'Water Dept', 'Internet Provider', 'Phone Carrier'],
                'amount_range': (50, 200)
            },
            {
                'category': 'Healthcare',
                'merchants': ['CVS Pharmacy', 'Walgreens', 'Urgent Care', 'Dental Office'],
                'amount_range': (15, 300)
            }
        ]
        
        # Generate transactions for each day in range
        days_diff = (end - start).days
        num_transactions = min(max(days_diff * 2, 10), 50)
        
        for i in range(num_transactions):
            # Deterministic date within range
            progress = i / num_transactions if num_transactions > 0 else 0
            tx_date = start + timedelta(seconds=progress * days_diff * 24 * 3600)
            
            # Select template deterministically
            template = templates[i % len(templates)]
            merchant = template['merchants'][i % len(template['merchants'])]
            
            # Generate amount
            min_amt, max_amt = template['amount_range']
            amount = round(min_amt + (max_amt - min_amt) * ((i * 7) % 100) / 100, 2)
            
            # Determine transaction type
            if is_credit_card:
                # Credit cards: mostly debits (purchases)
                tx_type = 'credit' if i % 10 == 0 else 'debit'
                tx_amount = -amount if tx_type == 'debit' else amount
            elif is_savings:
                # Savings: mostly credits (deposits/interest)
                tx_type = 'debit' if i % 5 == 0 else 'credit'
                tx_amount = amount if tx_type == 'credit' else -amount
            else:
                # Checking: mix of both
                tx_type = 'credit' if i % 3 == 0 else 'debit'
                tx_amount = amount if tx_type == 'credit' else -amount
            
            self._transaction_counter += 1
            
            transactions.append(Transaction(
                id=f'mock-tx-{account_id}-{self._transaction_counter}',
                account_id=account_id,
                amount=tx_amount,
                currency='USD',
                description=f"{merchant} - {template['category']}",
                category=template['category'],
                date=tx_date,
                merchant_name=merchant,
                pending=False,
                transaction_type=tx_type,
                metadata={
                    'original_amount': abs(amount),
                    'payment_method': 'Credit Card' if is_credit_card else 'Bank Transfer'
                }
            ))
        
        # Sort by date descending
        return sorted(transactions, key=lambda t: t.date, reverse=True)

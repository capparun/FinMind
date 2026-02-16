"""
Base Bank Connector Abstract Class
Production-ready foundation for all bank connectors
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from enum import Enum
import logging
import time

# Configure logging
logger = logging.getLogger(__name__)


class ConnectorErrorCode(Enum):
    """Standardized error codes for connector errors"""
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED"
    ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND"
    RATE_LIMITED = "RATE_LIMITED"
    NETWORK_ERROR = "NETWORK_ERROR"
    TIMEOUT = "TIMEOUT"
    INVALID_RESPONSE = "INVALID_RESPONSE"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


class ConnectorError(Exception):
    """Custom error class for connector errors"""
    
    def __init__(
        self, 
        message: str, 
        code: ConnectorErrorCode,
        institution_id: Optional[str] = None,
        retryable: bool = False
    ):
        super().__init__(message)
        self.code = code
        self.institution_id = institution_id
        self.retryable = retryable
        logger.error(f"ConnectorError [{code.value}]: {message}")


@dataclass
class BankCredentials:
    """Bank credentials dataclass"""
    institution_id: str
    username: Optional[str] = None
    password: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    public_token: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary (excluding sensitive data)"""
        return {
            'institution_id': self.institution_id,
            'has_username': bool(self.username),
            'has_password': bool(self.password),
            'has_access_token': bool(self.access_token),
        }


@dataclass
class AuthToken:
    """Authentication token dataclass"""
    access_token: str
    expires_at: datetime
    token_type: str = "Bearer"
    refresh_token: Optional[str] = None
    item_id: Optional[str] = None
    
    def is_expired(self, buffer_minutes: int = 5) -> bool:
        """Check if token is expired or about to expire"""
        buffer_time = timedelta(minutes=buffer_minutes)
        return datetime.utcnow() + buffer_time >= self.expires_at


@dataclass
class Transaction:
    """Financial transaction dataclass"""
    id: str
    account_id: str
    amount: float
    currency: str
    description: str
    date: datetime
    pending: bool = False
    transaction_type: str = "debit"  # 'debit', 'credit', 'transfer'
    category: Optional[str] = None
    merchant_name: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'account_id': self.account_id,
            'amount': self.amount,
            'currency': self.currency,
            'description': self.description,
            'date': self.date.isoformat(),
            'pending': self.pending,
            'transaction_type': self.transaction_type,
            'category': self.category,
            'merchant_name': self.merchant_name,
            'metadata': self.metadata
        }


@dataclass
class Account:
    """Bank account dataclass"""
    id: str
    institution_id: str
    name: str
    type: str  # 'checking', 'savings', 'credit', 'investment', 'loan'
    balance: float
    currency: str
    status: str = "active"  # 'active', 'inactive', 'closed', 'frozen'
    official_name: Optional[str] = None
    subtype: Optional[str] = None
    available_balance: Optional[float] = None
    account_number: Optional[str] = None
    mask: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'institution_id': self.institution_id,
            'name': self.name,
            'official_name': self.official_name,
            'type': self.type,
            'subtype': self.subtype,
            'balance': self.balance,
            'available_balance': self.available_balance,
            'currency': self.currency,
            'mask': self.mask,
            'status': self.status,
            'metadata': self.metadata
        }


@dataclass
class SyncResult:
    """Result of a sync operation"""
    success: bool
    accounts: List[Account] = field(default_factory=list)
    transactions: List[Transaction] = field(default_factory=list)
    error: Optional[str] = None
    error_code: Optional[ConnectorErrorCode] = None
    next_sync_token: Optional[str] = None
    accounts_synced: int = 0
    transactions_synced: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'success': self.success,
            'accounts': [a.to_dict() for a in self.accounts],
            'transactions': [t.to_dict() for t in self.transactions],
            'error': self.error,
            'error_code': self.error_code.value if self.error_code else None,
            'accounts_synced': self.accounts_synced,
            'transactions_synced': self.transactions_synced
        }


@dataclass
class ConnectorConfig:
    """Configuration for a bank connector"""
    name: str
    institution_id: str
    base_url: Optional[str] = None
    api_version: str = "v1"
    timeout: int = 30000  # milliseconds
    retry_attempts: int = 3
    retry_delay: int = 1000  # milliseconds
    debug: bool = False


class BaseBankConnector(ABC):
    """
    Abstract base class that all bank connectors must extend
    
    Example:
        class ChaseConnector(BaseBankConnector):
            def authenticate(self, credentials: BankCredentials) -> AuthToken:
                # Implementation
                pass
    """
    
    def __init__(self, config: ConnectorConfig):
        # Validate required config
        if not config.institution_id:
            raise ConnectorError(
                'institution_id is required',
                ConnectorErrorCode.UNKNOWN_ERROR
            )
        
        if not config.name:
            raise ConnectorError(
                'name is required',
                ConnectorErrorCode.UNKNOWN_ERROR
            )
        
        self.config = config
        self.credentials: Optional[BankCredentials] = None
        self.auth_token: Optional[AuthToken] = None
        self._is_authenticated = False
        self._last_error: Optional[Exception] = None
        
        # Setup logging
        if config.debug:
            logging.basicConfig(level=logging.DEBUG)
    
    def _log(self, message: str, data: Any = None):
        """Logger utility for debug output"""
        if self.config.debug:
            log_msg = f"[{self.config.name}] {message}"
            if data:
                log_msg += f" | {data}"
            logger.debug(log_msg)
    
    @property
    def is_authenticated(self) -> bool:
        """Check if currently authenticated"""
        return self._is_authenticated and self.auth_token is not None
    
    @property
    def last_error(self) -> Optional[Exception]:
        """Get the last error that occurred"""
        return self._last_error
    
    @abstractmethod
    def authenticate(self, credentials: BankCredentials) -> AuthToken:
        """
        Authenticate with the bank
        
        Args:
            credentials: Bank login credentials
            
        Returns:
            AuthToken for subsequent requests
            
        Raises:
            ConnectorError: If authentication fails
        """
        pass
    
    @abstractmethod
    def refresh_token(self, token: AuthToken) -> AuthToken:
        """
        Refresh the authentication token
        
        Args:
            token: Current auth token
            
        Returns:
            New auth token
            
        Raises:
            ConnectorError: If refresh fails
        """
        pass
    
    @abstractmethod
    def fetch_accounts(self) -> List[Account]:
        """
        Fetch all accounts for the authenticated user
        
        Returns:
            Array of accounts
            
        Raises:
            ConnectorError: If not authenticated or request fails
        """
        pass
    
    @abstractmethod
    def fetch_transactions(
        self,
        account_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Transaction]:
        """
        Fetch transactions for a specific account
        
        Args:
            account_id: Account identifier
            start_date: Start date for transactions (inclusive)
            end_date: End date for transactions (inclusive)
            
        Returns:
            Array of transactions
            
        Raises:
            ConnectorError: If not authenticated, account not found, or request fails
        """
        pass
    
    def _ensure_authenticated(self):
        """Ensure the connector is authenticated before making requests"""
        if not self.is_authenticated:
            raise ConnectorError(
                'Not authenticated. Call authenticate() first.',
                ConnectorErrorCode.AUTHENTICATION_FAILED,
                self.config.institution_id
            )
    
    def _needs_token_refresh(self, buffer_minutes: int = 5) -> bool:
        """Check if token needs refresh (expires within buffer_minutes)"""
        if not self.auth_token:
            return True
        return self.auth_token.is_expired(buffer_minutes)
    
    def _retry_operation(self, operation, operation_name: str):
        """Execute with retry logic and exponential backoff"""
        last_error = None
        
        for attempt in range(1, self.config.retry_attempts + 1):
            try:
                self._log(f"{operation_name} - attempt {attempt}")
                return operation()
            except Exception as e:
                last_error = e
                self._last_error = e
                
                self._log(f"{operation_name} - attempt {attempt} failed: {str(e)}")
                
                # Don't retry on authentication errors
                if isinstance(e, ConnectorError):
                    if e.code in [
                        ConnectorErrorCode.INVALID_CREDENTIALS,
                        ConnectorErrorCode.AUTHENTICATION_FAILED
                    ]:
                        raise
                
                # Wait before retry (exponential backoff)
                if attempt < self.config.retry_attempts:
                    delay = self.config.retry_delay * (2 ** (attempt - 1))
                    self._log(f"Retrying in {delay}ms...")
                    time.sleep(delay / 1000)  # Convert to seconds
        
        raise last_error or Exception(f"{operation_name} failed after {self.config.retry_attempts} attempts")
    
    def sync(
        self,
        credentials: BankCredentials,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        max_transactions: Optional[int] = None
    ) -> SyncResult:
        """
        Full sync operation: authenticate + fetch accounts + fetch transactions
        
        This is a convenience method that orchestrates the entire sync process.
        It handles authentication, account fetching, transaction fetching, and
        comprehensive error handling.
        
        Args:
            credentials: Bank credentials (required for initial auth)
            start_date: Start date for transaction fetching
            end_date: End date for transaction fetching
            max_transactions: Maximum number of transactions to fetch
            
        Returns:
            Complete sync result with accounts and transactions
        """
        start_time = time.time()
        
        try:
            # Validate credentials
            if not credentials or not credentials.institution_id:
                raise ConnectorError(
                    'Valid credentials with institution_id are required',
                    ConnectorErrorCode.INVALID_CREDENTIALS
                )
            
            self._log('Starting sync operation', {'institution_id': credentials.institution_id})
            
            # Step 1: Authenticate (or use existing token)
            if not self.is_authenticated or self._needs_token_refresh():
                self._log('Authenticating...')
                self.auth_token = self._retry_operation(
                    lambda: self.authenticate(credentials),
                    'authenticate'
                )
                self.credentials = credentials
                self._is_authenticated = True
                self._log('Authentication successful')
            else:
                self._log('Using existing authentication')
            
            # Step 2: Fetch accounts
            self._log('Fetching accounts...')
            accounts = self._retry_operation(
                self.fetch_accounts,
                'fetch_accounts'
            )
            self._log(f'Fetched {len(accounts)} accounts')
            
            # Validate accounts
            if not isinstance(accounts, list):
                raise ConnectorError(
                    'Invalid response: accounts is not a list',
                    ConnectorErrorCode.INVALID_RESPONSE
                )
            
            # Step 3: Fetch transactions for all active accounts
            self._log('Fetching transactions...')
            all_transactions = []
            
            for account in accounts:
                # Skip inactive/closed accounts
                if account.status != 'active':
                    self._log(f'Skipping {account.status} account: {account.id}')
                    continue
                
                try:
                    transactions = self._retry_operation(
                        lambda: self.fetch_transactions(
                            account.id,
                            start_date,
                            end_date
                        ),
                        f'fetch_transactions({account.id})'
                    )
                    
                    # Validate and limit transactions
                    if isinstance(transactions, list):
                        if max_transactions and len(transactions) > max_transactions:
                            transactions = transactions[:max_transactions]
                            self._log(f'Limited transactions to {max_transactions}')
                        
                        all_transactions.extend(transactions)
                        self._log(f'Fetched {len(transactions)} transactions for account {account.id}')
                except Exception as e:
                    self._log(f'Failed to fetch transactions for account {account.id}: {str(e)}')
                    # Continue with other accounts instead of failing completely
            
            duration = (time.time() - start_time) * 1000
            self._log(f'Sync completed in {duration:.0f}ms', {
                'accounts': len(accounts),
                'transactions': len(all_transactions)
            })
            
            return SyncResult(
                success=True,
                accounts=accounts,
                transactions=all_transactions,
                accounts_synced=len(accounts),
                transactions_synced=len(all_transactions)
            )
            
        except Exception as error:
            # Reset authentication on critical errors
            if isinstance(error, ConnectorError):
                if error.code in [
                    ConnectorErrorCode.AUTHENTICATION_FAILED,
                    ConnectorErrorCode.INVALID_CREDENTIALS
                ]:
                    self._is_authenticated = False
                    self.auth_token = None
            
            duration = (time.time() - start_time) * 1000
            self._log(f'Sync failed after {duration:.0f}ms: {str(error)}')
            
            error_message = str(error)
            error_code = ConnectorErrorCode.UNKNOWN_ERROR
            
            if isinstance(error, ConnectorError):
                error_code = error.code
            
            return SyncResult(
                success=False,
                error=error_message,
                error_code=error_code
            )
    
    def validate_config(self) -> bool:
        """Validate if the connector is properly configured"""
        return (
            bool(self.config.institution_id) and
            bool(self.config.name) and
            self.config.timeout > 0 and
            self.config.retry_attempts >= 0
        )
    
    def get_metadata(self) -> ConnectorConfig:
        """Get connector metadata"""
        return self.config
    
    def disconnect(self):
        """Disconnect and cleanup"""
        self._log('Disconnecting...')
        self._is_authenticated = False
        self.auth_token = None
        self.credentials = None
        self._last_error = None

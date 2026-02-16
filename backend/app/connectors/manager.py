"""
Connector Manager
Manages multiple bank connectors
"""

from typing import Dict, List, Optional, Any
from datetime import datetime

from .base import (
    BaseBankConnector,
    BankCredentials,
    SyncResult,
    ConnectorError,
    ConnectorErrorCode
)
from .mock_connector import MockBankConnector


class ConnectorManager:
    """
    Manages multiple bank connectors
    
    Provides a unified interface for registering, discovering,
    and using different bank connectors.
    
    Example:
        manager = ConnectorManager()
        
        # Sync with mock bank
        result = manager.sync('mock-bank', {
            'institution_id': 'mock-bank',
            'username': 'demo',
            'password': 'demo'
        })
    """
    
    def __init__(self):
        self._connectors: Dict[str, BaseBankConnector] = {}
        
        # Register built-in connectors
        self.register('mock-bank', MockBankConnector())
    
    def register(self, institution_id: str, connector: BaseBankConnector) -> None:
        """
        Register a new connector
        
        Args:
            institution_id: Unique identifier for the institution
            connector: Connector instance
        """
        self._connectors[institution_id] = connector
    
    def get_connector(self, institution_id: str) -> Optional[BaseBankConnector]:
        """
        Get a connector by institution ID
        
        Args:
            institution_id: Institution identifier
            
        Returns:
            Connector instance or None if not found
        """
        return self._connectors.get(institution_id)
    
    def list_connectors(self) -> List[Dict[str, str]]:
        """
        List all registered connectors
        
        Returns:
            List of connector metadata
        """
        return [
            {
                'institution_id': id,
                'name': connector.config.name
            }
            for id, connector in self._connectors.items()
        ]
    
    def has_connector(self, institution_id: str) -> bool:
        """
        Check if a connector exists
        
        Args:
            institution_id: Institution identifier
            
        Returns:
            True if connector exists
        """
        return institution_id in self._connectors
    
    def sync(
        self,
        institution_id: str,
        credentials: Dict[str, Any],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        max_transactions: Optional[int] = None
    ) -> SyncResult:
        """
        Sync data from a bank
        
        Args:
            institution_id: Institution identifier
            credentials: Bank credentials dictionary
            start_date: Start date for transactions
            end_date: End date for transactions
            max_transactions: Maximum number of transactions
            
        Returns:
            Sync result
        """
        connector = self.get_connector(institution_id)
        
        if not connector:
            return SyncResult(
                success=False,
                error=f'Connector not found for institution: {institution_id}',
                error_code=ConnectorErrorCode.UNKNOWN_ERROR
            )
        
        # Convert dict to BankCredentials
        bank_creds = BankCredentials(**credentials)
        
        return connector.sync(
            credentials=bank_creds,
            start_date=start_date,
            end_date=end_date,
            max_transactions=max_transactions
        )

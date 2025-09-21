
import React, { useState, useCallback } from 'react';
import { useEffect } from 'react';
import { DashboardIcon, IntelligenceIcon, AccountsIcon, LogoIcon, OperationsIcon } from './components/Icons';
import Dashboard from './components/Dashboard';
import Intelligence from './components/Intelligence';
import Accounts from './components/Accounts';
import Operations from './components/Operations';
import type { Page, Account, Trade, WatchlistItem } from './types';
import { MOCK_WATCHLIST } from './constants';
import { TradeStatus, TradeType } from './types';
import { fetchAccounts, createAccount, deleteAccount, fetchTrades, createTrade, closeTradeInDb, fetchWatchlist, debugFetchProfiles } from './services/databaseService';
import { deleteOperation } from './services/databaseService';


const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(MOCK_WATCHLIST);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from Supabase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [accountsData, tradesData, watchlistData] = await Promise.all([
          fetchAccounts(),
          fetchTrades(),
          fetchWatchlist()
        ]);
        
        // Debug: Fetch and display profiles table
        await debugFetchProfiles();
        
        setAccounts(accountsData);
        setTrades(tradesData);
        setWatchlist(watchlistData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data from database');
        // Fall back to empty arrays to prevent app crash
        setAccounts([]);
        setTrades([]);
        setWatchlist(MOCK_WATCHLIST);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const addAccount = useCallback((account: Omit<Account, 'id' | 'createdAt' | 'status'>) => {
    createAccount(account)
      .then(newAccount => {
        setAccounts(prev => [newAccount, ...prev]);
      })
      .catch(err => {
        console.error('Error creating account:', err);
        setError('Failed to create account');
      });
  }, []);
  
  const removeAccount = useCallback((accountId: string) => {
    deleteAccount(accountId)
      .then(() => {
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      })
      .catch(err => {
        console.error('Error deleting account:', err);
        setError('Failed to delete account');
      });
  }, []);
  
  const addToWatchlist = useCallback((item: WatchlistItem) => {
    setWatchlist(prev => {
        if (prev.some(w => w.symbol === item.symbol)) return prev;
        return [...prev, item];
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol: string) => {
      setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
  }, []);

  const addTrade = useCallback((tradeData: Omit<Trade, 'id' | 'status' | 'openAt' | 'pnl'>) => {
    createTrade(tradeData)
      .then(newTrade => {
        setTrades(prev => [newTrade, ...prev]);
      })
      .catch(err => {
        console.error('Error creating trade:', err);
        setError('Failed to create trade');
      });
  }, []);

  const closeTrade = useCallback((tradeId: string, closePrice: number) => {
    closeTradeInDb(tradeId, closePrice)
      .then(() => {
        // Refresh trades data
        return fetchTrades();
      })
      .then(updatedTrades => {
        setTrades(updatedTrades);
      })
      .catch(err => {
        console.error('Error closing trade:', err);
        setError('Failed to close trade');
      });
  }, []);

  const deleteTrade = useCallback((tradeId: string) => {
    deleteOperation(tradeId)
      .then(() => {
        // Remove the trade from local state
        setTrades(prev => prev.filter(trade => trade.id !== tradeId));
      })
      .catch(err => {
        console.error('Error deleting trade:', err);
        setError('Failed to delete trade');
      });
  }, []);
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your trading data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-brand-blue text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard accounts={accounts} trades={trades} watchlist={watchlist} removeFromWatchlist={removeFromWatchlist} addTrade={addTrade} closeTrade={closeTrade} />;
      case 'intelligence':
        return <Intelligence watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} addTrade={addTrade} accounts={accounts} />;
      case 'operations':
        return <Operations trades={trades} accounts={accounts} addTrade={addTrade} closeTrade={closeTrade} deleteTrade={deleteTrade} />;
      case 'accounts':
        return <Accounts accounts={accounts} addAccount={addAccount} removeAccount={removeAccount} />;
      default:
        return <Dashboard accounts={accounts} trades={trades} watchlist={watchlist} removeFromWatchlist={removeFromWatchlist} addTrade={addTrade} closeTrade={closeTrade} />;
    }
  };

  const NavItem: React.FC<{ page: Page; label: string; icon: React.ReactNode }> = ({ page, label, icon }) => (
    <button
      onClick={() => setActivePage(page)}
      className={`flex items-center w-full px-4 py-3 text-left transition-colors duration-200 rounded-lg ${
        activePage === page 
          ? 'bg-brand-blue text-white shadow-lg' 
          : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
      }`}
    >
      {icon}
      <span className="ml-4 font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-900 font-sans">
      <aside className="w-64 bg-gray-800 p-4 flex flex-col border-r border-gray-700">
        <div className="flex items-center mb-10 px-2">
          <LogoIcon />
          <h1 className="text-xl font-bold ml-2 text-gray-200">CFD Tracker</h1>
        </div>
        <nav className="flex flex-col space-y-2">
          <NavItem page="dashboard" label="Dashboard" icon={<DashboardIcon />} />
          <NavItem page="intelligence" label="Intelligence" icon={<IntelligenceIcon />} />
          <NavItem page="operations" label="Operations" icon={<OperationsIcon />} />
          <NavItem page="accounts" label="Accounts" icon={<AccountsIcon />} />
        </nav>
        <div className="mt-auto text-center text-gray-600 text-xs">
          <p>CFD Tracker Pro v1.0</p>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;


import React, { useState, useCallback } from 'react';
import { DashboardIcon, IntelligenceIcon, AccountsIcon, LogoIcon, OperationsIcon } from './components/Icons';
import Dashboard from './components/Dashboard';
import Intelligence from './components/Intelligence';
import Accounts from './components/Accounts';
import Operations from './components/Operations';
import type { Page, Account, Trade, WatchlistItem } from './types';
import { MOCK_ACCOUNTS, MOCK_TRADES, MOCK_WATCHLIST } from './constants';
import { TradeStatus, TradeType } from './types';


const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [trades, setTrades] = useState<Trade[]>(MOCK_TRADES);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(MOCK_WATCHLIST);

  const addAccount = useCallback((account: Omit<Account, 'id' | 'createdAt' | 'status'>) => {
    setAccounts(prev => [
      ...prev,
      {
        ...account,
        id: `acc_${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'active'
      }
    ]);
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
    setTrades(prev => [
      ...prev,
      {
        ...tradeData,
        id: `t_${Date.now()}`,
        status: TradeStatus.OPEN,
        openAt: new Date().toISOString(),
        pnl: 0, // Initial P&L for an open trade is 0
      }
    ]);
  }, []);

  const closeTrade = useCallback((tradeId: string, closePrice: number) => {
    setTrades(prev => prev.map(trade => {
      if (trade.id === tradeId) {
        let pnl: number;
        if (trade.tradeType === TradeType.LONG) {
          pnl = (closePrice - trade.openPrice) * trade.quantity;
        } else { // SHORT
          pnl = (trade.openPrice - closePrice) * trade.quantity;
        }
        return {
          ...trade,
          status: TradeStatus.CLOSED,
          closePrice,
          pnl,
          closedAt: new Date().toISOString(),
        };
      }
      return trade;
    }));
  }, []);


  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard accounts={accounts} trades={trades} watchlist={watchlist} removeFromWatchlist={removeFromWatchlist} addTrade={addTrade} />;
      case 'intelligence':
        return <Intelligence watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} addTrade={addTrade} accounts={accounts} />;
      case 'operations':
        return <Operations trades={trades} accounts={accounts} addTrade={addTrade} closeTrade={closeTrade} />;
      case 'accounts':
        return <Accounts accounts={accounts} addAccount={addAccount} />;
      default:
        return <Dashboard accounts={accounts} trades={trades} watchlist={watchlist} removeFromWatchlist={removeFromWatchlist} addTrade={addTrade} />;
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


import React, { useState } from 'react';
import type { Trade, Account, WatchlistItem } from '../types';
import { TradeStatus } from '../types';
import { TrashIcon, AddIcon } from './Icons';
import { OpenOperationModal } from './Operations';

interface DashboardProps {
  accounts: Account[];
  trades: Trade[];
  watchlist: WatchlistItem[];
  removeFromWatchlist: (symbol: string) => void;
  addTrade: (tradeData: Omit<Trade, 'id' | 'status' | 'openAt' | 'pnl'>) => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; change?: string; colorClass?: string }> = ({ title, value, change, colorClass = 'text-gray-200' }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col justify-between">
    <h3 className="text-gray-400 text-sm font-medium uppercase">{title}</h3>
    <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    {change && <p className="text-gray-500 text-xs mt-1">{change}</p>}
  </div>
);

const RecentTradeRow: React.FC<{ trade: Trade }> = ({ trade }) => {
    const isWin = trade.pnl! >= 0;
    const pnlColor = isWin ? 'text-brand-green' : 'text-brand-red';

    return (
        <tr className="border-b border-gray-700 hover:bg-gray-700/50">
            <td className="p-4 font-bold">{trade.symbol}</td>
            <td className="p-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isWin ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
                    {isWin ? 'Win' : 'Loss'}
                </span>
            </td>
            <td className={`p-4 font-mono text-right ${pnlColor}`}>{trade.pnl?.toFixed(2)} USD</td>
        </tr>
    );
};

const TableCard: React.FC<{ title: string, children: React.ReactNode, headers: string[] }> = ({ title, children, headers }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">{title}</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        {headers.map(h => <th key={h} scope="col" className={`p-4 ${h.toLowerCase().includes('p&l') || h.toLowerCase().includes('price') ? 'text-right' : ''} ${h.toLowerCase().includes('actions') ? 'text-center' : ''}`}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {children}
                </tbody>
            </table>
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ accounts, trades, watchlist, removeFromWatchlist, addTrade }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<{ symbol: string; price: number } | undefined>(undefined);

  const closedTrades = trades.filter(t => t.status === TradeStatus.CLOSED);
  const openTrades = trades.filter(t => t.status === TradeStatus.OPEN);

  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter(t => t.pnl! > 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) + '%' : 'N/A';

  const realizedPnl = closedTrades.reduce((sum, trade) => sum + trade.pnl!, 0);
  const unrealizedPnl = openTrades.reduce((sum, trade) => sum + trade.pnl!, 0);
  const startingBalance = accounts.reduce((sum, acc) => sum + acc.startingBalance, 0);
  const currentEquity = startingBalance + realizedPnl + unrealizedPnl;
  
  const recentTrades = [...closedTrades].sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime()).slice(0, 5);
  
  const handleAddOperation = (symbol: string, price: number) => {
    setModalInitialData({ symbol, price });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-200">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Trades" value={totalTrades} change={`${winningTrades} wins`} />
        <KpiCard title="Win Rate" value={winRate} colorClass={winningTrades/totalTrades >= 0.5 ? 'text-brand-green' : 'text-brand-red'} />
        <KpiCard 
            title="Realized P&L" 
            value={`${realizedPnl.toFixed(2)} USD`} 
            colorClass={realizedPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}
        />
        <KpiCard title="Current Equity" value={`${currentEquity.toFixed(2)} USD`} />
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TableCard title="Open Positions" headers={['Symbol', 'Quantity', 'Unrealized P&L', 'Actions']}>
              {openTrades.length > 0 ? openTrades.map(trade => (
                  <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-4 font-bold">{trade.symbol}</td>
                    <td className="p-4">{trade.quantity}</td>
                    <td className={`p-4 font-mono text-right ${trade.pnl! >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>{trade.pnl?.toFixed(2)} USD</td>
                    <td className="p-4 text-center">
                        <button onClick={() => handleAddOperation(trade.symbol, trade.openPrice)} className="text-gray-400 hover:text-brand-blue" title="Add to position">
                          <AddIcon />
                        </button>
                    </td>
                  </tr>
              ))
              : <tr><td colSpan={4} className="text-center p-8 text-gray-500">No open positions.</td></tr>}
            </TableCard>
            <TableCard title="Watchlist" headers={['Symbol', 'Company Name', 'Price', 'Actions']}>
            {watchlist.length > 0 ? (
              watchlist.map(item => (
                <tr key={item.symbol} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4 font-bold">{item.symbol}</td>
                  <td className="p-4">{item.companyName}</td>
                  <td className="p-4 font-mono text-right">${item.currentPrice.toFixed(2)}</td>
                  <td className="p-4">
                    <div className="flex justify-center items-center space-x-4">
                        <button onClick={() => handleAddOperation(item.symbol, item.currentPrice)} className="text-gray-400 hover:text-brand-blue" title="Open new operation">
                            <AddIcon />
                        </button>
                        <button onClick={() => removeFromWatchlist(item.symbol)} className="text-gray-400 hover:text-brand-red" title="Remove from watchlist">
                            <TrashIcon />
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center p-8 text-gray-500">
                  Your watchlist is empty.
                </td>
              </tr>
            )}
          </TableCard>
        </div>
        <TableCard title="Recent Trades" headers={['Symbol', 'Result', 'Profit/Loss']}>
            {recentTrades.length > 0 ? recentTrades.map(trade => <RecentTradeRow key={trade.id} trade={trade} />)
            : <tr><td colSpan={3} className="text-center p-8 text-gray-500">No recent trades.</td></tr>}
        </TableCard>
      </div>

       {isModalOpen && (
          <OpenOperationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAdd={addTrade}
            accounts={accounts}
            initialData={modalInitialData}
          />
        )}
    </div>
  );
};

export default Dashboard;

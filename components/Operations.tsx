
import React, { useState } from 'react';
import type { Trade, Account } from '../types';
import { TradeStatus, TradeType } from '../types';

// ============================
// MODALS
// ============================
interface OpenOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tradeData: Omit<Trade, 'id' | 'status' | 'openAt' | 'pnl'>) => void;
  accounts: Account[];
  initialData?: { symbol: string; price: number };
}

export const OpenOperationModal: React.FC<OpenOperationModalProps> = ({ isOpen, onClose, onAdd, accounts, initialData }) => {
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [tradeType, setTradeType] = useState<TradeType>(TradeType.LONG);
  const [quantity, setQuantity] = useState('');
  const [openPrice, setOpenPrice] = useState(initialData?.price.toString() || '');
  const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol && quantity && openPrice && accountId) {
      onAdd({
        symbol: symbol.toUpperCase(),
        tradeType,
        quantity: parseFloat(quantity),
        openPrice: parseFloat(openPrice),
        accountId,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-gray-200">Open New Operation</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-400 mb-1">Symbol</label>
            <input id="symbol" type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" required />
          </div>
          <div>
            <label htmlFor="tradeType" className="block text-sm font-medium text-gray-400 mb-1">Type</label>
            <select id="tradeType" value={tradeType} onChange={(e) => setTradeType(e.target.value as TradeType)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue">
              <option value={TradeType.LONG}>Long</option>
              <option value={TradeType.SHORT}>Short</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
              <input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" required />
            </div>
            <div>
              <label htmlFor="openPrice" className="block text-sm font-medium text-gray-400 mb-1">Open Price</label>
              <input id="openPrice" type="number" value={openPrice} onChange={(e) => setOpenPrice(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" required />
            </div>
          </div>
          <div>
            <label htmlFor="accountId" className="block text-sm font-medium text-gray-400 mb-1">Account</label>
            <select id="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" required>
               {accounts.length > 0 ? accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>) : <option disabled>No accounts available</option>}
            </select>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700">Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-lg bg-brand-blue text-white font-bold hover:bg-blue-500">Open Trade</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export interface CloseOperationModalProps {
    trade: Trade;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (tradeId: string, closePrice: number) => void;
}

export const CloseOperationModal: React.FC<CloseOperationModalProps> = ({ trade, isOpen, onClose, onConfirm }) => {
    const [closePrice, setClosePrice] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (closePrice) {
            onConfirm(trade.id, parseFloat(closePrice));
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2 text-gray-200">Close Operation</h2>
                <p className="text-gray-400 mb-6">Closing {trade.tradeType.toUpperCase()} position for {trade.symbol}.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="closePrice" className="block text-sm font-medium text-gray-400 mb-1">Close Price</label>
                        <input id="closePrice" type="number" step="any" value={closePrice} onChange={e => setClosePrice(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-red" autoFocus required />
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-brand-red text-white font-bold hover:bg-red-500">Confirm Close</button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// ============================
// MAIN PAGE COMPONENT
// ============================

interface OperationsProps {
  trades: Trade[];
  accounts: Account[];
  addTrade: (tradeData: Omit<Trade, 'id' | 'status' | 'openAt' | 'pnl'>) => void;
  closeTrade: (tradeId: string, closePrice: number) => void;
}

const Operations: React.FC<OperationsProps> = ({ trades, accounts, addTrade, closeTrade }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);

  const openTrades = trades.filter(t => t.status === TradeStatus.OPEN);
  const closedTrades = [...trades.filter(t => t.status === TradeStatus.CLOSED)].sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime());

  const getAccountName = (id: string) => accounts.find(acc => acc.id === id)?.name || 'Unknown';

  const TradeTable: React.FC<{title: string, trades: Trade[]}> = ({ title, trades }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-200">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
            <tr>
              <th className="p-4">Symbol</th>
              <th className="p-4">Type</th>
              <th className="p-4">Quantity</th>
              <th className="p-4">Open Price</th>
              <th className="p-4">Account</th>
              <th className="p-4">{title === 'Open Positions' ? 'Open Date' : 'P&L'}</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.length > 0 ? trades.map(trade => (
              <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="p-4 font-bold">{trade.symbol}</td>
                <td className={`p-4 font-semibold capitalize ${trade.tradeType === TradeType.LONG ? 'text-brand-green' : 'text-brand-red'}`}>{trade.tradeType}</td>
                <td className="p-4">{trade.quantity}</td>
                <td className="p-4 font-mono">${trade.openPrice.toFixed(2)}</td>
                <td className="p-4">{getAccountName(trade.accountId)}</td>
                <td className={`p-4 font-mono ${trade.status === TradeStatus.CLOSED ? (trade.pnl! >= 0 ? 'text-brand-green' : 'text-brand-red') : ''}`}>
                  {trade.status === TradeStatus.OPEN ? new Date(trade.openAt).toLocaleDateString() : `${trade.pnl?.toFixed(2)} USD`}
                </td>
                <td className="p-4 text-center">
                  {trade.status === TradeStatus.OPEN && (
                    <button onClick={() => setTradeToClose(trade)} className="font-semibold py-1 px-3 rounded-lg transition-colors text-xs bg-red-500/20 text-brand-red hover:bg-red-500/40">
                      Close
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="text-center p-8 text-gray-500">No trades to display.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-200">Operations</h1>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-brand-blue text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-500 transition-colors">
            Open New Operation
          </button>
        </div>
        <TradeTable title="Open Positions" trades={openTrades} />
        <TradeTable title="Trade History" trades={closedTrades} />
      </div>

      <OpenOperationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addTrade}
        accounts={accounts}
      />
      {tradeToClose && (
        <CloseOperationModal
          trade={tradeToClose}
          isOpen={!!tradeToClose}
          onClose={() => setTradeToClose(null)}
          onConfirm={closeTrade}
        />
      )}
    </>
  );
};

export default Operations;

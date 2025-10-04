
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
  const [leverage, setLeverage] = useState('5');
  const [estimatedDays, setEstimatedDays] = useState('7');
  
  // Get selected account's commission settings
  const selectedAccount = accounts.find(acc => acc.id === accountId);
  const [openCommission, setOpenCommission] = useState(selectedAccount?.openCloseCommission.toString() || '0.25');
  const [closeCommission, setCloseCommission] = useState(selectedAccount?.openCloseCommission.toString() || '0.25');
  const [nightCommission, setNightCommission] = useState(selectedAccount?.nightCommission.toString() || '7.0');

  // Update commission values when account changes
  React.useEffect(() => {
    if (selectedAccount) {
      setOpenCommission(selectedAccount.openCloseCommission.toString());
      setCloseCommission(selectedAccount.openCloseCommission.toString());
      setNightCommission(selectedAccount.nightCommission.toString());
    }
  }, [selectedAccount]);

  if (!isOpen) return null;

  // Calculate position value and required margin
  const positionValue = parseFloat(quantity || '0') * parseFloat(openPrice || '0');
  const leverageValue = parseFloat(leverage || '1');
  const requiredMargin = positionValue / leverageValue;
  const openCommissionAmount = (positionValue * parseFloat(openCommission || '0')) / 100;
  const closeCommissionAmount = (positionValue * parseFloat(closeCommission || '0')) / 100;
  const totalCommissions = openCommissionAmount + closeCommissionAmount;
  // Night commission: annual rate divided by 365 days, applied to position value
  const nightCommissionPerDay = (positionValue * parseFloat(nightCommission || '0')) / 100 / 365;
  const estimatedNightCommissions = nightCommissionPerDay * parseFloat(estimatedDays || '0');
  const totalEstimatedCosts = totalCommissions + estimatedNightCommissions;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol && quantity && openPrice && accountId && leverage) {
      // Calculate opening fees
      const positionValue = parseFloat(quantity) * parseFloat(openPrice);
      const openingFees = (positionValue * parseFloat(openCommission)) / 100;
      
      onAdd({
        symbol: symbol.toUpperCase(),
        tradeType,
        quantity: parseFloat(quantity),
        openPrice: parseFloat(openPrice),
        accountId,
      });
      onClose();
      // Reset form
      setSymbol('');
      setQuantity('');
      setOpenPrice('');
      setLeverage('5');
      setEstimatedDays('7');
      setOpenCommission(selectedAccount?.openCloseCommission.toString() || '0.25');
      setCloseCommission(selectedAccount?.openCloseCommission.toString() || '0.25');
      setNightCommission(selectedAccount?.nightCommission.toString() || '7.0');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-gray-200">Open New Operation</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Trade Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-400 mb-1">Symbol</label>
              <input id="symbol" type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="e.g., AAPL" required />
            </div>
            <div>
              <label htmlFor="tradeType" className="block text-sm font-medium text-gray-400 mb-1">Position Type</label>
              <select id="tradeType" value={tradeType} onChange={(e) => setTradeType(e.target.value as TradeType)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                <option value={TradeType.LONG}>Long (Buy)</option>
                <option value={TradeType.SHORT}>Short (Sell)</option>
              </select>
            </div>
          </div>

          {/* Position Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
              <input id="quantity" type="number" step="0.01" min="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="100" required />
            </div>
            <div>
              <label htmlFor="openPrice" className="block text-sm font-medium text-gray-400 mb-1">Open Price ($)</label>
              <input id="openPrice" type="number" step="0.01" min="0.01" value={openPrice} onChange={(e) => setOpenPrice(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="150.00" required />
            </div>
            <div>
              <label htmlFor="leverage" className="block text-sm font-medium text-gray-400 mb-1">Leverage (1:X)</label>
              <input id="leverage" type="number" step="0.01" min="1" max="500" value={leverage} onChange={(e) => setLeverage(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="5" required />
            </div>
          </div>

          {/* Commission Settings */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Commission Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="openCommission" className="block text-sm font-medium text-gray-400 mb-1">Open Commission (%)</label>
                <input id="openCommission" type="number" step="0.01" min="0" max="10" value={openCommission} onChange={(e) => setOpenCommission(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="0.1" />
              </div>
              <div>
                <label htmlFor="closeCommission" className="block text-sm font-medium text-gray-400 mb-1">Close Commission (%)</label>
                <input id="closeCommission" type="number" step="0.01" min="0" max="10" value={closeCommission} onChange={(e) => setCloseCommission(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="0.1" />
              </div>
              <div>
                <label htmlFor="nightCommission" className="block text-sm font-medium text-gray-400 mb-1">Night Commission (% per year)</label>
                <input id="nightCommission" type="number" step="0.01" min="0" max="100" value={nightCommission} onChange={(e) => setNightCommission(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="7.0" />
              </div>
              <div>
                <label htmlFor="estimatedDays" className="block text-sm font-medium text-gray-400 mb-1">Estimated Hold (days)</label>
                <input id="estimatedDays" type="number" min="1" max="365" value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="7" />
              </div>
            </div>
          </div>

          {/* Account Selection */}
          <div>
            <label htmlFor="accountId" className="block text-sm font-medium text-gray-400 mb-1">Trading Account</label>
            <select id="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue" required>
              {accounts.length > 0 ? accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>) : <option disabled>No accounts available</option>}
            </select>
          </div>

          {/* Position Summary */}
          {quantity && openPrice && leverage && (
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <h3 className="text-lg font-semibold text-gray-200 mb-3">Position Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Position Value</p>
                  <p className="font-bold text-gray-200">${positionValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Required Margin</p>
                  <p className="font-bold text-brand-blue">${requiredMargin.toFixed(2)} (1:{leverageValue})</p>
                </div>
                <div>
                  <p className="text-gray-400">Open Commission</p>
                  <p className="font-bold text-brand-red">${openCommissionAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Close Commission</p>
                  <p className="font-bold text-brand-red">${closeCommissionAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Night Commission/Day</p>
                  <p className="font-bold text-brand-red">${nightCommissionPerDay.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Est. Night Commissions</p>
                  <p className="font-bold text-brand-red">${estimatedNightCommissions.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Est. Costs</p>
                  <p className="font-bold text-brand-red">${totalEstimatedCosts.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Breakeven Price</p>
                  <p className="font-bold text-yellow-400">
                    ${tradeType === TradeType.LONG 
                      ? (parseFloat(openPrice || '0') + (totalEstimatedCosts / parseFloat(quantity || '1'))).toFixed(2)
                      : (parseFloat(openPrice || '0') - (totalEstimatedCosts / parseFloat(quantity || '1'))).toFixed(2)
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-2 rounded-lg bg-brand-blue text-white font-bold hover:bg-blue-500 transition-colors">Open Position</button>
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
    onConfirm: (tradeId: string, closePrice: number, closePercentage?: number) => void;
}

export const CloseOperationModal: React.FC<CloseOperationModalProps> = ({ trade, isOpen, onClose, onConfirm }) => {
    const [closePrice, setClosePrice] = useState('');
    const [closePercentage, setClosePercentage] = useState('100');
    const [closeType, setCloseType] = useState<'percentage' | 'quantity'>('percentage');
    const [closeQuantity, setCloseQuantity] = useState('');

    if (!isOpen) return null;

    const calculateQuantityFromPercentage = () => {
        const percentage = parseFloat(closePercentage || '0');
        return (trade.quantity * percentage) / 100;
    };

    const calculatePercentageFromQuantity = () => {
        const quantity = parseFloat(closeQuantity || '0');
        return (quantity / trade.quantity) * 100;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (closePrice && (closePercentage || closeQuantity)) {
            const finalPercentage = closeType === 'percentage' 
                ? parseFloat(closePercentage)
                : calculatePercentageFromQuantity();
            
            // Validate percentage is within bounds
            if (finalPercentage <= 0 || finalPercentage > 100) {
                alert('Close percentage must be between 0.01% and 100%');
                return;
            }
            
            onConfirm(trade.id, parseFloat(closePrice), finalPercentage);
            onClose();
        }
    };

    const quantityToClose = closeType === 'percentage' 
        ? calculateQuantityFromPercentage()
        : parseFloat(closeQuantity || '0');

    const remainingQuantity = trade.quantity - quantityToClose;
    const isPartialClose = quantityToClose < trade.quantity && quantityToClose > 0;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2 text-gray-200">Close Operation</h2>
                <p className="text-gray-400 mb-6">
                    {trade.tradeType.toUpperCase()} position for {trade.symbol} - Current: {trade.quantity} units
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Close Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Close Method</label>
                        <div className="flex space-x-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="percentage"
                                    checked={closeType === 'percentage'}
                                    onChange={(e) => setCloseType(e.target.value as 'percentage')}
                                    className="mr-2"
                                />
                                <span className="text-gray-200">Percentage</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="quantity"
                                    checked={closeType === 'quantity'}
                                    onChange={(e) => setCloseType(e.target.value as 'quantity')}
                                    className="mr-2"
                                />
                                <span className="text-gray-200">Quantity</span>
                            </label>
                        </div>
                    </div>

                    {/* Close Amount Input */}
                    {closeType === 'percentage' ? (
                        <div>
                            <label htmlFor="closePercentage" className="block text-sm font-medium text-gray-400 mb-1">
                                Close Percentage (%)
                            </label>
                            <input
                                id="closePercentage"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="100"
                                value={closePercentage}
                                onChange={e => setClosePercentage(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-red"
                                placeholder="100"
                                required
                            />
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="closeQuantity" className="block text-sm font-medium text-gray-400 mb-1">
                                Close Quantity (max: {trade.quantity})
                            </label>
                            <input
                                id="closeQuantity"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={trade.quantity}
                                value={closeQuantity}
                                onChange={e => setCloseQuantity(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-red"
                                placeholder={trade.quantity.toString()}
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="closePrice" className="block text-sm font-medium text-gray-400 mb-1">Close Price</label>
                        <input
                            id="closePrice"
                            type="number"
                            step="any"
                            value={closePrice}
                            onChange={e => setClosePrice(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-red"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Position Summary */}
                    {quantityToClose > 0 && closePrice && (
                        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                            <h4 className="text-sm font-semibold text-gray-200 mb-2">Position Summary</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-400">Closing Quantity</p>
                                    <p className="font-bold text-brand-red">{quantityToClose.toFixed(2)} units</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Remaining Quantity</p>
                                    <p className="font-bold text-gray-200">
                                        {remainingQuantity.toFixed(2)} units
                                        {remainingQuantity <= 0 && <span className="text-brand-red ml-1">(Position Closed)</span>}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Close Value</p>
                                    <p className="font-bold text-gray-200">${(quantityToClose * parseFloat(closePrice)).toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Est. P&L (Gross)</p>
                                    <p className={`font-bold ${
                                        trade.tradeType === 'long' 
                                            ? (parseFloat(closePrice) - trade.openPrice) >= 0 ? 'text-brand-green' : 'text-brand-red'
                                            : (trade.openPrice - parseFloat(closePrice)) >= 0 ? 'text-brand-green' : 'text-brand-red'
                                    }`}>
                                        ${trade.tradeType === 'long' 
                                            ? ((parseFloat(closePrice) - trade.openPrice) * quantityToClose).toFixed(2)
                                            : ((trade.openPrice - parseFloat(closePrice)) * quantityToClose).toFixed(2)
                                        }
                                    </p>
                                </div>
                            </div>
                            {isPartialClose && (
                                <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-400 text-xs">
                                    <i className="ri-information-line mr-1"></i>
                                    This is a partial close. The remaining position will stay open.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-brand-red text-white font-bold hover:bg-red-500">
                            {isPartialClose ? 'Partial Close' : 'Close Position'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface EditOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (tradeId: string, updates: Partial<Trade>) => void;
  trade: Trade;
  accounts: Account[];
}

const EditOperationModal: React.FC<EditOperationModalProps> = ({ isOpen, onClose, onUpdate, trade, accounts }) => {
  const [symbol, setSymbol] = useState(trade.symbol);
  const [tradeType, setTradeType] = useState<TradeType>(trade.tradeType);
  const [quantity, setQuantity] = useState(trade.quantity.toString());
  const [openPrice, setOpenPrice] = useState(trade.openPrice.toString());
  const [closePrice, setClosePrice] = useState(trade.closePrice?.toString() || '');
  const [accountId, setAccountId] = useState(trade.accountId);
  const [openDate, setOpenDate] = useState(trade.openAt.split('T')[0]);
  const [closeDate, setCloseDate] = useState(trade.closedAt ? trade.closedAt.split('T')[0] : '');
  const [openFee, setOpenFee] = useState(trade.fees?.open?.toString() || '0');
  const [closeFee, setCloseFee] = useState(trade.fees?.close?.toString() || '0');
  const [nightFee, setNightFee] = useState(trade.fees?.night?.toString() || '0');

  React.useEffect(() => {
    if (trade.status === TradeStatus.CLOSED && openDate && closeDate) {
      const open = new Date(openDate);
      const close = new Date(closeDate);
      const isSameDay = open.toDateString() === close.toDateString();

      if (isSameDay) {
        setNightFee('0');
      }
    }
  }, [openDate, closeDate, trade.status]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let calculatedNightFee = parseFloat(nightFee);

    if (trade.status === TradeStatus.CLOSED && openDate && closeDate) {
      const open = new Date(openDate);
      const close = new Date(closeDate);
      const isSameDay = open.toDateString() === close.toDateString();

      if (isSameDay) {
        calculatedNightFee = 0;
      }
    }

    const updates: Partial<Trade> = {
      symbol: symbol.toUpperCase(),
      tradeType,
      quantity: parseFloat(quantity),
      openPrice: parseFloat(openPrice),
      accountId,
      openAt: openDate,
      fees: {
        open: parseFloat(openFee),
        close: parseFloat(closeFee),
        night: calculatedNightFee,
        total: parseFloat(openFee) + parseFloat(closeFee) + calculatedNightFee,
      },
    };

    if (trade.status === TradeStatus.CLOSED && closePrice) {
      updates.closePrice = parseFloat(closePrice);
      if (closeDate) {
        updates.closedAt = closeDate;
      }
    }

    onUpdate(trade.id, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-gray-200">Edit Operation</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-symbol" className="block text-sm font-medium text-gray-400 mb-1">Symbol</label>
              <input
                id="edit-symbol"
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-tradeType" className="block text-sm font-medium text-gray-400 mb-1">Position Type</label>
              <select
                id="edit-tradeType"
                value={tradeType}
                onChange={(e) => setTradeType(e.target.value as TradeType)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value={TradeType.LONG}>Long (Buy)</option>
                <option value={TradeType.SHORT}>Short (Sell)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-quantity" className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
              <input
                id="edit-quantity"
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-openPrice" className="block text-sm font-medium text-gray-400 mb-1">Open Price</label>
              <input
                id="edit-openPrice"
                type="number"
                step="any"
                value={openPrice}
                onChange={(e) => setOpenPrice(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-openDate" className="block text-sm font-medium text-gray-400 mb-1">Open Date</label>
              <input
                id="edit-openDate"
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />
            </div>
            {trade.status === TradeStatus.CLOSED && (
              <div>
                <label htmlFor="edit-closeDate" className="block text-sm font-medium text-gray-400 mb-1">Close Date</label>
                <input
                  id="edit-closeDate"
                  type="date"
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            )}
          </div>

          {trade.status === TradeStatus.CLOSED && (
            <div>
              <label htmlFor="edit-closePrice" className="block text-sm font-medium text-gray-400 mb-1">Close Price</label>
              <input
                id="edit-closePrice"
                type="number"
                step="any"
                value={closePrice}
                onChange={(e) => setClosePrice(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Commission & Fees</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-openFee" className="block text-xs text-gray-500 mb-1">Open Fee ($)</label>
                <input
                  id="edit-openFee"
                  type="number"
                  step="any"
                  value={openFee}
                  onChange={(e) => setOpenFee(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label htmlFor="edit-closeFee" className="block text-xs text-gray-500 mb-1">Close Fee ($)</label>
                <input
                  id="edit-closeFee"
                  type="number"
                  step="any"
                  value={closeFee}
                  onChange={(e) => setCloseFee(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label htmlFor="edit-nightFee" className="block text-xs text-gray-500 mb-1">Night Fee ($)</label>
                <input
                  id="edit-nightFee"
                  type="number"
                  step="any"
                  value={nightFee}
                  onChange={(e) => setNightFee(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  disabled={trade.status === TradeStatus.CLOSED && openDate && closeDate && new Date(openDate).toDateString() === new Date(closeDate).toDateString()}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Total Fees: ${(() => {
                let calculatedNightFee = parseFloat(nightFee || '0');
                if (trade.status === TradeStatus.CLOSED && openDate && closeDate) {
                  const isSameDay = new Date(openDate).toDateString() === new Date(closeDate).toDateString();
                  if (isSameDay) calculatedNightFee = 0;
                }
                return (parseFloat(openFee || '0') + parseFloat(closeFee || '0') + calculatedNightFee).toFixed(2);
              })()}
              {trade.status === TradeStatus.CLOSED && openDate && closeDate && new Date(openDate).toDateString() === new Date(closeDate).toDateString() && (
                <span className="text-yellow-400 ml-2">(Same-day trade: no night fee)</span>
              )}
            </p>
          </div>

          <div>
            <label htmlFor="edit-account" className="block text-sm font-medium text-gray-400 mb-1">Account</label>
            <select
              id="edit-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              required
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700">Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-lg bg-brand-blue text-white font-bold hover:bg-blue-500">
              Update Operation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PositionDetailsModal: React.FC<{
  trade: Trade;
  account: Account | undefined;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
}> = ({ trade, account, isOpen, onClose, onEdit }) => {
  const [fills, setFills] = React.useState<any[]>([]);
  const [editingFillId, setEditingFillId] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState<any>({});
  const [isEditMode, setIsEditMode] = React.useState(false);

  const loadFills = () => {
    if (isOpen && trade.id) {
      import('../services/databaseService').then(({ fetchTradeFills }) => {
        fetchTradeFills(trade.id).then(setFills).catch(console.error);
      });
    }
  };

  React.useEffect(() => {
    loadFills();
  }, [isOpen, trade.id]);

  const handleEditFill = (fill: any) => {
    setEditingFillId(fill.id);
    setEditFormData({
      quantity: fill.quantity.toString(),
      price: fill.price.toString(),
      open_fee: fill.open_fee.toString(),
      close_fee: fill.close_fee.toString(),
      night_fee: fill.night_fee.toString(),
      fill_timestamp: new Date(fill.fill_timestamp || fill.created_at).toISOString().slice(0, 16)
    });
  };

  const handleSaveFill = async (fillId: string) => {
    try {
      const { updateTradeFill } = await import('../services/databaseService');
      await updateTradeFill(fillId, {
        quantity: parseFloat(editFormData.quantity),
        price: parseFloat(editFormData.price),
        open_fee: parseFloat(editFormData.open_fee),
        close_fee: parseFloat(editFormData.close_fee),
        night_fee: parseFloat(editFormData.night_fee),
        fill_timestamp: new Date(editFormData.fill_timestamp).toISOString()
      });
      setEditingFillId(null);
      loadFills();
    } catch (error) {
      console.error('Error updating fill:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingFillId(null);
    setEditFormData({});
  };

  if (!isOpen) return null;

  // Calculate position metrics
  const positionValue = trade.quantity * trade.openPrice;
  const leverage = 5; // Default leverage - in real app this would come from trade data
  const requiredMargin = positionValue / leverage;
  
  // Use stored fee data from database
  const openFee = trade.fees?.open || 0;
  const closeFee = trade.fees?.close || 0;
  const nightFee = trade.fees?.night || 0;
  const totalFees = trade.fees?.total || 0;
  
  // Calculate days held for display
  const openDate = new Date(trade.openAt);
  const endDate = trade.closedAt ? new Date(trade.closedAt) : new Date();
  const daysHeld = Math.ceil((endDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Current P&L (simplified - would need real-time price in production)
  const currentPrice = trade.openPrice * 1.02; // Mock 2% gain for demo
  const grossPnl = trade.tradeType === TradeType.LONG 
    ? (currentPrice - trade.openPrice) * trade.quantity
    : (trade.openPrice - currentPrice) * trade.quantity;
  const netPnl = trade.pnl || (grossPnl - totalFees);
  
  // Breakeven price
  const breakevenPrice = trade.tradeType === TradeType.LONG
    ? trade.openPrice + (totalFees / trade.quantity)
    : trade.openPrice - (totalFees / trade.quantity);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-200">Position Details - {trade.symbol}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-2xl">×</button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Position Overview */}
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Position Overview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Symbol</p>
                  <p className="font-bold text-gray-200">{trade.symbol}</p>
                </div>
                <div>
                  <p className="text-gray-400">Position Type</p>
                  <p className={`font-bold capitalize ${trade.tradeType === TradeType.LONG ? 'text-brand-green' : 'text-brand-red'}`}>
                    {trade.tradeType}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Quantity</p>
                  <p className="font-bold text-gray-200">{trade.quantity}</p>
                </div>
                <div>
                  <p className="text-gray-400">Open Price</p>
                  <p className="font-bold text-gray-200">${trade.openPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Current Price</p>
                  <p className="font-bold text-gray-200">${currentPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Position Value</p>
                  <p className="font-bold text-gray-200">${positionValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Leverage</p>
                  <p className="font-bold text-brand-blue">1:{leverage}</p>
                </div>
                <div>
                  <p className="text-gray-400">Required Margin</p>
                  <p className="font-bold text-brand-blue">${requiredMargin.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            {/* Timing Information */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Timing</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Open Date</p>
                  <p className="font-bold text-gray-200">{openDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Open Time</p>
                  <p className="font-bold text-gray-200">{openDate.toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Days Held</p>
                  <p className="font-bold text-gray-200">{daysHeld} days</p>
                </div>
                <div>
                  <p className="text-gray-400">Account</p>
                  <p className="font-bold text-gray-200">{account?.name || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Financial Details */}
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">P&L Analysis</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Gross P&L</span>
                  <span className={`font-bold ${grossPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                    ${grossPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Commissions</span>
                  <span className="font-bold text-brand-red">-${totalFees.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-600 pt-2 flex justify-between">
                  <span className="text-gray-200 font-semibold">Net P&L</span>
                  <span className={`font-bold text-lg ${netPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                    ${netPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Breakeven Price</span>
                  <span className="font-bold text-yellow-400">${breakevenPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Commission Breakdown */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Commission Breakdown</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Open Commission</span>
                  <span className="font-bold text-brand-red">${openFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Close Commission</span>
                  <span className="font-bold text-brand-red">${closeFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Night Commission</span>
                  <span className="font-bold text-brand-red">${nightFee.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Position held for {daysHeld} days
                </div>
                <div className="border-t border-gray-600 pt-2 flex justify-between">
                  <span className="text-gray-200 font-semibold">Total Commissions</span>
                  <span className="font-bold text-brand-red">${totalFees.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {fills.length > 0 && (
          <div className="mt-8 bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Fill History</h3>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-semibold ${
                  isEditMode
                    ? 'bg-brand-blue text-white hover:bg-blue-500'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                {isEditMode ? 'Done Editing' : 'Edit Fills'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
                  <tr>
                    <th className="p-3 text-left">Date/Time</th>
                    <th className="p-3 text-left">Side</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Open Fee</th>
                    <th className="p-3 text-right">Close Fee</th>
                    <th className="p-3 text-right">Night Fee</th>
                    <th className="p-3 text-right">Total Fees</th>
                    {isEditMode && <th className="p-3 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {fills.map((fill) => (
                    <tr key={fill.id} className="border-t border-gray-600">
                      {editingFillId === fill.id ? (
                        <>
                          <td className="p-3">
                            <input
                              type="datetime-local"
                              value={editFormData.fill_timestamp}
                              onChange={(e) => setEditFormData({ ...editFormData, fill_timestamp: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 text-xs"
                            />
                          </td>
                          <td className="p-3">
                            <span className={`font-semibold uppercase ${fill.side === 'buy' ? 'text-brand-green' : 'text-brand-red'}`}>
                              {fill.side}
                            </span>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={editFormData.quantity}
                              onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 text-right font-mono text-xs"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={editFormData.price}
                              onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 text-right font-mono text-xs"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={editFormData.open_fee}
                              onChange={(e) => setEditFormData({ ...editFormData, open_fee: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 text-right font-mono text-xs"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={editFormData.close_fee}
                              onChange={(e) => setEditFormData({ ...editFormData, close_fee: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 text-right font-mono text-xs"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={editFormData.night_fee}
                              onChange={(e) => setEditFormData({ ...editFormData, night_fee: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200 text-right font-mono text-xs"
                            />
                          </td>
                          <td className="p-3 text-right text-gray-200 font-mono">
                            ${(parseFloat(editFormData.open_fee || '0') + parseFloat(editFormData.close_fee || '0') + parseFloat(editFormData.night_fee || '0')).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center space-x-1">
                              <button
                                onClick={() => handleSaveFill(fill.id)}
                                className="px-2 py-1 bg-brand-green text-white rounded text-xs hover:bg-green-500"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-gray-300">
                            {new Date(fill.fill_timestamp || fill.created_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className={`font-semibold uppercase ${fill.side === 'buy' ? 'text-brand-green' : 'text-brand-red'}`}>
                              {fill.side}
                            </span>
                          </td>
                          <td className="p-3 text-right text-gray-200 font-mono">{fill.quantity}</td>
                          <td className="p-3 text-right text-gray-200 font-mono">${fill.price.toFixed(2)}</td>
                          <td className="p-3 text-right text-gray-200 font-mono">${fill.open_fee.toFixed(2)}</td>
                          <td className="p-3 text-right text-gray-200 font-mono">${fill.close_fee.toFixed(2)}</td>
                          <td className="p-3 text-right text-gray-200 font-mono">${fill.night_fee.toFixed(2)}</td>
                          <td className="p-3 text-right text-gray-200 font-mono font-bold">${(fill.open_fee + fill.close_fee + fill.night_fee).toFixed(2)}</td>
                          {isEditMode && (
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleEditFill(fill)}
                                className="px-3 py-1 bg-brand-blue text-white rounded text-xs hover:bg-blue-500"
                              >
                                Edit
                              </button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Total fills: {fills.length} |
              {' '}Buy fills: {fills.filter(f => f.side === 'buy').length} |
              {' '}Sell fills: {fills.filter(f => f.side === 'sell').length}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-8 pt-4 border-t border-gray-700">
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================
// MAIN PAGE COMPONENT
// ============================

interface OperationsProps {
  trades: Trade[];
  accounts: Account[];
  addTrade: (tradeData: Omit<Trade, 'id' | 'status' | 'openAt' | 'pnl'>) => void;
  closeTrade: (tradeId: string, closePrice: number, closePercentage?: number) => void;
  deleteTrade: (tradeId: string) => void;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => void;
}

const DeleteOperationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trade: Trade;
}> = ({ isOpen, onClose, onConfirm, trade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-2 text-gray-200">Delete Operation</h2>
        <p className="text-gray-400 mb-6">
          Are you sure you want to delete the {trade.tradeType.toUpperCase()} operation for {trade.symbol}? This action cannot be undone and will permanently remove all associated data.
        </p>
        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700">Cancel</button>
          <button type="button" onClick={onConfirm} className="px-6 py-2 rounded-lg bg-brand-red text-white font-bold hover:bg-red-500">Delete Operation</button>
        </div>
      </div>
    </div>
  );
};
const Operations: React.FC<OperationsProps> = ({ trades, accounts, addTrade, closeTrade, deleteTrade, updateTrade }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [tradeToView, setTradeToView] = useState<Trade | null>(null);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);

  const openTrades = trades.filter(t => t.status === TradeStatus.OPEN);
  const closedTrades = [...trades.filter(t => t.status === TradeStatus.CLOSED)].sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime());

  const getAccountName = (id: string) => accounts.find(acc => acc.id === id)?.name || 'Unknown';
  const getAccount = (id: string) => accounts.find(acc => acc.id === id);

  const handleDeleteOperation = (trade: Trade) => {
    setTradeToDelete(trade);
  };

  const confirmDeleteOperation = () => {
    if (tradeToDelete) {
      deleteTrade(tradeToDelete.id);
      setTradeToDelete(null);
    }
  };
  const TradeTable: React.FC<{title: string, trades: Trade[], showDeleteButton?: boolean}> = ({ title, trades, showDeleteButton = false }) => (
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
                  <div className="flex justify-center items-center space-x-2">
                  {trade.status === TradeStatus.OPEN && (
                    <>
                      <button onClick={() => setTradeToView(trade)} className="font-semibold py-1 px-3 rounded-lg transition-colors text-xs bg-blue-500/20 text-brand-blue hover:bg-blue-500/40">
                        Details
                      </button>
                    <button onClick={() => setTradeToClose(trade)} className="font-semibold py-1 px-3 rounded-lg transition-colors text-xs bg-red-500/20 text-brand-red hover:bg-red-500/40">
                      Close
                    </button>
                    </>
                  )}
                  {showDeleteButton && (
                    <>
                      {trade.status === TradeStatus.CLOSED && (
                          <button onClick={() => setTradeToView(trade)} className="font-semibold py-1 px-3 rounded-lg transition-colors text-xs bg-blue-500/20 text-brand-blue hover:bg-blue-500/40">
                            Details
                          </button>
                      )}
                      <button
                        onClick={() => handleDeleteOperation(trade)}
                        className="text-gray-400 hover:text-brand-red transition-colors p-1"
                        title="Delete operation"
                      >
                        <i className="ri-delete-bin-line text-base"></i>
                      </button>
                    </>
                  )}
                  </div>
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
        <TradeTable title="Trade History" trades={closedTrades} showDeleteButton={true} />
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
      {tradeToDelete && (
        <DeleteOperationModal
          isOpen={!!tradeToDelete}
          onClose={() => setTradeToDelete(null)}
          onConfirm={confirmDeleteOperation}
          trade={tradeToDelete}
        />
      )}
      {tradeToEdit && (
        <EditOperationModal
          isOpen={!!tradeToEdit}
          onClose={() => setTradeToEdit(null)}
          onUpdate={updateTrade}
          trade={tradeToEdit}
          accounts={accounts}
        />
      )}
      {tradeToView && (
        <PositionDetailsModal
          trade={tradeToView}
          account={getAccount(tradeToView.accountId)}
          isOpen={!!tradeToView}
          onClose={() => setTradeToView(null)}
          onEdit={(trade) => {
            setTradeToEdit(trade);
            setTradeToView(null);
          }}
        />
      )}
    </>
  );
};

export default Operations;

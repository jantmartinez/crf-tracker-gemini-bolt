import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PriceUpdateLog {
  id: string;
  symbol_id: string;
  old_price: number | null;
  new_price: number | null;
  source: string;
  triggered_by: string;
  status: string;
  error_message: string | null;
  created_at: string;
  symbols?: {
    ticker: string;
    name: string;
  };
}

interface UpdateResult {
  ticker: string;
  oldPrice?: number;
  newPrice?: number;
  change?: number;
  status: string;
  error?: string;
}

interface Symbol {
  id: string;
  ticker: string;
  name: string;
  currency: string;
  latest_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  has_open_positions?: boolean;
}

type AdminTab = 'price-updates' | 'symbols';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('price-updates');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logs, setLogs] = useState<PriceUpdateLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [updateResults, setUpdateResults] = useState<UpdateResult[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [latestUpdate, setLatestUpdate] = useState<{ date: string; count: number; successCount: number } | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDateFilter = (date: string) => {
    setSelectedDate(date);
    if (date) {
      fetchLogs(date);
    } else {
      fetchLogs();
    }
  };

  const fetchLogs = async (filterDate?: string) => {
    setIsLoadingLogs(true);
    try {
      let query = supabase
        .from('price_update_log')
        .select(`
          *,
          symbols (ticker, name)
        `);

      if (filterDate) {
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);

      if (!filterDate && data && data.length > 0) {
        const latest = data[0];
        const latestDate = new Date(latest.created_at).toISOString().split('T')[0];
        const logsFromLatest = data.filter(log =>
          new Date(log.created_at).toISOString().split('T')[0] === latestDate
        );
        const successCount = logsFromLatest.filter(log => log.status === 'success').length;

        setLatestUpdate({
          date: latestDate,
          count: logsFromLatest.length,
          successCount
        });
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleUpdatePrices = async () => {
    setIsUpdating(true);
    setUpdateMessage(null);
    setUpdateResults(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-stock-prices`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ triggered_by: 'manual' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Check if there's an error in the response
      if (result.error) {
        setUpdateMessage({
          type: 'error',
          text: result.error + (result.instruction ? ` ${result.instruction}` : ''),
        });
        return;
      }

      setUpdateResults(result.results || []);
      setUpdateMessage({
        type: 'success',
        text: `Price update completed! ${result.summary.success} succeeded, ${result.summary.failed} failed.`,
      });

      // Refresh logs after update
      await fetchLogs();
    } catch (error) {
      console.error('Error updating prices:', error);
      setUpdateMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update prices',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-200">Admin Panel</h1>

      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('price-updates')}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            activeTab === 'price-updates'
              ? 'bg-brand-blue text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Price Updates
        </button>
        <button
          onClick={() => setActiveTab('symbols')}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            activeTab === 'symbols'
              ? 'bg-brand-blue text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Symbol Management
        </button>
      </div>

      {activeTab === 'price-updates' && (
        <>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Stock Price Updates</h2>
        <p className="text-gray-400 mb-4">
          Manually trigger stock price updates from Finnhub API. Prices are automatically updated daily at midnight CET.
        </p>

        {updateMessage && (
          <div
            className={`px-4 py-3 rounded-lg mb-4 ${
              updateMessage.type === 'success'
                ? 'bg-green-500/20 text-brand-green border border-green-500/50'
                : 'bg-red-500/20 text-brand-red border border-red-500/50'
            }`}
          >
            {updateMessage.text}
          </div>
        )}

        <button
          onClick={handleUpdatePrices}
          disabled={isUpdating}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            isUpdating
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-brand-blue text-white hover:bg-blue-600'
          }`}
        >
          {isUpdating ? (
            <span className="flex items-center gap-2">
              <i className="ri-loader-4-line animate-spin"></i>
              Updating Prices...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <i className="ri-refresh-line"></i>
              Update Prices Now
            </span>
          )}
        </button>

        {updateResults && updateResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-200">Update Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                  <tr>
                    <th className="p-3">Symbol</th>
                    <th className="p-3">Old Price</th>
                    <th className="p-3">New Price</th>
                    <th className="p-3">Change</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Error Details</th>
                  </tr>
                </thead>
                <tbody>
                  {updateResults.map((result, index) => (
                    <tr key={index} className="border-b border-gray-700">
                      <td className="p-3 font-bold">{result.ticker}</td>
                      <td className="p-3 font-mono">
                        {result.oldPrice !== undefined && result.oldPrice !== null ? `$${result.oldPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-3 font-mono">
                        {result.newPrice !== undefined ? `$${result.newPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className={`p-3 font-mono ${
                        result.change !== undefined
                          ? result.change >= 0
                            ? 'text-brand-green'
                            : 'text-brand-red'
                          : ''
                      }`}>
                        {result.change !== undefined
                          ? `${result.change >= 0 ? '+' : ''}${result.change.toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="p-3">
                        {result.status === 'success' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-brand-green">
                            Success
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-brand-red">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-red-400 max-w-md">
                        {result.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-200">Price Update History</h2>
          <button
            onClick={() => fetchLogs()}
            disabled={isLoadingLogs}
            className="text-gray-400 hover:text-brand-blue transition-colors"
            title="Refresh logs"
          >
            <i className={`ri-refresh-line text-lg ${isLoadingLogs ? 'animate-spin' : ''}`}></i>
          </button>
        </div>

        {latestUpdate && !selectedDate && (
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-1">Latest Update</h3>
                <p className="text-xs text-gray-400">
                  {new Date(latestUpdate.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-200">{latestUpdate.count}</p>
                <p className="text-xs text-gray-400">
                  {latestUpdate.successCount} successful, {latestUpdate.count - latestUpdate.successCount} failed
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-400 mb-2">
            Filter by Date
          </label>
          <div className="flex gap-2">
            <input
              id="dateFilter"
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateFilter(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {selectedDate && (
              <button
                onClick={() => handleDateFilter('')}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {isLoadingLogs ? (
          <div className="text-center py-8 text-gray-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No update logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Symbol</th>
                  <th className="p-3">Old Price</th>
                  <th className="p-3">New Price</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Trigger</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-3 font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold">
                      {log.symbols?.ticker || 'Unknown'}
                    </td>
                    <td className="p-3 font-mono">
                      {log.old_price !== null ? `$${log.old_price.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 font-mono">
                      {log.new_price !== null ? `$${log.new_price.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-xs">
                      <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                        {log.source}
                      </span>
                    </td>
                    <td className="p-3 text-xs">
                      <span className={`px-2 py-1 rounded-full ${
                        log.triggered_by === 'manual'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {log.triggered_by}
                      </span>
                    </td>
                    <td className="p-3">
                      {log.status === 'success' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-brand-green">
                          Success
                        </span>
                      ) : (
                        <span
                          className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-brand-red cursor-help"
                          title={log.error_message || 'Unknown error'}
                        >
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {activeTab === 'symbols' && <SymbolManagement />}
    </div>
  );
};

interface SymbolManagementProps {}

const SymbolManagement: React.FC<SymbolManagementProps> = () => {
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [newSymbol, setNewSymbol] = useState({ ticker: '', name: '', currency: 'USD' });

  useEffect(() => {
    fetchSymbols();
  }, []);

  const fetchSymbols = async () => {
    setIsLoading(true);
    try {
      const { data: symbolsData, error: symbolsError } = await supabase
        .from('symbols')
        .select('*')
        .order('ticker');

      if (symbolsError) throw symbolsError;

      const { data: openPositionsData, error: positionsError } = await supabase
        .from('operation_groups')
        .select('symbol_id')
        .eq('status', 'open');

      if (positionsError) throw positionsError;

      const openSymbolIds = new Set(openPositionsData.map(p => p.symbol_id));

      const enrichedSymbols = symbolsData.map(symbol => ({
        ...symbol,
        has_open_positions: openSymbolIds.has(symbol.id),
      }));

      setSymbols(enrichedSymbols);
    } catch (error) {
      console.error('Error fetching symbols:', error);
      setMessage({ type: 'error', text: 'Failed to load symbols' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (symbol: Symbol) => {
    if (symbol.has_open_positions && symbol.is_active) {
      setMessage({
        type: 'error',
        text: `Cannot deactivate ${symbol.ticker} - it has open positions`,
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('symbols')
        .update({ is_active: !symbol.is_active, updated_at: new Date().toISOString() })
        .eq('id', symbol.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `${symbol.ticker} ${!symbol.is_active ? 'activated' : 'deactivated'} successfully`,
      });
      await fetchSymbols();
    } catch (error) {
      console.error('Error toggling symbol:', error);
      setMessage({ type: 'error', text: 'Failed to update symbol' });
    }
  };

  const handleAddSymbol = async () => {
    if (!newSymbol.ticker.trim() || !newSymbol.name.trim()) {
      setMessage({ type: 'error', text: 'Ticker and name are required' });
      return;
    }

    try {
      const { error } = await supabase
        .from('symbols')
        .insert({
          ticker: newSymbol.ticker.toUpperCase(),
          name: newSymbol.name,
          currency: newSymbol.currency,
          is_active: true,
        });

      if (error) throw error;

      setMessage({ type: 'success', text: `${newSymbol.ticker} added successfully` });
      setNewSymbol({ ticker: '', name: '', currency: 'USD' });
      setIsAddingSymbol(false);
      await fetchSymbols();
    } catch (error) {
      console.error('Error adding symbol:', error);
      setMessage({ type: 'error', text: 'Failed to add symbol' });
    }
  };

  const activeSymbols = symbols.filter(s => s.is_active);
  const inactiveSymbols = symbols.filter(s => !s.is_active);
  const symbolsWithOpenPositions = symbols.filter(s => s.has_open_positions);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-200">Symbol Management</h2>
            <p className="text-gray-400 text-sm mt-1">
              Manage symbols tracked for price updates. Symbols with open positions are automatically tracked.
            </p>
          </div>
          <button
            onClick={() => setIsAddingSymbol(!isAddingSymbol)}
            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            {isAddingSymbol ? 'Cancel' : 'Add Symbol'}
          </button>
        </div>

        {message && (
          <div
            className={`px-4 py-3 rounded-lg mb-4 ${
              message.type === 'success'
                ? 'bg-green-500/20 text-brand-green border border-green-500/50'
                : 'bg-red-500/20 text-brand-red border border-red-500/50'
            }`}
          >
            {message.text}
          </div>
        )}

        {isAddingSymbol && (
          <div className="bg-gray-700/50 p-4 rounded-lg mb-6 border border-gray-600">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Add New Symbol</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Ticker</label>
                <input
                  type="text"
                  value={newSymbol.ticker}
                  onChange={(e) => setNewSymbol({ ...newSymbol, ticker: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Company Name</label>
                <input
                  type="text"
                  value={newSymbol.name}
                  onChange={(e) => setNewSymbol({ ...newSymbol, name: e.target.value })}
                  placeholder="Apple Inc."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Currency</label>
                <select
                  value={newSymbol.currency}
                  onChange={(e) => setNewSymbol({ ...newSymbol, currency: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleAddSymbol}
              className="px-6 py-2 bg-brand-green text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Add Symbol
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <p className="text-xs text-gray-400 uppercase mb-1">Total Symbols</p>
            <p className="text-2xl font-bold text-gray-200">{symbols.length}</p>
          </div>
          <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/50">
            <p className="text-xs text-gray-400 uppercase mb-1">Active (Tracked)</p>
            <p className="text-2xl font-bold text-brand-green">{activeSymbols.length}</p>
          </div>
          <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/50">
            <p className="text-xs text-gray-400 uppercase mb-1">With Open Positions</p>
            <p className="text-2xl font-bold text-blue-400">{symbolsWithOpenPositions.length}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading symbols...</div>
      ) : (
        <>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">
              Active Symbols ({activeSymbols.length})
            </h3>
            {activeSymbols.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active symbols</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-400">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                      <th className="p-3">Ticker</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Currency</th>
                      <th className="p-3">Latest Price</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSymbols.map((symbol) => (
                      <tr key={symbol.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3 font-bold">{symbol.ticker}</td>
                        <td className="p-3">{symbol.name}</td>
                        <td className="p-3">{symbol.currency}</td>
                        <td className="p-3 font-mono">
                          {symbol.latest_price ? `$${symbol.latest_price.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3">
                          {symbol.has_open_positions && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400">
                              Open Positions
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleActive(symbol)}
                            disabled={symbol.has_open_positions}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                              symbol.has_open_positions
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-red-500/20 text-brand-red hover:bg-red-500/30 border border-red-500/50'
                            }`}
                            title={symbol.has_open_positions ? 'Cannot deactivate - has open positions' : ''}
                          >
                            Deactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {inactiveSymbols.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">
                Inactive Symbols ({inactiveSymbols.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-400">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                      <th className="p-3">Ticker</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Currency</th>
                      <th className="p-3">Latest Price</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveSymbols.map((symbol) => (
                      <tr key={symbol.id} className="border-b border-gray-700 hover:bg-gray-700/50 opacity-60">
                        <td className="p-3 font-bold">{symbol.ticker}</td>
                        <td className="p-3">{symbol.name}</td>
                        <td className="p-3">{symbol.currency}</td>
                        <td className="p-3 font-mono">
                          {symbol.latest_price ? `$${symbol.latest_price.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleActive(symbol)}
                            className="px-3 py-1 text-xs font-medium rounded-lg bg-green-500/20 text-brand-green hover:bg-green-500/30 border border-green-500/50 transition-colors"
                          >
                            Activate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Admin;

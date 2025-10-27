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

const Admin: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logs, setLogs] = useState<PriceUpdateLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [updateResults, setUpdateResults] = useState<UpdateResult[] | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('price_update_log')
        .select(`
          *,
          symbols (ticker, name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
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
                  </tr>
                </thead>
                <tbody>
                  {updateResults.map((result, index) => (
                    <tr key={index} className="border-b border-gray-700">
                      <td className="p-3 font-bold">{result.ticker}</td>
                      <td className="p-3 font-mono">
                        {result.oldPrice !== undefined ? `$${result.oldPrice.toFixed(2)}` : '-'}
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
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="text-gray-400 hover:text-brand-blue transition-colors"
            title="Refresh logs"
          >
            <i className={`ri-refresh-line text-lg ${isLoadingLogs ? 'animate-spin' : ''}`}></i>
          </button>
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
    </div>
  );
};

export default Admin;

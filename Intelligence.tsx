
import React, { useState, useCallback } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { fetchStockAnalysis } from '../services/geminiService';
import type { StockAnalysis, WatchlistItem, Account, Trade } from '../types';
import { AnalystRating } from '../types';
import { ArrowUpIcon, ArrowDownIcon, TrashIcon, StarIcon, StarFillIcon, AddIcon } from './Icons';
import { OpenOperationModal } from './Operations';

const ratingColors: Record<AnalystRating, string> = {
    [AnalystRating.STRONG_BUY]: 'bg-green-500',
    [AnalystRating.BUY]: 'bg-green-400',
    [AnalystRating.HOLD]: 'bg-yellow-500',
    [AnalystRating.SELL]: 'bg-red-400',
    [AnalystRating.STRONG_SELL]: 'bg-red-500',
};

const RsiGauge: React.FC<{ value: number }> = ({ value }) => {
    const data = [{ name: 'RSI', value }];
    let fillColor = '#3b82f6'; // Neutral
    if (value > 70) fillColor = '#ef4444'; // Overbought
    if (value < 30) fillColor = '#22c55e'; // Oversold

    return (
        <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer>
                <RadialBarChart
                    innerRadius="80%"
                    outerRadius="100%"
                    data={data}
                    startAngle={180}
                    endAngle={0}
                    barSize={20}
                >
                    <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                    />
                    <RadialBar
                        background
                        dataKey="value"
                        angleAxisId={0}
                        fill={fillColor}
                        cornerRadius={10}
                    />
                    <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-200">
                        {value.toFixed(1)}
                    </text>
                    <text x="50%" y="90%" textAnchor="middle" dominantBaseline="middle" className="text-xs fill-gray-400">
                        RSI (14)
                    </text>
                </RadialBarChart>
            </ResponsiveContainer>
        </div>
    );
};


const WatchlistCard: React.FC<{ watchlist: WatchlistItem[]; removeFromWatchlist: (symbol: string) => void; onAddOperation: (symbol: string, price: number) => void; }> = ({ watchlist, removeFromWatchlist, onAddOperation }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Watchlist</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        <th scope="col" className="p-3">Symbol</th>
                        <th scope="col" className="p-3 text-right">Price</th>
                        <th scope="col" className="p-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {watchlist.length > 0 ? (
                        watchlist.map(item => (
                            <tr key={item.symbol} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                                <td className="p-3 font-bold">{item.symbol}</td>
                                <td className="p-3 font-mono text-right">${item.currentPrice.toFixed(2)}</td>
                                <td className="p-3">
                                    <div className="flex justify-center items-center space-x-3">
                                        <button onClick={() => onAddOperation(item.symbol, item.currentPrice)} className="text-gray-400 hover:text-brand-blue" title="Open new operation">
                                            <AddIcon className="text-base" />
                                        </button>
                                        <button onClick={() => removeFromWatchlist(item.symbol)} className="text-gray-400 hover:text-brand-red" title="Remove from watchlist">
                                            <TrashIcon className="text-base" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={3} className="text-center p-8 text-gray-500">Your watchlist is empty.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);


interface IntelligenceProps {
  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;
  addTrade: (tradeData: Omit<Trade, 'id' | 'status' | 'openAt' | 'pnl'>) => void;
  accounts: Account[];
}


const Intelligence: React.FC<IntelligenceProps> = ({ watchlist, addToWatchlist, removeFromWatchlist, addTrade, accounts }) => {
    const [ticker, setTicker] = useState<string>('');
    const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<{ symbol: string; price: number } | undefined>(undefined);

    const openTradeModal = (symbol: string, price: number) => {
        setModalInitialData({ symbol, price });
        setIsModalOpen(true);
    };

    const handleSearch = useCallback(async () => {
        if (!ticker) return;
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        try {
            const result = await fetchStockAnalysis(ticker);
            setAnalysis(result);
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [ticker]);
    
    const upside = analysis ? ((analysis.analystConsensus.priceTargets.mean - analysis.currentPrice) / analysis.currentPrice) * 100 : 0;
    const isInWatchlist = analysis ? watchlist.some(item => item.symbol === analysis.symbol) : false;

    const handleWatchlistToggle = () => {
        if (!analysis) return;
        if (isInWatchlist) {
            removeFromWatchlist(analysis.symbol);
        } else {
            addToWatchlist({
                symbol: analysis.symbol,
                companyName: analysis.companyName,
                currentPrice: analysis.currentPrice,
            });
        }
    };

    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <h1 className="text-3xl font-bold text-gray-200">Intelligence Center</h1>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter Ticker (e.g., AAPL)"
                        className="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="bg-brand-blue text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Analyzing...' : 'Analyze'}
                    </button>
                </div>

                {isLoading && <div className="text-center p-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto"></div>
                    <p className="mt-4 text-gray-400">Generating AI analysis...</p>
                </div>}
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
                
                {analysis && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Stock Overview */}
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-200">{analysis.companyName} ({analysis.symbol})</h2>
                                <p className="text-gray-400">{analysis.exchange}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-mono font-bold text-gray-200">${analysis.currentPrice.toFixed(2)}</p>
                            </div>
                             <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleWatchlistToggle}
                                    className={`font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2 text-sm ${
                                        isInWatchlist 
                                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    {isInWatchlist ? <StarFillIcon /> : <StarIcon />}
                                    <span>{isInWatchlist ? 'On Watchlist' : 'Add to Watchlist'}</span>
                                </button>
                                <button onClick={() => openTradeModal(analysis.symbol, analysis.currentPrice)} className="bg-brand-green text-white font-bold py-2 px-6 rounded-lg hover:bg-green-500 transition-colors">
                                    Start Operation
                                </button>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Analyst & Technicals */}
                            <div className="lg:col-span-1 space-y-8">
                               {/* Analyst Consensus */}
                               <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Analyst Consensus</h3>
                                    <div className="text-center">
                                        <span className={`px-4 py-2 text-lg font-bold rounded-full text-white ${ratingColors[analysis.analystConsensus.rating]}`}>
                                            {analysis.analystConsensus.rating}
                                        </span>
                                        <div className="flex justify-between mt-6 text-sm">
                                            <div className="text-center"><p className="text-gray-400">Low</p><p className="font-bold">${analysis.analystConsensus.priceTargets.low.toFixed(2)}</p></div>
                                            <div className="text-center"><p className="text-gray-400">Mean</p><p className="font-bold text-xl text-brand-blue">${analysis.analystConsensus.priceTargets.mean.toFixed(2)}</p></div>
                                            <div className="text-center"><p className="text-gray-400">High</p><p className="font-bold">${analysis.analystConsensus.priceTargets.high.toFixed(2)}</p></div>
                                        </div>
                                        <div className={`mt-4 flex items-center justify-center font-bold ${upside > 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                          {upside > 0 ? <ArrowUpIcon className="mr-1"/> : <ArrowDownIcon className="mr-1"/>}
                                          {upside.toFixed(2)}% Upside
                                        </div>
                                    </div>
                                </div>
                                {/* Technical Analysis */}
                                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Technical Analysis</h3>
                                    <RsiGauge value={analysis.technicals.rsi14} />
                                    <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                        <div><p className="text-gray-400">SMA 20</p><p className="font-bold">${analysis.technicals.sma20.toFixed(2)}</p></div>
                                        <div><p className="text-gray-400">SMA 50</p><p className="font-bold">${analysis.technicals.sma50.toFixed(2)}</p></div>
                                        <div><p className="text-gray-400">SMA 200</p><p className="font-bold">${analysis.technicals.sma200.toFixed(2)}</p></div>
                                        <div><p className="text-gray-400">ATR</p><p className="font-bold">{analysis.technicals.atr.toFixed(2)}</p></div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent News */}
                            <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
                                <h3 className="text-lg font-semibold mb-4 text-gray-200">Recent News</h3>
                                <ul className="space-y-4">
                                    {analysis.news.map((item, index) => (
                                        <li key={index} className="border-b border-gray-700 pb-4 last:border-b-0">
                                            <p className="font-semibold text-gray-200">{item.title}</p>
                                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                                <span>{item.source}</span>
                                                <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="lg:col-span-1 space-y-8">
                <WatchlistCard watchlist={watchlist} removeFromWatchlist={removeFromWatchlist} onAddOperation={openTradeModal} />
            </div>
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
        </>
    );
};

export default Intelligence;

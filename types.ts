
export type Page = 'dashboard' | 'intelligence' | 'accounts' | 'operations';

export enum TradeStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum TradeType {
  LONG = 'long',
  SHORT = 'short',
}

export interface Trade {
  id: string;
  symbol: string;
  quantity: number;
  openPrice: number;
  closePrice?: number;
  status: TradeStatus;
  pnl?: number; // Realized or Unrealized P&L
  accountId: string;
  closedAt?: string;
  tradeType: TradeType;
  openAt: string;
}

export interface Account {
  id: string;
  name: string;
  startingBalance: number;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface WatchlistItem {
  symbol: string;
  companyName: string;
  currentPrice: number;
}

export enum AnalystRating {
  STRONG_BUY = 'Strong Buy',
  BUY = 'Buy',
  HOLD = 'Hold',
  SELL = 'Sell',
  STRONG_SELL = 'Strong Sell',
}

export interface StockAnalysis {
  symbol: string;
  companyName: string;
  exchange: string;
  currentPrice: number;
  analystConsensus: {
    rating: AnalystRating;
    priceTargets: {
      high: number;
      mean: number;
      low: number;
    };
  };
  technicals: {
    rsi14: number;
    sma20: number;
    sma50: number;
    sma200: number;
    atr: number;
  };
  news: {
    title: string;
    source: string;
    timestamp: string;
  }[];
}
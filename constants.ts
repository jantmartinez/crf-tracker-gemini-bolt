
import type { Account, Trade, WatchlistItem } from './types';
import { TradeStatus, TradeType } from './types';

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc_1',
    name: 'Revolut CFD',
    startingBalance: 10000,
    createdAt: '2023-01-15T09:00:00Z',
    status: 'active',
    openCloseCommission: 0.25,
    nightCommission: 7.0,
  },
  {
    id: 'acc_2',
    name: 'XTB CFD',
    startingBalance: 25000,
    createdAt: '2023-03-20T14:30:00Z',
    status: 'active',
    openCloseCommission: 0.15,
    nightCommission: 5.0,
  },
];

export const MOCK_TRADES: Trade[] = [
  // Closed Trades
  { id: 't_1', symbol: 'AAPL', quantity: 10, openPrice: 150, closePrice: 155, status: TradeStatus.CLOSED, pnl: 50, accountId: 'acc_1', closedAt: '2024-05-20T10:00:00Z', tradeType: TradeType.LONG, openAt: '2024-05-19T10:00:00Z' },
  { id: 't_2', symbol: 'GOOGL', quantity: 5, openPrice: 2800, closePrice: 2750, status: TradeStatus.CLOSED, pnl: -250, accountId: 'acc_1', closedAt: '2024-05-21T11:00:00Z', tradeType: TradeType.LONG, openAt: '2024-05-20T11:00:00Z' },
  { id: 't_3', symbol: 'TSLA', quantity: 8, openPrice: 700, closePrice: 780, status: TradeStatus.CLOSED, pnl: 640, accountId: 'acc_2', closedAt: '2024-05-22T12:00:00Z', tradeType: TradeType.LONG, openAt: '2024-05-21T12:00:00Z' },
  { id: 't_4', symbol: 'AMZN', quantity: 2, openPrice: 3100, closePrice: 3200, status: TradeStatus.CLOSED, pnl: -200, accountId: 'acc_2', closedAt: '2024-05-23T13:00:00Z', tradeType: TradeType.SHORT, openAt: '2024-05-22T13:00:00Z' },
  { id: 't_5', symbol: 'MSFT', quantity: 15, openPrice: 300, closePrice: 310, status: TradeStatus.CLOSED, pnl: 150, accountId: 'acc_1', closedAt: '2024-05-24T14:00:00Z', tradeType: TradeType.LONG, openAt: '2024-05-23T14:00:00Z' },
  
  // Open Trades (currentPrice assumed for unrealized P&L calculation)
  // Let's assume current prices are: NVDA: 1000, META: 480
  // LONG NVDA: (1000 - 950) * 5 = 250 profit
  { id: 't_6', symbol: 'NVDA', quantity: 5, openPrice: 950, status: TradeStatus.OPEN, pnl: 250, accountId: 'acc_1', tradeType: TradeType.LONG, openAt: '2024-05-28T09:00:00Z' },
  // SHORT META: (490 - 480) * 10 = 100 profit
  { id: 't_7', symbol: 'META', quantity: 10, openPrice: 490, status: TradeStatus.OPEN, pnl: 100, accountId: 'acc_2', tradeType: TradeType.SHORT, openAt: '2024-05-29T10:00:00Z' },
];

export const MOCK_WATCHLIST: WatchlistItem[] = [
  { symbol: 'AMD', companyName: 'Advanced Micro Devices, Inc.', currentPrice: 165.43 },
  { symbol: 'PLTR', companyName: 'Palantir Technologies Inc.', currentPrice: 25.11 },
];


export const DEFAULT_SETTINGS = {
  baseCurrency: 'USD',
  riskPerTrade: 2.5,
  defaultLeverage: 5,
};
import type { Trade, Account } from '../types';
import { TradeStatus } from '../types';

export interface DailyMetrics {
  date: string;
  pnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  volume: number;
  fees: number;
}

export interface MonthlyCalendarData {
  year: number;
  month: number;
  days: (DailyMetrics | null)[];
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  averageTrade: number;
  expectancy: number;
  maxDrawdown: number;
  totalFees: number;
}

export interface TimeBasedMetrics {
  hourly: { hour: number; pnl: number; tradeCount: number }[];
  weekday: { day: string; pnl: number; tradeCount: number; winRate: number }[];
}

export const calculateDailyMetrics = (trades: Trade[], date: Date): DailyMetrics => {
  const dateStr = date.toISOString().split('T')[0];

  const dayTrades = trades.filter(trade => {
    if (trade.status !== TradeStatus.CLOSED || !trade.closedAt) return false;
    const tradeDate = new Date(trade.closedAt).toISOString().split('T')[0];
    return tradeDate === dateStr;
  });

  const winCount = dayTrades.filter(t => (t.pnl ?? 0) > 0).length;
  const lossCount = dayTrades.filter(t => (t.pnl ?? 0) < 0).length;
  const totalPnl = dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalVolume = dayTrades.reduce((sum, t) => sum + (t.quantity * t.openPrice), 0);
  const totalFees = dayTrades.reduce((sum, t) => sum + (t.fees?.total ?? 0), 0);

  return {
    date: dateStr,
    pnl: totalPnl,
    tradeCount: dayTrades.length,
    winCount,
    lossCount,
    winRate: dayTrades.length > 0 ? (winCount / dayTrades.length) * 100 : 0,
    volume: totalVolume,
    fees: totalFees,
  };
};

export const getMonthCalendarData = (trades: Trade[], year: number, month: number): MonthlyCalendarData => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const days: (DailyMetrics | null)[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const metrics = calculateDailyMetrics(trades, date);

    days.push(metrics.tradeCount > 0 ? metrics : null);
  }

  return {
    year,
    month,
    days,
  };
};

export interface MonthSummary {
  month: number;
  monthName: string;
  pnl: number;
  tradeCount: number;
  winCount: number;
  winRate: number;
  fees: number;
}

export const getYearCalendarData = (trades: Trade[], year: number): MonthSummary[] => {
  const months: MonthSummary[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let month = 0; month < 12; month++) {
    const monthData = getMonthCalendarData(trades, year, month);

    const monthTrades = trades.filter(trade => {
      if (trade.status !== TradeStatus.CLOSED || !trade.closedAt) return false;
      const tradeDate = new Date(trade.closedAt);
      return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
    });

    const winCount = monthTrades.filter(t => (t.pnl ?? 0) > 0).length;
    const totalPnl = monthTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const totalFees = monthTrades.reduce((sum, t) => sum + (t.fees?.total ?? 0), 0);
    const winRate = monthTrades.length > 0 ? (winCount / monthTrades.length) * 100 : 0;

    months.push({
      month,
      monthName: monthNames[month],
      pnl: totalPnl,
      tradeCount: monthTrades.length,
      winCount,
      winRate,
      fees: totalFees,
    });
  }

  return months;
};

export const calculatePerformanceMetrics = (trades: Trade[]): PerformanceMetrics => {
  const closedTrades = trades.filter(t => t.status === TradeStatus.CLOSED);

  const winningTrades = closedTrades.filter(t => (t.pnl ?? 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl ?? 0) < 0);

  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0));
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalFees = closedTrades.reduce((sum, t) => sum + (t.fees?.total ?? 0), 0);

  const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  const averageTrade = closedTrades.length > 0 ? totalPnl / closedTrades.length : 0;

  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const expectancy = closedTrades.length > 0
    ? (winRate / 100) * averageWin - ((100 - winRate) / 100) * averageLoss
    : 0;

  const largestWin = winningTrades.length > 0
    ? Math.max(...winningTrades.map(t => t.pnl ?? 0))
    : 0;
  const largestLoss = losingTrades.length > 0
    ? Math.min(...losingTrades.map(t => t.pnl ?? 0))
    : 0;

  const maxDrawdown = calculateMaxDrawdown(closedTrades);

  return {
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    totalPnl,
    averageWin,
    averageLoss,
    profitFactor,
    largestWin,
    largestLoss,
    averageTrade,
    expectancy,
    maxDrawdown,
    totalFees,
  };
};

const calculateMaxDrawdown = (trades: Trade[]): number => {
  if (trades.length === 0) return 0;

  const sortedTrades = [...trades].sort((a, b) =>
    new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime()
  );

  let peak = 0;
  let maxDrawdown = 0;
  let runningPnl = 0;

  sortedTrades.forEach(trade => {
    runningPnl += trade.pnl ?? 0;

    if (runningPnl > peak) {
      peak = runningPnl;
    }

    const drawdown = peak - runningPnl;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return maxDrawdown;
};

export const calculateTimeBasedMetrics = (trades: Trade[]): TimeBasedMetrics => {
  const closedTrades = trades.filter(t => t.status === TradeStatus.CLOSED && t.closedAt);

  const hourlyData = new Array(24).fill(0).map((_, hour) => ({ hour, pnl: 0, tradeCount: 0 }));
  const weekdayData = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => ({
    day,
    pnl: 0,
    tradeCount: 0,
    winCount: 0,
    winRate: 0,
  }));

  closedTrades.forEach(trade => {
    const date = new Date(trade.closedAt!);
    const hour = date.getHours();
    const weekday = date.getDay();

    hourlyData[hour].pnl += trade.pnl ?? 0;
    hourlyData[hour].tradeCount += 1;

    weekdayData[weekday].pnl += trade.pnl ?? 0;
    weekdayData[weekday].tradeCount += 1;
    if ((trade.pnl ?? 0) > 0) {
      weekdayData[weekday].winCount += 1;
    }
  });

  weekdayData.forEach(day => {
    day.winRate = day.tradeCount > 0 ? (day.winCount / day.tradeCount) * 100 : 0;
  });

  return {
    hourly: hourlyData,
    weekday: weekdayData.map(({ day, pnl, tradeCount, winRate }) => ({ day, pnl, tradeCount, winRate })),
  };
};

export const getMonthlyPnlData = (trades: Trade[]) => {
  if (trades.length === 0) return [];

  // Find the first and last trade dates using openAt and closedAt
  const allDates: Date[] = [];

  trades.forEach(trade => {
    allDates.push(new Date(trade.openAt));
    if (trade.closedAt) {
      allDates.push(new Date(trade.closedAt));
    }
  });

  if (allDates.length === 0) return [];

  const firstTradeDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const lastTradeDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  // Initialize all months from first to last trade
  const monthlyMap = new Map<string, { month: string; pnl: number; tradeCount: number; winCount: number; sortKey: string }>();

  const currentDate = new Date(firstTradeDate.getFullYear(), firstTradeDate.getMonth(), 1);
  const endDate = new Date(lastTradeDate.getFullYear(), lastTradeDate.getMonth(), 1);

  // Create entries for all months in range
  while (currentDate <= endDate) {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    monthlyMap.set(monthKey, {
      month: monthLabel,
      pnl: 0,
      tradeCount: 0,
      winCount: 0,
      sortKey: monthKey
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Populate with actual trade data (only closed trades have P&L)
  const closedTrades = trades.filter(t => t.status === TradeStatus.CLOSED && t.closedAt);

  closedTrades.forEach(trade => {
    const date = new Date(trade.closedAt!);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const data = monthlyMap.get(monthKey);
    if (data) {
      data.pnl += trade.pnl ?? 0;
      data.tradeCount += 1;
      if ((trade.pnl ?? 0) > 0) {
        data.winCount += 1;
      }
    }
  });

  return Array.from(monthlyMap.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(item => ({
      month: item.month,
      pnl: item.pnl,
      tradeCount: item.tradeCount,
      winRate: item.tradeCount > 0 ? (item.winCount / item.tradeCount) * 100 : 0,
    }));
};

export const getSymbolDistribution = (trades: Trade[]) => {
  const closedTrades = trades.filter(t => t.status === TradeStatus.CLOSED);

  const symbolMap = new Map<string, { symbol: string; tradeCount: number; pnl: number; winCount: number }>();

  closedTrades.forEach(trade => {
    if (!symbolMap.has(trade.symbol)) {
      symbolMap.set(trade.symbol, { symbol: trade.symbol, tradeCount: 0, pnl: 0, winCount: 0 });
    }

    const data = symbolMap.get(trade.symbol)!;
    data.tradeCount += 1;
    data.pnl += trade.pnl ?? 0;
    if ((trade.pnl ?? 0) > 0) {
      data.winCount += 1;
    }
  });

  return Array.from(symbolMap.values())
    .map(item => ({
      ...item,
      winRate: item.tradeCount > 0 ? (item.winCount / item.tradeCount) * 100 : 0,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);
};

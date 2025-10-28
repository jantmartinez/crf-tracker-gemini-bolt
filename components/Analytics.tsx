import React, { useState, useMemo } from 'react';
import type { Trade, Account } from '../types';
import {
  calculatePerformanceMetrics,
  getMonthCalendarData,
  getYearCalendarData,
  calculateTimeBasedMetrics,
  getMonthlyPnlData,
  getSymbolDistribution,
} from '../services/analyticsService';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

interface AnalyticsProps {
  trades: Trade[];
  accounts: Account[];
}

type TabType = 'calendar' | 'reports';

const Analytics: React.FC<AnalyticsProps> = ({ trades, accounts }) => {
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'year'>('month');

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const calendarData = useMemo(
    () => getMonthCalendarData(trades, currentYear, currentMonth),
    [trades, currentYear, currentMonth]
  );

  const yearCalendarData = useMemo(
    () => getYearCalendarData(trades, currentYear),
    [trades, currentYear]
  );

  const performanceMetrics = useMemo(() => calculatePerformanceMetrics(trades), [trades]);
  const timeBasedMetrics = useMemo(() => calculateTimeBasedMetrics(trades), [trades]);
  const monthlyPnlData = useMemo(() => getMonthlyPnlData(trades), [trades]);
  const symbolDistribution = useMemo(() => getSymbolDistribution(trades), [trades]);

  const previousMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const previousYear = () => {
    setSelectedDate(new Date(currentYear - 1, currentMonth, 1));
  };

  const nextYear = () => {
    setSelectedDate(new Date(currentYear + 1, currentMonth, 1));
  };

  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const monthlyTotalPnl = calendarData.days.reduce((sum, day) => sum + (day?.pnl ?? 0), 0);
  const monthlyTotalTrades = calendarData.days.reduce((sum, day) => sum + (day?.tradeCount ?? 0), 0);
  const monthlyWinCount = calendarData.days.reduce((sum, day) => sum + (day?.winCount ?? 0), 0);
  const monthlyWinRate = monthlyTotalTrades > 0 ? (monthlyWinCount / monthlyTotalTrades) * 100 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-200">Analytics</h1>

      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            activeTab === 'calendar'
              ? 'bg-brand-blue text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            activeTab === 'reports'
              ? 'bg-brand-blue text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Reports
        </button>
      </div>

      {activeTab === 'calendar' && (
        <CalendarTab
          calendarData={calendarData}
          yearCalendarData={yearCalendarData}
          monthName={monthName}
          currentYear={currentYear}
          firstDayOfMonth={firstDayOfMonth}
          previousMonth={previousMonth}
          nextMonth={nextMonth}
          previousYear={previousYear}
          nextYear={nextYear}
          monthlyTotalPnl={monthlyTotalPnl}
          monthlyTotalTrades={monthlyTotalTrades}
          monthlyWinRate={monthlyWinRate}
          calendarView={calendarView}
          setCalendarView={setCalendarView}
          onMonthClick={(month: number) => {
            setSelectedDate(new Date(currentYear, month, 1));
            setCalendarView('month');
          }}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab
          performanceMetrics={performanceMetrics}
          timeBasedMetrics={timeBasedMetrics}
          monthlyPnlData={monthlyPnlData}
          symbolDistribution={symbolDistribution}
        />
      )}
    </div>
  );
};

interface CalendarTabProps {
  calendarData: ReturnType<typeof getMonthCalendarData>;
  yearCalendarData: ReturnType<typeof getYearCalendarData>;
  monthName: string;
  currentYear: number;
  firstDayOfMonth: number;
  previousMonth: () => void;
  nextMonth: () => void;
  previousYear: () => void;
  nextYear: () => void;
  monthlyTotalPnl: number;
  monthlyTotalTrades: number;
  monthlyWinRate: number;
  calendarView: 'month' | 'year';
  setCalendarView: (view: 'month' | 'year') => void;
  onMonthClick: (month: number) => void;
}

const CalendarTab: React.FC<CalendarTabProps> = ({
  calendarData,
  yearCalendarData,
  monthName,
  currentYear,
  firstDayOfMonth,
  previousMonth,
  nextMonth,
  previousYear,
  nextYear,
  monthlyTotalPnl,
  monthlyTotalTrades,
  monthlyWinRate,
  calendarView,
  setCalendarView,
  onMonthClick,
}) => {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const emptyDays = Array(adjustedFirstDay).fill(null);
  const allDays = [...emptyDays, ...calendarData.days];

  const calculateWeeklyTotals = () => {
    const weeks: { pnl: number; tradeCount: number }[] = [];

    for (let i = 0; i < allDays.length; i += 7) {
      const weekDays = allDays.slice(i, i + 7);
      const weekPnl = weekDays.reduce((sum, day) => sum + (day?.pnl ?? 0), 0);
      const weekTradeCount = weekDays.reduce((sum, day) => sum + (day?.tradeCount ?? 0), 0);
      weeks.push({ pnl: weekPnl, tradeCount: weekTradeCount });
    }

    return weeks;
  };

  const weeklyTotals = calculateWeeklyTotals();

  const yearlyTotalPnl = yearCalendarData.reduce((sum, month) => sum + month.pnl, 0);
  const yearlyTotalTrades = yearCalendarData.reduce((sum, month) => sum + month.tradeCount, 0);
  const yearlyWinCount = yearCalendarData.reduce((sum, month) => sum + month.winCount, 0);
  const yearlyWinRate = yearlyTotalTrades > 0 ? (yearlyWinCount / yearlyTotalTrades) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setCalendarView('month')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              calendarView === 'month'
                ? 'bg-brand-blue text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setCalendarView('year')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              calendarView === 'year'
                ? 'bg-brand-blue text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {calendarView === 'year' ? (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousYear}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-8">
              <h2 className="text-2xl font-bold text-gray-200">{currentYear}</h2>
              <div className="bg-gray-700/50 px-4 py-2 rounded-lg border border-gray-600">
                <p className="text-xs text-gray-400 uppercase mb-1">Yearly Total</p>
                <p className={`text-xl font-bold ${yearlyTotalPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                  ${yearlyTotalPnl.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={nextYear}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {yearCalendarData.map((monthData) => {
              const isProfit = monthData.pnl >= 0;
              const hasTrades = monthData.tradeCount > 0;

              return (
                <div
                  key={monthData.month}
                  onClick={() => hasTrades && onMonthClick(monthData.month)}
                  className={`${
                    hasTrades
                      ? isProfit
                        ? 'bg-green-500/20 border-green-500/50 cursor-pointer hover:bg-green-500/30'
                        : 'bg-red-500/20 border-red-500/50 cursor-pointer hover:bg-red-500/30'
                      : 'bg-gray-700/30 border-gray-600/30'
                  } border-2 rounded-lg p-6 transition-all`}
                >
                  <h3 className="text-lg font-bold text-gray-200 mb-3">{monthData.monthName}</h3>

                  {hasTrades ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-400 uppercase mb-1">P&L</p>
                        <p className={`text-2xl font-bold ${isProfit ? 'text-brand-green' : 'text-brand-red'}`}>
                          ${monthData.pnl.toFixed(2)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-600/50">
                        <div>
                          <p className="text-xs text-gray-400">Trades</p>
                          <p className="text-sm font-semibold text-gray-200">{monthData.tradeCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Win Rate</p>
                          <p className={`text-sm font-semibold ${monthData.winRate >= 50 ? 'text-brand-green' : 'text-brand-red'}`}>
                            {monthData.winRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No trades</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-gray-700/50 p-6 rounded-lg">
              <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Yearly P&L</h3>
              <p className={`text-3xl font-bold ${yearlyTotalPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                ${yearlyTotalPnl.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-700/50 p-6 rounded-lg">
              <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Total Trades</h3>
              <p className="text-3xl font-bold text-gray-200">{yearlyTotalTrades}</p>
            </div>
            <div className="bg-gray-700/50 p-6 rounded-lg">
              <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Win Rate</h3>
              <p className={`text-3xl font-bold ${yearlyWinRate >= 50 ? 'text-brand-green' : 'text-brand-red'}`}>
                {yearlyWinRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-8">
                <h2 className="text-2xl font-bold text-gray-200">{monthName}</h2>
                <div className="bg-gray-700/50 px-4 py-2 rounded-lg border border-gray-600">
                  <p className="text-xs text-gray-400 uppercase mb-1">Monthly Total</p>
                  <p className={`text-xl font-bold ${monthlyTotalPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                    ${monthlyTotalPnl.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

        <div className="grid grid-cols-8 gap-1 sm:gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-gray-400 font-semibold text-xs sm:text-sm py-2">
              {day}
            </div>
          ))}
          <div className="text-center text-gray-400 font-semibold text-xs sm:text-sm py-2">
            Week
          </div>
        </div>

        <div className="space-y-1 sm:space-y-2">
          {weeklyTotals.map((weekTotal, weekIndex) => {
            const weekStart = weekIndex * 7;
            const weekEnd = weekStart + 7;
            const weekDays = allDays.slice(weekStart, weekEnd);
            const isWeekProfit = weekTotal.pnl >= 0;

            return (
              <div key={`week-${weekIndex}`} className="grid grid-cols-8 gap-1 sm:gap-2">
                {weekDays.map((dayData, dayIndex) => {
                  const index = weekStart + dayIndex;

                  if (dayData === null && index < adjustedFirstDay) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  if (dayData === null) {
                    const dayNumber = index - adjustedFirstDay + 1;
                    return (
                      <div
                        key={`day-${dayNumber}`}
                        className="aspect-square bg-gray-700/30 rounded-lg p-1 sm:p-2 flex flex-col"
                      >
                        <span className="text-gray-500 text-xs sm:text-sm font-medium">{dayNumber}</span>
                      </div>
                    );
                  }

                  const dayNumber = index - adjustedFirstDay + 1;
                  const isProfit = dayData.pnl > 0;
                  const bgColor = isProfit ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50';

                  return (
                    <div
                      key={`day-${dayNumber}`}
                      className={`aspect-square ${bgColor} border rounded-lg p-1 sm:p-2 flex flex-col hover:shadow-lg transition-shadow cursor-pointer group relative`}
                      title={`${dayData.tradeCount} trades | Win Rate: ${dayData.winRate.toFixed(1)}% | P&L: $${dayData.pnl.toFixed(2)}`}
                    >
                      <span className="text-gray-200 text-xs sm:text-sm font-medium">{dayNumber}</span>
                      <div className="flex-1 flex flex-col justify-center">
                        <p className={`text-xs font-bold ${isProfit ? 'text-brand-green' : 'text-brand-red'}`}>
                          ${dayData.pnl.toFixed(0)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400">{dayData.tradeCount}</p>
                      </div>

                      <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl z-10 hidden group-hover:block">
                        <p className="text-xs text-gray-400 mb-1">
                          Trades: <span className="text-gray-200 font-semibold">{dayData.tradeCount}</span>
                        </p>
                        <p className="text-xs text-gray-400 mb-1">
                          Win Rate: <span className="text-gray-200 font-semibold">{dayData.winRate.toFixed(1)}%</span>
                        </p>
                        <p className="text-xs text-gray-400 mb-1">
                          P&L:{' '}
                          <span className={`font-semibold ${isProfit ? 'text-brand-green' : 'text-brand-red'}`}>
                            ${dayData.pnl.toFixed(2)}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400">
                          Fees: <span className="text-gray-200 font-semibold">${dayData.fees.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div
                  className={`aspect-square ${
                    isWeekProfit ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                  } border-2 rounded-lg p-2 flex flex-col justify-center items-center`}
                  title={`Weekly Total: ${weekTotal.tradeCount} trades | P&L: $${weekTotal.pnl.toFixed(2)}`}
                >
                  <p className={`text-sm font-bold ${isWeekProfit ? 'text-brand-green' : 'text-brand-red'}`}>
                    ${weekTotal.pnl.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-400">{weekTotal.tradeCount}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Monthly P&L</h3>
              <p className={`text-3xl font-bold ${monthlyTotalPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                ${monthlyTotalPnl.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Total Trades</h3>
              <p className="text-3xl font-bold text-gray-200">{monthlyTotalTrades}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Win Rate</h3>
              <p className={`text-3xl font-bold ${monthlyWinRate >= 50 ? 'text-brand-green' : 'text-brand-red'}`}>
                {monthlyWinRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface ReportsTabProps {
  performanceMetrics: ReturnType<typeof calculatePerformanceMetrics>;
  timeBasedMetrics: ReturnType<typeof calculateTimeBasedMetrics>;
  monthlyPnlData: ReturnType<typeof getMonthlyPnlData>;
  symbolDistribution: ReturnType<typeof getSymbolDistribution>;
}

const ReportsTab: React.FC<ReportsTabProps> = ({
  performanceMetrics,
  timeBasedMetrics,
  monthlyPnlData,
  symbolDistribution,
}) => {
  const COLORS = ['#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Trades" value={performanceMetrics.totalTrades} />
        <MetricCard
          title="Win Rate"
          value={`${performanceMetrics.winRate.toFixed(1)}%`}
          colorClass={performanceMetrics.winRate >= 50 ? 'text-brand-green' : 'text-brand-red'}
        />
        <MetricCard
          title="Total P&L"
          value={`$${performanceMetrics.totalPnl.toFixed(2)}`}
          colorClass={performanceMetrics.totalPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}
        />
        <MetricCard
          title="Profit Factor"
          value={performanceMetrics.profitFactor === Infinity ? '∞' : performanceMetrics.profitFactor.toFixed(2)}
          colorClass={performanceMetrics.profitFactor >= 1.5 ? 'text-brand-green' : 'text-gray-400'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Average Win"
          value={`$${performanceMetrics.averageWin.toFixed(2)}`}
          colorClass="text-brand-green"
        />
        <MetricCard
          title="Average Loss"
          value={`$${performanceMetrics.averageLoss.toFixed(2)}`}
          colorClass="text-brand-red"
        />
        <MetricCard
          title="Largest Win"
          value={`$${performanceMetrics.largestWin.toFixed(2)}`}
          colorClass="text-brand-green"
        />
        <MetricCard
          title="Largest Loss"
          value={`$${performanceMetrics.largestLoss.toFixed(2)}`}
          colorClass="text-brand-red"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Expectancy"
          value={`$${performanceMetrics.expectancy.toFixed(2)}`}
          colorClass={performanceMetrics.expectancy >= 0 ? 'text-brand-green' : 'text-brand-red'}
        />
        <MetricCard
          title="Max Drawdown"
          value={`$${performanceMetrics.maxDrawdown.toFixed(2)}`}
          colorClass="text-brand-red"
        />
        <MetricCard
          title="Total Fees"
          value={`$${performanceMetrics.totalFees.toFixed(2)}`}
          colorClass="text-gray-400"
        />
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Monthly P&L</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyPnlData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
            <YAxis yAxisId="pnl" stroke="#3B82F6" fontSize={12} />
            <YAxis yAxisId="winRate" orientation="right" stroke="#22C55E" fontSize={12} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#E5E7EB',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'pnl') return [`$${Number(value).toFixed(2)}`, 'P&L'];
                if (name === 'winRate') return [`${Number(value).toFixed(1)}%`, 'Win Rate'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="pnl" dataKey="pnl" fill="#3B82F6" name="pnl" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="winRate"
              type="monotone"
              dataKey="winRate"
              stroke="#22C55E"
              strokeWidth={2}
              name="winRate"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Performance by Weekday</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeBasedMetrics.weekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" fontSize={11} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#E5E7EB',
                }}
                formatter={(value: any) => `$${Number(value).toFixed(2)}`}
              />
              <Bar dataKey="pnl" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Symbol Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={symbolDistribution.slice(0, 6)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ symbol, tradeCount }) => `${symbol} (${tradeCount})`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="tradeCount"
              >
                {symbolDistribution.slice(0, 6).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#E5E7EB',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Symbol Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
              <tr>
                <th className="p-4">Symbol</th>
                <th className="p-4 text-right">Trades</th>
                <th className="p-4 text-right">Win Rate</th>
                <th className="p-4 text-right">Total P&L</th>
              </tr>
            </thead>
            <tbody>
              {symbolDistribution.map(symbol => (
                <tr key={symbol.symbol} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4 font-bold">{symbol.symbol}</td>
                  <td className="p-4 text-right">{symbol.tradeCount}</td>
                  <td className="p-4 text-right">
                    <span
                      className={symbol.winRate >= 50 ? 'text-brand-green' : 'text-brand-red'}
                    >
                      {symbol.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`p-4 text-right font-mono ${symbol.pnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                    ${symbol.pnl.toFixed(2)}
                  </td>
                </tr>
              ))}
              {symbolDistribution.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-gray-500">
                    No trading data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string | number; colorClass?: string }> = ({
  title,
  value,
  colorClass = 'text-gray-200',
}) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
    <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">{title}</h3>
    <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
  </div>
);

export default Analytics;

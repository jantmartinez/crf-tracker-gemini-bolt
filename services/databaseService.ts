import { supabase } from '../lib/supabase';
import type { Account, Trade, WatchlistItem } from '../types';
import { TradeStatus, TradeType } from '../types';

// Account operations
export const fetchAccounts = async (): Promise<Account[]> => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }

  return data.map(account => ({
    id: account.id,
    name: account.name,
    startingBalance: account.starting_balance,
    createdAt: account.created_at,
    status: account.is_active ? 'active' : 'inactive'
  }));
};

export const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'status'>): Promise<Account> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name: account.name,
      starting_balance: account.startingBalance,
      current_balance: account.startingBalance,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating account:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    startingBalance: data.starting_balance,
    createdAt: data.created_at,
    status: 'active'
  };
};

// Symbol operations
export const fetchOrCreateSymbol = async (ticker: string): Promise<string> => {
  // First try to find existing symbol
  const { data: existingSymbol } = await supabase
    .from('symbols')
    .select('id')
    .eq('ticker', ticker.toUpperCase())
    .single();

  if (existingSymbol) {
    return existingSymbol.id;
  }

  // Create new symbol if it doesn't exist
  const { data, error } = await supabase
    .from('symbols')
    .insert({
      ticker: ticker.toUpperCase(),
      name: `${ticker.toUpperCase()} Corporation`, // Placeholder name
      currency: 'USD'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating symbol:', error);
    throw error;
  }

  return data.id;
};

// Trade operations (using operation_groups and operation_fills)
export const fetchTrades = async (): Promise<Trade[]> => {
  const { data, error } = await supabase
    .from('operation_groups')
    .select(`
      *,
      symbols (ticker),
      operation_fills (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trades:', error);
    throw error;
  }

  return data.map(group => {
    const fills = group.operation_fills || [];
    const buyFills = fills.filter(f => f.side === 'buy');
    const sellFills = fills.filter(f => f.side === 'sell');
    
    const totalBuyQuantity = buyFills.reduce((sum, f) => sum + f.quantity, 0);
    const totalSellQuantity = sellFills.reduce((sum, f) => sum + f.quantity, 0);
    const netQuantity = totalBuyQuantity - totalSellQuantity;
    
    const avgBuyPrice = buyFills.length > 0 
      ? buyFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) / totalBuyQuantity
      : 0;
    
    const avgSellPrice = sellFills.length > 0
      ? sellFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) / totalSellQuantity
      : 0;

    // Calculate P&L
    let pnl = 0;
    if (group.status === 'closed') {
      // For closed positions, calculate realized P&L
      pnl = sellFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) - 
            buyFills.reduce((sum, f) => sum + (f.price * f.quantity), 0);
    } else {
      // For open positions, we'd need current market price to calculate unrealized P&L
      // For now, we'll set it to 0 and update it with real-time data later
      pnl = 0;
    }

    return {
      id: group.id,
      symbol: group.symbols?.ticker || 'UNKNOWN',
      quantity: Math.abs(netQuantity),
      openPrice: avgBuyPrice,
      closePrice: group.status === 'closed' ? avgSellPrice : undefined,
      status: group.status === 'closed' ? TradeStatus.CLOSED : TradeStatus.OPEN,
      pnl,
      accountId: group.account_id,
      openAt: group.created_at,
      closedAt: group.closed_at,
      tradeType: netQuantity >= 0 ? TradeType.LONG : TradeType.SHORT
    };
  });
};

export const createTrade = async (tradeData: Omit<Trade, 'id' | 'status' | 'openAt' | 'pnl'>): Promise<Trade> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get or create symbol
  const symbolId = await fetchOrCreateSymbol(tradeData.symbol);

  // Create operation group
  const { data: group, error: groupError } = await supabase
    .from('operation_groups')
    .insert({
      user_id: user.id,
      account_id: tradeData.accountId,
      symbol_id: symbolId,
      status: 'open'
    })
    .select()
    .single();

  if (groupError) {
    console.error('Error creating operation group:', groupError);
    throw groupError;
  }

  // Create initial fill (opening position)
  const { error: fillError } = await supabase
    .from('operation_fills')
    .insert({
      group_id: group.id,
      side: 'buy', // Always start with a buy for simplicity
      quantity: tradeData.quantity,
      price: tradeData.openPrice,
      leverage: 1
    });

  if (fillError) {
    console.error('Error creating operation fill:', fillError);
    throw fillError;
  }

  return {
    id: group.id,
    symbol: tradeData.symbol,
    quantity: tradeData.quantity,
    openPrice: tradeData.openPrice,
    status: TradeStatus.OPEN,
    pnl: 0,
    accountId: tradeData.accountId,
    openAt: group.created_at,
    tradeType: tradeData.tradeType
  };
};

export const closeTrade = async (tradeId: string, closePrice: number): Promise<void> => {
  // Get the operation group and its fills
  const { data: group, error: groupError } = await supabase
    .from('operation_groups')
    .select(`
      *,
      operation_fills (*)
    `)
    .eq('id', tradeId)
    .single();

  if (groupError) {
    console.error('Error fetching operation group:', groupError);
    throw groupError;
  }

  // Calculate total quantity to close
  const buyFills = group.operation_fills.filter(f => f.side === 'buy');
  const sellFills = group.operation_fills.filter(f => f.side === 'sell');
  const totalBuyQuantity = buyFills.reduce((sum, f) => sum + f.quantity, 0);
  const totalSellQuantity = sellFills.reduce((sum, f) => sum + f.quantity, 0);
  const quantityToClose = totalBuyQuantity - totalSellQuantity;

  if (quantityToClose <= 0) {
    throw new Error('No open quantity to close');
  }

  // Create closing fill
  const { error: fillError } = await supabase
    .from('operation_fills')
    .insert({
      group_id: tradeId,
      side: 'sell',
      quantity: quantityToClose,
      price: closePrice
    });

  if (fillError) {
    console.error('Error creating closing fill:', fillError);
    throw fillError;
  }

  // Update operation group status
  const { error: updateError } = await supabase
    .from('operation_groups')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString()
    })
    .eq('id', tradeId);

  if (updateError) {
    console.error('Error updating operation group:', updateError);
    throw updateError;
  }
};

// Watchlist operations (stored in user profile or separate table)
export const fetchWatchlist = async (): Promise<WatchlistItem[]> => {
  // For now, return the symbols that are commonly watched
  // In a real app, you might have a separate watchlist table
  const { data, error } = await supabase
    .from('symbols')
    .select('*')
    .in('ticker', ['AMD', 'PLTR']) // Mock watchlist items
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching watchlist:', error);
    throw error;
  }

  return data.map(symbol => ({
    symbol: symbol.ticker,
    companyName: symbol.name || `${symbol.ticker} Corporation`,
    currentPrice: symbol.last_price || 0
  }));
};

// User profile operations
export const fetchUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching user profile:', error);
    throw error;
  }

  if (!data) {
    // Create default profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        base_currency: 'USD',
        risk_per_trade: 2.5,
        default_leverage: 5
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user profile:', createError);
      throw createError;
    }

    return newProfile;
  }

  return data;
};
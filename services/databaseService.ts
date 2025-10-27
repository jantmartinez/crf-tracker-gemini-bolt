import { supabase } from '../lib/supabase';
import type { Account, Trade, WatchlistItem } from '../types';
import { TradeStatus, TradeType } from '../types';

export interface TradeFill {
  id: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  open_fee: number;
  close_fee: number;
  night_fee: number;
  fees: number;
  fill_timestamp: string;
  created_at: string;
}

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

  console.log('Fetched accounts from database:', data);

  return data.map(account => ({
    id: account.id,
    name: account.name,
    startingBalance: account.starting_balance,
    createdAt: account.created_at,
    status: (account.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
    openCloseCommission: account.open_close_commission ?? 0.25,
    nightCommission: account.night_commission ?? 7.0
  }));
};

export const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'status'>): Promise<Account> => {
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      name: account.name,
      starting_balance: account.startingBalance,
      current_balance: account.startingBalance,
      is_active: true,
      open_close_commission: account.openCloseCommission ?? 0.25,
      night_commission: account.nightCommission ?? 7.0
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
    status: 'active',
    openCloseCommission: data.open_close_commission ?? 0.25,
    nightCommission: data.night_commission ?? 7.0
  };
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  // First, check if there are any operations associated with this account
  const { data: operations, error: checkError } = await supabase
    .from('operation_groups')
    .select('id')
    .eq('account_id', accountId)
    .limit(1);

  if (checkError) {
    console.error('Error checking for associated operations:', checkError);
    throw new Error('Failed to verify account can be deleted');
  }

  if (operations && operations.length > 0) {
    throw new Error('Cannot delete account with existing operations. Please close or delete all operations first.');
  }

  // Check if the account exists first
  const { data: existingAccount, error: fetchError } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('id', accountId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching account:', fetchError);
    throw new Error('Failed to verify account exists');
  }

  if (!existingAccount) {
    throw new Error('Account not found in database');
  }

  console.log('Attempting to delete account:', existingAccount);

  // Delete the account
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId);

  if (error) {
    console.error('Error deleting account:', error);
    throw new Error(`Failed to delete account from database: ${error.message}`);
  }

  console.log('Account deleted successfully:', accountId);
};

// Update account commission settings
export const updateAccountCommissions = async (
  accountId: string, 
  commissions: { openCloseCommission: number; nightCommission: number }
): Promise<void> => {
  // Validate commission rates
  if (commissions.openCloseCommission < 0 || commissions.openCloseCommission > 100) {
    throw new Error('Open/Close commission must be between 0% and 100%');
  }
  
  if (commissions.nightCommission < 0 || commissions.nightCommission > 100) {
    throw new Error('Night commission must be between 0% and 100%');
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      open_close_commission: commissions.openCloseCommission,
      night_commission: commissions.nightCommission,
      updated_at: new Date().toISOString()
    })
    .eq('id', accountId);

  if (error) {
    console.error('Error updating account commissions:', error);
    throw new Error(`Failed to update commission settings: ${error.message}`);
  }

  console.log('Account commissions updated successfully:', accountId);
};

// Symbol operations
export const fetchOrCreateSymbol = async (ticker: string): Promise<string> => {
  // First try to find existing symbol
  const { data: existingSymbol } = await supabase
    .from('symbols')
    .select('id')
    .eq('ticker', ticker.toUpperCase())
    .maybeSingle();

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
    .select('id');

  if (error) {
    console.error('Error creating symbol:', error);
    throw error;
  }

  return data[0].id;
};

// Trade operations (using operation_groups and operation_fills)
export const fetchTrades = async (): Promise<Trade[]> => {
  const { data, error } = await supabase
    .from('operation_groups')
    .select(`
      *,
      symbols (ticker, latest_price),
      operation_fills (*),
      accounts (open_close_commission, night_commission)
    `)
    .order('open_at', { ascending: false });

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
    
    // Determine trade type and net quantity
    let tradeType: TradeType;
    let netQuantity: number;
    let openPrice: number;
    
    if (totalBuyQuantity > totalSellQuantity) {
      // Long position (more buys than sells)
      tradeType = TradeType.LONG;
      netQuantity = totalBuyQuantity - totalSellQuantity;
      openPrice = buyFills.length > 0 
        ? buyFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) / totalBuyQuantity
        : 0;
    } else if (totalSellQuantity > totalBuyQuantity) {
      // Short position (more sells than buys)
      tradeType = TradeType.SHORT;
      netQuantity = totalSellQuantity - totalBuyQuantity;
      openPrice = sellFills.length > 0
        ? sellFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) / totalSellQuantity
        : 0;
    } else {
      // Flat position - determine by first fill
      const firstFill = fills.sort((a, b) => new Date(a.fill_timestamp || a.created_at).getTime() - new Date(b.fill_timestamp || b.created_at).getTime())[0];
      tradeType = firstFill?.side === 'buy' ? TradeType.LONG : TradeType.SHORT;
      netQuantity = 0;
      openPrice = firstFill?.price || 0;
    }
    
    // Calculate original quantity (from opening fills only)
    const openingFills = tradeType === TradeType.LONG ? buyFills : sellFills;
    const closingFills = tradeType === TradeType.LONG ? sellFills : buyFills;
    const originalQuantity = openingFills.reduce((sum, f) => sum + f.quantity, 0);

    // Determine if position is partially closed
    const isPartiallyCloseD = group.status === 'open' && netQuantity > 0 && netQuantity < originalQuantity;

    // Calculate average close price (from closing fills)
    const closedQuantity = closingFills.reduce((sum, f) => sum + f.quantity, 0);
    const avgClosePrice = closedQuantity > 0
      ? closingFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) / closedQuantity
      : 0;

    // Calculate P&L including fees
    const totalOpenFees = fills.reduce((sum, f) => sum + (f.open_fee || 0), 0);
    const totalCloseFees = fills.reduce((sum, f) => sum + (f.close_fee || 0), 0);
    const totalNightFees = fills.reduce((sum, f) => sum + (f.night_fee || 0), 0);
    const totalFees = totalOpenFees + totalCloseFees + totalNightFees;

    let pnl = 0;
    let realizedPnl = 0;
    let unrealizedPnl = 0;

    if (group.status === 'closed') {
      // For closed positions, calculate realized P&L minus fees
      if (tradeType === TradeType.LONG) {
        pnl = closingFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) -
              openingFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) - totalFees;
      } else {
        pnl = openingFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) -
              closingFills.reduce((sum, f) => sum + (f.price * f.quantity), 0) - totalFees;
      }
    } else if (isPartiallyCloseD) {
      // For partially closed positions, calculate both realized and unrealized P&L
      const totalOpenValue = openingFills.reduce((sum, f) => sum + (f.price * f.quantity), 0);
      const totalCloseValue = closingFills.reduce((sum, f) => sum + (f.price * f.quantity), 0);

      // Realized P&L: closed portion
      if (tradeType === TradeType.LONG) {
        realizedPnl = totalCloseValue - (totalOpenValue * (closedQuantity / originalQuantity)) - totalFees;
      } else {
        realizedPnl = (totalOpenValue * (closedQuantity / originalQuantity)) - totalCloseValue - totalFees;
      }

      // Unrealized P&L: open portion using latest price
      const latestPrice = group.symbols?.latest_price;
      if (latestPrice && latestPrice > 0) {
        if (tradeType === TradeType.LONG) {
          unrealizedPnl = (latestPrice - openPrice) * netQuantity;
        } else {
          unrealizedPnl = (openPrice - latestPrice) * netQuantity;
        }
      }

      pnl = unrealizedPnl; // Default pnl for open positions
    } else {
      // For open positions, calculate unrealized P&L using latest_price
      const latestPrice = group.symbols?.latest_price;
      if (latestPrice && latestPrice > 0) {
        if (tradeType === TradeType.LONG) {
          pnl = (latestPrice - openPrice) * netQuantity - totalFees;
        } else {
          pnl = (openPrice - latestPrice) * netQuantity - totalFees;
        }
      } else {
        // If no latest price available, P&L is 0
        pnl = -totalFees;
      }
    }

    return {
      id: group.id,
      symbol: group.symbols?.ticker || 'UNKNOWN',
      quantity: Math.abs(netQuantity) || Math.max(totalBuyQuantity, totalSellQuantity),
      openPrice: openPrice,
      closePrice: (group.status === 'closed' || isPartiallyCloseD) && avgClosePrice > 0 ? avgClosePrice : undefined,
      status: group.status === 'closed' ? TradeStatus.CLOSED : TradeStatus.OPEN,
      pnl,
      realizedPnl: isPartiallyCloseD ? realizedPnl : undefined,
      unrealizedPnl: isPartiallyCloseD ? unrealizedPnl : undefined,
      accountId: group.account_id,
      openAt: group.open_at || group.created_at,
      closedAt: group.closed_at,
      tradeType: tradeType,
      fees: {
        open: totalOpenFees,
        close: totalCloseFees,
        night: totalNightFees,
        total: totalFees
      },
      originalQuantity,
      isPartiallyCloseD
    };
  });
};

export const createTrade = async (tradeData: Omit<Trade, 'id' | 'status' | 'openAt' | 'pnl'>): Promise<Trade> => {
  // Get or create symbol
  const symbolId = await fetchOrCreateSymbol(tradeData.symbol);

  // Create operation group with open_at set to now
  const openTimestamp = new Date().toISOString();
  const { data: group, error: groupError } = await supabase
    .from('operation_groups')
    .insert({
      account_id: tradeData.accountId,
      symbol_id: symbolId,
      status: 'open',
      open_at: openTimestamp
    })
    .select()
    .single();

  if (groupError) {
    console.error('Error creating operation group:', groupError);
    throw groupError;
  }

  // Create initial fill (opening position) with proper side based on trade type
  const side = tradeData.tradeType === TradeType.LONG ? 'buy' : 'sell';
  
  // Calculate opening fees based on account commission settings
  const account = await supabase
    .from('accounts')
    .select('open_close_commission')
    .eq('id', tradeData.accountId)
    .single();

  const positionValue = tradeData.quantity * tradeData.openPrice;
  const openCommission = account.data?.open_close_commission || 0.25;
  const openingFees = (positionValue * openCommission) / 100;

  const { error: fillError } = await supabase
    .from('operation_fills')
    .insert({
      group_id: group.id,
      side: side,
      quantity: tradeData.quantity,
      price: tradeData.openPrice,
      fees: openingFees, // Keep for backward compatibility
      open_fee: openingFees,
      close_fee: 0,
      night_fee: 0,
      fee_currency: 'USD',
      leverage: 5, // Default leverage, should come from trade data in real implementation
      fill_timestamp: openTimestamp
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
    openAt: group.open_at || group.created_at,
    tradeType: tradeData.tradeType
  };
};

export const closeTrade = async (tradeId: string, closePrice: number): Promise<void> => {
}

export const updateTrade = async (tradeId: string, updates: Partial<Trade>): Promise<void> => {
  const { data: group, error: fetchError } = await supabase
    .from('operation_groups')
    .select(`
      *,
      operation_fills (*)
    `)
    .eq('id', tradeId)
    .single();

  if (fetchError) {
    console.error('Error fetching operation group:', fetchError);
    throw fetchError;
  }

  const groupUpdates: any = {};

  if (updates.symbol !== undefined) {
    const symbolId = await fetchOrCreateSymbol(updates.symbol);
    groupUpdates.symbol_id = symbolId;
  }

  if (updates.accountId !== undefined) {
    groupUpdates.account_id = updates.accountId;
  }

  if (updates.closedAt !== undefined) {
    groupUpdates.closed_at = new Date(updates.closedAt).toISOString();
  }

  if (updates.openAt !== undefined) {
    groupUpdates.open_at = new Date(updates.openAt).toISOString();
  }

  if (Object.keys(groupUpdates).length > 0) {
    const { error: updateGroupError } = await supabase
      .from('operation_groups')
      .update(groupUpdates)
      .eq('id', tradeId);

    if (updateGroupError) {
      console.error('Error updating operation group:', updateGroupError);
      throw updateGroupError;
    }
  }

  const fills = group.operation_fills || [];

  if (fills.length > 0) {
    const sortedFills = fills.sort((a, b) =>
      new Date(a.fill_timestamp || a.created_at).getTime() -
      new Date(b.fill_timestamp || b.created_at).getTime()
    );

    const openFill = sortedFills[0];
    const closeFill = sortedFills.length > 1 ? sortedFills[sortedFills.length - 1] : null;

    if (openFill && (updates.quantity !== undefined || updates.openPrice !== undefined || updates.tradeType !== undefined || updates.openAt !== undefined || updates.fees !== undefined)) {
      const fillUpdates: any = {};

      if (updates.quantity !== undefined) {
        fillUpdates.quantity = updates.quantity;
      }

      if (updates.openPrice !== undefined) {
        fillUpdates.price = updates.openPrice;
      }

      if (updates.tradeType !== undefined) {
        fillUpdates.side = updates.tradeType === 'long' ? 'buy' : 'sell';
      }

      if (updates.openAt !== undefined) {
        fillUpdates.fill_timestamp = new Date(updates.openAt).toISOString();
      }

      if (updates.fees !== undefined) {
        fillUpdates.open_fee = updates.fees.open;
        fillUpdates.night_fee = updates.fees.night;
        fillUpdates.fees = updates.fees.open + updates.fees.night;
      }

      const { error: updateFillError } = await supabase
        .from('operation_fills')
        .update(fillUpdates)
        .eq('id', openFill.id);

      if (updateFillError) {
        console.error('Error updating open fill:', updateFillError);
        throw updateFillError;
      }
    }

    if (closeFill && (updates.closePrice !== undefined || updates.closedAt !== undefined || updates.fees !== undefined)) {
      const closeFillUpdates: any = {};

      if (updates.closePrice !== undefined) {
        closeFillUpdates.price = updates.closePrice;
      }

      if (updates.closedAt !== undefined) {
        closeFillUpdates.fill_timestamp = new Date(updates.closedAt).toISOString();
      }

      if (updates.fees !== undefined) {
        closeFillUpdates.close_fee = updates.fees.close;
        closeFillUpdates.fees = (closeFillUpdates.fees || 0) + updates.fees.close;
      }

      const { error: updateCloseFillError } = await supabase
        .from('operation_fills')
        .update(closeFillUpdates)
        .eq('id', closeFill.id);

      if (updateCloseFillError) {
        console.error('Error updating close fill:', updateCloseFillError);
        throw updateCloseFillError;
      }
    }
  }
};

export const closeTradeInDb = async (tradeId: string, closePrice: number): Promise<void> => {
  await partialCloseTradeInDb(tradeId, closePrice, 100); // Close 100% of position
};

export const partialCloseTradeInDb = async (
  tradeId: string, 
  closePrice: number, 
  closePercentage: number
): Promise<void> => {
  // Validate input parameters
  if (closePercentage <= 0 || closePercentage > 100) {
    throw new Error('Close percentage must be between 0.01% and 100%');
  }

  // Get the operation group and its fills
  const { data: group, error: groupError } = await supabase
    .from('operation_groups')
    .select(`
      *,
      operation_fills (*),
      accounts (open_close_commission, night_commission)
    `)
    .eq('id', tradeId)
    .single();

  if (groupError) {
    console.error('Error fetching operation group:', groupError);
    throw groupError;
  }

  // Calculate night fees for the position
  const openDate = new Date(group.open_at || group.created_at);
  const closeDate = new Date();
  const daysHeld = Math.ceil((closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate total quantity to close and determine closing side
  const buyFills = group.operation_fills.filter(f => f.side === 'buy');
  const sellFills = group.operation_fills.filter(f => f.side === 'sell');
  const totalBuyQuantity = buyFills.reduce((sum, f) => sum + f.quantity, 0);
  const totalSellQuantity = sellFills.reduce((sum, f) => sum + f.quantity, 0);
  
  const netQuantity = totalBuyQuantity - totalSellQuantity;
  const totalOpenQuantity = Math.abs(netQuantity);
  const quantityToClose = (totalOpenQuantity * closePercentage) / 100;
  const closingSide = netQuantity > 0 ? 'sell' : 'buy'; // If net long, sell to close; if net short, buy to close

  if (totalOpenQuantity <= 0) {
    throw new Error('No open quantity to close');
  }

  // Validate minimum closing quantity (e.g., 0.01 shares)
  if (quantityToClose < 0.01) {
    throw new Error('Closing quantity too small. Minimum is 0.01 units.');
  }

  // Calculate closing fees (using account commission settings)
  const account = group.accounts;
  const positionValue = quantityToClose * closePrice;
  const closeCommission = account?.open_close_commission || 0.25;
  const closingFees = (positionValue * closeCommission) / 100;

  // Calculate proportional night fees for the portion being closed
  const totalPositionValue = group.operation_fills.reduce((sum, fill) => sum + (fill.quantity * fill.price), 0);
  const nightCommissionRate = group.accounts?.night_commission || 7.0;
  const nightCommissionPerDay = (totalPositionValue * nightCommissionRate) / 100 / 365;
  const totalNightFees = nightCommissionPerDay * daysHeld;
  const proportionalNightFees = (totalNightFees * closePercentage) / 100;

  // Create closing fill with proper fees
  const { error: fillError } = await supabase
    .from('operation_fills')
    .insert({
      group_id: tradeId,
      side: closingSide,
      quantity: quantityToClose,
      price: closePrice,
      fees: closingFees, // Keep for backward compatibility
      open_fee: 0,
      close_fee: closingFees,
      night_fee: proportionalNightFees,
      fee_currency: 'USD',
      leverage: 1 // Default leverage for closing
    });

  if (fillError) {
    console.error('Error creating closing fill:', fillError);
    throw fillError;
  }

  // If this is a complete close (100%), update the operation group status
  if (closePercentage >= 100) {
    // Update night fees for all existing fills in this operation
    const { error: updateNightFeesError } = await supabase
      .from('operation_fills')
      .update({
        night_fee: totalNightFees / group.operation_fills.length // Distribute night fees across all fills
      })
      .eq('group_id', tradeId);

    if (updateNightFeesError) {
      console.error('Error updating night fees:', updateNightFeesError);
      throw updateNightFeesError;
    }

    // Update operation group status to closed
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
  } else {
    // For partial closes, keep the operation group open
    // The remaining quantity will be calculated dynamically when fetching trades
    console.log(`Partially closed ${closePercentage}% of position ${tradeId}`);
  }
};

export const fetchTradeFills = async (tradeId: string): Promise<TradeFill[]> => {
  const { data, error } = await supabase
    .from('operation_fills')
    .select('*')
    .eq('group_id', tradeId)
    .order('fill_timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching trade fills:', error);
    throw error;
  }

  return data || [];
};

export const updateTradeFill = async (
  fillId: string,
  updates: {
    quantity?: number;
    price?: number;
    open_fee?: number;
    close_fee?: number;
    night_fee?: number;
    fill_timestamp?: string;
  }
): Promise<void> => {
  const { error } = await supabase
    .from('operation_fills')
    .update(updates)
    .eq('id', fillId);

  if (error) {
    console.error('Error updating fill:', error);
    throw error;
  }
};

export const deleteOperation = async (operationId: string): Promise<void> => {
  // First delete all operation fills for this group
  const { error: fillsError } = await supabase
    .from('operation_fills')
    .delete()
    .eq('group_id', operationId);

  if (fillsError) {
    console.error('Error deleting operation fills:', fillsError);
    throw fillsError;
  }

  // Then delete the operation group
  const { error: groupError } = await supabase
    .from('operation_groups')
    .delete()
    .eq('id', operationId);

  if (groupError) {
    console.error('Error deleting operation group:', groupError);
    throw groupError;
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
    currentPrice: symbol.latest_price || 0
  }));
};

// Debug function to fetch and print profiles table
export const debugFetchProfiles = async () => {
  console.log('🔍 Fetching profiles table data...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  console.log('📊 Profiles table data:');
  console.table(data);
  
  if (data.length === 0) {
    console.log('⚠️ No profiles found in the table');
  } else {
    console.log(`✅ Found ${data.length} profile(s)`);
    data.forEach((profile, index) => {
      console.log(`Profile ${index + 1}:`, {
        id: profile.id,
        base_currency: profile.base_currency,
        risk_per_trade: profile.risk_per_trade,
        default_leverage: profile.default_leverage,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      });
    });
  }
  
  return data;
};

// User profile operations
export const fetchUserProfile = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }

  if (!data) {
    // No data returned, return defaults
    return {
      base_currency: 'USD',
      risk_per_trade: 2.5,
      default_leverage: 5
    };
  }

  return {
    base_currency: data.base_currency,
    risk_per_trade: data.risk_per_trade,
    default_leverage: data.default_leverage
  };
};

export const updateUserProfile = async (profileData: {
  base_currency?: string;
  risk_per_trade?: number;
  default_leverage?: number;
}) => {
  // First try to update existing profile
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .maybeSingle();

  if (existingProfile) {
    // Update existing profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        base_currency: profileData.base_currency,
        risk_per_trade: profileData.risk_per_trade,
        default_leverage: profileData.default_leverage
      })
      .eq('id', existingProfile.id)
      .select();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    return data[0];
  } else {
    // Create new profile if none exists
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        base_currency: profileData.base_currency || 'USD',
        risk_per_trade: profileData.risk_per_trade || 2.5,
        default_leverage: profileData.default_leverage || 5
      })
      .select();

    if (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }

    return data[0];
  }
};

export const createUserProfile = async (profileData: {
  base_currency?: string;
  risk_per_trade?: number;
  default_leverage?: number;
}) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      base_currency: profileData.base_currency || 'USD', 
      risk_per_trade: profileData.risk_per_trade || 2.5,
      default_leverage: profileData.default_leverage || 5
    })
    .select();

  if (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }

  return data[0];
};
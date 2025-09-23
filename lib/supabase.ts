import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      symbols: {
        Row: {
          id: string;
          ticker: string;
          exchange: string | null;
          name: string | null;
          asset_type: string | null;
          currency: string;
          last_price: number | null;
          price_updated_at: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          ticker: string;
          exchange?: string | null;
          name?: string | null;
          asset_type?: string | null;
          currency?: string;
          last_price?: number | null;
          price_updated_at?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          ticker?: string;
          exchange?: string | null;
          name?: string | null;
          asset_type?: string | null;
          currency?: string;
          last_price?: number | null;
          price_updated_at?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          base_currency: string;
          risk_per_trade: number | null;
          default_leverage: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          base_currency?: string;
          risk_per_trade?: number | null;
          default_leverage?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          base_currency?: string;
          risk_per_trade?: number | null;
          default_leverage?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          starting_balance: number;
          current_balance: number | null;
          broker: string | null;
          account_type: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          starting_balance: number;
          current_balance?: number | null;
          broker?: string | null;
          account_type?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          open_close_commission?: number | null;
          night_commission?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          starting_balance?: number;
          current_balance?: number | null;
          broker?: string | null;
          account_type?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          open_close_commission?: number | null;
          night_commission?: number | null;
        };
      };
      operation_groups: {
        Row: {
          id: string;
          user_id: string | null;
          account_id: string | null;
          symbol_id: string | null;
          status: string;
          strategy: string | null;
          notes: string | null;
          created_at: string | null;
          closed_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          account_id?: string | null;
          symbol_id?: string | null;
          status?: string;
          strategy?: string | null;
          notes?: string | null;
          created_at?: string | null;
          closed_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          account_id?: string | null;
          symbol_id?: string | null;
          status?: string;
          strategy?: string | null;
          notes?: string | null;
          created_at?: string | null;
          closed_at?: string | null;
          updated_at?: string | null;
        };
      };
      operation_fills: {
        Row: {
          id: string;
          group_id: string | null;
          side: string;
          quantity: number;
          price: number;
          fees: number | null;
          leverage: number | null;
          fill_timestamp: string | null;
          note: string | null;
          created_at: string | null;
          open_fee: number | null;
          close_fee: number | null;
          night_fee: number | null;
          fee_currency: string | null;
        };
        Insert: {
          id?: string;
          group_id?: string | null;
          side: string;
          quantity: number;
          price: number;
          fees?: number | null;
          leverage?: number | null;
          fill_timestamp?: string | null;
          note?: string | null;
          created_at?: string | null;
          open_fee?: number | null;
          close_fee?: number | null;
          night_fee?: number | null;
          fee_currency?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string | null;
          side?: string;
          quantity?: number;
          price?: number;
          fees?: number | null;
          leverage?: number | null;
          fill_timestamp?: string | null;
          note?: string | null;
          created_at?: string | null;
          open_fee?: number | null;
          close_fee?: number | null;
          night_fee?: number | null;
          fee_currency?: string | null;
        };
      };
      intelligence_data: {
        Row: {
          id: string;
          symbol_id: string | null;
          data_type: string;
          data: any;
          source: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          symbol_id?: string | null;
          data_type: string;
          data: any;
          source?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          symbol_id?: string | null;
          data_type?: string;
          data?: any;
          source?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      news_items: {
        Row: {
          id: string;
          symbol_id: string | null;
          headline: string;
          summary: string | null;
          content: string | null;
          source: string | null;
          author: string | null;
          published_at: string | null;
          url: string | null;
          sentiment: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          symbol_id?: string | null;
          headline: string;
          summary?: string | null;
          content?: string | null;
          source?: string | null;
          author?: string | null;
          published_at?: string | null;
          url?: string | null;
          sentiment?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          symbol_id?: string | null;
          headline?: string;
          summary?: string | null;
          content?: string | null;
          source?: string | null;
          author?: string | null;
          published_at?: string | null;
          url?: string | null;
          sentiment?: string | null;
          created_at?: string | null;
        };
      };
    };
  };
}
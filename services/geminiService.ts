import type { StockAnalysis } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const fetchStockAnalysis = async (ticker: string): Promise<StockAnalysis> => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase configuration is missing.");
  }

  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/stock-analysis`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    const analysis = await response.json();
    return analysis as StockAnalysis;

  } catch (error) {
    console.error("Error fetching stock analysis:", error);
    throw new Error("Failed to generate stock analysis. Please try again.");
  }
};

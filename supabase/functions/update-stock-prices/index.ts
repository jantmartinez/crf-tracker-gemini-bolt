import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Symbol {
  id: string;
  ticker: string;
  latest_price: number | null;
}

interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');

    if (!finnhubApiKey) {
      throw new Error('FINNHUB_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the triggering method from request body or default to 'manual'
    const { triggered_by = 'manual' } = await req.json().catch(() => ({ triggered_by: 'manual' }));

    // Fetch all active symbols
    const { data: symbols, error: symbolsError } = await supabase
      .from('symbols')
      .select('id, ticker, latest_price')
      .eq('is_active', true);

    if (symbolsError) {
      throw new Error(`Failed to fetch symbols: ${symbolsError.message}`);
    }

    if (!symbols || symbols.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active symbols found', updated: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Update prices for each symbol
    for (const symbol of symbols as Symbol[]) {
      try {
        // Fetch quote from Finnhub
        const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol.ticker}&token=${finnhubApiKey}`;
        const response = await fetch(finnhubUrl);
        
        if (!response.ok) {
          throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
        }

        const quote: FinnhubQuote = await response.json();
        
        // Check if we got valid data (current price > 0)
        if (!quote.c || quote.c <= 0) {
          throw new Error(`Invalid price data received for ${symbol.ticker}`);
        }

        const oldPrice = symbol.latest_price;
        const newPrice = quote.c;

        // Update the symbol's latest price
        const { error: updateError } = await supabase
          .from('symbols')
          .update({ latest_price: newPrice, updated_at: new Date().toISOString() })
          .eq('id', symbol.id);

        if (updateError) {
          throw new Error(`Failed to update price: ${updateError.message}`);
        }

        // Log the successful update
        await supabase.from('price_update_log').insert({
          symbol_id: symbol.id,
          old_price: oldPrice,
          new_price: newPrice,
          source: 'finnhub_api',
          triggered_by,
          status: 'success',
        });

        successCount++;
        results.push({
          ticker: symbol.ticker,
          oldPrice,
          newPrice,
          change: newPrice - (oldPrice || 0),
          status: 'success',
        });
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Log the failed update
        await supabase.from('price_update_log').insert({
          symbol_id: symbol.id,
          old_price: symbol.latest_price,
          new_price: null,
          source: 'finnhub_api',
          triggered_by,
          status: 'failed',
          error_message: errorMessage,
        });

        results.push({
          ticker: symbol.ticker,
          status: 'failed',
          error: errorMessage,
        });
      }

      // Add a small delay to avoid rate limiting (Finnhub free tier: 60 calls/minute)
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    return new Response(
      JSON.stringify({
        message: 'Price update completed',
        summary: {
          total: symbols.length,
          success: successCount,
          failed: failCount,
        },
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in update-stock-prices function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
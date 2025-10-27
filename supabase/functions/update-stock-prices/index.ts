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
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
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

    console.log('Edge Function Environment Check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasFinnhubKey: !!finnhubApiKey,
    });

    if (!finnhubApiKey || finnhubApiKey === 'your_finnhub_api_key_here') {
      return new Response(
        JSON.stringify({
          error: 'FINNHUB_API_KEY not configured. Please add your Finnhub API key to the environment variables.',
          instruction: 'Get a free API key from https://finnhub.io/ and configure it in your Supabase project settings.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { triggered_by = 'manual' } = await req.json().catch(() => ({ triggered_by: 'manual' }));

    const { data: symbols, error: symbolsError } = await supabase
      .from('symbols')
      .select('id, ticker, latest_price')
      .eq('is_active', true);

    if (symbolsError) {
      throw new Error(`Failed to fetch symbols: ${symbolsError.message}`);
    }

    if (!symbols || symbols.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No active symbols found', 
          summary: { total: 0, success: 0, failed: 0 },
          results: [] 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Updating prices for ${symbols.length} symbols`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const symbol of symbols as Symbol[]) {
      try {
        const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol.ticker}&token=${finnhubApiKey}`;
        console.log(`Fetching price for ${symbol.ticker}`);
        
        const response = await fetch(finnhubUrl);
        
        if (!response.ok) {
          throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
        }

        const quote: FinnhubQuote = await response.json();
        
        if (!quote.c || quote.c <= 0) {
          throw new Error(`Invalid price data received for ${symbol.ticker}`);
        }

        const oldPrice = symbol.latest_price;
        const newPrice = quote.c;

        const { error: updateError } = await supabase
          .from('symbols')
          .update({ latest_price: newPrice, updated_at: new Date().toISOString() })
          .eq('id', symbol.id);

        if (updateError) {
          throw new Error(`Failed to update price: ${updateError.message}`);
        }

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

        console.log(`✓ Updated ${symbol.ticker}: $${newPrice}`);
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(`✗ Failed to update ${symbol.ticker}:`, errorMessage);
        
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

      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    console.log(`Price update completed: ${successCount} succeeded, ${failCount} failed`);

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
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
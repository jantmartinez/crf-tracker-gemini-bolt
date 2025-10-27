import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface StockAnalysisRequest {
  ticker: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const { ticker }: StockAnalysisRequest = await req.json();

    if (!ticker) {
      return new Response(
        JSON.stringify({ error: 'Ticker symbol is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stockAnalysisSchema = {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        companyName: { type: 'string' },
        exchange: { type: 'string' },
        currentPrice: { type: 'number' },
        analystConsensus: {
          type: 'object',
          properties: {
            rating: { 
              type: 'string',
              enum: ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']
            },
            priceTargets: {
              type: 'object',
              properties: {
                high: { type: 'number' },
                mean: { type: 'number' },
                low: { type: 'number' },
              },
              required: ['high', 'mean', 'low'],
            },
          },
          required: ['rating', 'priceTargets'],
        },
        technicals: {
          type: 'object',
          properties: {
            rsi14: { type: 'number' },
            sma20: { type: 'number' },
            sma50: { type: 'number' },
            sma200: { type: 'number' },
            atr: { type: 'number' },
          },
          required: ['rsi14', 'sma20', 'sma50', 'sma200', 'atr'],
        },
        news: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              source: { type: 'string' },
              timestamp: { type: 'string' },
            },
            required: ['title', 'source', 'timestamp'],
          },
        },
      },
      required: ['symbol', 'companyName', 'exchange', 'currentPrice', 'analystConsensus', 'technicals', 'news'],
    };

    const prompt = `Generate a real stock analysis for the ticker symbol: ${ticker.toUpperCase()}. The company should be plausible for the given ticker. Provide a comprehensive analysis including company info, analyst consensus, technical indicators, and recent news articles. Format the entire response as a single JSON object conforming to the provided schema. Ensure the news timestamps are recent and realistic.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: stockAnalysisSchema,
            temperature: 0.5,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API returned ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error('No analysis text returned from Gemini');
    }

    const analysis = JSON.parse(analysisText);

    return new Response(
      JSON.stringify(analysis),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in stock-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate stock analysis'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import { GoogleGenAI, Type } from "@google/genai";
import type { StockAnalysis } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const stockAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    symbol: { type: Type.STRING },
    companyName: { type: Type.STRING },
    exchange: { type: Type.STRING },
    currentPrice: { type: Type.NUMBER },
    analystConsensus: {
      type: Type.OBJECT,
      properties: {
        rating: { 
          type: Type.STRING,
          enum: ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']
        },
        priceTargets: {
          type: Type.OBJECT,
          properties: {
            high: { type: Type.NUMBER },
            mean: { type: Type.NUMBER },
            low: { type: Type.NUMBER },
          },
          required: ['high', 'mean', 'low'],
        },
      },
      required: ['rating', 'priceTargets'],
    },
    technicals: {
      type: Type.OBJECT,
      properties: {
        rsi14: { type: Type.NUMBER },
        sma20: { type: Type.NUMBER },
        sma50: { type: Type.NUMBER },
        sma200: { type: Type.NUMBER },
        atr: { type: Type.NUMBER },
      },
      required: ['rsi14', 'sma20', 'sma50', 'sma200', 'atr'],
    },
    news: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          source: { type: Type.STRING },
          timestamp: { type: Type.STRING, description: "An ISO 8601 date string" },
        },
        required: ['title', 'source', 'timestamp'],
      },
    },
  },
  required: ['symbol', 'companyName', 'exchange', 'currentPrice', 'analystConsensus', 'technicals', 'news'],
};

export const fetchStockAnalysis = async (ticker: string): Promise<StockAnalysis> => {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }
  
  try {
    const prompt = `Generate a real stock analysis for the ticker symbol: ${ticker.toUpperCase()}. The company should be plausible for the given ticker. Provide a comprehensive analysis including company info, analyst consensus, technical indicators, and recent news articles. Format the entire response as a single JSON object conforming to the provided schema. Ensure the news timestamps are recent and realistic.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: stockAnalysisSchema,
        temperature: 0.5,
      },
    });

    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText);
    return parsedData as StockAnalysis;
    
  } catch (error) {
    console.error("Error fetching stock analysis from Gemini API:", error);
    throw new Error("Failed to generate stock analysis. Please check your API key and try again.");
  }
};

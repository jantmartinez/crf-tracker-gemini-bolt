<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CFD Tracker Pro

A professional CFD trading tracker with real-time analytics, AI-powered stock intelligence, and comprehensive performance metrics.

## Features

- Real-time stock price updates via Finnhub API
- AI-powered stock analysis using Google Gemini
- Comprehensive trading analytics and calendar views
- Multi-account management
- Position tracking with P&L calculations
- Advanced reporting and performance metrics

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `FINNHUB_API_KEY`: Your Finnhub API key for stock prices

3. Configure Supabase Edge Function secrets:
   - Set `GEMINI_API_KEY` in your Supabase project settings under Edge Functions secrets
   - This is required for the AI stock analysis feature

4. Run the app:
   ```bash
   npm run dev
   ```

## Security

API keys are securely stored and never exposed in client-side code. The Gemini API is accessed through a Supabase Edge Function to keep credentials secure.

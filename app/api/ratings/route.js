import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// In-memory store as fallback when Supabase unavailable
const memStore = {};

export async function GET() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('ratings').select('ticker,rating,analysis');
      if (!error && data) {
        const out = {};
        data.forEach(r => { out[r.ticker] = { rating: r.rating, text: r.analysis }; });
        return NextResponse.json(out);
      }
    } catch (_) {}
  }
  // Fallback to in-memory
  return NextResponse.json(memStore);
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }); }
  const { ticker, rating, text } = body;
  if (!ticker || !rating) return NextResponse.json({ error: 'ticker and rating required' }, { status: 400 });

  // Always store in memory
  memStore[ticker] = { rating, text: text || '' };

  if (supabase) {
    try {
      await supabase.from('ratings').upsert({ ticker, rating, analysis: text || '' }, { onConflict: 'ticker' });
    } catch (_) {}
  }

  return NextResponse.json({ ok: true });
}

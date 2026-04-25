import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) return NextResponse.json({});

  const { data, error } = await supabase
    .from('ratings')
    .select('ticker, rating, confidence, analysis_text, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const map = {};
  for (const row of data) {
    if (!map[row.ticker]) map[row.ticker] = row.rating;
  }
  return NextResponse.json(map);
}

export async function POST(req) {
  const { ticker, rating, confidence, analysis_text } = await req.json();
  if (!ticker || !rating) return NextResponse.json({ error: 'ticker e rating obrigatorios' }, { status: 400 });

  if (!supabase) return NextResponse.json({ ok: true, note: 'supabase not configured' });

  const { error } = await supabase.from('ratings').upsert(
    { ticker, rating, confidence: confidence || null, analysis_text: analysis_text || null },
    { onConflict: 'ticker' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

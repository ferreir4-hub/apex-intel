import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const key = process.env.FINNHUB_API_KEY;
  if (!key) return NextResponse.json({ error: 'FINNHUB_API_KEY not set' }, { status: 500 });

  try {
    const resp = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`
    );
    if (!resp.ok) return NextResponse.json({ error: 'Finnhub error' }, { status: 502 });
    const data = await resp.json();
    return NextResponse.json({
      symbol,
      price:     data.c  ?? null,
      change:    data.d  ?? null,
      changePct: data.dp ?? null,
      prevClose: data.pc ?? null,
      high:      data.h  ?? null,
      low:       data.l  ?? null,
      open:      data.o  ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
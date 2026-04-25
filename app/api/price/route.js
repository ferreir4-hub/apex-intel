import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

  const key = process.env.FINNHUB_API_KEY;
  if (!key) return NextResponse.json({ price: null, note: 'no api key' });

  try {
    const resp = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${key}`
    );
    const data = await resp.json();
    // data.c = current price, data.pc = previous close
    if (!data.c) return NextResponse.json({ price: null });
    return NextResponse.json({ price: data.c, change: data.d, changePct: data.dp, prevClose: data.pc });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

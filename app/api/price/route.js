import { NextResponse } from 'next/server';
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  try {
    const resp = await fetch(`https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${process.env.POLYGON_API_KEY}`);
    const data = await resp.json();
    return NextResponse.json({ symbol, price: data?.results?.p ?? null });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

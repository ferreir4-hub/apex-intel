import { NextResponse } from 'next/server';
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  const today = new Date().toISOString().split('T')[0];
  const week = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  try {
    const resp = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${week}&to=${today}&token=${process.env.FINNHUB_API_KEY}`);
    const data = await resp.json();
    return NextResponse.json(Array.isArray(data) ? data.slice(0, 5) : []);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

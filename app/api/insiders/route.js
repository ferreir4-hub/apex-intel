import { NextResponse } from 'next/server';
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  try {
    const resp = await fetch(`https://financialmodelingprep.com/api/v4/insider-trading?symbol=${symbol}&limit=5&apikey=${process.env.FMP_API_KEY}`);
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

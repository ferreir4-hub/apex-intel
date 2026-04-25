import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const fmpKey = process.env.FMP_API_KEY;
  if (fmpKey) {
    try {
      const resp = await fetch(
        `https://financialmodelingprep.com/api/v4/insider-trading?symbol=${symbol}&limit=8&apikey=${fmpKey}`
      );
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          return NextResponse.json(data.map(d => ({
            ticker: symbol,
            name: d.reportingName || d.reportingCik || 'N/A',
            position: d.typeOfOwner || 'Insider',
            type: d.acquistionOrDisposition === 'A' ? 'buy' : 'sell',
            value: d.securitiesTransacted && d.price ? Math.round(d.price * d.securitiesTransacted) : (d.value || 0),
            shares: d.securitiesTransacted || 0,
            date: (d.transactionDate || d.filingDate || '').split('T')[0],
          })));
        }
      }
    } catch (_) {}
  }

  const finnKey = process.env.FINNHUB_API_KEY;
  if (!finnKey) return NextResponse.json([]);
  try {
    const from = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const to   = new Date().toISOString().split('T')[0];
    const resp = await fetch(
      `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${symbol}&from=${from}&to=${to}&token=${finnKey}`
    );
    if (!resp.ok) return NextResponse.json([]);
    const data = await resp.json();
    const txs  = data?.data || [];
    return NextResponse.json(
      txs.slice(0, 8).map(d => ({
        ticker: symbol,
        name: d.name || 'N/A',
        position: d.position || 'Insider',
        type: (d.change || 0) > 0 ? 'buy' : 'sell',
        value: Math.abs(Math.round((d.change || 0) * (d.transactionPrice || 0))),
        shares: Math.abs(d.change || 0),
        date: d.transactionDate || '',
      }))
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

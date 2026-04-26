import { NextResponse } from 'next/server';

// Minimum thresholds to filter noise
const MIN_VALUE = 25000;   // USD - ignores small transactions
const MIN_SHARES = 500;    // shares - ignores trivial grants

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const fmpKey = process.env.FMP_API_KEY;
  if (fmpKey) {
    try {
      const resp = await fetch(
        'https://financialmodelingprep.com/api/v4/insider-trading?symbol=' + symbol + '&limit=20&apikey=' + fmpKey
      );
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          const filtered = data
            .map(d => {
              const shares = Math.abs(d.securitiesTransacted || 0);
              const price = d.price || 0;
              const value = price > 0 && shares > 0 ? Math.round(price * shares) : Math.abs(d.value || 0);
              return {
                ticker: symbol,
                name: d.reportingName || d.reportingCik || 'N/A',
                position: d.typeOfOwner || 'Insider',
                type: d.acquistionOrDisposition === 'A' ? 'buy' : 'sell',
                value,
                shares,
                price: price > 0 ? price : null,
                date: (d.transactionDate || d.filingDate || '').split('T')[0],
              };
            })
            .filter(d => d.value >= MIN_VALUE || d.shares >= MIN_SHARES)
            .sort((a,b) => b.value - a.value)
            .slice(0, 10);
          if (filtered.length > 0) return NextResponse.json(filtered);
        }
      }
    } catch (_) {}
  }

  // Finnhub fallback
  const finnKey = process.env.FINNHUB_API_KEY;
  if (!finnKey) return NextResponse.json([]);
  try {
    const from = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];
    const to   = new Date().toISOString().split('T')[0];
    const resp = await fetch(
      'https://finnhub.io/api/v1/stock/insider-transactions?symbol=' + symbol + '&from=' + from + '&to=' + to + '&token=' + finnKey
    );
    if (!resp.ok) return NextResponse.json([]);
    const data = await resp.json();
    const txs  = data?.data || [];
    const filtered = txs
      .map(d => {
        const shares = Math.abs(d.change || 0);
        const price = d.transactionPrice || 0;
        const value = price > 0 && shares > 0 ? Math.round(price * shares) : 0;
        return {
          ticker: symbol,
          name: d.name || 'N/A',
          position: d.position || 'Insider',
          type: (d.change || 0) > 0 ? 'buy' : 'sell',
          value,
          shares,
          price: price > 0 ? price : null,
          date: d.transactionDate || '',
        };
      })
      .filter(d => (d.value >= MIN_VALUE || d.shares >= MIN_SHARES) && d.shares > 0)
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);
    return NextResponse.json(filtered);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

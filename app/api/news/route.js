import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key     = process.env.FINNHUB_API_KEY;
  const today   = new Date().toISOString().split('T')[0];
  const twoWeeks = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

  if (!key) return NextResponse.json({ error: 'FINNHUB_API_KEY not set' }, { status: 500 });

  const tickersParam = searchParams.get('tickers');
  if (tickersParam) {
    const tickers = tickersParam.split(',').slice(0, 15);
    const all = [];
    await Promise.allSettled(
      tickers.map(async (symbol) => {
        try {
          const url = 'https://finnhub.io/api/v1/company-news?symbol=' + symbol + '&from=' + twoWeeks + '&to=' + today + '&token=' + key;
          const r = await fetch(url);
          if (!r.ok) return;
          const data = await r.json();
          if (Array.isArray(data)) {
            data.slice(0, 3).forEach(n => all.push({ ...n, ticker: symbol }));
          }
        } catch (_) {}
      })
    );
    const top5 = all
      .filter(n => n.headline && n.datetime)
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 5);
    return NextResponse.json(top5);
  }

  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol or tickers required' }, { status: 400 });

  try {
    const url = 'https://finnhub.io/api/v1/company-news?symbol=' + symbol + '&from=' + twoWeeks + '&to=' + today + '&token=' + key;
    const resp = await fetch(url);
    const data = await resp.json();
    return NextResponse.json(Array.isArray(data) ? data.slice(0, 5) : []);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

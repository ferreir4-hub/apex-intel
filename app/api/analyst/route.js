import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const key = process.env.FINNHUB_API_KEY;
  if (!key) return NextResponse.json({ error: 'FINNHUB_API_KEY not set' }, { status: 500 });

  try {
    const [recResp, priceResp] = await Promise.all([
      fetch('https://finnhub.io/api/v1/stock/recommendation?symbol=' + symbol + '&token=' + key),
      fetch('https://finnhub.io/api/v1/stock/price-target?symbol=' + symbol + '&token=' + key),
    ]);

    const recs = recResp.ok ? await recResp.json() : [];
    const priceTarget = priceResp.ok ? await priceResp.json() : {};

    const latest = Array.isArray(recs) && recs.length > 0 ? recs[0] : null;
    const total = latest ? (latest.strongBuy||0)+(latest.buy||0)+(latest.hold||0)+(latest.sell||0)+(latest.strongSell||0) : 0;
    const score = total > 0 ? ((latest.strongBuy||0)*2 + (latest.buy||0) - (latest.sell||0) - (latest.strongSell||0)*2) / total : 0;
    const consensus = score > 1.2 ? 'STRONG_BUY' : score > 0.4 ? 'BUY' : score > -0.4 ? 'HOLD' : score > -1.2 ? 'SELL' : 'STRONG_SELL';

    return NextResponse.json({
      symbol,
      period: latest?.period || null,
      strongBuy: latest?.strongBuy || 0,
      buy: latest?.buy || 0,
      hold: latest?.hold || 0,
      sell: latest?.sell || 0,
      strongSell: latest?.strongSell || 0,
      total,
      consensus,
      priceTargetHigh: priceTarget.targetHigh || null,
      priceTargetLow: priceTarget.targetLow || null,
      priceTargetMean: priceTarget.targetMean || null,
      priceTargetMedian: priceTarget.targetMedian || null,
      lastUpdated: priceTarget.lastUpdated || null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

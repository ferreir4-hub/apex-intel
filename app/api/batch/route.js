import { NextResponse } from 'next/server';

const MODELS = [
  'google/gemma-3-27b-it:free',
  'openai/gpt-oss-20b:free',
  'google/gemma-4-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

export async function POST(req) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }); }
  const { stock } = body;
  if (!stock || !stock.t) return NextResponse.json({ error: 'stock required' }, { status: 400 });

  const prompt = `Analisa este stock de forma objectiva e concisa (max 3 frases):
Ticker: ${stock.t} | Nome: ${stock.n}
Valor actual: ${stock.v} EUR | P&L: ${stock.pnl > 0 ? '+' : ''}${stock.pnl} EUR (${stock.pp > 0 ? '+' : ''}${stock.pp}%)
Peso no portfolio: ${stock.w}% | Sector: ${stock.s}

Responde APENAS neste formato JSON exacto (sem markdown, sem codigo, so JSON):
{"rating":"STRONG_BUY","text":"Analise em portugues de portugal aqui."}

Rating deve ser exactamente um de: STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL`;

  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + key,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://apex-intel-chi.vercel.app',
          'X-Title': 'Apex Intel'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content || '';
      if (!raw) continue;
      // Parse JSON from response
      const match = raw.match(/\{[^{}]*"rating"[^{}]*\}/s);
      if (!match) continue;
      const parsed = JSON.parse(match[0]);
      const validRatings = ['STRONG_BUY','BUY','HOLD','SELL','STRONG_SELL'];
      if (!validRatings.includes(parsed.rating)) continue;
      return NextResponse.json({ rating: parsed.rating, text: parsed.text || '', model });
    } catch (_) { continue; }
  }

  return NextResponse.json({ error: 'All models failed or rate limited. Tenta novamente.' }, { status: 503 });
}

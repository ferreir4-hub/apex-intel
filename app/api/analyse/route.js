import { NextResponse } from 'next/server';

const SYSTEM = `És APEX, analista de Wall Street de elite, IQ 175. Responde sempre em português de Portugal. Directo, sem disclaimers. Data: Abril 2026.

RATING SCALE: Strong Buy / Buy / Hold / Sell / Strong Sell

Formato OBRIGATÓRIO:
RATING: [um dos 5 ratings]
CONFIDENCE: [High/Medium/Low]

TESE BULL:
- ponto

TESE BEAR:
- ponto

CATALISADORES:
- ponto

RISCO PRINCIPAL:
texto 1-2 frases

VEREDICTO:
texto 2-3 frases com acção específica`;

export async function POST(req) {
  try {
    const { stock, history } = await req.json();
    const first = `Analisa: ${stock.t} – ${stock.n}\nSector: ${stock.s}\nValor: €${stock.v.toFixed(2)}\nP&L: ${stock.pnl >= 0 ? '+' : ''}€${Math.abs(stock.pnl).toFixed(2)} (${stock.pp >= 0 ? '+' : ''}${stock.pp.toFixed(2)}%)\nPeso portfolio: ${stock.w.toFixed(2)}%`;
    const msgs = history?.length ? history : [{ role: 'user', content: first }];
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: SYSTEM, messages: msgs }),
    });
    if (!resp.ok) { const e = await resp.json().catch(()=>({})); return NextResponse.json({ error: e.error?.message || `HTTP ${resp.status}` }, { status: resp.status }); }
    const data = await resp.json();
    const text = data.content[0].text;
    const m = text.match(/RATING:\s*(Strong Buy|Buy|Hold|Sell|Strong Sell)/i);
    const ALL = ['Strong Buy','Buy','Hold','Sell','Strong Sell'];
    const rating = m ? ALL.find(r => r.toLowerCase() === m[1].toLowerCase()) : null;
    return NextResponse.json({ text, rating, conv: [...msgs, { role: 'assistant', content: text }] });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

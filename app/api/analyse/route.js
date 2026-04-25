import { NextResponse } from 'next/server';

const SYSTEM = `És APEX, analista de Wall Street de elite, IQ 175. Responde sempre em português de Portugal. Directo, sem disclaimers. Data: Abril 2026.

RATING SCALE: Strong Buy / Buy / Hold / Sell / Strong Sell

Formato OBRIGATÓRIO:
RATING: [um dos 5 ratings]
CONFIDENCE: [High/Medium/Low]

TESE BULL:
- ponto
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
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://apex-intel-chi.vercel.app', 'X-Title': 'Apex Intel' },
      body: JSON.stringify({ model: 'deepseek/deepseek-chat:free', max_tokens: 1000, messages: [{ role: 'system', content: SYSTEM }, ...msgs] }),
    });
    if (!resp.ok) { const err = await resp.json().catch(() => ({})); return NextResponse.json({ error: err.error?.message || `HTTP ${resp.status}` }, { status: resp.status }); }
    const data = await resp.json();
    const text = data.choices[0].message.content;
    const m = text.match(/RATING:\s*(Strong Buy|Buy|Hold|Sell|Strong Sell)/i);
    const found = m ? m[1] : null;
    const ALL = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
    const rating = found ? ALL.find(r => r.toLowerCase() === found.toLowerCase()) : null;
    const newConv = [...msgs, { role: 'assistant', content: text }];
    return NextResponse.json({ text, rating, conv: newConv });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
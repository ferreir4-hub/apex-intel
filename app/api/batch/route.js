import { NextResponse } from 'next/server';

const MODELS = [
  'google/gemma-3-27b-it:free',
  'openai/gpt-oss-20b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-12b-it:free',
];

export async function POST(req) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }); }
  const { stock } = body;
  if (!stock || !stock.t) return NextResponse.json({ error: 'stock required' }, { status: 400 });

  // Fetch analyst recommendations from Finnhub to enrich context
  let analystContext = '';
  const finnKey = process.env.FINNHUB_API_KEY;
  if (finnKey) {
    try {
      const r = await fetch('https://finnhub.io/api/v1/stock/recommendation?symbol=' + stock.t + '&token=' + finnKey);
      if (r.ok) {
        const recs = await r.json();
        if (Array.isArray(recs) && recs.length > 0) {
          const latest = recs[0];
          analystContext = 'Consensus analistas Wall Street (periodo ' + (latest.period||'recente') + '): ' +
            'Strong Buy=' + (latest.strongBuy||0) + ' Buy=' + (latest.buy||0) +
            ' Hold=' + (latest.hold||0) + ' Sell=' + (latest.sell||0) +
            ' Strong Sell=' + (latest.strongSell||0) + '.';
        }
      }
    } catch (_) {}
  }

  // Determine performance tier
  const perfTier = stock.pp > 100 ? 'excepcional (>100%)' :
    stock.pp > 50 ? 'muito forte (>50%)' :
    stock.pp > 20 ? 'positivo (>20%)' :
    stock.pp > 0 ? 'ligeiramente positivo' :
    stock.pp > -20 ? 'ligeiramente negativo' : 'fraco (<-20%)';

  const weightRisk = stock.w > 30 ? 'CONCENTRACAO CRITICA - peso de ' + stock.w.toFixed(1) + '% e excessivo' :
    stock.w > 15 ? 'peso elevado (' + stock.w.toFixed(1) + '%), monitorizar' :
    stock.w < 1 ? 'posicao pequena (' + stock.w.toFixed(1) + '%), pouco impacto' :
    'peso adequado (' + stock.w.toFixed(1) + '%)';

  const prompt = `Actua como um analista de investimentos senior com 20 anos de experiencia em mercados globais. A tua tarefa e avaliar este stock com rigor e objectividade maxima.

DADOS DO STOCK:
- Ticker: ${stock.t} | Empresa: ${stock.n} | Sector: ${stock.s || 'N/A'}
- Valor actual na carteira: EUR ${(stock.v||0).toFixed(2)}
- P&L: ${(stock.pnl||0) >= 0 ? '+' : ''}EUR ${(stock.pnl||0).toFixed(2)} (${(stock.pp||0) >= 0 ? '+' : ''}${(stock.pp||0).toFixed(1)}%) - Performance: ${perfTier}
- Peso no portfolio: ${weightRisk}
${analystContext ? '- ' + analystContext : ''}

INSTRUCOES DE ANALISE (segue EXACTAMENTE esta ordem de raciocinio):

1. MOMENTUM TECNICO: Com base no P&L e performance %, o stock esta em tendencia ascendente, lateral ou descendente? Ha sinais de reversao?

2. FUNDAMENTAIS DO SECTOR: O sector ${stock.s||''} esta em fase de crescimento, maturidade ou declinio no ciclo actual (2025-2026)? Como se posiciona ${stock.t} vs peers?

3. RISCO DE PORTFOLIO: O peso actual (${(stock.w||0).toFixed(1)}%) e adequado? Ha risco de concentracao excessiva?

4. CATALISTAS E RISCOS: Quais os principais catalistas positivos e riscos downside para ${stock.t} nos proximos 6-12 meses?

5. VEREDICTO FINAL: Com base nos 4 pontos anteriores e no consensus dos analistas (se disponivel), qual o rating mais adequado?

REGRAS:
- Responde EXCLUSIVAMENTE em JSON valido sem markdown
- O campo "text" deve ter 2-3 frases em portugues de portugal, directas e sem eufemismos
- O rating deve reflectir genuinamente o potencial de valorizacao/desvalorizacao esperado
- STRONG_BUY: expectativa clara de valorizacao >20% nos proximos 12 meses
- BUY: expectativa de valorizacao 5-20%
- HOLD: expectativa de performance em linha com o mercado, sem catalista claro
- SELL: risco de desvalorizacao 5-20% ou melhor oportunidade noutra posicao
- STRONG_SELL: risco de desvalorizacao >20% ou deterioracao fundamental clara

FORMATO DE RESPOSTA (JSON puro, sem mais nada):
{"rating":"STRONG_BUY","text":"Analise concisa em portugues aqui."}`;

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
          max_tokens: 300,
          temperature: 0.2,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content || '';
      if (!raw) continue;
      const match = raw.match(/\{[^{}]*"rating"[^{}]*\}/s);
      if (!match) continue;
      let parsed;
      try { parsed = JSON.parse(match[0]); } catch { continue; }
      const validRatings = ['STRONG_BUY','BUY','HOLD','SELL','STRONG_SELL'];
      if (!validRatings.includes(parsed.rating)) continue;
      return NextResponse.json({ rating: parsed.rating, text: parsed.text || '', model });
    } catch (_) { continue; }
  }

  return NextResponse.json({ error: 'Todos os modelos falharam ou atingiram rate limit. Tenta novamente em 30s.' }, { status: 503 });
}

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
  const { portfolio } = body;
  if (!portfolio || !portfolio.length) return NextResponse.json({ error: 'portfolio required' }, { status: 400 });

  const tickers = portfolio.map(s => s.t).join(', ');
  const sectors = [...new Set(portfolio.map(s => s.s || 'Tech'))].join(', ');
  const totalV = portfolio.reduce((s, x) => s + (x.v || 0), 0);
  const topHoldings = [...portfolio].sort((a,b)=>(b.w||0)-(a.w||0)).slice(0,5).map(s => s.t + ' (' + (s.w||0).toFixed(1) + '%)').join(', ');
  const heavyTech = portfolio.filter(s => s.s === 'Tech').reduce((s,x) => s + (x.w||0), 0);

  const prompt = 'Actua como um gestor de portfolio senior com foco em crescimento a longo prazo. Analisa o portfolio abaixo e sugere exactamente 5 novos stocks que NAO estao ja no portfolio, que complementam e diversificam a carteira de forma estrategica.\n\nPORTFOLIO ACTUAL:\n- Tickers presentes: ' + tickers + '\n- Top holdings: ' + topHoldings + '\n- Sectores: ' + sectors + '\n- Exposicao Tech: ' + heavyTech.toFixed(0) + '%\n- Valor total: EUR ' + totalV.toFixed(0) + '\n\nCRITERIOS PARA SUGESTOES:\n1. Nao sugerir nenhum ticker ja presente no portfolio\n2. Priorizar diversificacao (sectores sub-representados, geografias diferentes)\n3. Focar em empresas com catalistas claros para os proximos 2-3 anos\n4. Mistura de risco: 2-3 growth stocks + 1-2 value/dividend stocks\n\nPara cada sugestao indica:\n- ticker: simbolo bolsa americana\n- name: nome completo empresa\n- sector: sector principal\n- thesis: tese de investimento em 2 frases em portugues de portugal, especifica e sem vaguezas\n- cagr3y: estimativa CAGR 3 anos em percentagem (numero inteiro, ex: 12)\n- rating: um de STRONG_BUY BUY HOLD\n\nResponde APENAS com JSON valido, array de 5 objectos, sem markdown:\n[{"ticker":"X","name":"X","sector":"X","thesis":"X","cagr3y":10,"rating":"BUY"},...]';

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
          max_tokens: 800,
          temperature: 0.4,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content || '';
      if (!raw) continue;
      // Extract JSON array
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) continue;
      let parsed;
      try { parsed = JSON.parse(match[0]); } catch { continue; }
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      // Validate and clean
      const valid = ['STRONG_BUY','BUY','HOLD'];
      const clean = parsed.filter(x => x.ticker && x.name && x.thesis).map(x => ({
        ticker: String(x.ticker).toUpperCase().trim(),
        name: String(x.name),
        sector: String(x.sector || 'N/A'),
        thesis: String(x.thesis),
        cagr3y: Number(x.cagr3y) || 10,
        rating: valid.includes(x.rating) ? x.rating : 'BUY',
      }));
      if (clean.length > 0) return NextResponse.json(clean.slice(0, 5));
    } catch (_) { continue; }
  }

  return NextResponse.json({ error: 'Modelos indisponiveis. Tenta novamente em 30s.' }, { status: 503 });
}

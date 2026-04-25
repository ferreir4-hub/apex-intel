import { NextResponse } from 'next/server';
const SYSTEM = `És APEX, analista de Wall Street de elite. Responde em português de Portugal. Directo, sem disclaimers.\nRATING SCALE: Strong Buy / Buy / Hold / Sell / Strong Sell\nFormato OBRIGATÓRIO:\nRATING: [um dos 5 ratings]\nCONFIDENCE: [High/Medium/Low]\nTESE BULL:\n- ponto\nTESE BEAR:\n- ponto\nCATALISADORES:\n- ponto\nRISCO PRINCIPAL:\ntexto\nVEREDICTO:\ntexto`;
export async function POST(req) {
  const { stock } = await req.json();
  const msg = `Analisa: ${stock.t} – ${stock.n}\nSector: ${stock.s}\nValor: €${stock.v.toFixed(2)}\nP&L: ${stock.pnl>=0?'+':''}€${Math.abs(stock.pnl).toFixed(2)} (${stock.pp>=0?'+':''}${stock.pp.toFixed(2)}%)\nPeso: ${stock.w.toFixed(2)}%`;
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:600,system:SYSTEM,messages:[{role:'user',content:msg}]}),
  });
  if (!resp.ok) { const e = await resp.json().catch(()=>({})); return NextResponse.json({error:e.error?.message||`HTTP ${resp.status}`},{status:resp.status}); }
  const data = await resp.json();
  const text = data.content[0].text;
  const m = text.match(/RATING:\s*(Strong Buy|Buy|Hold|Sell|Strong Sell)/i);
  const ALL = ['Strong Buy','Buy','Hold','Sell','Strong Sell'];
  const rating = m ? ALL.find(r=>r.toLowerCase()===m[1].toLowerCase()) : null;
  return NextResponse.json({ticker:stock.t,text,rating});
}

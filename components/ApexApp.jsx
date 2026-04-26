'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { PORTFOLIO_DEFAULT } from '@/lib/portfolio';

const G = {
  bg: '#FAF7F4', surf: '#FFFFFF', border: '#E8E2DA', text: '#1A1714',
  muted: '#7A6E66', accent: '#2C5F2E', accentL: '#E8F5E9',
  sell: '#C62828', sellL: '#FFEBEE', warn: '#E65100', warnL: '#FFF3E0',
  hold: '#1565C0', holdL: '#E3F2FD',
};

const RATING = {
  STRONG_BUY:  { bg: '#1B5E20', text: '#fff', label: 'Strong Buy' },
  BUY:         { bg: '#2E7D32', text: '#fff', label: 'Buy' },
  HOLD:        { bg: '#1565C0', text: '#fff', label: 'Hold' },
  SELL:        { bg: '#C62828', text: '#fff', label: 'Sell' },
  STRONG_SELL: { bg: '#7B0000', text: '#fff', label: 'Strong Sell' },
};

const fmt = (n, d=2) => typeof n === 'number' ? n.toFixed(d) : '0.00';
const fmtK = n => {
  const a = Math.abs(n||0);
  if (a >= 1e9) return (n/1e9).toFixed(1)+'B';
  if (a >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (a >= 1e3) return (n/1e3).toFixed(1)+'K';
  return (n||0).toFixed(0);
};

function Pill({ r }) {
  if (!r || !RATING[r]) return null;
  const c = RATING[r];
  return <span style={{background:c.bg,color:c.text,borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700,fontFamily:'DM Mono,monospace',letterSpacing:'.4px'}}>{c.label}</span>;
}

function Card({ children, style }) {
  return <div style={{background:G.surf,border:'1px solid '+G.border,borderRadius:14,padding:18,...style}}>{children}</div>;
}

function AnalystPanel({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/analyst?symbol='+symbol)
      .then(r=>r.json()).then(d=>{ setData(d); setLoading(false); })
      .catch(()=>setLoading(false));
  }, [symbol]);
  if (loading) return <div style={{color:G.muted,fontSize:12,padding:'8px 0'}}>A carregar analistas...</div>;
  if (!data || data.error || !data.total) return null;
  const total = data.total;
  const bars = [
    {label:'Strong Buy', n:data.strongBuy, color:'#1B5E20'},
    {label:'Buy', n:data.buy, color:'#2E7D32'},
    {label:'Hold', n:data.hold, color:'#1565C0'},
    {label:'Sell', n:data.sell, color:'#C62828'},
    {label:'Strong Sell', n:data.strongSell, color:'#7B0000'},
  ].filter(b=>b.n>0);
  return (
    <div style={{marginTop:12,padding:'12px 14px',background:G.bg,borderRadius:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:G.muted}}>Analistas Wall Street ({total})</div>
        <Pill r={data.consensus} />
      </div>
      <div style={{display:'flex',gap:4,height:8,borderRadius:99,overflow:'hidden',marginBottom:8}}>
        {bars.map(b=>(
          <div key={b.label} style={{background:b.color,width:(b.n/total*100)+'%',transition:'width .4s'}} title={b.label+': '+b.n} />
        ))}
      </div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:11,color:G.muted}}>
        {bars.map(b=><span key={b.label} style={{color:b.color,fontWeight:600}}>{b.label}: {b.n}</span>)}
      </div>
      {data.priceTargetMean && (
        <div style={{marginTop:8,fontSize:12,color:G.text}}>
          <span style={{color:G.muted}}>Price Target: </span>
          <span style={{fontFamily:'DM Mono,monospace',fontWeight:700}}>USD {fmt(data.priceTargetMean)}</span>
          <span style={{color:G.muted}}> (low {fmt(data.priceTargetLow)} / high {fmt(data.priceTargetHigh)})</span>
        </div>
      )}
    </div>
  );
}

function AnalysisPanel({ stock, onClose, onRatingSet }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  async function analyse() {
    setLoading(true); setErr(''); setResult(null);
    try {
      const res = await fetch('/api/batch', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({stock}) });
      const d = await res.json();
      if (d.error) setErr(d.error);
      else { setResult(d); if(d.rating) onRatingSet(stock.t, d.rating, d.text); }
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(26,23,20,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:G.surf,borderRadius:16,padding:28,width:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 8px 40px rgba(0,0,0,.18)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontFamily:'DM Mono,monospace',fontWeight:700,fontSize:15}}>{stock.t} <span style={{color:G.muted,fontWeight:400,fontSize:13}}>{stock.n}</span></div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:G.muted,fontSize:20}}>x</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
          {[['Valor','EUR '+fmt(stock.v)],['P&L',(stock.pnl>=0?'+':'')+'EUR '+fmt(stock.pnl)],['Variacao',(stock.pp>=0?'+':'')+fmt(stock.pp)+'%'],['Peso',fmt(stock.w)+'%']].map(([k,v])=>(
            <div key={k} style={{background:G.bg,borderRadius:8,padding:'10px 14px'}}>
              <div style={{fontSize:11,color:G.muted,marginBottom:3}}>{k}</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:14,fontWeight:600}}>{v}</div>
            </div>
          ))}
        </div>
        <AnalystPanel symbol={stock.t} />
        {!result && !loading && (
          <button onClick={analyse} style={{width:'100%',background:G.accent,color:'#fff',border:'none',borderRadius:10,padding:'12px 0',fontWeight:700,fontSize:14,cursor:'pointer',marginTop:14}}>
            Analisar com AI
          </button>
        )}
        {loading && <div style={{textAlign:'center',color:G.muted,padding:24,fontSize:13}}>A analisar... (pode demorar 10-20s)</div>}
        {err && <div style={{color:G.sell,fontSize:13,marginTop:10,padding:'10px 14px',background:G.sellL,borderRadius:8}}>{err}</div>}
        {result && (
          <div style={{marginTop:14}}>
            <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
              <Pill r={result.rating} />
              <span style={{fontSize:11,color:G.muted}}>via {(result.model||'').split('/').pop()}</span>
            </div>
            <div style={{fontSize:13,color:G.text,lineHeight:1.65,background:G.bg,borderRadius:8,padding:'12px 14px'}}>{result.text}</div>
            <button onClick={analyse} style={{marginTop:12,background:'none',border:'1px solid '+G.border,borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:12,color:G.muted}}>Reanalisar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BatchAnalyser({ portfolio, ratings, onRatingSet, onClose }) {
  const unrated = portfolio.filter(s => !ratings[s.t] || !RATING[ratings[s.t]]);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const runRef = useRef(false);

  useEffect(() => {
    if (unrated.length > 0 && !runRef.current) {
      runRef.current = true;
      runBatch();
    }
  }, []); // eslint-disable-line

  async function runBatch() {
    setRunning(true); setDone(false); setLog([]); setProgress(0);
    for (let i = 0; i < unrated.length; i++) {
      const stock = unrated[i];
      setLog(prev => [...prev, {t:stock.t, status:'loading'}]);
      try {
        const res = await fetch('/api/batch', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stock})});
        const d = await res.json();
        if (d.error) {
          setLog(prev => prev.map(x => x.t===stock.t ? {...x,status:'error',msg:d.error.slice(0,60)} : x));
        } else {
          if (d.rating) onRatingSet(stock.t, d.rating, d.text);
          setLog(prev => prev.map(x => x.t===stock.t ? {...x,status:'ok',rating:d.rating} : x));
        }
      } catch(e) {
        setLog(prev => prev.map(x => x.t===stock.t ? {...x,status:'error',msg:e.message.slice(0,60)} : x));
      }
      setProgress(i+1);
    }
    setRunning(false); setDone(true);
  }

  const total = unrated.length;
  const pct = total > 0 ? Math.round((progress/total)*100) : 100;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(26,23,20,.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:G.surf,borderRadius:16,padding:28,width:520,maxHeight:'80vh',display:'flex',flexDirection:'column',gap:16}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:14,fontWeight:600}}>Analisar Portfolio</div>
          {done && <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:G.muted,fontSize:18}}>x</button>}
        </div>
        {total === 0 ? (
          <div style={{color:G.muted,fontSize:13,textAlign:'center',padding:20}}>Todos os stocks ja foram analisados.</div>
        ) : (
          <>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:G.muted,marginBottom:6}}>
                <span>{running ? 'A analisar '+progress+'/'+total+'...' : done ? 'Concluido!' : 'A iniciar...'}</span>
                <span style={{fontFamily:'DM Mono,monospace',fontWeight:700}}>{pct}%</span>
              </div>
              <div style={{background:G.bg,borderRadius:99,height:7,overflow:'hidden'}}>
                <div style={{background:G.accent,width:pct+'%',height:'100%',borderRadius:99,transition:'width .5s ease'}} />
              </div>
            </div>
            <div style={{overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:6}}>
              {log.map(entry=>(
                <div key={entry.t} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:G.bg,borderRadius:8,fontSize:13}}>
                  <span style={{fontFamily:'DM Mono,monospace',fontWeight:700,minWidth:52}}>{entry.t}</span>
                  {entry.status==='loading' && <span style={{color:G.muted,fontSize:12}}>A analisar...</span>}
                  {entry.status==='ok' && <Pill r={entry.rating} />}
                  {entry.status==='error' && <span style={{color:G.sell,fontSize:12}}>Erro: {entry.msg}</span>}
                </div>
              ))}
            </div>
            {done && <button onClick={onClose} style={{background:G.accent,color:'#fff',border:'none',borderRadius:10,padding:'11px 0',fontWeight:700,cursor:'pointer',fontSize:14}}>Fechar</button>}
          </>
        )}
      </div>
    </div>
  );
}

function NewsPanel({ portfolio }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!portfolio || !portfolio.length) return;
    const tickers = portfolio.map(s=>s.t).slice(0,15).join(',');
    fetch('/api/news?tickers='+tickers)
      .then(r=>r.json())
      .then(d=>{ if(Array.isArray(d)) setNews(d); else setErr(d.error||'Erro'); setLoading(false); })
      .catch(e=>{ setErr(e.message); setLoading(false); });
  }, [portfolio]);

  function calcScore(n, portfolio) {
    let score = 0;
    // Relevancia ticker (40pts) - stock with higher weight = more relevant
    const stock = portfolio.find(s=>s.t===n.ticker);
    if (stock) {
      const wScore = Math.min(40, Math.round((stock.w||0) * 1.5));
      score += wScore;
    } else {
      score += 15; // unknown ticker still somewhat relevant
    }
    // Sentimento absoluto (30pts)
    const sentAbs = Math.min(1, Math.abs(n.sentiment||0));
    score += Math.round(sentAbs * 30);
    // Recencia (20pts) - newer = better
    if (n.datetime) {
      const ageHours = (Date.now() - n.datetime*1000) / 3600000;
      if (ageHours < 6) score += 20;
      else if (ageHours < 24) score += 15;
      else if (ageHours < 72) score += 10;
      else if (ageHours < 168) score += 5;
    }
    // Fonte tier (10pts)
    const tierA = ['Reuters','Bloomberg','WSJ','Financial Times','CNBC','MarketWatch'];
    const tierB = ['Seeking Alpha','Motley Fool','Barrons','Forbes','Fortune'];
    const src = n.source || '';
    if (tierA.some(s=>src.includes(s))) score += 10;
    else if (tierB.some(s=>src.includes(s))) score += 6;
    else score += 3;
    return Math.min(100, score);
  }

  if (loading) return <div style={{padding:32,textAlign:'center',color:G.muted}}>A carregar noticias...</div>;
  if (err) return <div style={{padding:20,color:G.sell,background:G.sellL,borderRadius:10,margin:16}}>{err}</div>;
  if (!news.length) return <div style={{padding:32,textAlign:'center',color:G.muted}}>Sem noticias recentes.</div>;

  const scored = news.map(n=>({...n, score: calcScore(n, portfolio)})).sort((a,b)=>b.score-a.score);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12,padding:16}}>
      {scored.map((n,i)=>{
        const ts = n.datetime ? new Date(n.datetime*1000).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
        const scoreColor = n.score>=70 ? G.accent : n.score>=40 ? G.warn : G.muted;
        const isNeg = (n.sentiment||0) < -0.2;
        return (
          <a key={i} href={n.url||'#'} target="_blank" rel="noreferrer"
            style={{display:'block',background:G.surf,border:'1px solid '+G.border,borderRadius:12,padding:'14px 16px',textDecoration:'none',color:G.text}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:700,background:G.accentL,color:G.accent,borderRadius:5,padding:'2px 7px'}}>{n.ticker||''}</span>
              {isNeg && <span style={{fontSize:11,fontWeight:700,background:G.sellL,color:G.sell,borderRadius:5,padding:'2px 7px'}}>NEGATIVO</span>}
              <span style={{fontSize:11,color:G.muted,marginLeft:'auto'}}>{ts}</span>
            </div>
            <div style={{fontSize:14,fontWeight:500,lineHeight:1.45,color:G.text,marginBottom:6}}>{n.headline}</div>
            {n.summary && <div style={{fontSize:12,color:G.muted,lineHeight:1.4,marginBottom:10}}>{n.summary.slice(0,140)}{n.summary.length>140?'...':''}</div>}
            {/* Score bar */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6}}>
              <div style={{fontSize:11,color:G.muted,whiteSpace:'nowrap'}}>{n.source||''}</div>
              <div style={{flex:1,height:4,background:G.bg,borderRadius:99,overflow:'hidden'}}>
                <div style={{background:scoreColor,width:n.score+'%',height:'100%',borderRadius:99,transition:'width .4s'}} />
              </div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:700,color:scoreColor,minWidth:36,textAlign:'right'}}>{n.score}%</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function InsidersPanel({ portfolio }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');
  const tickers = portfolio.map(s=>s.t);

  useEffect(() => { if(!selected && tickers.length) setSelected(tickers[0]); }, [portfolio]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true); setData([]);
    fetch('/api/insiders?symbol='+selected)
      .then(r=>r.json())
      .then(d=>{ setData(Array.isArray(d)?d:[]); setLoading(false); })
      .catch(()=>setLoading(false));
  }, [selected]);

  return (
    <div style={{padding:16}}>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {tickers.slice(0,16).map(t=>(
          <button key={t} onClick={()=>setSelected(t)}
            style={{background:selected===t?G.accent:G.bg,color:selected===t?'#fff':G.text,border:'1px solid '+(selected===t?G.accent:G.border),borderRadius:8,padding:'5px 12px',fontSize:12,fontFamily:'DM Mono,monospace',fontWeight:600,cursor:'pointer'}}>
            {t}
          </button>
        ))}
      </div>
      <div style={{fontSize:11,color:G.muted,marginBottom:12}}>Apenas transacoes significativas (>USD 25K ou >500 acoes)</div>
      {loading && <div style={{textAlign:'center',color:G.muted,padding:20}}>A carregar...</div>}
      {!loading && !data.length && <div style={{textAlign:'center',color:G.muted,padding:20,fontSize:13}}>Sem transacoes relevantes nos ultimos 6 meses.</div>}
      {!loading && data.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {data.map((d,i)=>{
            const isBuy = d.type==='buy';
            const hasValue = (d.value||0) > 0;
            return (
              <div key={i} style={{background:G.surf,border:'1px solid '+G.border,borderRadius:10,padding:'12px 16px',display:'grid',gridTemplateColumns:'48px 1fr auto',gap:12,alignItems:'center'}}>
                <div style={{width:44,height:44,borderRadius:10,background:isBuy?G.accentL:G.sellL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:isBuy?G.accent:G.sell}}>
                  {isBuy?'+':'-'}
                </div>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:G.text}}>{d.name}</div>
                  <div style={{fontSize:12,color:G.muted}}>{d.position}</div>
                  <div style={{fontSize:11,color:G.muted,marginTop:2}}>{d.date}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  {hasValue ? (
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:14,fontWeight:700,color:isBuy?G.accent:G.sell}}>
                      {isBuy?'+':'-'}USD {fmtK(d.value)}
                    </div>
                  ) : null}
                  <div style={{fontSize:11,color:G.muted}}>
                    {d.shares>0 ? fmtK(d.shares)+' acoes' : ''}
                    {d.price ? ' @ USD '+fmt(d.price) : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GrowthChart({ portfolio }) {
  // CAGR estimates by sector (conservative base case)
  const SECTOR_CAGR = {
    'Tech': 0.12, 'AI': 0.18, 'Healthcare': 0.09, 'Finance': 0.08,
    'Energy': 0.06, 'Consumer': 0.07, 'Industrial': 0.07,
    'Materials': 0.05, 'Crypto': 0.20, 'ETF': 0.09, 'Outro': 0.08,
  };
  const totalValue = portfolio.reduce((s,x)=>s+(x.v||0),0);
  const years = [0,1,2,3,4,5,7,10];

  // Calculate weighted portfolio CAGR
  const portCAGR = portfolio.reduce((s,x)=>{
    const cagr = SECTOR_CAGR[x.s||'Outro'] || 0.08;
    return s + cagr * ((x.w||0)/100);
  }, 0);

  const scenarios = {
    bear:  portCAGR * 0.5,
    base:  portCAGR,
    bull:  portCAGR * 1.6,
  };

  const project = (cagr, y) => totalValue * Math.pow(1+cagr, y);
  const maxVal = project(scenarios.bull, 10);

  const W = 460, H = 180, PAD = { t:16, r:16, b:36, l:56 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const xPos = y => PAD.l + (y/10) * chartW;
  const yPos = v => PAD.t + chartH - (v/maxVal) * chartH;

  const makePath = (cagr) => years.map((y,i) => (i===0?'M':'L')+xPos(y).toFixed(1)+' '+yPos(project(cagr,y)).toFixed(1)).join(' ');

  return (
    <Card style={{marginBottom:0}}>
      <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>Projecao de Crescimento (10 anos)</div>
      <div style={{fontSize:11,color:G.muted,marginBottom:12}}>
        CAGR estimado do portfolio: <span style={{fontFamily:'DM Mono,monospace',fontWeight:700,color:G.accent}}>{(portCAGR*100).toFixed(1)}%/ano</span>
        <span style={{marginLeft:12,color:G.muted}}>Base: sector weights + historico</span>
      </div>
      <svg viewBox={'0 0 '+W+' '+H} style={{width:'100%',height:'auto'}}>
        {/* Grid lines */}
        {[0,0.25,0.5,0.75,1].map(f=>{
          const y = PAD.t + chartH*(1-f);
          const val = maxVal*f;
          return <g key={f}>
            <line x1={PAD.l} x2={W-PAD.r} y1={y} y2={y} stroke={G.border} strokeWidth={1} />
            <text x={PAD.l-6} y={y+4} textAnchor="end" fontSize={9} fill={G.muted}>{fmtK(val)}</text>
          </g>;
        })}
        {/* X axis labels */}
        {years.map(y=>(
          <text key={y} x={xPos(y)} y={H-8} textAnchor="middle" fontSize={9} fill={G.muted}>{y===0?'Hoje':y+'a'}</text>
        ))}
        {/* Bear path */}
        <path d={makePath(scenarios.bear)} fill="none" stroke={G.sell} strokeWidth={1.5} strokeDasharray="4 3" opacity={.7} />
        {/* Bull path */}
        <path d={makePath(scenarios.bull)} fill="none" stroke={G.accent} strokeWidth={1.5} strokeDasharray="4 3" opacity={.7} />
        {/* Base path */}
        <path d={makePath(scenarios.base)} fill="none" stroke={'#1565C0'} strokeWidth={2.5} />
        {/* End labels */}
        <text x={W-PAD.r+2} y={yPos(project(scenarios.bull,10))+4} fontSize={10} fill={G.accent} fontWeight="700">EUR {fmtK(project(scenarios.bull,10))}</text>
        <text x={W-PAD.r+2} y={yPos(project(scenarios.base,10))+4} fontSize={10} fill={'#1565C0'} fontWeight="700">EUR {fmtK(project(scenarios.base,10))}</text>
        <text x={W-PAD.r+2} y={yPos(project(scenarios.bear,10))+4} fontSize={10} fill={G.sell} fontWeight="700">EUR {fmtK(project(scenarios.bear,10))}</text>
      </svg>
      <div style={{display:'flex',gap:16,fontSize:11,marginTop:8,justifyContent:'center'}}>
        {[['Bull',G.accent,'+'+((scenarios.bull*100).toFixed(0))+'%/ano'],['Base','#1565C0','+'+((scenarios.base*100).toFixed(0))+'%/ano'],['Bear',G.sell,'+'+((scenarios.bear*100).toFixed(0))+'%/ano']].map(([l,c,r])=>(
          <span key={l} style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:16,height:2,background:c,display:'inline-block',borderRadius:2}} />
            <span style={{color:G.muted}}>{l}: </span><span style={{color:c,fontWeight:600,fontFamily:'DM Mono,monospace'}}>{r}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

function OverviewPanel({ portfolio, ratings }) {
  const total = portfolio.reduce((s,x)=>s+(x.v||0),0);
  const totalPnl = portfolio.reduce((s,x)=>s+(x.pnl||0),0);
  const totalPnlPct = total > 0 ? (totalPnl/(total-totalPnl))*100 : 0;
  const hhi = portfolio.reduce((s,x)=>s+Math.pow((x.w||0)/100,2),0);
  const hhiColor = hhi>0.25?G.sell:hhi>0.12?G.warn:G.accent;
  const hhiLabel = hhi>0.25?'Alto':hhi>0.12?'Medio':'Baixo';

  const sectors = {};
  portfolio.forEach(s=>{
    const sec=s.s||'Outro';
    if(!sectors[sec]) sectors[sec]={value:0,count:0};
    sectors[sec].value+=(s.v||0); sectors[sec].count++;
  });
  const sectorList = Object.entries(sectors).sort((a,b)=>b[1].value-a[1].value);

  const sorted = [...portfolio].sort((a,b)=>(b.pp||0)-(a.pp||0));
  const winners = sorted.slice(0,3);
  const losers = sorted.slice(-3).reverse();

  const rCounts = {STRONG_BUY:0,BUY:0,HOLD:0,SELL:0,STRONG_SELL:0};
  let rated=0;
  portfolio.forEach(s=>{ const r=ratings[s.t]; if(r&&rCounts[r]!==undefined){rCounts[r]++;rated++;} });
  const buySignals=(rCounts.STRONG_BUY||0)+(rCounts.BUY||0);
  const sellSignals=(rCounts.SELL||0)+(rCounts.STRONG_SELL||0);

  const alerts=[];
  if(hhi>0.25) alerts.push({type:'danger',msg:'Concentracao critica (HHI '+fmt(hhi*100,0)+'). '+sectorList[0]?.[0]+' representa '+(sectorList[0]?.[1].value/total*100).toFixed(0)+'% do portfolio.'});
  if(sellSignals>0) alerts.push({type:'warn',msg:sellSignals+' posicao(oes) com sinal de venda activo. Rever stop-loss.'});
  const bigPos=portfolio.filter(s=>(s.w||0)>25);
  if(bigPos.length) alerts.push({type:'warn',msg:bigPos.map(s=>s.t+' ('+fmt(s.w,1)+'%)').join(', ')+' com peso excessivo (>25%).'});
  const redCount=portfolio.filter(s=>(s.pnl||0)<0).length;
  if(redCount>4) alerts.push({type:'info',msg:redCount+' posicoes em prejuizo. Considera reavaliar as teses de investimento.'});

  return (
    <div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>
      {alerts.length>0 && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {alerts.map((a,i)=>(
            <div key={i} style={{padding:'10px 14px',borderRadius:10,fontSize:13,lineHeight:1.5,
              background:a.type==='danger'?G.sellL:a.type==='warn'?G.warnL:G.holdL,
              color:a.type==='danger'?G.sell:a.type==='warn'?G.warn:G.hold,
              borderLeft:'3px solid '+(a.type==='danger'?G.sell:a.type==='warn'?G.warn:G.hold)}}>
              {a.type==='danger'?'[!] ':a.type==='warn'?'[!] ':'[i] '}{a.msg}
            </div>
          ))}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
        {[['Total','EUR '+fmtK(total),G.text],['P&L',(totalPnl>=0?'+':'')+'EUR '+fmtK(totalPnl)+' ('+(totalPnlPct>=0?'+':'')+fmt(totalPnlPct,1)+'%)',totalPnl>=0?G.accent:G.sell],['HHI',hhiLabel+' ('+fmt(hhi*100,1)+')',hhiColor]].map(([k,v,c])=>(
          <Card key={k}><div style={{fontSize:11,color:G.muted,marginBottom:5}}>{k}</div><div style={{fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color:c}}>{v}</div></Card>
        ))}
      </div>
      <GrowthChart portfolio={portfolio} />
      <Card>
        <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Exposicao por Sector</div>
        {sectorList.map(([sec,{value,count}])=>{
          const pct=total>0?(value/total)*100:0;
          return <div key={sec} style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
              <span>{sec} <span style={{color:G.muted,fontSize:11}}>({count})</span></span>
              <span style={{fontFamily:'DM Mono,monospace',fontWeight:600}}>{fmt(pct,1)}%</span>
            </div>
            <div style={{background:G.bg,borderRadius:99,height:6,overflow:'hidden'}}>
              <div style={{background:G.accent,width:pct+'%',height:'100%',borderRadius:99}} />
            </div>
          </div>;
        })}
      </Card>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <Card>
          <div style={{fontWeight:600,fontSize:13,color:G.accent,marginBottom:10}}>Top Performers</div>
          {winners.map(s=>(
            <div key={s.t} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid '+G.border,fontSize:12}}>
              <span style={{fontFamily:'DM Mono,monospace',fontWeight:600}}>{s.t}</span>
              <span style={{color:G.accent,fontWeight:700}}>{s.pp>=0?'+':''}{fmt(s.pp,1)}%</span>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{fontWeight:600,fontSize:13,color:G.sell,marginBottom:10}}>Piores</div>
          {losers.map(s=>(
            <div key={s.t} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid '+G.border,fontSize:12}}>
              <span style={{fontFamily:'DM Mono,monospace',fontWeight:600}}>{s.t}</span>
              <span style={{color:G.sell,fontWeight:700}}>{s.pp>=0?'+':''}{fmt(s.pp,1)}%</span>
            </div>
          ))}
        </Card>
      </div>
      {rated>0 && (
        <Card>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Ratings AI ({rated}/{portfolio.length})</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
            {Object.entries(rCounts).map(([r,n])=>n>0?<div key={r} style={{background:RATING[r].bg,color:RATING[r].text,borderRadius:8,padding:'5px 12px',fontSize:12,fontWeight:700}}>{RATING[r].label}: {n}</div>:null)}
          </div>
          <div style={{fontSize:12,color:G.muted,lineHeight:1.55}}>
            {buySignals>sellSignals?'Maioria com sinal positivo. ':sellSignals>buySignals?'Atencao: mais sinais de venda. ':'Equilibrado. '}
            Racio Buy/Sell: {buySignals}/{sellSignals}.
          </div>
        </Card>
      )}
    </div>
  );
}

function DiscoverPanel({ portfolio }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function generate() {
    setLoading(true); setErr(''); setIdeas([]);
    const sectors = [...new Set(portfolio.map(s=>s.s||'Tech'))];
    const tickers = portfolio.map(s=>s.t).join(', ');
    const totalV = portfolio.reduce((s,x)=>s+(x.v||0),0);
    const topHoldings = [...portfolio].sort((a,b)=>(b.w||0)-(a.w||0)).slice(0,5).map(s=>s.t+' ('+fmt(s.w,1)+'%)').join(', ');
    const prompt = 'Actua como um gestor de portfolio com experiencia em mercados globais. Analisa este portfolio e sugere 5 novos stocks nao presentes que complementariam a carteira. Portfolio actual: ' + tickers + '. Top holdings: ' + topHoldings + '. Sectores presentes: ' + sectors.join(', ') + '. Valor total: EUR ' + totalV.toFixed(0) + '. Para cada sugestao fornece: ticker, nome empresa, sector, tese de investimento (2 frases em PT), CAGR estimado a 3 anos (%), rating sugerido. Responde APENAS em JSON valido: [{"ticker":"TSLA","name":"Tesla","sector":"EV","thesis":"Tese aqui.","cagr3y":15,"rating":"BUY"},...]';
    try {
      const res = await fetch('/api/batch', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({stock:{t:'DISCOVER',n:'Portfolio Discovery',v:0,pnl:0,pp:0,w:0,s:'Multi'},_prompt_override:prompt})
      });
      // Use analyse endpoint directly
      const OR_KEY_HINT = 'use openrouter';
      const r2 = await fetch('/api/discover', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolio})});
      const d2 = await r2.json();
      if (Array.isArray(d2)) { setIdeas(d2); setDone(true); }
      else if (d2.ideas && Array.isArray(d2.ideas)) { setIdeas(d2.ideas); setDone(true); }
      else setErr(d2.error || 'Resposta inesperada');
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{padding:16}}>
      {!done && !loading && (
        <div style={{textAlign:'center',padding:'32px 16px'}}>
          <div style={{fontSize:14,color:G.text,fontWeight:600,marginBottom:8}}>Descobertas AI</div>
          <div style={{fontSize:13,color:G.muted,marginBottom:24,lineHeight:1.6}}>
            A AI analisa o teu portfolio e sugere novos stocks que complementam a tua carteira,<br/>com tese de investimento e projecao de crescimento.
          </div>
          <button onClick={generate} style={{background:G.accent,color:'#fff',border:'none',borderRadius:12,padding:'13px 32px',fontWeight:700,fontSize:14,cursor:'pointer'}}>
            Gerar Sugestoes
          </button>
        </div>
      )}
      {loading && (
        <div style={{textAlign:'center',padding:'48px 16px',color:G.muted}}>
          <div style={{fontSize:14,marginBottom:8}}>A analisar portfolio e gerar sugestoes...</div>
          <div style={{fontSize:12}}>Pode demorar 15-30 segundos</div>
        </div>
      )}
      {err && <div style={{color:G.sell,background:G.sellL,borderRadius:10,padding:'12px 16px',fontSize:13,marginBottom:16}}>{err}</div>}
      {done && ideas.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
            <div style={{fontWeight:600,fontSize:14}}>Sugestoes para o teu Portfolio</div>
            <button onClick={()=>{setDone(false);setIdeas([]);}} style={{background:'none',border:'1px solid '+G.border,borderRadius:8,padding:'5px 12px',fontSize:12,cursor:'pointer',color:G.muted}}>Regenerar</button>
          </div>
          {ideas.map((idea,i)=>(
            <Card key={i}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                <div>
                  <span style={{fontFamily:'DM Mono,monospace',fontWeight:700,fontSize:16}}>{idea.ticker}</span>
                  <span style={{color:G.muted,fontSize:13,marginLeft:10}}>{idea.name}</span>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {idea.sector && <span style={{fontSize:11,background:G.accentL,color:G.accent,borderRadius:5,padding:'2px 8px',fontWeight:600}}>{idea.sector}</span>}
                  {idea.rating && <Pill r={idea.rating} />}
                </div>
              </div>
              <div style={{fontSize:13,color:G.text,lineHeight:1.6,marginBottom:12}}>{idea.thesis}</div>
              {idea.cagr3y && (
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{flex:1,background:G.bg,borderRadius:99,height:8,overflow:'hidden'}}>
                    <div style={{background:idea.cagr3y>15?G.accent:idea.cagr3y>8?G.warn:G.muted,width:Math.min(100,idea.cagr3y*3)+'%',height:'100%',borderRadius:99}} />
                  </div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color:G.accent,whiteSpace:'nowrap'}}>CAGR +{idea.cagr3y}%/ano</div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioTable({ portfolio, ratings, ratingTexts, onAnalyse }) {
  const [filter, setFilter] = useState('Todos');
  const filters = ['Todos','Strong Buy','Buy','Hold','Sell','Strong Sell'];
  const rmap = {'Strong Buy':'STRONG_BUY','Buy':'BUY','Hold':'HOLD','Sell':'SELL','Strong Sell':'STRONG_SELL'};
  const filtered = filter==='Todos' ? portfolio : portfolio.filter(s=>ratings[s.t]===rmap[filter]);

  return (
    <div>
      <div style={{display:'flex',gap:6,padding:'0 16px 12px',flexWrap:'wrap'}}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{background:filter===f?G.text:G.bg,color:filter===f?G.surf:G.muted,border:'1px solid '+G.border,borderRadius:20,padding:'4px 13px',fontSize:12,cursor:'pointer',fontWeight:filter===f?700:400}}>
            {f}
          </button>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6,padding:'0 16px'}}>
        {filtered.map(s=>{
          const r=ratings[s.t];
          const hasR=r&&RATING[r];
          return (
            <div key={s.t} style={{background:G.surf,border:'1px solid '+G.border,borderRadius:12,padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'start'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}>
                  <span style={{fontFamily:'DM Mono,monospace',fontWeight:700,fontSize:14}}>{s.t}</span>
                  <span style={{fontSize:12,color:G.muted}}>{s.n}</span>
                  {hasR && <Pill r={r} />}
                </div>
                <div style={{display:'flex',gap:16,fontSize:12,color:G.muted,flexWrap:'wrap'}}>
                  <span>EUR {fmt(s.v)}</span>
                  <span style={{color:(s.pnl||0)>=0?G.accent:G.sell,fontWeight:600}}>
                    {(s.pnl||0)>=0?'+':''}EUR {fmt(s.pnl)} ({(s.pp||0)>=0?'+':''}{fmt(s.pp)}%)
                  </span>
                  <span>{fmt(s.w)}%</span>
                </div>
                {ratingTexts[s.t] && (
                  <div style={{fontSize:12,color:G.muted,marginTop:6,lineHeight:1.4,fontStyle:'italic'}}>
                    {ratingTexts[s.t].slice(0,110)}{ratingTexts[s.t].length>110?'...':''}
                  </div>
                )}
              </div>
              <button onClick={()=>onAnalyse(s)}
                style={{background:G.bg,border:'1px solid '+G.border,borderRadius:8,padding:'6px 14px',fontSize:12,cursor:'pointer',color:G.text,whiteSpace:'nowrap'}}>
                Analisar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MainApexApp() {
  const [portfolio] = useState(PORTFOLIO_DEFAULT);
  const [ratings, setRatings] = useState({});
  const [ratingTexts, setRatingTexts] = useState({});
  const [tab, setTab] = useState('Portfolio');
  const [showBatch, setShowBatch] = useState(false);
  const [analyseStock, setAnalyseStock] = useState(null);

  const total = portfolio.reduce((s,x)=>s+(x.v||0),0);
  const totalPnl = portfolio.reduce((s,x)=>s+(x.pnl||0),0);
  const ratedCount = portfolio.filter(s=>ratings[s.t]&&RATING[ratings[s.t]]).length;

  useEffect(()=>{
    fetch('/api/ratings').then(r=>r.json()).then(d=>{
      if(d && typeof d==='object' && !d.error){
        const r={},t={};
        Object.entries(d).forEach(([ticker,val])=>{
          if(typeof val==='object'){r[ticker]=val.rating;t[ticker]=val.text||'';}
          else r[ticker]=val;
        });
        setRatings(r); setRatingTexts(t);
      }
    }).catch(()=>{});
  },[]);

  const handleRatingSet = useCallback((ticker, rating, text)=>{
    setRatings(prev=>({...prev,[ticker]:rating}));
    setRatingTexts(prev=>({...prev,[ticker]:text||''}));
    fetch('/api/ratings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker,rating,text:text||''})}).catch(()=>{});
  },[]);

  const tabs = ['Portfolio','Insiders','Noticias','Overview','Descobertas'];
  const rGroups={STRONG_BUY:[],BUY:[],SELL:[],STRONG_SELL:[]};
  portfolio.forEach(s=>{ const r=ratings[s.t]; if(r&&rGroups[r]) rGroups[r].push(s); });

  return (
    <div style={{minHeight:'100vh',background:G.bg,fontFamily:'DM Sans,sans-serif',color:G.text}}>
      <div style={{background:G.surf,borderBottom:'1px solid '+G.border,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <div style={{fontFamily:'DM Mono,monospace',fontWeight:700,fontSize:16,letterSpacing:'.5px'}}>Apex / Intel</div>
        <div style={{display:'flex',gap:20,fontSize:13}}>
          {[['Total','EUR '+fmtK(total),''],['P&L',(totalPnl>=0?'+':'')+'EUR '+fmtK(totalPnl),totalPnl>=0?G.accent:G.sell],['Rated',ratedCount+'/'+portfolio.length,'']].map(([k,v,c])=>(
            <div key={k}><div style={{fontSize:10,color:G.muted}}>{k}</div><div style={{fontFamily:'DM Mono,monospace',fontWeight:700,fontSize:13,color:c||G.text}}>{v}</div></div>
          ))}
        </div>
        <button onClick={()=>setShowBatch(true)}
          style={{background:G.accent,color:'#fff',border:'none',borderRadius:10,padding:'9px 18px',fontWeight:700,fontSize:13,cursor:'pointer'}}>
          Analisar Tudo
        </button>
      </div>

      <div style={{background:G.surf,borderBottom:'1px solid '+G.border,padding:'10px 20px',display:'flex',gap:20,overflowX:'auto'}}>
        {Object.entries(rGroups).map(([r,stocks])=>(
          <div key={r} style={{minWidth:110}}>
            <div style={{marginBottom:5}}><Pill r={r} /></div>
            {stocks.length===0 ? <div style={{fontSize:11,color:G.muted}}>-</div> : (
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {stocks.map(s=><span key={s.t} style={{fontSize:11,fontFamily:'DM Mono,monospace',background:G.bg,borderRadius:4,padding:'1px 5px'}}>{s.t}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{display:'flex',borderBottom:'1px solid '+G.border,background:G.surf,padding:'0 16px'}}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{background:'none',border:'none',borderBottom:tab===t?'2px solid '+G.accent:'2px solid transparent',padding:'12px 14px',fontSize:13,fontWeight:tab===t?700:400,color:tab===t?G.text:G.muted,cursor:'pointer'}}>
            {t}{t==='Descobertas'?<span style={{marginLeft:4,background:G.accentL,color:G.accent,borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700}}>AI</span>:null}
          </button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:'0 auto',paddingTop:8}}>
        {tab==='Portfolio' && <PortfolioTable portfolio={portfolio} ratings={ratings} ratingTexts={ratingTexts} onAnalyse={setAnalyseStock} />}
        {tab==='Insiders' && <InsidersPanel portfolio={portfolio} />}
        {tab==='Noticias' && <NewsPanel portfolio={portfolio} />}
        {tab==='Overview' && <OverviewPanel portfolio={portfolio} ratings={ratings} />}
        {tab==='Descobertas' && <DiscoverPanel portfolio={portfolio} />}
      </div>

      {showBatch && <BatchAnalyser portfolio={portfolio} ratings={ratings} onRatingSet={handleRatingSet} onClose={()=>setShowBatch(false)} />}
      {analyseStock && <AnalysisPanel stock={analyseStock} onClose={()=>setAnalyseStock(null)} onRatingSet={handleRatingSet} />}
    </div>
  );
}

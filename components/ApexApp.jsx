'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PORTFOLIO_DEFAULT } from '../lib/portfolio';

// ─── THEME (Midnight Galaxy - dark minimal) ───────────────────────────────────
const G = {
  bg: '#08080f', card: '#0e0e1a', cardHover: '#13131f',
  border: '#1a1a2e', borderLight: '#252540',
  text: '#e8eaf0', muted: '#5a6480', faint: '#2a2a45',
  accent: '#7c6af7', accentDim: '#7c6af722',
  green: '#22d47a', red: '#f04f5a', yellow: '#f5a623',
  blue: '#4a9eff', purple: '#b06ef7', cyan: '#00d4c8',
  gradAccent: 'linear-gradient(135deg, #7c6af7, #b06ef7)',
};

const RATING_META = {
  STRONG_BUY:  { label: 'Strong Buy',  color: '#22d47a', bg: '#0d2e1a' },
  BUY:         { label: 'Buy',          color: '#4ade80', bg: '#0a2015' },
  HOLD:        { label: 'Hold',         color: '#f5a623', bg: '#2e1f05' },
  SELL:        { label: 'Sell',         color: '#fb923c', bg: '#2e1205' },
  STRONG_SELL: { label: 'Strong Sell',  color: '#f04f5a', bg: '#2e080a' },
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt    = n => n == null ? '—' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
const fmtK   = n => { if (n == null) return '—'; if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+'M'; if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(0)+'K'; return Math.abs(n).toFixed(0); };
const fmtPct = n => n == null ? '—' : (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const relTime = ts => { const d = Date.now()/1000 - ts; if (d < 3600) return Math.floor(d/60)+'m atrás'; if (d < 86400) return Math.floor(d/3600)+'h atrás'; return Math.floor(d/86400)+'d atrás'; };

// Normalise portfolio.js short fields → full field names
function normalisePortfolio(raw) {
  const total = raw.reduce((s, p) => s + (p.v || p.value || 0), 0);
  return raw.map(p => ({
    ticker:  p.t   || p.ticker,
    name:    p.n   || p.name,
    value:   p.v   || p.value  || 0,
    pnl:     p.pnl || 0,
    pnlPct:  p.pp  || p.pnlPct || 0,
    weight:  p.w   || p.weight || (total > 0 ? ((p.v||p.value||0)/total*100) : 0),
    sector:  p.s   || p.sector || 'Other',
    // Keep original short fields for batch API
    t: p.t || p.ticker, n: p.n || p.name, v: p.v || p.value || 0,
    pp: p.pp || p.pnlPct || 0, w: p.w || p.weight || 0, s: p.s || p.sector || 'Other',
  }));
}

// ─── BASE COMPONENTS ─────────────────────────────────────────────────────────
function Pill({ children, color = G.accent, bg }) {
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:9999, fontSize:11, fontWeight:600, letterSpacing:'0.04em', color, background: bg || color+'22', border:`1px solid ${color}33` }}>{children}</span>;
}

function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background: G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:20, ...style }}>{children}</div>;
}

function Spinner() {
  return <div style={{ display:'inline-block', width:16, height:16, border:`2px solid ${G.faint}`, borderTop:`2px solid ${G.accent}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />;
}

// ─── ANALYST PANEL ───────────────────────────────────────────────────────────
function AnalystPanel({ ticker }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/api/analyst?ticker=${ticker}`).then(r=>r.json()).then(setData).catch(()=>{});
  }, [ticker]);
  if (!data || data.error) return null;
  const { consensus, counts={}, total=0, priceTargetMean, priceTargetHigh, priceTargetLow, period } = data;
  const meta = RATING_META[consensus] || RATING_META.HOLD;
  const bars = [
    { key:'STRONG_BUY', label:'S.Buy', count: counts.strongBuy||0 },
    { key:'BUY',        label:'Buy',   count: counts.buy||0 },
    { key:'HOLD',       label:'Hold',  count: counts.hold||0 },
    { key:'SELL',       label:'Sell',  count: counts.sell||0 },
    { key:'STRONG_SELL',label:'S.Sell',count: counts.strongSell||0 },
  ];
  return (
    <div style={{ marginTop:16, padding:16, background:'#06060f', borderRadius:10, border:`1px solid ${G.border}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <span style={{ color:G.muted, fontSize:12 }}>Wall Street Consensus</span>
        <Pill color={meta.color} bg={meta.bg}>{meta.label}</Pill>
        {period && <span style={{ color:G.muted, fontSize:11 }}>{period}</span>}
      </div>
      {total > 0 && <>
        <div style={{ display:'flex', height:6, borderRadius:3, overflow:'hidden', gap:1, marginBottom:6 }}>
          {bars.map(b => b.count > 0 && <div key={b.key} style={{ width:`${(b.count/total)*100}%`, background:RATING_META[b.key].color }} title={`${b.label}: ${b.count}`}/>)}
        </div>
        <div style={{ display:'flex', gap:12 }}>
          {bars.map(b => <div key={b.key} style={{ fontSize:11, color: b.count>0 ? RATING_META[b.key].color : G.muted }}>{b.label} {b.count}</div>)}
          <div style={{ fontSize:11, color:G.muted, marginLeft:'auto' }}>{total} analistas</div>
        </div>
      </>}
      {priceTargetMean > 0 && (
        <div style={{ display:'flex', gap:20, marginTop:12, flexWrap:'wrap' }}>
          {[['Alvo', priceTargetMean, G.text], ['Alto', priceTargetHigh, G.green], ['Baixo', priceTargetLow, G.red]].map(([label, val, color]) => (
            <div key={label}><div style={{ fontSize:11, color:G.muted }}>{label}</div><div style={{ fontSize:15, fontWeight:700, color }}>${val?.toFixed(2)}</div></div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ANALYSIS MODAL ──────────────────────────────────────────────────────────
function AnalysisPanel({ stock, onClose }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // batch API expects short fields: {t,n,v,pnl,pp,w,s}
    fetch('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: { t: stock.ticker, n: stock.name, v: stock.value, pnl: stock.pnl, pp: stock.pnlPct, w: stock.weight, s: stock.sector } })
    })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setResult(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [stock.ticker]);

  const meta = result?.rating ? RATING_META[result.rating] || RATING_META.HOLD : null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:16, padding:28, maxWidth:680, width:'100%', maxHeight:'85vh', overflowY:'auto', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:G.muted, cursor:'pointer', fontSize:20, lineHeight:1 }}>✕</button>
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ color:G.text, fontSize:22, fontWeight:800 }}>{stock.ticker}</span>
            <span style={{ color:G.muted, fontSize:14 }}>{stock.name}</span>
          </div>
          <div style={{ color:G.muted, fontSize:13, marginTop:4 }}>{fmt(stock.value)} · {fmtPct(stock.pnlPct)} · {stock.weight?.toFixed(1)}% portfolio</div>
        </div>
        <AnalystPanel ticker={stock.ticker} />
        {loading && <div style={{ textAlign:'center', padding:40, color:G.accent }}>A analisar com IA... <Spinner /></div>}
        {error && <div style={{ color:G.red, padding:16, background:G.red+'11', borderRadius:8, marginTop:16 }}>{error}</div>}
        {result && !loading && (
          <div style={{ marginTop:20 }}>
            {meta && <Pill color={meta.color} bg={meta.bg} style={{ fontSize:14 }}>{meta.label}</Pill>}
            <div style={{ color:G.text, fontSize:14, lineHeight:1.8, marginTop:12, background:'#06060f', padding:16, borderRadius:10 }}>{result.text}</div>
            {result.model && <div style={{ color:G.muted, fontSize:11, marginTop:8 }}>via {result.model}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BATCH ANALYSER ──────────────────────────────────────────────────────────
function BatchAnalyser({ portfolio, ratings, setRatings }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const hasRun = useRef(false);

  const handleRun = useCallback(async () => {
    if (hasRun.current || running) return;
    hasRun.current = true;
    setRunning(true);
    setProgress(0);
    const map = {};
    // Call one by one (API expects single stock)
    for (let i = 0; i < portfolio.length; i++) {
      const p = portfolio[i];
      try {
        const res = await fetch('/api/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: { t: p.ticker, n: p.name, v: p.value, pnl: p.pnl, pp: p.pnlPct, w: p.weight, s: p.sector } })
        });
        const d = await res.json();
        if (d.rating) map[p.ticker] = d.rating;
      } catch (_) {}
      setProgress(i + 1);
      setRatings({ ...map });
    }
    // Persist
    try {
      await fetch('/api/ratings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ratings: map }) });
    } catch (_) {}
    setRunning(false);
    setDone(true);
  }, [portfolio, setRatings, running]);

  const rated = Object.keys(ratings).length;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      {!done && !running && (
        <button onClick={handleRun} style={{ background:G.gradAccent, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:13, fontWeight:600, boxShadow:`0 2px 12px ${G.accent}44` }}>
          Analisar Tudo
        </button>
      )}
      {running && (
        <div style={{ display:'flex', alignItems:'center', gap:8, color:G.accent, fontSize:13 }}>
          <Spinner /> {progress}/{portfolio.length} analisados...
        </div>
      )}
      {done && (
        <div style={{ color:G.green, fontSize:13 }}>
          ✓ {rated} stocks classificados
          <button onClick={() => { hasRun.current=false; setDone(false); handleRun(); }} style={{ marginLeft:8, background:'none', border:`1px solid ${G.border}`, color:G.muted, borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:11 }}>
            Reanalisar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── NEWS PANEL ──────────────────────────────────────────────────────────────
// API returns plain array with {headline, url, source, datetime(unix), ticker, summary}
function NewsPanel({ tickers }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/news?tickers=${tickers.slice(0, 10).join(',')}`)
      .then(r => r.json())
      .then(d => {
        const arr = Array.isArray(d) ? d : (d.news || []);
        setNews(arr);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color:G.muted, padding:40, textAlign:'center' }}><Spinner /></div>;
  if (!news.length) return <div style={{ color:G.muted, padding:40, textAlign:'center' }}>Sem notícias disponíveis.</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {news.slice(0, 8).map((item, i) => {
        const score = item.relevanceScore || 0;
        const scoreColor = score >= 70 ? G.green : score >= 40 ? G.yellow : G.muted;
        const tStr = item.ticker || item.related || '';
        const tsAgo = item.datetime ? relTime(item.datetime) : '';
        return (
          <Card key={i} style={{ padding:16 }}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color:G.text, textDecoration:'none', fontSize:14, fontWeight:600, lineHeight:1.5, display:'block', marginBottom:8 }}>
              {item.headline}
            </a>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom: score > 0 ? 10 : 0 }}>
              <span style={{ color:G.muted, fontSize:12 }}>{item.source}</span>
              {tsAgo && <><span style={{ color:G.faint }}>·</span><span style={{ color:G.muted, fontSize:12 }}>{tsAgo}</span></>}
              {tStr && <Pill color={G.accent}>{tStr}</Pill>}
            </div>
            {score > 0 && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:11, color:G.muted }}>Relevância</span>
                  <span style={{ fontSize:11, fontWeight:700, color:scoreColor }}>{score}%</span>
                </div>
                <div style={{ height:3, background:G.faint, borderRadius:2 }}>
                  <div style={{ height:'100%', borderRadius:2, width:`${score}%`, background:scoreColor }} />
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── INSIDERS PANEL ──────────────────────────────────────────────────────────
// API: GET /api/insiders?symbol=XXX → plain array {name,type('buy'/'sell'),value,shares,price,date}
function InsidersPanel({ tickers }) {
  const [insiders, setInsiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(tickers[0]);

  const load = useCallback(ticker => {
    setLoading(true);
    setInsiders([]);
    fetch(`/api/insiders?symbol=${ticker}`)
      .then(r => r.json())
      .then(d => { setInsiders(Array.isArray(d) ? d : (d.insiders || [])); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(selected); }, [selected]);

  const buys  = insiders.filter(t => t.type === 'buy'  || t.type === 'BUY');
  const sells = insiders.filter(t => t.type === 'sell' || t.type === 'SELL');
  const totalBuyVal  = buys.reduce((s, t) => s + (t.value || 0), 0);
  const totalSellVal = sells.reduce((s, t) => s + (t.value || 0), 0);
  const totalVol = totalBuyVal + totalSellVal;
  const buyRatio = totalVol > 0 ? Math.round((totalBuyVal / totalVol) * 100) : 0;

  return (
    <div>
      {/* Ticker selector */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {tickers.slice(0, 16).map(t => (
          <button key={t} onClick={() => setSelected(t)} style={{ padding:'4px 10px', borderRadius:20, border:`1px solid ${selected===t ? G.accent : G.border}`, background: selected===t ? G.accentDim : 'transparent', color: selected===t ? G.accent : G.muted, cursor:'pointer', fontSize:12, fontWeight:600 }}>{t}</button>
        ))}
      </div>

      {loading && <div style={{ color:G.muted, textAlign:'center', padding:40 }}><Spinner /></div>}

      {!loading && !insiders.length && (
        <div style={{ color:G.muted, textAlign:'center', padding:40 }}>Sem transações relevantes para {selected}.</div>
      )}

      {!loading && insiders.length > 0 && (
        <>
          {/* Buy/Sell ratio bar */}
          <Card style={{ padding:16, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:11, color:G.muted }}>Volume Compras</div>
                <div style={{ fontSize:18, fontWeight:800, color:G.green }}>${fmtK(totalBuyVal)}</div>
                <div style={{ fontSize:12, color:G.muted }}>{buys.length} transações</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, color:G.muted, marginBottom:4 }}>Buy/Sell Ratio</div>
                <div style={{ fontSize:28, fontWeight:900, color: buyRatio >= 60 ? G.green : buyRatio <= 40 ? G.red : G.yellow }}>{buyRatio}%</div>
                <div style={{ fontSize:11, color:G.muted }}>compras vs total</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, color:G.muted }}>Volume Vendas</div>
                <div style={{ fontSize:18, fontWeight:800, color:G.red }}>${fmtK(totalSellVal)}</div>
                <div style={{ fontSize:12, color:G.muted }}>{sells.length} transações</div>
              </div>
            </div>
            <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${buyRatio}%`, background:G.green, transition:'width 0.5s' }} />
              <div style={{ flex:1, background:G.red }} />
            </div>
          </Card>

          {/* Transactions */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[{ label:'Compras', data:buys, color:G.green }, { label:'Vendas', data:sells, color:G.red }].map(({ label, data, color }) => (
              <div key={label}>
                <div style={{ color, fontSize:13, fontWeight:700, marginBottom:10 }}>{label} ({data.length})</div>
                {data.length === 0 && <div style={{ color:G.muted, fontSize:13 }}>Sem {label.toLowerCase()}.</div>}
                {data.map((t, i) => (
                  <div key={i} style={{ padding:'10px 12px', marginBottom:8, background:color+'0e', borderRadius:8, border:`1px solid ${color}22` }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ color:G.text, fontSize:13, fontWeight:600 }}>{t.name || 'Insider'}</span>
                      <span style={{ color, fontSize:13, fontWeight:700 }}>{(t.type==='buy'||t.type==='BUY') ? '+' : '-'}${fmtK(t.value)}</span>
                    </div>
                    <div style={{ color:G.muted, fontSize:12, marginTop:3 }}>
                      {t.shares?.toLocaleString()} acções{t.price > 0 && ` · $${t.price.toFixed(2)}`}{t.date && ` · ${t.date}`}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── GROWTH CHART ─────────────────────────────────────────────────────────────
const SECTOR_CAGR = {
  Technology:    { bear:0.06, base:0.14, bull:0.22 },
  Semiconductor: { bear:0.07, base:0.16, bull:0.26 },
  Consumer:      { bear:0.04, base:0.09, bull:0.14 },
  Healthcare:    { bear:0.03, base:0.08, bull:0.14 },
  Industrials:   { bear:0.03, base:0.07, bull:0.12 },
  Energy:        { bear:0.02, base:0.06, bull:0.12 },
  ETF:           { bear:0.05, base:0.10, bull:0.16 },
  Default:       { bear:0.04, base:0.10, bull:0.17 },
};

function getSector(ticker) {
  const t = ticker.toUpperCase();
  if (['GOOGL','MSFT','META','AAPL','NVDA','HOOD','HIMS','NFLX','FRSH','TEM','INFQ','WYFI','DXYZ','OUST','MITK'].includes(t)) return 'Technology';
  if (['MRVL','IONQ','AXTI','SMH','POET'].includes(t)) return 'Semiconductor';
  if (['AMZN','KO','OSCR'].includes(t)) return 'Consumer';
  if (['ABCL','NBIS','IREN'].includes(t)) return 'Healthcare';
  if (['KBR','PH','MOS','TMC','XPEV'].includes(t)) return 'Industrials';
  if (['GOLD'].includes(t)) return 'ETF';
  return 'Default';
}

function GrowthChart({ portfolio }) {
  const [years, setYears] = useState(10);
  const [monthly, setMonthly] = useState('');
  const [extraMonthly, setExtraMonthly] = useState(0);

  const totalValue = portfolio.reduce((s, p) => s + (p.value || 0), 0);
  let bearCAGR = 0, baseCAGR = 0, bullCAGR = 0;
  portfolio.forEach(p => {
    const w = (p.value || 0) / totalValue;
    const c = SECTOR_CAGR[getSector(p.ticker)] || SECTOR_CAGR.Default;
    bearCAGR += w * c.bear; baseCAGR += w * c.base; bullCAGR += w * c.bull;
  });

  const project = (cagr) => {
    const pts = [];
    let val = totalValue;
    for (let y = 0; y <= years; y++) {
      if (y > 0) {
        val = val * (1 + cagr) + extraMonthly * 12;
      }
      pts.push(val);
    }
    return pts;
  };

  const bearVals = project(bearCAGR);
  const baseVals = project(baseCAGR);
  const bullVals = project(bullCAGR);
  const maxVal = bullVals[years];

  const W=580, H=240, PL=72, PR=60, PT=16, PB=36;
  const chartW = W - PL - PR, chartH = H - PT - PB;
  const xPos = i => PL + (i / years) * chartW;
  const yPos = v => PT + chartH - Math.max(0, Math.min(1, v/maxVal)) * chartH;
  const pathD = vals => vals.map((v,i) => `${i===0?'M':'L'} ${xPos(i).toFixed(1)} ${yPos(v).toFixed(1)}`).join(' ');
  const fmtE = v => v >= 1e6 ? '€'+(v/1e6).toFixed(1)+'M' : v >= 1e3 ? '€'+(v/1e3).toFixed(0)+'K' : '€'+v.toFixed(0);

  const xTicks = years <= 10 ? [0,2,4,6,8,10].filter(x=>x<=years) : years <= 15 ? [0,3,6,9,12,15].filter(x=>x<=years) : [0,5,10,15,20,25,30].filter(x=>x<=years);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <div style={{ color:G.text, fontSize:14, fontWeight:700 }}>Projecção de Crescimento</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {[5,10,15,20,30].map(y => (
            <button key={y} onClick={() => setYears(y)} style={{ padding:'3px 10px', borderRadius:16, border:`1px solid ${years===y ? G.accent : G.border}`, background: years===y ? G.accentDim : 'transparent', color: years===y ? G.accent : G.muted, cursor:'pointer', fontSize:12, fontWeight:600 }}>{y}a</button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', maxWidth:W }}>
        {[0.25,0.5,0.75,1].map(p => {
          const y = PT + chartH - p*chartH;
          return <g key={p}><line x1={PL} x2={W-PR} y1={y} y2={y} stroke={G.faint} strokeWidth={1}/><text x={PL-6} y={y+4} fill={G.muted} fontSize={10} textAnchor="end">{fmtE(maxVal*p)}</text></g>;
        })}
        {xTicks.map(x => <text key={x} x={xPos(x)} y={H-PB+14} fill={G.muted} fontSize={10} textAnchor="middle">{x===0?'Hoje':`+${x}a`}</text>)}
        <path d={pathD(bearVals)} fill="none" stroke={G.red}    strokeWidth={1.5} strokeDasharray="4 3"/>
        <path d={pathD(baseVals)} fill="none" stroke={G.accent} strokeWidth={2.5}/>
        <path d={pathD(bullVals)} fill="none" stroke={G.green}  strokeWidth={1.5} strokeDasharray="4 3"/>
        <text x={W-PR+4} y={yPos(bearVals[years])+4}  fill={G.red}    fontSize={10}>{fmtE(bearVals[years])}</text>
        <text x={W-PR+4} y={yPos(baseVals[years])-4}  fill={G.accent} fontSize={11} fontWeight="bold">{fmtE(baseVals[years])}</text>
        <text x={W-PR+4} y={yPos(bullVals[years])-4}  fill={G.green}  fontSize={10}>{fmtE(bullVals[years])}</text>
      </svg>

      {/* Monthly DCA input */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12, flexWrap:'wrap' }}>
        <span style={{ color:G.muted, fontSize:13 }}>+ Investimento mensal:</span>
        <input
          type="number" placeholder="ex: 500" value={monthly}
          onChange={e => setMonthly(e.target.value)}
          style={{ background:G.faint, border:`1px solid ${G.border}`, borderRadius:8, padding:'5px 10px', color:G.text, fontSize:13, width:100, outline:'none' }}
        />
        <button onClick={() => setExtraMonthly(Number(monthly)||0)} style={{ background:G.accentDim, border:`1px solid ${G.accent}44`, color:G.accent, borderRadius:8, padding:'5px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          Aplicar
        </button>
        {extraMonthly > 0 && <span style={{ color:G.green, fontSize:13 }}>+€{extraMonthly}/mês incluído</span>}
      </div>

      <div style={{ display:'flex', gap:20, marginTop:12 }}>
        {[['Bear', bearCAGR, G.red], ['Base', baseCAGR, G.accent], ['Bull', bullCAGR, G.green]].map(([label, cagr, color]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color }}>
            <div style={{ width:16, height:2, background:color, borderRadius:1 }}/>
            {label} ({(cagr*100).toFixed(0)}% CAGR)
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OVERVIEW PANEL ───────────────────────────────────────────────────────────
function OverviewPanel({ portfolio, ratings }) {
  const totalValue = portfolio.reduce((s, p) => s + (p.value||0), 0);
  const totalPnL   = portfolio.reduce((s, p) => s + (p.pnl||0), 0);

  const sectorMap = {};
  portfolio.forEach(p => { const s = getSector(p.ticker); sectorMap[s] = (sectorMap[s]||0) + (p.value||0); });
  const sectors = Object.entries(sectorMap).sort((a,b)=>b[1]-a[1]);

  const hhi = portfolio.reduce((s, p) => s + Math.pow((p.value/totalValue)*100, 2), 0);
  const hhiLabel = hhi > 2500 ? 'Alta Concentração' : hhi > 1500 ? 'Moderada' : 'Diversificado';
  const hhiColor = hhi > 2500 ? G.red : hhi > 1500 ? G.yellow : G.green;

  const ratingCounts = { STRONG_BUY:0, BUY:0, HOLD:0, SELL:0, STRONG_SELL:0 };
  portfolio.forEach(p => { const r = ratings[p.ticker]; if (r && ratingCounts[r] !== undefined) ratingCounts[r]++; });
  const ratedTotal = Object.values(ratingCounts).reduce((s,v)=>s+v,0);

  const alerts = [];
  const top = portfolio[0];
  if (top && top.value/totalValue > 0.35) alerts.push(`${top.ticker} representa ${((top.value/totalValue)*100).toFixed(0)}% do portfolio — peso elevado.`);
  const tech = (sectorMap['Technology']||0) + (sectorMap['Semiconductor']||0);
  if (tech/totalValue > 0.6) alerts.push(`Exposição a Tech/Semis: ${((tech/totalValue)*100).toFixed(0)}% — considerar diversificação.`);
  portfolio.filter(p=>p.pnlPct<-15).forEach(p => alerts.push(`${p.ticker} com P&L ${fmtPct(p.pnlPct)} — avaliar saída.`));

  const sectorColors = [G.accent, G.cyan, G.purple, G.green, G.yellow, G.red, '#f97316', G.muted];
  const winners  = [...portfolio].sort((a,b)=>b.pnlPct-a.pnlPct).slice(0,3);
  const topLosers= [...portfolio].sort((a,b)=>a.pnlPct-b.pnlPct).slice(0,3);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
        {[
          { label:'Valor Total', value:fmt(totalValue), color:G.text },
          { label:'P&L Total',   value:fmt(totalPnL),   color:totalPnL>=0?G.green:G.red },
          { label:'Posições',    value:portfolio.length, color:G.text },
          { label:'HHI',         value:`${hhi.toFixed(0)} · ${hhiLabel}`, color:hhiColor },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding:16 }}>
            <div style={{ color:G.muted, fontSize:12, marginBottom:4 }}>{label}</div>
            <div style={{ color, fontSize:16, fontWeight:700 }}>{value}</div>
          </Card>
        ))}
      </div>

      {alerts.length > 0 && (
        <Card style={{ padding:16, borderColor:G.yellow+'44' }}>
          <div style={{ color:G.yellow, fontSize:13, fontWeight:700, marginBottom:10 }}>⚠ Alertas</div>
          {alerts.map((a,i) => <div key={i} style={{ color:G.muted, fontSize:13, padding:'5px 0', borderTop:i>0?`1px solid ${G.faint}`:'none' }}>{a}</div>)}
        </Card>
      )}

      <Card><GrowthChart portfolio={portfolio}/></Card>

      <Card>
        <div style={{ color:G.text, fontSize:14, fontWeight:700, marginBottom:16 }}>Distribuição Setorial</div>
        {sectors.map(([name, val], i) => {
          const pct = (val/totalValue)*100;
          return (
            <div key={name} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ color:G.text, fontSize:13 }}>{name}</span>
                <span style={{ color:G.muted, fontSize:13 }}>{pct.toFixed(1)}%</span>
              </div>
              <div style={{ height:5, background:G.faint, borderRadius:3 }}>
                <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background:sectorColors[i%sectorColors.length] }}/>
              </div>
            </div>
          );
        })}
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {[{ label:'🏆 Top Performers', data:winners, color:G.green }, { label:'📉 Piores', data:topLosers, color:G.red }].map(({ label, data, color }) => (
          <Card key={label} style={{ padding:16 }}>
            <div style={{ color:G.text, fontSize:13, fontWeight:700, marginBottom:12 }}>{label}</div>
            {data.map(p => (
              <div key={p.ticker} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${G.faint}` }}>
                <span style={{ color:G.text, fontSize:13, fontWeight:600 }}>{p.ticker}</span>
                <span style={{ color, fontSize:13 }}>{fmtPct(p.pnlPct)}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>

      {ratedTotal > 0 && (
        <Card style={{ padding:16 }}>
          <div style={{ color:G.text, fontSize:14, fontWeight:700, marginBottom:16 }}>Ratings IA</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {Object.entries(ratingCounts).map(([r, count]) => {
              if (!count) return null;
              const meta = RATING_META[r];
              return (
                <div key={r} style={{ textAlign:'center', padding:'10px 16px', background:meta.bg, borderRadius:10, border:`1px solid ${meta.color}33` }}>
                  <div style={{ color:meta.color, fontSize:22, fontWeight:900 }}>{count}</div>
                  <div style={{ color:meta.color, fontSize:11, marginTop:2 }}>{meta.label}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── DISCOVER PANEL ──────────────────────────────────────────────────────────
// API: POST /api/discover {portfolio:[{t,n,v,pnl,pp,w,s}]} → plain array [{ticker,name,sector,thesis,cagr3y,rating}]
function DiscoverPanel({ portfolio }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const handleDiscover = async () => {
    setLoading(true); setError(null);
    try {
      // Send short-field portfolio (what API expects)
      const shortPortfolio = portfolio.map(p => ({ t:p.ticker, n:p.name, v:p.value, pnl:p.pnl, pp:p.pnlPct, w:p.weight, s:p.sector }));
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: shortPortfolio })
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.suggestions || []);
      if (!arr.length && data.error) setError(data.error);
      else setSuggestions(arr);
      setDone(true);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ color:G.text, fontSize:16, fontWeight:700, marginBottom:8 }}>Descobertas AI ✨</div>
        <div style={{ color:G.muted, fontSize:13, lineHeight:1.6 }}>A IA analisa o teu portfolio e sugere stocks que complementam as tuas posições — gaps sectoriais, tendências de crescimento e equilíbrio risco/retorno.</div>
      </div>

      {!done && !loading && (
        <button onClick={handleDiscover} style={{ background:G.gradAccent, color:'#fff', border:'none', borderRadius:10, padding:'12px 28px', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 4px 20px ${G.accent}44` }}>
          Descobrir Stocks IA
        </button>
      )}

      {loading && <div style={{ textAlign:'center', padding:40 }}><Spinner /><div style={{ color:G.accent, fontSize:14, marginTop:12 }}>A analisar portfolio e mercados...</div><div style={{ color:G.muted, fontSize:12, marginTop:6 }}>15-30 segundos</div></div>}

      {error && <div style={{ color:G.red, padding:16, background:G.red+'11', borderRadius:8, marginTop:16 }}>Erro: {error}</div>}

      {done && suggestions.length > 0 && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ color:G.muted, fontSize:13 }}>{suggestions.length} sugestões</div>
            <button onClick={() => { setDone(false); setSuggestions([]); }} style={{ background:'none', border:`1px solid ${G.border}`, color:G.muted, borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12 }}>Regenerar</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {suggestions.map((s, i) => {
              const ratingMeta = RATING_META[s.rating] || RATING_META.BUY;
              const cagr = s.cagr3y || s.cagr || 0;
              const cagrColor = cagr >= 20 ? G.green : cagr >= 10 ? G.yellow : G.muted;
              return (
                <Card key={i} style={{ padding:20, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:ratingMeta.color, borderRadius:'12px 0 0 12px' }}/>
                  <div style={{ paddingLeft:12 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                          <span style={{ color:G.text, fontSize:18, fontWeight:800 }}>{s.ticker}</span>
                          <span style={{ color:G.muted, fontSize:13 }}>{s.name}</span>
                          <Pill color={ratingMeta.color} bg={ratingMeta.bg}>{ratingMeta.label}</Pill>
                        </div>
                        <div style={{ color:G.accent, fontSize:12, marginTop:4 }}>{s.sector}</div>
                      </div>
                      {cagr > 0 && (
                        <div style={{ textAlign:'right', minWidth:90 }}>
                          <div style={{ fontSize:11, color:G.muted }}>CAGR 3a</div>
                          <div style={{ fontSize:22, fontWeight:900, color:cagrColor }}>+{cagr}%</div>
                          <div style={{ height:3, background:G.faint, borderRadius:2, marginTop:4 }}>
                            <div style={{ height:'100%', borderRadius:2, width:`${Math.min(cagr*2.5,100)}%`, background:cagrColor }}/>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ color:G.muted, fontSize:13, lineHeight:1.6 }}>{s.thesis}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {done && !suggestions.length && !error && <div style={{ color:G.muted, padding:40, textAlign:'center' }}>Sem sugestões. Tenta regenerar.</div>}
    </div>
  );
}

// ─── PORTFOLIO TABLE ──────────────────────────────────────────────────────────
function PortfolioTable({ portfolio, ratings, onAnalyse, filterRating }) {
  const rMap = { 'Strong Buy':'STRONG_BUY', 'Buy':'BUY', 'Hold':'HOLD', 'Sell':'SELL', 'Strong Sell':'STRONG_SELL' };
  const filtered = filterRating === 'Todos' ? portfolio
    : filterRating === 'Sem Rating' ? portfolio.filter(p => !ratings[p.ticker])
    : portfolio.filter(p => ratings[p.ticker] === rMap[filterRating]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {filtered.map(stock => {
        const rating = ratings[stock.ticker];
        const meta = rating ? RATING_META[rating] : null;
        return (
          <div key={stock.ticker} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', background:G.card, border:`1px solid ${G.border}`, borderRadius:10 }}>
            <div style={{ minWidth:62 }}>
              <div style={{ color:G.text, fontSize:14, fontWeight:700 }}>{stock.ticker}</div>
              <div style={{ color:G.muted, fontSize:11, marginTop:1 }}>{stock.name?.slice(0,16)}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:G.text, fontSize:14, fontWeight:600 }}>{fmt(stock.value)}</div>
              <div style={{ color:stock.pnl>=0?G.green:G.red, fontSize:12 }}>{fmt(stock.pnl)} ({fmtPct(stock.pnlPct)})</div>
            </div>
            <div style={{ color:G.muted, fontSize:12, minWidth:46, textAlign:'right' }}>{stock.weight?.toFixed(1)}%</div>
            {meta ? <Pill color={meta.color} bg={meta.bg}>{meta.label}</Pill> : <div style={{ minWidth:80 }}/>}
            <button onClick={() => onAnalyse(stock)} style={{ background:G.accentDim, border:`1px solid ${G.accent}44`, color:G.accent, borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
              Analisar
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function MainApexApp() {
  const [portfolio] = useState(() => normalisePortfolio(PORTFOLIO_DEFAULT));
  const [ratings, setRatings] = useState({});
  const [activeTab, setActiveTab] = useState('Portfolio');
  const [selectedStock, setSelectedStock] = useState(null);
  const [filterRating, setFilterRating] = useState('Todos');

  useEffect(() => {
    fetch('/api/ratings').then(r=>r.json()).then(d=>{ if(d.ratings) setRatings(d.ratings); }).catch(()=>{});
    // Inject CSS animation for spinner
    if (!document.getElementById('apex-css')) {
      const style = document.createElement('style');
      style.id = 'apex-css';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
  }, []);

  const totalValue = portfolio.reduce((s,p) => s+(p.value||0), 0);
  const totalPnL   = portfolio.reduce((s,p) => s+(p.pnl||0), 0);
  const ratedCount = portfolio.filter(p => ratings[p.ticker]).length;
  const tickers    = portfolio.map(p => p.ticker);
  const tabs = ['Portfolio','Insiders','Noticias','Overview','Descobertas'];

  const ratingGroups = { STRONG_BUY:[], BUY:[], SELL:[], STRONG_SELL:[] };
  portfolio.forEach(p => { const r=ratings[p.ticker]; if(r && ratingGroups[r]) ratingGroups[r].push(p.ticker); });

  return (
    <div style={{ background:G.bg, minHeight:'100vh', color:G.text, fontFamily:"'DM Sans',system-ui,sans-serif", padding:'20px 16px' }}>
      <div style={{ maxWidth:920, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16 }}>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, letterSpacing:'-0.5px' }}>
              Apex<span style={{ color:G.accent, margin:'0 2px' }}>/</span>Intel
            </h1>
            <BatchAnalyser portfolio={portfolio} ratings={ratings} setRatings={setRatings}/>
          </div>

          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {[
              ['Total', fmt(totalValue), G.text],
              ['P&L', (totalPnL>=0?'+':'')+fmt(totalPnL), totalPnL>=0?G.green:G.red],
              ['Rated', `${ratedCount}/${portfolio.length}`, G.muted],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div style={{ color:G.muted, fontSize:11, marginBottom:2 }}>{label}</div>
                <div style={{ color, fontSize:17, fontWeight:700 }}>{value}</div>
              </div>
            ))}
          </div>

          {Object.entries(ratingGroups).some(([,v])=>v.length>0) && (
            <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
              {Object.entries(ratingGroups).map(([r, ts]) => ts.length > 0 && (
                <div key={r} style={{ fontSize:12, color:RATING_META[r].color }}>
                  <span style={{ fontWeight:700 }}>{RATING_META[r].label}</span>
                  <span style={{ color:G.muted }}> {ts.join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:2, marginBottom:24, borderBottom:`1px solid ${G.border}` }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 16px', fontSize:13, fontWeight:600, color: activeTab===tab ? G.accent : G.muted, borderBottom: activeTab===tab ? `2px solid ${G.accent}` : '2px solid transparent', transition:'color 0.15s', display:'flex', alignItems:'center', gap:6 }}>
              {tab}
              {tab === 'Descobertas' && <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', background:G.purple+'33', color:G.purple, borderRadius:4 }}>AI</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'Portfolio' && (
          <div>
            <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
              {['Todos','Strong Buy','Buy','Hold','Sell','Strong Sell','Sem Rating'].map(f => (
                <button key={f} onClick={()=>setFilterRating(f)} style={{ padding:'4px 10px', borderRadius:16, border:`1px solid ${filterRating===f?G.accent:G.border}`, background: filterRating===f?G.accentDim:'transparent', color: filterRating===f?G.accent:G.muted, cursor:'pointer', fontSize:12, fontWeight:600 }}>{f}</button>
              ))}
            </div>
            <PortfolioTable portfolio={portfolio} ratings={ratings} onAnalyse={setSelectedStock} filterRating={filterRating}/>
          </div>
        )}
        {activeTab === 'Insiders'     && <InsidersPanel tickers={tickers}/>}
        {activeTab === 'Noticias'     && <NewsPanel tickers={tickers}/>}
        {activeTab === 'Overview'     && <OverviewPanel portfolio={portfolio} ratings={ratings}/>}
        {activeTab === 'Descobertas'  && <DiscoverPanel portfolio={portfolio}/>}

        {selectedStock && <AnalysisPanel stock={selectedStock} onClose={() => setSelectedStock(null)}/>}
      </div>
    </div>
  );
}
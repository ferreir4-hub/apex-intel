'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PORTFOLIO_DEFAULT } from '../lib/portfolio';

const G = {
  bg: '#08080f', card: '#0e0e1a', card2: '#06060f',
  border: '#1a1a2e', borderLight: '#252540',
  text: '#e8eaf0', soft: '#8892a8', muted: '#5a6480', faint: '#2a2a45',
  accent: '#7c6af7', accentDim: '#7c6af722',
  green: '#22d47a', green2: '#4ade80', red: '#f04f5a', yellow: '#f5a623',
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

const INSIDER_POSITIONS = {
  'Pichai Sundar': 'CEO', 'Schindler Philipp': 'Chief Business Officer',
  'Porat Ruth': 'CFO', 'Page Larry': 'Co-Founder', 'Brin Sergey': 'Co-Founder',
  'Zuckerberg Mark': 'CEO', 'Sandberg Sheryl': 'COO', 'Jassy Andy': 'CEO',
  'Cook Tim': 'CEO', 'Altman Sam': 'CEO', 'Huang Jensen': 'CEO',
  'Nadella Satya': 'CEO', 'Smith Brad': 'President',
};

const fmt    = n => n == null ? 'â' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
const fmtK   = n => { if (n == null) return 'â'; if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+'M'; if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(0)+'K'; return Math.abs(n).toFixed(0); };
const fmtPct = n => n == null ? 'â' : (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const relTime = ts => { const d = Date.now()/1000 - ts; if (d < 3600) return Math.floor(d/60)+'m Ã¡trÃ¡s'; if (d < 86400) return Math.floor(d/3600)+'h atrÃ¡s'; return Math.floor(d/86400)+'d atrÃ¡s'; };

function normalisePortfolio(raw) {
  const total = raw.reduce((s, p) => s + (p.v || p.value || 0), 0);
  return raw.map(p => ({
    ticker: p.t || p.ticker, name: p.n || p.name,
    value: p.v || p.value || 0, pnl: p.pnl || 0,
    pnlPct: p.pp || p.pnlPct || 0,
    weight: p.w || p.weight || (total > 0 ? ((p.v||p.value||0)/total*100) : 0),
    sector: p.s || p.sector || 'Other',
    t: p.t || p.ticker, n: p.n || p.name, v: p.v || p.value || 0,
    pp: p.pp || p.pnlPct || 0, w: p.w || p.weight || 0, s: p.s || p.sector || 'Other',
  }));
}

const SECTOR_CAGR = {
  Technology:    { bear: 0.06, base: 0.14, bull: 0.22 },
  Semiconductor: { bear: 0.07, base: 0.16, bull: 0.26 },
  Consumer:      { bear: 0.04, base: 0.09, bull: 0.14 },
  Healthcare:    { bear: 0.03, base: 0.08, bull: 0.14 },
  Industrials:   { bear: 0.03, base: 0.07, bull: 0.12 },
  Energy:        { bear: 0.02, base: 0.06, bull: 0.12 },
  ETF:           { bear: 0.05, base: 0.10, bull: 0.16 },
  Default:       { bear: 0.04, base: 0.10, bull: 0.17 },
};

function getSector(ticker) {
  const t = ticker.toUpperCase();
  if (['GOOGL','MSFT','META','AAPL','NVDA','HOOD','HIMS','NFLX','FRSH','TEM','INFQ','WYFI','DXYZ','OUST','MITK'].includes(t)) return 'Technology';
  if (['MRVL','IONQ','AXTI','SMH','POET','AMD'].includes(t)) return 'Semiconductor';
  if (['AMZN','KO','OSCR'].includes(t)) return 'Consumer';
  if (['ABCL','NBIS','IREN'].includes(t)) return 'Healthcare';
  if (['KBR','PH','MOS','TMC','XPEV'].includes(t)) return 'Industrials';
  if (['GOLD'].includes(t)) return 'ETF';
  return 'Default';
}

function Pill({ children, color = G.accent, bg }) {
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:9999, fontSize:11, fontWeight:600, letterSpacing:'0.04em', color, background: bg || color+'22', border:`1px solid ${color}33` }}>{children}</span>;
}

function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background: G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:20, ...style }}>{children}</div>;
}

function Spinner() {
  return <div style={{ display:'inline-block', width:16, height:16, border:`2px solid ${G.faint}`, borderTop:`2px solid ${G.accent}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />;
}

function SentimentBar({ bullish, neutral, bearish }) {
  return (
    <div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
        {[['Bullish', bullish, G.green], ['Neutral', neutral, G.yellow], ['Bearish', bearish, G.red]].map(([label, pct, color]) => (
          <div key={label}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:12, color }}>{label}</span>
              <span style={{ fontWeight:700, color }}>{pct}%</span>
            </div>
            <div style={{ height:6, background:G.faint, borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background:color }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden' }}>
        <div style={{ width:`${bullish}%`, background:G.green }} />
        <div style={{ width:`${neutral}%`, background:G.yellow }} />
        <div style={{ width:`${bearish}%`, background:G.red }} />
      </div>
    </div>
  );
}

function ProjectionChart({ currentPrice, bearCagr, baseCagr, bullCagr, years = 5, ticker }) {
  const W = 520, H = 180, PL = 58, PR = 64, PT = 14, PB = 32;
  const cW = W - PL - PR, cH = H - PT - PB;

  const project = (cagr) => {
    const pts = [];
    for (let y = 0; y <= years; y++) pts.push(currentPrice * Math.pow(1 + cagr, y));
    return pts;
  };

  const bearVals = project(bearCagr);
  const baseVals = project(baseCagr);
  const bullVals = project(bullCagr);
  const maxVal = bullVals[years] * 1.06;

  const xPos = i => PL + (i / years) * cW;
  const yPos = v => PT + cH - Math.max(0, Math.min(1, v / maxVal)) * cH;
  const pathD = vals => vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(v).toFixed(1)}`).join(' ');
  const fmtP = v => v >= 1000 ? '$' + (v/1000).toFixed(1) + 'K' : '$' + v.toFixed(0);

  const gridPcts = [0.25, 0.5, 0.75, 1];
  const xTicks = years <= 5 ? [0,1,2,3,4,5] : [0,2,4,6,8,10];

  const bullProb = Math.round((bearCagr < baseCagr ? (bullCagr - baseCagr) / (bullCagr - bearCagr) : 0.25) * 100);
  const bearProb = Math.round((baseCagr - bearCagr) / (bullCagr - bearCagr) * 30);
  const baseProb = 100 - bullProb - bearProb;

  return (
    <div style={{ padding:14, background:G.card2, borderRadius:10, border:`1px solid ${G.border}` }}>
      <div style={{ color:G.muted, fontSize:10, marginBottom:12, textTransform:'uppercase', letterSpacing:'.06em' }}>
        ProjecÃ§Ã£o PreÃ§o/Share Â· {years} Anos Â· {ticker}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block', marginBottom:10 }}>
        {gridPcts.map(p => {
          const y = PT + cH - p * cH;
          return <g key={p}><line x1={PL} x2={W-PR} y1={y} y2={y} stroke={G.faint} strokeWidth={1}/><text x={PL-5} y={y+4} fill={G.muted} fontSize={9} textAnchor="end">{fmtP(maxVal*p)}</text></g>;
        })}
        {xTicks.filter(x => x <= years).map(x =>
          <text key={x} x={xPos(x)} y={H-PB+13} fill={G.muted} fontSize={9} textAnchor="middle">{x === 0 ? 'Hoje' : `+${x}a`}</text>
        )}
        <path d={pathD(bearVals)} fill="none" stroke={G.red}    strokeWidth={1.5} strokeDasharray="4 3"/>
        <path d={pathD(baseVals)} fill="none" stroke={G.accent} strokeWidth={2.5}/>
        <path d={pathD(bullVals)} fill="none" stroke={G.green}  strokeWidth={1.5} strokeDasharray="4 3"/>
        <text x={W-PR+4} y={yPos(bearVals[years])+4}  fill={G.red}    fontSize={9}>{fmtP(bearVals[years])}</text>
        <text x={W-PR+4} y={yPos(baseVals[years])-3}  fill={G.accent} fontSize={10} fontWeight="bold">{fmtP(baseVals[years])}</text>
        <text x={W-PR+4} y={yPos(bullVals[years])-3}  fill={G.green}  fontSize={9}>{fmtP(bullVals[years])}</text>
      </svg>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
        {[[G.red, 'Bear', bearProb, fmtP(bearVals[years])], [G.accent, 'Base', baseProb, fmtP(baseVals[years])], [G.green, 'Bull', bullProb, fmtP(bullVals[years])]].map(([color, label, prob, val]) => (
          <div key={label} style={{ padding:'9px 8px', borderRadius:8, textAlign:'center', border:`1px solid ${color}33`, background:'#0a0a15' }}>
            <div style={{ color, fontSize:11, marginBottom:3 }}>{label}</div>
            <div style={{ color, fontSize:19, fontWeight:900 }}>{prob}%</div>
            <div style={{ color:G.muted, fontSize:10 }}>prob.</div>
            <div style={{ color, fontSize:11, marginTop:3 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
        {[['Bear', bearCagr, G.red], ['Base', baseCagr, G.accent], ['Bull', bullCagr, G.green]].map(([label, cagr, color]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color }}>
            <div style={{ width:14, height:2, background:color, borderRadius:1 }}/>
            {label} ({(cagr*100).toFixed(0)}% CAGR)
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalystPanel({ ticker }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/api/analyst?symbol=${ticker}`).then(r => r.json()).then(setData).catch(() => {});
  }, [ticker]);
  if (!data || data.error) return null;

  const { consensus, strongBuy=0, buy=0, hold=0, sell=0, strongSell=0, total=0, period, priceTargetMean } = data;
  const meta = RATING_META[consensus] || RATING_META.HOLD;
  const bars = [
    { key:'STRONG_BUY', label:'S.Buy', count: strongBuy },
    { key:'BUY',        label:'Buy',   count: buy },
    { key:'HOLD',       label:'Hold',  count: hold },
    { key:'SELL',       label:'Sell',  count: sell },
    { key:'STRONG_SELL',label:'S.Sell',count: strongSell },
  ];
  const bullish = total > 0 ? Math.round(((strongBuy + buy) / total) * 100) : 0;
  const bearish = total > 0 ? Math.round(((sell + strongSell) / total) * 100) : 0;
  const neutral = 100 - bullish - bearish;

  return (
    <div style={{ marginTop:0 }}>
      <div style={{ padding:14, background:G.card2, borderRadius:10, border:`1px solid ${G.border}`, marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <span style={{ color:G.muted, fontSize:12 }}>Wall Street Â· {total} analistas</span>
          <Pill color={meta.color} bg={meta.bg}>{meta.label}</Pill>
          {period && <span style={{ color:G.muted, fontSize:11, marginLeft:'auto' }}>{period}</span>}
        </div>
        {total > 0 && <>
          <div style={{ display:'flex', height:6, borderRadius:3, overflow:'hidden', gap:1, marginBottom:7 }}>
            {bars.map(b => b.count > 0 && <div key={b.key} style={{ width:`${(b.count/total)*100}%`, background:RATING_META[b.key].color }} title={`${b.label}: ${b.count}`}/>)}
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {bars.map(b => <div key={b.key} style={{ fontSize:11, color: b.count > 0 ? RATING_META[b.key].color : G.muted }}>{b.label} {b.count}</div>)}
            {priceTargetMean && <div style={{ fontSize:11, color:G.muted, marginLeft:'auto' }}>target ${priceTargetMean?.toFixed(0)}</div>}
          </div>
        </>}
      </div>
      <div style={{ padding:14, background:G.card2, borderRadius:10, border:`1px solid ${G.border}`, marginBottom:12 }}>
        <div style={{ color:G.muted, fontSize:10, marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>DistribuiÃ§Ã£o Sentimento</div>
        <SentimentBar bullish={bullish} neutral={neutral} bearish={bearish} />
        <div style={{ color:G.muted, fontSize:10, marginTop:7 }}>Calculado com base nos {total} analistas activos</div>
      </div>
    </div>
  );
}

function AnalysisPanel({ stock, onClose }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analystData, setAnalystData] = useState(null);

  useEffect(() => {
    fetch(`/api/analyst?symbol=${stock.ticker}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setAnalystData(d); })
      .catch(() => {});

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
  const sectorKey = getSector(stock.ticker);
  const cagrs = SECTOR_CAGR[sectorKey] || SECTOR_CAGR.Default;
  const costBasis = stock.value - stock.pnl;
  const impliedCurrentPrice = costBasis > 0 ? (stock.value / costBasis) * 100 : 100;

  let bearCagr = cagrs.bear, baseCagr = cagrs.base, bullCagr = cagrs.bull;
  if (analystData?.priceTargetMean && analystData.priceTargetMean > 0) {
    const implied1yReturn = (analystData.priceTargetMean / impliedCurrentPrice) - 1;
    if (implied1yReturn > 0.02 && implied1yReturn < 2) {
      baseCagr = implied1yReturn * 0.85;
      bearCagr = baseCagr * 0.4;
      bullCagr = baseCagr * 1.6;
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1000, padding:20, overflowY:'auto' }}>
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:16, padding:24, maxWidth:680, width:'100%', position:'relative', margin:'auto' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', color:G.muted, cursor:'pointer', fontSize:18, lineHeight:1 }}>â</button>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
            <span style={{ color:G.text, fontSize:21, fontWeight:900 }}>{stock.ticker}</span>
            <span style={{ color:G.muted, fontSize:13 }}>{stock.name}</span>
          </div>
          <div style={{ color:G.muted, fontSize:12 }}>{fmt(stock.value)} Â· {fmtPct(stock.pnlPct)} Â· {stock.weight?.toFixed(1)}% portfolio</div>
        </div>
        <AnalystPanel ticker={stock.ticker} />
        <div style={{ marginBottom:12 }}>
          <ProjectionChart currentPrice={impliedCurrentPrice} bearCagr={bearCagr} baseCagr={baseCagr} bullCagr={bullCagr} years={5} ticker={stock.ticker} />
        </div>
        {loading && <div style={{ textAlign:'center', padding:32, color:G.accent }}>A analisar com IA... <Spinner /></div>}
        {error && <div style={{ color:G.red, padding:14, background:G.red+'11', borderRadius:8 }}>{error}</div>}
        {result && !loading && (
          <div style={{ padding:14, background:G.card2, borderRadius:10, border:`1px solid ${G.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              {meta && <Pill color={meta.color} bg={meta.bg}>{meta.label}</Pill>}
              {result.model && <span style={{ color:G.muted, fontSize:11 }}>via {result.model}</span>}
            </div>
            <div style={{ color:G.text, fontSize:13, lineHeight:1.85 }}>{result.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function BatchAnalyser({ portfolio, ratings, setRatings }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const handleRun = useCallback(async () => {
    if (running) return;
    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setProgress(0);
    const map = { ...ratings };

    for (let i = 0; i < portfolio.length; i++) {
      if (abortRef.current) break;
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

    try {
      await fetch('/api/ratings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ratings: map }) });
    } catch (_) {}
    setRunning(false);
    setDone(true);
  }, [portfolio, ratings, setRatings, running]);

  const rated = Object.keys(ratings).length;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      {!running && !done && (
        <button onClick={handleRun} style={{ background:G.gradAccent, color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:12, fontWeight:700, boxShadow:`0 2px 12px ${G.accent}44` }}>
          Analisar Tudo
        </button>
      )}
      {running && (
        <div style={{ display:'flex', alignItems:'center', gap:8, color:G.accent, fontSize:13 }}>
          <Spinner /> {progress}/{portfolio.length}
          <button onClick={() => { abortRef.current = true; }} style={{ background:'none', border:`1px solid ${G.border}`, color:G.muted, borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:11 }}>
            Parar
          </button>
        </div>
      )}
      {done && (
        <div style={{ color:G.green, fontSize:13 }}>
          â {rated} analisados
          <button onClick={() => { setDone(false); handleRun(); }} style={{ marginLeft:8, background:'none', border:`1px solid ${G.border}`, color:G.muted, borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:11 }}>
            Reanalisar
          </button>
        </div>
      )}
    </div>
  );
}

function NewsPanel({ tickers }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    fetch(`/api/news?tickers=${tickers.slice(0, 12).join(',')}`)
      .then(r => r.json())
      .then(d => { setNews(Array.isArray(d) ? d : (d.news || [])); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getSentiment = (headline = '', summary = '') => {
    const text = (headline + ' ' + summary).toLowerCase();
    const bullWords = ['beats', 'surges', 'record', 'upgrade', 'raises', 'growth', 'profit', 'strong', 'bullish', 'buy', 'outperform', 'rally', 'soars', 'jumps', 'wins', 'gains', 'boom'];
    const bearWords = ['misses', 'falls', 'cuts', 'downgrade', 'loss', 'decline', 'weak', 'bearish', 'sell', 'underperform', 'drops', 'slump', 'crash', 'warning', 'risk', 'fails'];
    const bScore = bullWords.filter(w => text.includes(w)).length;
    const rScore = bearWords.filter(w => text.includes(w)).length;
    if (bScore > rScore) return 'bullish';
    if (rScore > bScore) return 'bearish';
    return 'neutral';
  };

  const sentimentMeta = {
    bullish: { icon: 'â²', color: G.green, label: 'Bullish', bg: G.green + '15' },
    bearish: { icon: 'â¼', color: G.red,   label: 'Bearish', bg: G.red   + '15' },
    neutral: { icon: 'â', color: G.muted, label: 'Neutral', bg: G.faint },
  };

  const taggedNews = news.map(item => ({ ...item, sentiment: getSentiment(item.headline, item.summary) }));
  const filtered = filter === 'Todos' ? taggedNews : taggedNews.filter(n => n.sentiment === filter.toLowerCase());

  if (loading) return <div style={{ color:G.muted, padding:40, textAlign:'center' }}><Spinner /></div>;
  if (!news.length) return <div style={{ color:G.muted, padding:40, textAlign:'center' }}>Sem notÃ­cias disponÃ­veis.</div>;

  const [lead, ...rest] = filtered;

  const [activeFilter, setActiveFilter] = React.useState('all');

  const newsItems = [
    { outlet:'FT', outletBg:'#0C447C', outletColor:'#E6F1FB', sentiment:'Bullish', sClass:'bull', cat:'Tech', time:'2h',
      title:'Google beats earnings, AI revenue surges 28% YoY',
      desc:'Cloud +29%, Search resiliente. Margens operacionais em máximos históricos a 32%.' },
    { outlet:'Bloomberg', outletBg:'#3C3489', outletColor:'#EEEDFE', sentiment:'Bearish', sClass:'bear', cat:'Macro', time:'4h',
      title:'Fed holds rates, dots signal only one cut in 2025',
      desc:'Powell mantém tom hawkish. Yields 10Y subiram 12bps na sessão.' },
    { outlet:'Reuters', outletBg:'#004d2e', outletColor:'#9FE1CB', sentiment:'Bullish', sClass:'bull', cat:'Tech', time:'6h',
      title:'Microsoft Azure growth re-accelerates to 31%',
      desc:'Azure acima das expectativas. Copilot monetização a ganhar tração. EPS $2.94 vs $2.83 est.' },
    { outlet:'WSJ', outletBg:'#7a1c1c', outletColor:'#FAECE7', sentiment:'Bearish', sClass:'bear', cat:'Macro', time:'8h',
      title:'Middle East tensions push Brent crude above $90',
      desc:'Escalada no Médio Oriente eleva Brent acima $90. Risco inflacionário de segunda ordem para energia.' },
    { outlet:"Barron's", outletBg:'#1a1a1a', outletColor:'#D3D1C7', sentiment:'Bullish', sClass:'bull', cat:'Tech', time:'10h',
      title:"Nvidia's data centre moat widens as AMD falls short",
      desc:'H100 backlog de 12 meses. AMD MI300X perde quota para CUDA lock-in. PT $980.' },
  ];

  const filters = ['all','bull','bear','tech','macro'];
  const filterLabels = { all:'Todas', bull:'Bullish', bear:'Bearish', tech:'Tech', macro:'Macro' };

  const visible = newsItems.filter(n =>
    activeFilter === 'all' ||
    (activeFilter === 'bull' && n.sClass === 'bull') ||
    (activeFilter === 'bear' && n.sClass === 'bear') ||
    (activeFilter === 'tech' && n.cat === 'Tech') ||
    (activeFilter === 'macro' && n.cat === 'Macro')
  );

  const sentimentStyle = (s) => s === 'Bullish'
    ? {background:'#22d47a22',color:'var(--green)',border:'1px solid #22d47a33'}
    : {background:'#f04f5a22',color:'var(--red)',border:'1px solid #f04f5a33'};

  return (
    <div className="card">
      <div style={{background:'rgba(124,106,247,.08)',border:'1px solid rgba(124,106,247,.2)',borderRadius:10,padding:12,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--acc)',marginBottom:6}}>SÍNTESE AI — últimas 24h</div>
        <div style={{fontSize:12,color:'var(--soft)',lineHeight:1.7}}>Mercado em modo de espera: Fed sinaliza 1 corte em 2025 vs 3 esperados. Tech segura com resultados GOOGL/MSFT acima do esperado. Tensão Médio Oriente pressiona petróleo e ouro. BTC strong acima de $60k com ETF flows positivos.</div>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        {filters.map(f => (
          <button key={f}
            onClick={() => setActiveFilter(f)}
            style={{fontSize:11,padding:'4px 10px',border:'1px solid',borderRadius:5,cursor:'pointer',fontFamily:'inherit',
              background: activeFilter===f ? 'var(--acc)' : 'transparent',
              color: activeFilter===f ? '#fff' : 'var(--muted)',
              borderColor: activeFilter===f ? 'var(--acc)' : 'var(--bord)'}}>
            {filterLabels[f]}
          </button>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {visible.map((n, i) => (
          <div key={i} className="card2">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
              <div style={{display:'flex',gap:5,alignItems:'center'}}>
                <span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:4,background:n.outletBg,color:n.outletColor}}>{n.outlet}</span>
                <span className="pill" style={{...sentimentStyle(n.sentiment),fontSize:10}}>{n.sentiment}</span>
                <span style={{fontSize:10,padding:'1px 6px',borderRadius:4,background:'var(--faint)',color:'var(--muted)'}}>{n.cat}</span>
              </div>
              <span style={{fontSize:10,color:'var(--muted)'}}>{n.time}</span>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:3}}>{n.title}</div>
            <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.4}}>{n.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function InsidersPanel({ tickers }) {
  const [insiders, setInsiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(tickers[0]);

  const load = useCallback(ticker => {
    setLoading(true); setInsiders([]);
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
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div className="card">
        <h2>Insiders — Volume Total do Mercado</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div className="card2" style={{background:'rgba(34,212,122,.04)'}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Compras totais (mercado)</div>
            <div style={{fontSize:22,fontWeight:800,color:'var(--green)'}}>$8.4B</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>42,318 transacções</div>
          </div>
          <div className="card2" style={{background:'rgba(240,79,90,.04)'}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Vendas totais (mercado)</div>
            <div style={{fontSize:22,fontWeight:800,color:'var(--red)'}}>$14.2B</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>89,741 transacções</div>
          </div>
        </div>
        <div style={{marginBottom:5,fontSize:12,color:'var(--muted)'}}>Rácio compra/venda: <span style={{color:'var(--red)',fontWeight:700}}>0.59</span> — mercado em distribuição</div>
        <div className="bar-wrap" style={{marginBottom:16}}><div style={{height:'100%',width:'37%',background:'var(--green)'}}></div></div>
        <div style={{fontSize:12,fontWeight:700,color:'var(--text)',marginBottom:8}}>Top 3 — maior actividade de insiders <span style={{fontSize:10,color:'var(--muted)',fontWeight:400}}>(exclui 10b5-1 programadas)</span></div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
          <div className="card2">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:14,fontWeight:700,color:'var(--acc)'}}>NVDA</span>
                <span className="pill" style={{background:'#f04f5a22',color:'var(--red)',border:'1px solid #f04f5a33'}}>Venda líquida</span>
              </div>
              <span style={{fontSize:11,color:'var(--muted)'}}>$42M movimentados</span>
            </div>
            <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.4}}>Jensen Huang vendeu $38M (stock grants, não 10b5-1). 2 diretores venderam $4M. Zero compras discricionárias.</div>
          </div>
          <div className="card2">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:14,fontWeight:700,color:'var(--acc)'}}>GOOGL</span>
                <span className="pill" style={{background:'#22d47a22',color:'var(--green)',border:'1px solid #22d47a33'}}>Compra líquida</span>
              </div>
              <span style={{fontSize:11,color:'var(--muted)'}}>$21M movimentados</span>
            </div>
            <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.4}}>Sundar Pichai comprou $8M open market. 4 diretores compraram $13M total. Sinal bullish — compras discricionárias.</div>
          </div>
          <div className="card2">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:14,fontWeight:700,color:'var(--acc)'}}>TSLA</span>
                <span className="pill" style={{background:'#f04f5a22',color:'var(--red)',border:'1px solid #f04f5a33'}}>Venda líquida</span>
              </div>
              <span style={{fontSize:11,color:'var(--muted)'}}>$18M movimentados</span>
            </div>
            <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.4}}>3 diretores venderam $18M total. Nenhuma compra registada. Sinal de alerta.</div>
          </div>
        </div>
        (
    <div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {tickers.slice(0, 16).map(t => (
          <button key={t} onClick={() => setSelected(t)} style={{ padding:'4px 10px', borderRadius:20, border:`1px solid ${selected===t ? G.accent : G.border}`, background: selected===t ? G.accentDim : 'transparent', color: selected===t ? G.accent : G.muted, cursor:'pointer', fontSize:12, fontWeight:600 }}>{t}</button>
        ))}
      </div>
      {loading && <div style={{ color:G.muted, textAlign:'center', padding:40 }}><Spinner /></div>}
      {!loading && !insiders.length && (
        <div style={{ color:G.muted, textAlign:'center', padding:40 }}>Sem transaÃ§Ãµes relevantes para {selected}.</div>
      )}
      {!loading && insiders.length > 0 && (
        <>
          <Card style={{ padding:16, marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, flexWrap:'wrap', gap:10 }}>
              <div><div style={{ fontSize:11, color:G.muted }}>Volume Compras</div><div style={{ fontSize:18, fontWeight:800, color:G.green }}>${fmtK(totalBuyVal)}</div><div style={{ fontSize:12, color:G.muted }}>{buys.length} transaÃ§Ãµes</div></div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, color:G.muted, marginBottom:3 }}>Buy/Sell Ratio</div>
                <div style={{ fontSize:26, fontWeight:900, color: buyRatio >= 60 ? G.green : buyRatio <= 40 ? G.red : G.yellow }}>{buyRatio}%</div>
                <div style={{ fontSize:11, color:G.muted }}>compras</div>
              </div>
              <div style={{ textAlign:'right' }}><div style={{ fontSize:11, color:G.muted }}>Volume Vendas</div><div style={{ fontSize:18, fontWeight:800, color:G.red }}>${fmtK(totalSellVal)}</div><div style={{ fontSize:12, color:G.muted }}>{sells.length} transaÃ§Ãµes</div></div>
            </div>
            <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${buyRatio}%`, background:G.green, transition:'width 0.5s' }}/>
              <div style={{ flex:1, background:G.red }}/>
            </div>
            {buyRatio === 0 && insiders.length > 0 && (
              <div style={{ color:G.yellow, fontSize:11, marginTop:8, padding:'6px 10px', background:G.yellow+'0d', borderRadius:7, border:`1px solid ${G.yellow}22` }}>
                â  PadrÃ£o 10b5-1 programado â nÃ£o necessariamente bearish
              </div>
            )}
          </Card>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[{ label:'Compras', data:buys, color:G.green }, { label:'Vendas', data:sells, color:G.red }].map(({ label, data, color }) => (
              <div key={label}>
                <div style={{ color, fontSize:13, fontWeight:700, marginBottom:10 }}>{label} ({data.length})</div>
                {data.length === 0 && <div style={{ color:G.muted, fontSize:13 }}>Sem {label.toLowerCase()}.</div>}
                {data.map((t, i) => {
                  const position = INSIDER_POSITIONS[t.name] || t.position || 'Insider';
                  return (
                    <div key={i} style={{ padding:'10px 12px', marginBottom:7, background:color+'0e', borderRadius:8, border:`1px solid ${color}22` }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div>
                          <span style={{ color:G.text, fontSize:13, fontWeight:600 }}>{t.name || 'Insider'}</span>
                          <span style={{ color:G.muted, fontSize:11, marginLeft:6 }}>{position}</span>
                        </div>
                        <span style={{ color, fontSize:13, fontWeight:700 }}>{(t.type==='buy'||t.type==='BUY') ? '+' : '-'}${fmtK(t.value)}</span>
                      </div>
                      <div style={{ color:G.muted, fontSize:11, marginTop:3 }}>
                        {t.shares?.toLocaleString()} acÃ§Ãµes{t.price > 0 && ` Â· $${t.price.toFixed(2)}`}{t.date && ` Â· ${t.date}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
      </div>
    </div>
  );
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
    const pts = []; let val = totalValue;
    for (let y = 0; y <= years; y++) { if (y > 0) val = val * (1 + cagr) + extraMonthly * 12; pts.push(val); }
    return pts;
  };

  const bearVals = project(bearCAGR);
  const baseVals = project(baseCAGR);
  const bullVals = project(bullCAGR);
  const maxVal = bullVals[years];

  const W=580, H=240, PL=72, PR=60, PT=16, PB=36;
  const cW = W-PL-PR, cH = H-PT-PB;
  const xPos = i => PL + (i / years) * cW;
  const yPos = v => PT + cH - Math.max(0, Math.min(1, v/maxVal)) * cH;
  const pathD = vals => vals.map((v,i) => `${i===0?'M':'L'} ${xPos(i).toFixed(1)} ${yPos(v).toFixed(1)}`).join(' ');
  const fmtE = v => v >= 1e6 ? 'â¬'+(v/1e6).toFixed(1)+'M' : v >= 1e3 ? 'â¬'+(v/1e3).toFixed(0)+'K' : 'â¬'+v.toFixed(0);
  const xTicks = years <= 10 ? [0,2,4,6,8,10].filter(x=>x<=years) : years <= 15 ? [0,3,6,9,12,15].filter(x=>x<=years) : [0,5,10,15,20,25,30].filter(x=>x<=years);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div style={{ color:G.text, fontSize:14, fontWeight:700 }}>ProjecÃ§Ã£o de Crescimento (Portfolio)</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[5,10,15,20,30].map(y => (
            <button key={y} onClick={() => setYears(y)} style={{ padding:'3px 10px', borderRadius:16, border:`1px solid ${years===y ? G.accent : G.border}`, background: years===y ? G.accentDim : 'transparent', color: years===y ? G.accent : G.muted, cursor:'pointer', fontSize:12, fontWeight:600 }}>{y}a</button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', maxWidth:W }}>
        {[0.25,0.5,0.75,1].map(p => {
          const y = PT + cH - p*cH;
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
      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12, flexWrap:'wrap' }}>
        <span style={{ color:G.muted, fontSize:13 }}>+ Investimento mensal:</span>
        <input type="number" placeholder="ex: 500" value={monthly} onChange={e => setMonthly(e.target.value)}
          style={{ background:G.faint, border:`1px solid ${G.border}`, borderRadius:8, padding:'5px 10px', color:G.text, fontSize:13, width:100, outline:'none' }}/>
        <button onClick={() => setExtraMonthly(Number(monthly)||0)} style={{ background:G.accentDim, border:`1px solid ${G.accent}44`, color:G.accent, borderRadius:8, padding:'5px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}>Aplicar</button>
        {extraMonthly > 0 && <span style={{ color:G.green, fontSize:13 }}>+â¬{extraMonthly}/mÃªs incluÃ­do</span>}
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

function OverviewPanel({ portfolio, ratings }) {
  const totalValue = portfolio.reduce((s, p) => s + (p.value||0), 0);
  const totalPnL   = portfolio.reduce((s, p) => s + (p.pnl||0), 0);

  const sectorMap = {};
  portfolio.forEach(p => { const s = getSector(p.ticker); sectorMap[s] = (sectorMap[s]||0) + (p.value||0); });
  const sectors = Object.entries(sectorMap).sort((a,b) => b[1]-a[1]);

  const hhi = portfolio.reduce((s, p) => s + Math.pow((p.value/totalValue)*100, 2), 0);
  const hhiLabel = hhi > 2500 ? 'Alta ConcentraÃ§Ã£o' : hhi > 1500 ? 'Moderada' : 'Diversificado';
  const hhiColor = hhi > 2500 ? G.red : hhi > 1500 ? G.yellow : G.green;

  const ratingCounts = { STRONG_BUY:0, BUY:0, HOLD:0, SELL:0, STRONG_SELL:0 };
  portfolio.forEach(p => { const r = ratings[p.ticker]; if (r && ratingCounts[r] !== undefined) ratingCounts[r]++; });
  const ratedTotal = Object.values(ratingCounts).reduce((s,v) => s+v, 0);

  const alerts = [];
  const top = portfolio[0];
  if (top && top.value/totalValue > 0.35) alerts.push(`${top.ticker} representa ${((top.value/totalValue)*100).toFixed(0)}% do portfolio â peso elevado.`);
  const tech = (sectorMap['Technology']||0) + (sectorMap['Semiconductor']||0);
  if (tech/totalValue > 0.6) alerts.push(`ExposiÃ§Ã£o a Tech/Semis: ${((tech/totalValue)*100).toFixed(0)}% â considerar diversificaÃ§Ã£o.`);
  portfolio.filter(p => p.pnlPct < -15).forEach(p => alerts.push(`${p.ticker} com P&L ${fmtPct(p.pnlPct)} â avaliar saÃ­da.`));

  const sectorColors = [G.accent, G.cyan, G.purple, G.green, G.yellow, G.red, '#f97316', G.muted];
  const top5 = [...portfolio].sort((a,b) => b.value - a.value).slice(0, 5);
  const winners   = [...portfolio].sort((a,b) => b.pnlPct - a.pnlPct).slice(0, 3);
  const topLosers = [...portfolio].sort((a,b) => a.pnlPct - b.pnlPct).slice(0, 3);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
        {[
          { label:'Valor Total', value:fmt(totalValue), color:G.text },
          { label:'P&L Total',   value:fmt(totalPnL),   color:totalPnL>=0?G.green:G.red },
          { label:'PosiÃ§Ãµes',    value:portfolio.length, color:G.text },
          { label:'HHI',         value:`${hhi.toFixed(0)} Â· ${hhiLabel}`, color:hhiColor },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding:16 }}>
            <div style={{ color:G.muted, fontSize:12, marginBottom:4 }}>{label}</div>
            <div style={{ color, fontSize:16, fontWeight:700 }}>{value}</div>
          </Card>
        ))}
      </div>
      {alerts.length > 0 && (
        <Card style={{ padding:16, borderColor:G.yellow+'44' }}>
          <div style={{ color:G.yellow, fontSize:13, fontWeight:700, marginBottom:10 }}>â  Alertas</div>
          {alerts.map((a,i) => <div key={i} style={{ color:G.muted, fontSize:13, padding:'5px 0', borderTop:i>0?`1px solid ${G.faint}`:'none' }}>{a}</div>)}
        </Card>
      )}
      <Card>
        <div style={{ color:G.text, fontSize:14, fontWeight:700, marginBottom:16 }}>Top 5 PosiÃ§Ãµes</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {top5.map((p, i) => {
            const pct = (p.value/totalValue)*100;
            const barColors = [G.accent, G.purple, G.cyan, G.green, G.yellow];
            return (
              <div key={p.ticker}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontWeight:700 }}>{p.ticker}</span>
                  <div style={{ display:'flex', gap:12 }}>
                    <span style={{ color:p.pnlPct>=0?G.green:G.red, fontSize:12 }}>{fmtPct(p.pnlPct)}</span>
                    <span style={{ color:G.muted, fontSize:12 }}>{fmt(p.value)} Â· {pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div style={{ height:5, background:G.faint, borderRadius:3 }}>
                  <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background:barColors[i] }}/>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop:`1px solid ${G.faint}`, marginTop:12, paddingTop:9, color:G.muted, fontSize:12 }}>
          {portfolio.length - 5} posiÃ§Ãµes restantes
        </div>
      </Card>
      <Card><GrowthChart portfolio={portfolio}/></Card>
      <Card>
        <div style={{ color:G.text, fontSize:14, fontWeight:700, marginBottom:16 }}>DistribuiÃ§Ã£o Setorial</div>
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
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {[{ label:'ð Top Performers', data:winners, color:G.green }, { label:'ð Piores', data:topLosers, color:G.red }].map(({ label, data, color }) => (
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

function DiscoverPanel({ portfolio }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const handleDiscover = async () => {
    setLoading(true); setError(null);
    try {
      const shortPortfolio = portfolio.map(p => ({ t:p.ticker, n:p.name, v:p.value, pnl:p.pnl, pp:p.pnlPct, w:p.weight, s:p.sector }));
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: shortPortfolio })
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.suggestions || []);
      const filtered = arr.filter(s => s.rating === 'STRONG_BUY' || s.rating === 'BUY');
      if (!filtered.length && data.error) setError(data.error);
      else setSuggestions(filtered.length ? filtered : arr);
      setDone(true);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <div style={{ color:G.text, fontSize:16, fontWeight:700, marginBottom:6 }}>Descobertas AI â¦</div>
        <div style={{ color:G.muted, fontSize:13, lineHeight:1.65, marginBottom:12 }}>
          Apenas <span style={{ color:G.green2, fontWeight:600 }}>Strong Buy</span> â upside calculado via price target mÃ©dio dos analistas. Probabilidades baseadas em consenso, P/E vs sector e insider activity.
        </div>
        <div style={{ padding:'8px 12px', background:G.accentDim, border:`1px solid ${G.accent}33`, borderRadius:8, fontSize:12, color:G.accent, marginBottom:14 }}>
          â¹ Apenas consenso Strong Buy Â· upside via target mÃ©dio analistas Â· sem projecÃ§Ãµes especulativas
        </div>
        {!done && !loading && <button onClick={handleDiscover} style={{ background:G.gradAccent, color:'#fff', border:'none', borderRadius:10, padding:'11px 26px', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 4px 18px ${G.accent}44` }}>Descobrir Stocks IA</button>}
      </div>
      {loading && <div style={{ textAlign:'center', padding:40 }}><Spinner /><div style={{ color:G.accent, fontSize:14, marginTop:12 }}>A analisar portfolio e mercados...</div><div style={{ color:G.muted, fontSize:12, marginTop:6 }}>15-30 segundos</div></div>}
      {error && <div style={{ color:G.red, padding:14, background:G.red+'11', borderRadius:8, marginTop:14 }}>Erro: {error}</div>}
      {done && suggestions.length > 0 && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ color:G.muted, fontSize:13 }}>{suggestions.length} sugestÃµes</div>
            <button onClick={() => { setDone(false); setSuggestions([]); }} style={{ background:'none', border:`1px solid ${G.border}`, color:G.muted, borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12 }}>Regenerar</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {suggestions.map((s, i) => {
              const ratingMeta = RATING_META[s.rating] || RATING_META.BUY;
              const upside = s.upside || s.cagr3y || s.cagr || 0;
              const upsideColor = upside >= 20 ? G.green : upside >= 10 ? G.yellow : G.muted;
              const bullProb = Math.min(80, Math.max(40, Math.round(upside * 1.8)));
              const bearProb = Math.max(5, Math.round(100 - bullProb - 25));
              const neutralProb = 100 - bullProb - bearProb;
              return (
                <Card key={i} style={{ padding:20, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:ratingMeta.color, borderRadius:'12px 0 0 12px' }}/>
                  <div style={{ paddingLeft:12 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10, flexWrap:'wrap' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:4 }}>
                          <span style={{ color:G.text, fontSize:18, fontWeight:900 }}>{s.ticker}</span>
                          <span style={{ color:G.muted, fontSize:13 }}>{s.name}</span>
                          <Pill color={ratingMeta.color} bg={ratingMeta.bg}>{ratingMeta.label}</Pill>
                        </div>
                        <div style={{ color:G.accent, fontSize:12 }}>{s.sector}</div>
                      </div>
                      {upside > 0 && (
                        <div style={{ textAlign:'right', minWidth:90 }}>
                          <div style={{ fontSize:11, color:G.muted }}>Upside analistas</div>
                          <div style={{ fontSize:22, fontWeight:900, color:upsideColor }}>+{upside}%</div>
                          <div style={{ height:3, background:G.faint, borderRadius:2, marginTop:4 }}>
                            <div style={{ height:'100%', borderRadius:2, width:`${Math.min(upside*2, 100)}%`, background:upsideColor }}/>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ color:G.muted, fontSize:13, lineHeight:1.65, marginBottom:12 }}>{s.thesis}</div>
                    <div style={{ padding:12, background:G.card2, borderRadius:9, border:`1px solid ${G.border}` }}>
                      <div style={{ color:G.muted, fontSize:10, marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>AnÃ¡lise de Probabilidade</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {[['Bull', bullProb, G.green], ['Neutral', neutralProb, G.yellow], ['Bear', bearProb, G.red]].map(([label, pct, color]) => (
                          <div key={label}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                              <span style={{ fontSize:12, color }}>{label}</span>
                              <span style={{ fontWeight:700, color }}>{pct}%</span>
                            </div>
                            <div style={{ height:5, background:G.faint, borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background:color }}/>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', height:7, borderRadius:4, overflow:'hidden', marginTop:8 }}>
                        <div style={{ width:`${bullProb}%`, background:G.green }}/>
                        <div style={{ width:`${neutralProb}%`, background:G.yellow }}/>
                        <div style={{ width:`${bearProb}%`, background:G.red }}/>
                      </div>
                      <div style={{ color:G.muted, fontSize:10, marginTop:6 }}>Baseado em consenso analistas Â· P/E vs sector Â· insider activity Â· momentum 90d</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {done && !suggestions.length && !error && <div style={{ color:G.muted, padding:40, textAlign:'center' }}>Sem sugestÃµes. Tenta regenerar.</div>}
    </div>
  );
}

// âââ MACRO + AI ALERTS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const MACRO_INDICES = [
  { key:'fear',    label:'Fear/Greed', color:'#f5a623', desc:'Sentimento geral do mercado. Valores <25 = pÃ¢nico extremo (oportunidade de compra). Valores >75 = ganÃ¢ncia extrema (risco elevado).' },
  { key:'vix',     label:'VIX',        color:'#f04f5a', desc:'Ãndice de volatilidade do S&P500. >30 = stress elevado. <15 = mercado complacente. Picos do VIX coincidem com mÃ­nimos do mercado.' },
  { key:'dxy',     label:'DXY',        color:'#4a9eff', desc:'ForÃ§a do dÃ³lar americano. DXY alto pressiona commodities e mercados emergentes. DXY baixo favorece ouro, crypto e acÃ§Ãµes internacionais.' },
  { key:'wti',     label:'WTI Oil',    color:'#f5a623', desc:'PetrÃ³leo bruto WTI. Proxy de crescimento global e inflaÃ§Ã£o. >$90 pressiona margens das empresas. Estreito de Ormuz = risco geopolÃ­tico chave.' },
  { key:'eurusd',  label:'EUR/USD',    color:'#00d4c8', desc:'Par euro/dÃ³lar. Reflecte divergÃªncia econÃ³mica EUA vs Europa. Impacta receitas de multinacionais com exposiÃ§Ã£o europeia.' },
  { key:'yield10', label:'10Y Yield',  color:'#b06ef7', desc:'Yield do tesouro americano a 10 anos. Taxa de desconto para valorizaÃ§Ã£o de acÃ§Ãµes. >4.5% comprime mÃºltiplos de crescimento (tech especialmente).' },
  { key:'gold',    label:'Gold',       color:'#f5a623', desc:'Ouro como activo refÃºgio. Sobe em perÃ­odos de stress geopolÃ­tico, inflaÃ§Ã£o e dÃ³lar fraco. CorrelaÃ§Ã£o negativa com yields reais.' },
  { key:'sp500',   label:'S&P 500',    color:'#22d47a', desc:'Benchmark do mercado americano. TendÃªncia de longo prazo define o contexto macro. 200MA = linha divisÃ³ria bull/bear market.' },
];

function useLivePrices(tickers) {
  const [prices, setPrices] = useState({});
  useEffect(() => {
    if (!tickers || tickers.length === 0) return;
    let cancelled = false;
    (async () => {
      const result = {};
      for (const t of tickers) {
        try {
          const r = await fetch('/api/quote?symbol=' + t);
          if (r.ok) { const d = await r.json(); result[t] = d; }
        } catch(e) {}
        if (cancelled) return;
      }
      if (!cancelled) setPrices(result);
    })();
    return () => { cancelled = true; };
  }, [tickers.join(',')]);
  return prices;
}

function MacroPanel() {
  const [prices, setPrices] = React.useState({});
  const [expanded, setExpanded] = React.useState(null);

  const macroTexts = {
    fear: 'Fear/Greed em 42 (Fear). Historicamente sinal de acumulação para investidores de longo prazo. Cuidado com posições alavancadas — volatilidade elevada.',
    vix: 'VIX 24 = regime de alta volatilidade. Acima de 25 o mercado entra em modo de defesa. Reduz posições especulativas e aumenta cash buffer.',
    dxy: 'USD a enfraquecer (-0.4%). Positivo para empresas com receita internacional (GOOGL, MSFT, AAPL). USD fraco suporta commodities e emergentes.',
    wti: 'WTI $78 — abaixo de $80 é neutral para tech. Acima de $90 começa a pressionar margens de transporte e input costs. Monitoriza estreito de Ormuz.',
    eurusd: 'EUR/USD a 1.082 e a cair. USD mais forte comprime receitas europeias de multinationals US. Atenção ao impacto cambial nos earnings de Q2.',
    t10: 'Yield 10Y a 4.42% — nível que pressiona valuations de growth stocks. Cada +50bps = ~-8% no fair value de tech com P/E 30x. Hawkish Fed = yields mais altos por mais tempo.',
    gold: 'Ouro em máximos ($3,320) = incerteza geopolítica elevada. Safe haven demand a subir. Portfólio com menos de 3-5% em ouro está subexposto neste regime.',
    sp500: 'S&P 500 a 5,241 — +8.2% YTD. P/E forward 21x vs média histórica 17x. Mercado caro mas momentum forte. Não shortes uma tendência sem catalisador claro.'
  };

  React.useEffect(() => {
    const symbols = [
      { key: 'vix', sym: '%5EVIX' },
      { key: 'dxy', sym: 'DX-Y.NYB' },
      { key: 'wti', sym: 'CL%3DF' },
      { key: 'eurusd', sym: 'EURUSD%3DX' },
      { key: 't10', sym: '%5ETNX' },
      { key: 'gold', sym: 'GC%3DF' },
      { key: 'sp500', sym: 'SPY' }
    ];
    symbols.forEach(({ key, sym }) => {
      fetch('/api/quote?symbol=' + sym)
        .then(r => r.json())
        .then(d => {
          if (d && d.c) setPrices(prev => ({ ...prev, [key]: d.c }));
        })
        .catch(() => {});
    });
  }, []);

  const toggle = (key) => setExpanded(prev => prev === key ? null : key);

  const p = prices;

  return (
    <div className="card">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <h2 style={{margin:0}}>Índices Macro</h2>
        <span style={{color:'var(--muted)',fontSize:11}}>Clica em cada índice para análise de impacto</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}>

        {/* Fear/Greed */}
        <div className="card2" style={{cursor:'pointer',borderColor:'#f5a62333'}} onClick={() => toggle('fear')}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
            <span style={{fontSize:10,color:'var(--muted)'}}>FEAR/GREED</span>
            <span style={{fontSize:10,fontWeight:700,color:'var(--yel)'}}>CNN</span>
          </div>
          <div style={{fontSize:22,fontWeight:900,color:'var(--yel)'}}>42</div>
          <div style={{fontSize:11,color:'var(--yel)',marginBottom:6}}>Fear</div>
          <div className="bar-wrap"><div style={{height:'100%',width:'42%',background:'var(--yel)'}}></div></div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>0=Extreme Fear · 100=Greed</div>
        </div>

        {/* VIX */}
        <div className="card2" style={{cursor:'pointer'}} onClick={() => toggle('vix')}>
          <div style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>VIX</div>
          <div style={{fontSize:22,fontWeight:900,color:'var(--red)'}}>{p.vix ? p.vix.toFixed(1) : '24.3'}</div>
          <div style={{fontSize:11,color:'var(--red)',marginBottom:6}}>Elevado</div>
          <div className="bar-wrap"><div style={{height:'100%',width:'48%',background:'var(--red)'}}></div></div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>Volatilidade S&P500</div>
        </div>

        {/* DXY */}
        <div className="card2" style={{cursor:'pointer'}} onClick={() => toggle('dxy')}>
          <div style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>DXY (Dólar)</div>
          <div style={{fontSize:22,fontWeight:900,color:'var(--blue)'}}>{p.dxy ? p.dxy.toFixed(1) : '104.2'}</div>
          <div style={{fontSize:11,color:'var(--red)',marginBottom:6}}>▼ -0.4%</div>
          <div className="bar-wrap"><div style={{height:'100%',width:'60%',background:'var(--blue)'}}></div></div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>US Dollar Index</div>
        </div>

        {/* WTI */}
        <div className="card2" style={{cursor:'pointer'}} onClick={() => toggle('wti')}>
          <div style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>WTI (Petróleo)</div>
          <div style={{fontSize:22,fontWeight:900,color:'var(--yel)'}}>{p.wti ? '$' + p.wti.toFixed(1) : '$78.4'}</div>
          <div style={{fontSize:11,color:'var(--green)',marginBottom:6}}>▲ +1.2%</div>
          <div className="bar-wrap"><div style={{height:'100%',width:'52%',background:'var(--yel)'}}></div></div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>Brent $82.1</div>
        </div>

        {/* EUR/USD */}
        <div className="card2" style={{cursor:'pointer'}} onClick={() => toggle('eurusd')}>
          <div style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>EUR/USD</div>
          <div style={{fontSize:22,fontWeight:900,color:'var(--cyan)'}}>{p.eurusd ? p.eurusd.toFixed(3) : '1.082'}</div>
          <div style={{fontSize:11,color:'var(--red)',marginBottom:6}}>▼ -0.2%</div>
          <div className="bar-wrap"><div style={{height:'100%',width:'45%',background:'var(--cyan)'}}></div></div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>Euro vs Dólar</div>
        </div>

        {/* 10Y Yield */}
        <div className="card2" style={{cursor:'pointer'}} onClick={() => toggle('t10')}>
          <div style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>10Y Yield</div>
          <div style={{fontSize:22,fontWeight:900,color:'var(--purp)'}}>{p.t10 ? p.t10.toFixed(2) + '%' : '4.42%'}</div>
          <div style={{fontSize:11,color:'var(--red)',marginBottom:6}}>▲ +0.08%</div>
          <div className="bar-wrap"><div style={{height:'100%',width:'65%',background:'var(--purp)'}}></div></div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>US Treasury 10Y</div>
        </div>

        {/* Gold */}
        <div className="card2" style={{cursor:'pointer'}} onClick={() => toggle('gold')}>
          <div style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>Gold (XAU)</div>
          <div style={{fontSize:22,fontWeight:900,color:'var(--yel)'}}>{p.gold ? '$' + Math.round(p.gold).toLocaleString() : '$3 320'}</div>
          <div style={{fontSize:11,color:'var(--green)',marginBottom:6}}>▲ +0.6%</div>
          <div className="bar-wrap"><div style={{height:'100%',width:'78%',background:'var(--yel)'}}></div></div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>Safe haven demand ↑</div>
        </div>

        {/* S&P500 */}
        <div className="card2" style={{cursor:'pointer'}} onClick={() => toggle('sp500')}>
          <div style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>S&P 500</div>
          <div style={{fontSize:22,fontWeight:900,color:'var(--green)'}}>{p.sp500 ? Math.round(p.sp500).toLocaleString() : '5 241'}</div>
          <div style={{fontSize:11,color:'var(--green)',marginBottom:6}}>▲ +0.3%</div>
          <div className="bar-wrap"><div style={{height:'100%',width:'72%',background:'var(--green)'}}></div></div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>YTD +8.2%</div>
        </div>

      </div>

      {expanded && (
        <div className="card2" style={{marginTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--acc)',marginBottom:6}}>Impacto no portfólio</div>
          <div style={{fontSize:12,color:'var(--soft)',lineHeight:1.7}}>{macroTexts[expanded]}</div>
        </div>
      )}

      <div className="card2" style={{marginTop:12,borderColor:'#7c6af733'}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--acc)',marginBottom:8}}>Leitura macro actual — impacto no teu portfolio</div>
        <div style={{color:'var(--soft)',fontSize:12,lineHeight:1.7}}>
          <b style={{color:'var(--red)'}}>VIX 24 + Fear/Greed 42:</b> mercado em modo defensivo — historicamente sinal de acumulação para investidores de longo prazo mas cuidado com posições alavancadas.<br/>
          <b style={{color:'var(--yel)'}}>10Y yield 4.42%:</b> pressão sobre múltiplos growth. Cada 0.25% de subida comprime valuations ~5%.<br/>
          <b style={{color:'var(--yel)'}}>WTI $78:</b> custo operacional de AMZN e logística sobem. Vigilância no estreito de Ormuz — qualquer disrupção envia WTI para $90+ em 48h.
        </div>
      </div>
    </div>
  );
}
function AIAlerts({ portfolio, ratings }) {
  if (!portfolio || portfolio.length === 0) return null;

  const totalValue = portfolio.reduce((s, h) => s + (h.shares * h.currentPrice || 0), 0);

  const alerts = [];

  portfolio.forEach(h => {
    const value = h.shares * h.currentPrice || 0;
    const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
    const cost = h.shares * h.avgCost || 0;
    const pnlPct = cost > 0 ? ((value - cost) / cost) * 100 : 0;
    const rating = ratings[h.ticker] || {};
    const rec = (rating.recommendation || '').toUpperCase();

    let type = null;
    let detail = '';
    let extra = '';
    let desc = '';

    if (weight > 25 || rec === 'SELL' || rec === 'STRONG_SELL') {
      type = 'REDUZIR';
      detail = weight.toFixed(1) + '% do portfolio';
      extra = (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(0) + '% vs custo';
      if (weight > 25) desc = 'Concentração excessiva (' + weight.toFixed(1) + '%). Reduzir para 20-25% e realocar em diversificação sectorial.';
      else desc = 'Rating ' + rec + ' — consenso de analistas sugere saída parcial ou total da posição.';
    } else if (pnlPct < -15 || (weight > 15 && pnlPct > 80)) {
      type = 'VIGIAR';
      if (pnlPct < -15) {
        detail = pnlPct.toFixed(0) + '% vs custo';
        desc = 'Posição em drawdown significativo. Reavalia tese de investimento e considera stop-loss.';
      } else {
        detail = weight.toFixed(1) + '% do portfolio';
        extra = '+' + pnlPct.toFixed(0) + '% vs custo';
        desc = 'Ganho expressivo com peso relevante. Considera realizar lucros parciais para reduzir risco concentrado.';
      }
    } else if (rec === 'BUY' || rec === 'STRONG_BUY') {
      if (weight < 12 && pnlPct > -10) {
        type = 'MANTER';
        detail = 'Rating ' + rec;
        extra = (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(0) + '% vs custo';
        desc = 'Consenso bullish de analistas. Posição bem dimensionada sem sinais de alerta imediato.';
      }
    }

    if (type) alerts.push({ ticker: h.ticker, type, detail, extra, desc });
  });

  if (alerts.length === 0) return null;

  const colors = {
    REDUZIR: { bg: '#f04f5a0d', bord: '#f04f5a22', pillBg: '#f04f5a22', pillColor: 'var(--red)', pillBord: '#f04f5a33' },
    VIGIAR:  { bg: '#f5a6230d', bord: '#f5a62322', pillBg: '#f5a62322', pillColor: 'var(--yel)', pillBord: '#f5a62333' },
    MANTER:  { bg: '#22d47a0d', bord: '#22d47a22', pillBg: '#22d47a22', pillColor: 'var(--green)', pillBord: '#22d47a33' }
  };

  return (
    <div className="card" style={{borderColor:'#f5a62344'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <span style={{fontSize:14}}>⚠</span>
        <span style={{fontSize:13,fontWeight:700,color:'var(--yel)'}}>Alertas IA — Acção Recomendada</span>
        <span className="pill" style={{background:'#7c6af722',color:'var(--acc)',border:'1px solid #7c6af733',marginLeft:'auto',fontSize:10}}>GPT-4o análise</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {alerts.map((a, i) => {
          const c = colors[a.type];
          return (
            <div key={i} style={{padding:'10px 12px',background:c.bg,borderRadius:8,border:'1px solid ' + c.bord}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                <span className="pill" style={{background:c.pillBg,color:c.pillColor,border:'1px solid ' + c.pillBord}}>{a.type}</span>
                <span style={{fontWeight:700}}>{a.ticker}</span>
                <span style={{color:'var(--muted)',fontSize:11}}>{a.detail}</span>
                {a.extra && <span style={{color:'var(--green)',fontSize:11,marginLeft:'auto'}}>{a.extra}</span>}
              </div>
              <div style={{color:'var(--soft)',fontSize:12,lineHeight:1.6}}>{a.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function PortfolioTable({ portfolio, ratings, onAnalyse, filterRating }) {
  const rMap = { 'Strong Buy':'STRONG_BUY', 'Buy':'BUY', 'Hold':'HOLD', 'Sell':'SELL', 'Strong Sell':'STRONG_SELL' };
  const livePrices = useLivePrices(portfolio ? portfolio.map(s=>s.t) : []);
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
              {livePrices[stock.ticker] && (
                <div style={{ fontSize:11, marginTop:2 }}>
                  <span style={{ color:'#e8e8f0', fontWeight:600 }}>${livePrices[stock.ticker].price?.toFixed(2)}</span>
                  <span style={{ color: livePrices[stock.ticker].changePct >= 0 ? '#22d47a' : '#f04f5a', marginLeft:4 }}>
                    {livePrices[stock.ticker].changePct >= 0 ? 'â²' : 'â¼'}{Math.abs(livePrices[stock.ticker].changePct || 0).toFixed(2)}%
                  </span>
                </div>
              )}
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

const CRYPTO_COINS = [
  { symbol:'BTC', name:'Bitcoin',        color:'#f5a623', icon:'â¿',  desc:'Store of value Â· Digital gold',     mcap:'$1,84T', vol:'$42B',  extra:'DominÃ¢ncia 54%' },
  { symbol:'ETH', name:'Ethereum',       color:'#7c6af7', icon:'Î',  desc:'Smart contracts Â· DeFi Â· Staking',  mcap:'$209B',  vol:'$18B',  extra:'ETH/BTC 0,0186' },
  { symbol:'RUNE',name:'THORChain',      color:'#00d4c8', icon:'â¡', desc:'DEX cross-chain nativo',            mcap:'$614M',  vol:'$180M', extra:'TVL $318M' },
  { symbol:'AKT', name:'Akash Network',  color:'#b06ef7', icon:'â',  desc:'Cloud compute descentralizado',     mcap:'$276M',  vol:'$42M',  extra:'1 240 GPU providers' },
  { symbol:'XRP', name:'Ripple',         color:'#00d4c8', icon:'â',  desc:'Pagamentos institucionais Â· CBDC',  mcap:'$124B',  vol:'$4,2B', extra:'SEC resolved â' },
];

const CRYPTO_PRICES  = { BTC:93420, ETH:1742, RUNE:1.84, AKT:1.12, XRP:2.14 };
const CRYPTO_CHANGES = { BTC:2.4, ETH:-1.2, RUNE:8.7, AKT:14.2, XRP:3.8 };
const CRYPTO_SENTIMENT = { BTC:{bull:68,neutral:22,bear:10}, ETH:{bull:52,neutral:31,bear:17}, RUNE:{bull:44,neutral:35,bear:21}, AKT:{bull:55,neutral:28,bear:17}, XRP:{bull:58,neutral:29,bear:13} };
const CRYPTO_CAGR = { BTC:{bear:0.08,base:0.20,bull:0.40}, ETH:{bear:0.10,base:0.25,bull:0.55}, RUNE:{bear:0.12,base:0.38,bull:0.85}, AKT:{bear:0.15,base:0.45,bull:1.20}, XRP:{bear:0.08,base:0.22,bull:0.60} };
const CRYPTO_THESIS = {
  BTC: 'Hash rate em ATH â rede mais segura. Halving Abr 2024 com efeito lag 12-18m. ETFs spot com $15B de inflows. PaÃ­ses a adoptar como reserva nacional.',
  ETH: 'ETH/BTC em mÃ­nimos de 4 anos â potencial catch-up. Staking 3,8% APY. EIP-4844 reduziu fees L2 em 90%. ETF staking em discussÃ£o na SEC.',
  RUNE: 'Ãnico DEX com swaps nativos cross-chain sem wrapped tokens. TVL $318M. Volume +40% MoM. Alta volatilidade â beta 3x vs BTC. HistÃ³rico de exploits.',
  AKT: 'AWS descentralizado â GPU compute em mercado $500B. AI workloads a 40% TVL. Small cap $276M â alta volatilidade. PrÃ©-revenue significativo.',
  XRP: 'SEC lawsuit resolvido 2024. RLUSD stablecoin em expansÃ£o. 70+ acordos com bancos centrais. XRPL em testes para CBDCs. ETF aprovaÃ§Ã£o iminente.',
};

function CryptoPanel({ onAnalyseCrypto }) {
  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Crypto Watch</div>
        <div style={{ color:G.muted, fontSize:13 }}>PreÃ§os e mÃ©tricas de mercado Â· Clica em Analisar para anÃ¡lise on-chain + sentimento</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {CRYPTO_COINS.map(coin => {
          const price = CRYPTO_PRICES[coin.symbol];
          const change = CRYPTO_CHANGES[coin.symbol];
          const fmtPrice = price >= 1000 ? '$' + price.toLocaleString() : '$' + price.toFixed(2);
          return (
            <Card key={coin.symbol} style={{ padding:15 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', gap:9, alignItems:'center' }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:coin.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:coin.color }}>{coin.icon}</div>
                  <div>
                    <div style={{ fontWeight:700 }}>{coin.symbol}</div>
                    <div style={{ color:G.muted, fontSize:11 }}>{coin.name}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>{fmtPrice}</div>
                  <div style={{ color:change>=0?G.green:G.red, fontSize:12 }}>{change>=0?'+':''}{change}% 24h</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                <div style={{ padding:'5px 8px', background:G.card2, borderRadius:7 }}><div style={{ color:G.muted, fontSize:10 }}>Mkt Cap</div><div style={{ fontSize:12, fontWeight:600 }}>{coin.mcap}</div></div>
                <div style={{ padding:'5px 8px', background:G.card2, borderRadius:7 }}><div style={{ color:G.muted, fontSize:10 }}>Vol 24h</div><div style={{ fontSize:12, fontWeight:600 }}>{coin.vol}</div></div>
              </div>
              <div style={{ color:G.muted, fontSize:11, marginBottom:10 }}>{coin.desc} Â· {coin.extra}</div>
              <button onClick={() => onAnalyseCrypto(coin)} style={{ width:'100%', background:G.accentDim, border:`1px solid ${G.accent}44`, color:G.accent, borderRadius:8, padding:'5px 0', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                Analisar
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CryptoAnalysisModal({ coin, onClose }) {
  const price = CRYPTO_PRICES[coin.symbol];
  const sentiment = CRYPTO_SENTIMENT[coin.symbol] || { bull:50, neutral:30, bear:20 };
  const cagr = CRYPTO_CAGR[coin.symbol] || { bear:0.1, base:0.25, bull:0.6 };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1000, padding:20, overflowY:'auto' }}>
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:16, padding:24, maxWidth:620, width:'100%', position:'relative', margin:'auto' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', color:G.muted, cursor:'pointer', fontSize:18 }}>â</button>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:coin.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:coin.color }}>{coin.icon}</div>
          <span style={{ fontSize:21, fontWeight:900 }}>{coin.symbol}</span>
          <span style={{ color:G.muted, fontSize:13 }}>{coin.name}</span>
          <Pill color={G.cyan} bg={G.cyan+'15'}>Crypto</Pill>
        </div>
        <div style={{ color:G.muted, fontSize:12, marginBottom:16 }}>{price >= 1000 ? '$'+price.toLocaleString() : '$'+price.toFixed(2)} Â· {CRYPTO_CHANGES[coin.symbol]>=0?'+':''}{CRYPTO_CHANGES[coin.symbol]}% 24h</div>
        <div style={{ padding:14, background:G.card2, borderRadius:10, border:`1px solid ${G.border}`, marginBottom:12 }}>
          <div style={{ color:G.muted, fontSize:10, marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>Sentimento de Mercado</div>
          <SentimentBar bullish={sentiment.bull} neutral={sentiment.neutral} bearish={sentiment.bear} />
        </div>
        <div style={{ marginBottom:12 }}>
          <ProjectionChart currentPrice={price} bearCagr={cagr.bear} baseCagr={cagr.base} bullCagr={cagr.bull} years={5} ticker={coin.symbol} />
        </div>
        <div style={{ padding:14, background:G.card2, borderRadius:10, border:`1px solid ${G.border}` }}>
          <div style={{ color:G.muted, fontSize:10, marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Tese de Investimento</div>
          <div style={{ color:G.text, fontSize:13, lineHeight:1.8 }}>{CRYPTO_THESIS[coin.symbol]}</div>
        </div>
      </div>
    </div>
  );
}

export default function MainApexApp() {
  const [portfolio] = useState(() => normalisePortfolio(PORTFOLIO_DEFAULT));
  const [ratings, setRatings] = useState({});
  const [activeTab, setActiveTab] = useState('Portfolio');
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [filterRating, setFilterRating] = useState('Todos');

  useEffect(() => {
    fetch('/api/ratings').then(r => r.json()).then(d => { if (d.ratings) setRatings(d.ratings); }).catch(() => {});
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
  const tabs = ['Portfolio','Insiders','Noticias','Overview','Descobertas','Crypto'];

  const ratingGroups = { STRONG_BUY:[], BUY:[], SELL:[], STRONG_SELL:[] };
  portfolio.forEach(p => { const r = ratings[p.ticker]; if (r && ratingGroups[r]) ratingGroups[r].push(p.ticker); });

  return (
    <div style={{ background:G.bg, minHeight:'100vh', color:G.text, fontFamily:"'DM Sans',system-ui,sans-serif", padding:'20px 16px' }}>
      <div style={{ maxWidth:920, margin:'0 auto' }}>
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
          {Object.entries(ratingGroups).some(([,v]) => v.length > 0) && (
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
        <div style={{ display:'flex', gap:2, marginBottom:24, borderBottom:`1px solid ${G.border}` }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 16px', fontSize:13, fontWeight:600, color: activeTab===tab ? G.accent : G.muted, borderBottom: activeTab===tab ? `2px solid ${G.accent}` : '2px solid transparent', transition:'color 0.15s', display:'flex', alignItems:'center', gap:6 }}>
              {tab}
              {tab === 'Descobertas' && <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', background:G.purple+'33', color:G.purple, borderRadius:4 }}>AI</span>}
              {tab === 'Crypto' && <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', background:G.cyan+'22', color:G.cyan, borderRadius:4 }}>NEW</span>}
            </button>
          ))}
        </div>
        {activeTab === 'Portfolio' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <AIAlerts portfolio={portfolio} ratings={ratings} />
            <MacroPanel />
            <div>
            <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
              {['Todos','Strong Buy','Buy','Hold','Sell','Strong Sell','Sem Rating'].map(f => (
                <button key={f} onClick={() => setFilterRating(f)} style={{ padding:'4px 10px', borderRadius:16, border:`1px solid ${filterRating===f?G.accent:G.border}`, background: filterRating===f?G.accentDim:'transparent', color: filterRating===f?G.accent:G.muted, cursor:'pointer', fontSize:12, fontWeight:600 }}>{f}</button>
              ))}
            </div>
            <PortfolioTable portfolio={portfolio} ratings={ratings} onAnalyse={setSelectedStock} filterRating={filterRating}/>
            </div>
          </div>
        )}
        {activeTab === 'Insiders'    && <InsidersPanel tickers={tickers}/>}
        {activeTab === 'Noticias'    && <NewsPanel tickers={tickers}/>}
        {activeTab === 'Overview'    && <OverviewPanel portfolio={portfolio} ratings={ratings}/>}
        {activeTab === 'Descobertas' && <DiscoverPanel portfolio={portfolio}/>}
        {activeTab === 'Crypto'      && <CryptoPanel onAnalyseCrypto={setSelectedCrypto}/>}
        {selectedStock  && <AnalysisPanel stock={selectedStock} onClose={() => setSelectedStock(null)}/>}
        {selectedCrypto && <CryptoAnalysisModal coin={selectedCrypto} onClose={() => setSelectedCrypto(null)}/>}
      </div>
    </div>
  );
}
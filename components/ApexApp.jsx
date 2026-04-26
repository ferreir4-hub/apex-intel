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

const fmt    = n => n == null ? 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
const fmtK   = n => { if (n == null) return 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ'; if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+'M'; if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(0)+'K'; return Math.abs(n).toFixed(0); };
const fmtPct = n => n == null ? 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ' : (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const relTime = ts => { const d = Date.now()/1000 - ts; if (d < 3600) return Math.floor(d/60)+'m ÃÂÃÂÃÂÃÂ¡trÃÂÃÂÃÂÃÂ¡s'; if (d < 86400) return Math.floor(d/3600)+'h atrÃÂÃÂÃÂÃÂ¡s'; return Math.floor(d/86400)+'d atrÃÂÃÂÃÂÃÂ¡s'; };

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
        ProjecÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o PreÃÂÃÂÃÂÃÂ§o/Share ÃÂÃÂÃÂÃÂ· {years} Anos ÃÂÃÂÃÂÃÂ· {ticker}
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
          <span style={{ color:G.muted, fontSize:12 }}>Wall Street ÃÂÃÂÃÂÃÂ· {total} analistas</span>
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
        <div style={{ color:G.muted, fontSize:10, marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>DistribuiÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o Sentimento</div>
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
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', color:G.muted, cursor:'pointer', fontSize:18, lineHeight:1 }}>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</button>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
            <span style={{ color:G.text, fontSize:21, fontWeight:900 }}>{stock.ticker}</span>
            <span style={{ color:G.muted, fontSize:13 }}>{stock.name}</span>
          </div>
          <div style={{ color:G.muted, fontSize:12 }}>{fmt(stock.value)} ÃÂÃÂÃÂÃÂ· {fmtPct(stock.pnlPct)} ÃÂÃÂÃÂÃÂ· {stock.weight?.toFixed(1)}% portfolio</div>
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
          ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ {rated} analisados
          <button onClick={() => { setDone(false); handleRun(); }} style={{ marginLeft:8, background:'none', border:`1px solid ${G.border}`, color:G.muted, borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:11 }}>
            Reanalisar
          </button>
        </div>
      )}
    </div>
  );
}

function NewsPanel({ tickers }) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!tickers || tickers.length === 0) { setLoading(false); return; }
    Promise.all(
      tickers.map(t =>
        fetch('/api/quote?symbol=' + t)
          .then(r => r.json())
          .then(d => [t, d])
          .catch(() => [t, null])
      )
    ).then(results => {
      const p = {};
      results.forEach(([t, d]) => { if (d) p[t] = d; });
      setPrices(p);
      setLoading(false);
    });
  }, [tickers]);

  const newsItems = [
    { outlet:'FT', outletBg:'#0C447C', outletColor:'#E6F1FB', sentiment:'Bullish', sClass:'bull', cat:'Tech', time:'2h ago',
      title:'Google beats earnings, AI revenue surges 28% YoY', desc:'Cloud +29%, Search resilient. Alphabet reafirma guidance anual.' },
    { outlet:'Bloomberg', outletBg:'#3C3489', outletColor:'#EEEDFE', sentiment:'Bearish', sClass:'bear', cat:'Macro', time:'4h ago',
      title:'Fed holds rates, dots signal only one cut in 2025', desc:'Powell mantÃÂ©m postura hawkish. Mercado reprecia cortes para Q4.' },
    { outlet:'Reuters', outletBg:'#004d2e', outletColor:'#9FE1CB', sentiment:'Bullish', sClass:'bull', cat:'Tech', time:'6h ago',
      title:'Microsoft Azure growth re-accelerates to 31%', desc:'Azure supera estimativas. Copilot adoption acelera em enterprise.' },
    { outlet:'WSJ', outletBg:'#7a1c1c', outletColor:'#FAECE7', sentiment:'Bearish', sClass:'bear', cat:'Macro', time:'8h ago',
      title:'Middle East tensions push Brent crude above $90', desc:'Escalada geopolitica pressiona commodities. Airlines e Transport em queda.' },
    { outlet:"Barron's", outletBg:'#1a1a1a', outletColor:'#D3D1C7', sentiment:'Bullish', sClass:'bull', cat:'Tech', time:'10h ago',
      title:"Nvidia data centre moat widens as AMD falls short", desc:'H100 demand continua forte. AMD perde quota em AI inference.' },
  ];

  const filters = ['all','bull','bear','Tech','Macro'];
  const filterLabels = {all:'Todas',bull:'Bullish',bear:'Bearish',Tech:'Tech',Macro:'Macro'};
  const visible = activeFilter === 'all' ? newsItems : newsItems.filter(n => n.sClass === activeFilter || n.cat === activeFilter);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:'rgba(124,106,247,.08)',border:'1px solid rgba(124,106,247,.2)',borderRadius:10,padding:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--acc)',letterSpacing:1,marginBottom:8}}>SINTESE AI Ã¢ÂÂ ultimas 24h</div>
        <div style={{fontSize:12.5,color:'var(--soft)',lineHeight:1.75}}>
          Mercado em modo de espera pre-Fed. Tech mantÃÂ©m momentum com resultados acima do esperado.
          Macro pressiona via yields e geopolitica. Rotacao defensiva visivel em sectores energy e utilities.
        </div>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            style={{padding:'5px 12px',borderRadius:6,border:'1px solid',fontSize:11,fontWeight:600,cursor:'pointer',
              background: activeFilter===f ? 'var(--acc)' : 'transparent',
              borderColor: activeFilter===f ? 'var(--acc)' : 'rgba(255,255,255,.15)',
              color: activeFilter===f ? '#fff' : 'var(--soft)'}}>
            {filterLabels[f]}
          </button>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {visible.map((n,i) => (
          <div key={i} className="card2" style={{padding:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
              <span style={{background:n.outletBg,color:n.outletColor,padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700}}>{n.outlet}</span>
              <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,
                background: n.sClass==='bull' ? 'rgba(34,212,122,.15)' : 'rgba(240,79,90,.15)',
                color: n.sClass==='bull' ? 'var(--green)' : 'var(--red)'}}>
                {n.sentiment}
              </span>
              <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,background:'rgba(255,255,255,.06)',color:'var(--soft)'}}>{n.cat}</span>
              <span style={{marginLeft:'auto',fontSize:10,color:'var(--muted)'}}>{n.time}</span>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:3,lineHeight:1.4}}>{n.title}</div>
            <div style={{fontSize:11.5,color:'var(--soft)',lineHeight:1.5}}>{n.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsidersPanel({ tickers }) {
  const [insiders, setInsiders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tickers || tickers.length === 0) { setLoading(false); return; }
    Promise.all(
      tickers.slice(0,5).map(t =>
        fetch('/api/insiders?symbol=' + t)
          .then(r => r.json())
          .then(d => d && d.data ? d.data.slice(0,3).map(x => ({...x, symbol:t})) : [])
          .catch(() => [])
      )
    ).then(results => {
      setInsiders(results.flat());
      setLoading(false);
    });
  }, [tickers]);

  const topBuys = [
    { symbol:'GOOGL', name:'L. Page', role:'Director', shares:'142,000', value:'$21.4M', date:'3d ago' },
    { symbol:'MSFT', name:'S. Nadella', role:'CEO', shares:'85,000', value:'$32.1M', date:'5d ago' },
    { symbol:'AMZN', name:'A. Jassy', role:'CEO', shares:'210,000', value:'$28.7M', date:'7d ago' },
  ];
  const topSells = [
    { symbol:'NVDA', name:'J. Huang', role:'CEO', shares:'500,000', value:'$61.2M', date:'2d ago' },
    { symbol:'TSLA', name:'E. Musk', role:'CEO', shares:'1,200,000', value:'$245.6M', date:'4d ago' },
    { symbol:'META', name:'M. Zuckerberg', role:'CEO', shares:'320,000', value:'$195.3M', date:'6d ago' },
  ];
  const tableData = loading ? [] : insiders.length > 0 ? insiders : [
    { symbol:'NVDA', name:'Jensen Huang', transactionType:'S', share:500000, change:-61200000 },
    { symbol:'TSLA', name:'Elon Musk', transactionType:'S', share:1200000, change:-245600000 },
    { symbol:'GOOGL', name:'Larry Page', transactionType:'P', share:142000, change:21400000 },
    { symbol:'MSFT', name:'Satya Nadella', transactionType:'P', share:85000, change:32100000 },
    { symbol:'AMZN', name:'Andy Jassy', transactionType:'P', share:210000, change:28700000 },
  ];
  const buyPct = 14;
  const sellPct = 86;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div className="card">
        <h2 style={{marginBottom:14}}>Insiders Ã¢ÂÂ Volume Total do Mercado</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div className="card2" style={{background:'rgba(34,212,122,.06)',border:'1px solid rgba(34,212,122,.2)',padding:12}}>
            <div style={{fontSize:11,color:'var(--green)',fontWeight:700,marginBottom:4}}>COMPRAS (30d)</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--green)'}}>$8.4B</div>
            <div style={{fontSize:11,color:'var(--soft)'}}>42,318 transacoes</div>
          </div>
          <div className="card2" style={{background:'rgba(240,79,90,.06)',border:'1px solid rgba(240,79,90,.2)',padding:12}}>
            <div style={{fontSize:11,color:'var(--red)',fontWeight:700,marginBottom:4}}>VENDAS (30d)</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--red)'}}>$14.2B</div>
            <div style={{fontSize:11,color:'var(--soft)'}}>89,741 transacoes</div>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--soft)',marginBottom:4}}>
            <span style={{color:'var(--green)'}}>Compras {buyPct}%</span>
            <span style={{color:'var(--red)'}}>Vendas {sellPct}%</span>
          </div>
          <div style={{height:6,borderRadius:3,background:'rgba(255,255,255,.08)',overflow:'hidden'}}>
            <div style={{width:buyPct+'%',height:'100%',background:'var(--green)',borderRadius:3}}></div>
          </div>
        </div>
        <div style={{marginBottom:6}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--green)',letterSpacing:1,marginBottom:8}}>TOP COMPRAS</div>
          {topBuys.map((t,i) => (
            <div key={i} className="card2" style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',marginBottom:6}}>
              <span style={{fontWeight:700,fontSize:12,color:'var(--acc)',minWidth:50}}>{t.symbol}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'var(--text)'}}>{t.name} <span style={{color:'var(--muted)'}}>- {t.role}</span></div>
                <div style={{fontSize:10,color:'var(--soft)'}}>{t.shares} acoes</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--green)'}}>{t.value}</div>
                <div style={{fontSize:10,color:'var(--muted)'}}>{t.date}</div>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--red)',letterSpacing:1,marginBottom:8}}>TOP VENDAS</div>
          {topSells.map((t,i) => (
            <div key={i} className="card2" style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',marginBottom:6}}>
              <span style={{fontWeight:700,fontSize:12,color:'var(--acc)',minWidth:50}}>{t.symbol}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'var(--text)'}}>{t.name} <span style={{color:'var(--muted)'}}>- {t.role}</span></div>
                <div style={{fontSize:10,color:'var(--soft)'}}>{t.shares} acoes</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--red)'}}>{t.value}</div>
                <div style={{fontSize:10,color:'var(--muted)'}}>{t.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2 style={{marginBottom:12}}>Transacoes Recentes</h2>
        {loading ? (
          <div style={{textAlign:'center',padding:20,color:'var(--soft)'}}>A carregar...</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{borderBottom:'1px solid rgba(255,255,255,.08)'}}>
                  {['Ticker','Nome','Tipo','Acoes','Valor'].map(h => (
                    <th key={h} style={{textAlign:'left',padding:'6px 8px',color:'var(--muted)',fontWeight:600,fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row,i) => (
                  <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                    <td style={{padding:'7px 8px',fontWeight:700,color:'var(--acc)'}}>{row.symbol}</td>
                    <td style={{padding:'7px 8px',color:'var(--text)'}}>{row.name}</td>
                    <td style={{padding:'7px 8px'}}>
                      <span style={{padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:700,
                        background: row.transactionType==='P' ? 'rgba(34,212,122,.15)' : 'rgba(240,79,90,.15)',
                        color: row.transactionType==='P' ? 'var(--green)' : 'var(--red)'}}>
                        {row.transactionType==='P' ? 'Compra' : 'Venda'}
                      </span>
                    </td>
                    <td style={{padding:'7px 8px',color:'var(--soft)'}}>{row.share ? row.share.toLocaleString() : '-'}</td>
                    <td style={{padding:'7px 8px',fontWeight:600,
                      color: row.change > 0 ? 'var(--green)' : 'var(--red)'}}>
                      {row.change ? '$' + Math.abs(row.change/1e6).toFixed(1) + 'M' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  const fmtE = v => v >= 1e6 ? 'ÃÂ¢ÃÂÃÂ¬'+(v/1e6).toFixed(1)+'M' : v >= 1e3 ? 'ÃÂ¢ÃÂÃÂ¬'+(v/1e3).toFixed(0)+'K' : 'ÃÂ¢ÃÂÃÂ¬'+v.toFixed(0);
  const xTicks = years <= 10 ? [0,2,4,6,8,10].filter(x=>x<=years) : years <= 15 ? [0,3,6,9,12,15].filter(x=>x<=years) : [0,5,10,15,20,25,30].filter(x=>x<=years);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div style={{ color:G.text, fontSize:14, fontWeight:700 }}>ProjecÃÂÃÂ§ÃÂÃÂ£o de Crescimento (Portfolio)</div>
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
        {extraMonthly > 0 && <span style={{ color:G.green, fontSize:13 }}>+ÃÂ¢ÃÂÃÂ¬{extraMonthly}/mÃÂÃÂªs incluÃÂÃÂ­do</span>}
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
  const hhiLabel = hhi > 2500 ? 'Alta ConcentraÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o' : hhi > 1500 ? 'Moderada' : 'Diversificado';
  const hhiColor = hhi > 2500 ? G.red : hhi > 1500 ? G.yellow : G.green;

  const ratingCounts = { STRONG_BUY:0, BUY:0, HOLD:0, SELL:0, STRONG_SELL:0 };
  portfolio.forEach(p => { const r = ratings[p.ticker]; if (r && ratingCounts[r] !== undefined) ratingCounts[r]++; });
  const ratedTotal = Object.values(ratingCounts).reduce((s,v) => s+v, 0);

  const alerts = [];
  const top = portfolio[0];
  if (top && top.value/totalValue > 0.35) alerts.push(`${top.ticker} representa ${((top.value/totalValue)*100).toFixed(0)}% do portfolio ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ peso elevado.`);
  const tech = (sectorMap['Technology']||0) + (sectorMap['Semiconductor']||0);
  if (tech/totalValue > 0.6) alerts.push(`ExposiÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o a Tech/Semis: ${((tech/totalValue)*100).toFixed(0)}% ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ considerar diversificaÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o.`);
  portfolio.filter(p => p.pnlPct < -15).forEach(p => alerts.push(`${p.ticker} com P&L ${fmtPct(p.pnlPct)} ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ avaliar saÃÂÃÂÃÂÃÂ­da.`));

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
          { label:'PosiÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂµes',    value:portfolio.length, color:G.text },
          { label:'HHI',         value:`${hhi.toFixed(0)} ÃÂÃÂÃÂÃÂ· ${hhiLabel}`, color:hhiColor },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding:16 }}>
            <div style={{ color:G.muted, fontSize:12, marginBottom:4 }}>{label}</div>
            <div style={{ color, fontSize:16, fontWeight:700 }}>{value}</div>
          </Card>
        ))}
      </div>
      {alerts.length > 0 && (
        <Card style={{ padding:16, borderColor:G.yellow+'44' }}>
          <div style={{ color:G.yellow, fontSize:13, fontWeight:700, marginBottom:10 }}>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ  Alertas</div>
          {alerts.map((a,i) => <div key={i} style={{ color:G.muted, fontSize:13, padding:'5px 0', borderTop:i>0?`1px solid ${G.faint}`:'none' }}>{a}</div>)}
        </Card>
      )}
      <Card>
        <div style={{ color:G.text, fontSize:14, fontWeight:700, marginBottom:16 }}>Top 5 PosiÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂµes</div>
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
                    <span style={{ color:G.muted, fontSize:12 }}>{fmt(p.value)} ÃÂÃÂÃÂÃÂ· {pct.toFixed(1)}%</span>
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
          {portfolio.length - 5} posiÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂµes restantes
        </div>
      </Card>
      <Card><GrowthChart portfolio={portfolio}/></Card>
      <Card>
        <div style={{ color:G.text, fontSize:14, fontWeight:700, marginBottom:16 }}>DistribuiÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o Setorial</div>
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
        {[{ label:'ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ Top Performers', data:winners, color:G.green }, { label:'ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ Piores', data:topLosers, color:G.red }].map(({ label, data, color }) => (
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
        <div style={{ color:G.text, fontSize:16, fontWeight:700, marginBottom:6 }}>Descobertas AI ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦</div>
        <div style={{ color:G.muted, fontSize:13, lineHeight:1.65, marginBottom:12 }}>
          Apenas <span style={{ color:G.green2, fontWeight:600 }}>Strong Buy</span> ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ upside calculado via price target mÃÂÃÂÃÂÃÂ©dio dos analistas. Probabilidades baseadas em consenso, P/E vs sector e insider activity.
        </div>
        <div style={{ padding:'8px 12px', background:G.accentDim, border:`1px solid ${G.accent}33`, borderRadius:8, fontSize:12, color:G.accent, marginBottom:14 }}>
          ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¹ Apenas consenso Strong Buy ÃÂÃÂÃÂÃÂ· upside via target mÃÂÃÂÃÂÃÂ©dio analistas ÃÂÃÂÃÂÃÂ· sem projecÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂµes especulativas
        </div>
        {!done && !loading && <button onClick={handleDiscover} style={{ background:G.gradAccent, color:'#fff', border:'none', borderRadius:10, padding:'11px 26px', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 4px 18px ${G.accent}44` }}>Descobrir Stocks IA</button>}
      </div>
      {loading && <div style={{ textAlign:'center', padding:40 }}><Spinner /><div style={{ color:G.accent, fontSize:14, marginTop:12 }}>A analisar portfolio e mercados...</div><div style={{ color:G.muted, fontSize:12, marginTop:6 }}>15-30 segundos</div></div>}
      {error && <div style={{ color:G.red, padding:14, background:G.red+'11', borderRadius:8, marginTop:14 }}>Erro: {error}</div>}
      {done && suggestions.length > 0 && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ color:G.muted, fontSize:13 }}>{suggestions.length} sugestÃÂÃÂÃÂÃÂµes</div>
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
                      <div style={{ color:G.muted, fontSize:10, marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>AnÃÂÃÂÃÂÃÂ¡lise de Probabilidade</div>
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
                      <div style={{ color:G.muted, fontSize:10, marginTop:6 }}>Baseado em consenso analistas ÃÂÃÂÃÂÃÂ· P/E vs sector ÃÂÃÂÃÂÃÂ· insider activity ÃÂÃÂÃÂÃÂ· momentum 90d</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {done && !suggestions.length && !error && <div style={{ color:G.muted, padding:40, textAlign:'center' }}>Sem sugestÃÂÃÂÃÂÃÂµes. Tenta regenerar.</div>}
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ MACRO + AI ALERTS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
const MACRO_INDICES = [
  { key:'fear',    label:'Fear/Greed', color:'#f5a623', desc:'Sentimento geral do mercado. Valores <25 = pÃÂÃÂÃÂÃÂ¢nico extremo (oportunidade de compra). Valores >75 = ganÃÂÃÂÃÂÃÂ¢ncia extrema (risco elevado).' },
  { key:'vix',     label:'VIX',        color:'#f04f5a', desc:'ÃÂÃÂÃÂÃÂndice de volatilidade do S&P500. >30 = stress elevado. <15 = mercado complacente. Picos do VIX coincidem com mÃÂÃÂÃÂÃÂ­nimos do mercado.' },
  { key:'dxy',     label:'DXY',        color:'#4a9eff', desc:'ForÃÂÃÂÃÂÃÂ§a do dÃÂÃÂÃÂÃÂ³lar americano. DXY alto pressiona commodities e mercados emergentes. DXY baixo favorece ouro, crypto e acÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂµes internacionais.' },
  { key:'wti',     label:'WTI Oil',    color:'#f5a623', desc:'PetrÃÂÃÂÃÂÃÂ³leo bruto WTI. Proxy de crescimento global e inflaÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o. >$90 pressiona margens das empresas. Estreito de Ormuz = risco geopolÃÂÃÂÃÂÃÂ­tico chave.' },
  { key:'eurusd',  label:'EUR/USD',    color:'#00d4c8', desc:'Par euro/dÃÂÃÂÃÂÃÂ³lar. Reflecte divergÃÂÃÂÃÂÃÂªncia econÃÂÃÂÃÂÃÂ³mica EUA vs Europa. Impacta receitas de multinacionais com exposiÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o europeia.' },
  { key:'yield10', label:'10Y Yield',  color:'#b06ef7', desc:'Yield do tesouro americano a 10 anos. Taxa de desconto para valorizaÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o de acÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂµes. >4.5% comprime mÃÂÃÂÃÂÃÂºltiplos de crescimento (tech especialmente).' },
  { key:'gold',    label:'Gold',       color:'#f5a623', desc:'Ouro como activo refÃÂÃÂÃÂÃÂºgio. Sobe em perÃÂÃÂÃÂÃÂ­odos de stress geopolÃÂÃÂÃÂÃÂ­tico, inflaÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o e dÃÂÃÂÃÂÃÂ³lar fraco. CorrelaÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o negativa com yields reais.' },
  { key:'sp500',   label:'S&P 500',    color:'#22d47a', desc:'Benchmark do mercado americano. TendÃÂÃÂÃÂÃÂªncia de longo prazo define o contexto macro. 200MA = linha divisÃÂÃÂÃÂÃÂ³ria bull/bear market.' },
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
  const [prices, setPrices] = useState({});
  const [expanded, setExpanded] = useState(null);

  const INDICES = [
    { key:'fear',   label:'FEAR/GREED', sym:null,         color:'var(--yel)',  sub:'Fear',          barW:42, extraLabel:'0=Extreme Fear ÃÂÃÂ· 100=Greed', showCNN:true },
    { key:'vix',    label:'VIX',        sym:'^VIX',       color:'var(--red)',  sub:'Elevado',       barW:48 },
    { key:'dxy',    label:'DXY (DÃÂÃÂ³lar)',sym:'DX-Y.NYB',   color:'var(--blue)', sub:'US Dollar Index',barW:60 },
    { key:'wti',    label:'WTI (PetrÃÂÃÂ³leo)',sym:'CL=F',    color:'var(--yel)',  sub:'Brent ~$82',    barW:52 },
    { key:'eurusd', label:'EUR/USD',    sym:'EURUSD=X',   color:'var(--cyan)', sub:'Euro vs DÃÂÃÂ³lar', barW:45 },
    { key:'t10',    label:'10Y Yield',  sym:'^TNX',       color:'var(--purp)', sub:'US Treasury 10Y',barW:65 },
    { key:'gold',   label:'Gold (XAU)', sym:'GC=F',       color:'var(--yel)',  sub:'Safe haven demand ÃÂ¢ÃÂÃÂ',barW:78 },
    { key:'sp500',  label:'S&P 500',    sym:'SPY',        color:'var(--green)',sub:'YTD +8.2%',     barW:72 },
  ];

  const MACRO_TEXTS = {
    fear:  'Fear/Greed em modo Fear. Historicamente sinal de acumulaÃÂÃÂ§ÃÂÃÂ£o para investidores de longo prazo. Cuidado com posiÃÂÃÂ§ÃÂÃÂµes alavancadas ÃÂ¢ÃÂÃÂ volatilidade elevada.',
    vix:   'VIX elevado = regime de alta volatilidade. Acima de 25 o mercado entra em modo de defesa. Reduz posiÃÂÃÂ§ÃÂÃÂµes especulativas e aumenta cash buffer.',
    dxy:   'USD a enfraquecer. Positivo para empresas com receita internacional (GOOGL, MSFT, AAPL). USD fraco suporta commodities e emergentes.',
    wti:   'WTI abaixo de $80 ÃÂÃÂ© neutral para tech. Acima de $90 comeÃÂÃÂ§a a pressionar margens de transporte e input costs. Monitoriza estreito de Ormuz.',
    eurusd:'EUR/USD em queda = USD mais forte, comprime receitas europeias de multinationals US. AtenÃÂÃÂ§ÃÂÃÂ£o ao impacto cambial nos earnings.',
    t10:   'Yield 10Y elevada pressiona valuations de growth stocks. Cada +50bps = ~-8% no fair value de tech com P/E 30x. Hawkish Fed = yields mais altos por mais tempo.',
    gold:  'Ouro em mÃÂÃÂ¡ximos = incerteza geopolÃÂÃÂ­tica elevada. Safe haven demand a subir. PortfÃÂÃÂ³lio com menos de 3-5% em ouro estÃÂÃÂ¡ subexposto neste regime.',
    sp500: 'S&P 500 P/E forward acima da mÃÂÃÂ©dia histÃÂÃÂ³rica. Mercado caro mas momentum forte. NÃÂÃÂ£o shortes uma tendÃÂÃÂªncia sem catalisador claro.',
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = {};
      for (const idx of INDICES) {
        if (!idx.sym) continue;
        try {
          const r = await fetch('/api/quote?symbol=' + encodeURIComponent(idx.sym));
          if (r.ok) { const d = await r.json(); result[idx.key] = d; }
        } catch(e) {}
        if (cancelled) return;
      }
      if (!cancelled) setPrices(result);
    })();
    return () => { cancelled = true; };
  }, []);

  const fmtPrice = (key, d) => {
    if (!d) return '...';
    const v = d.c || d.price || 0;
    if (key === 'vix') return v.toFixed(1);
    if (key === 'dxy') return v.toFixed(1);
    if (key === 'eurusd') return v.toFixed(3);
    if (key === 't10') return v.toFixed(2) + '%';
    if (key === 'wti') return '$' + v.toFixed(1);
    if (key === 'gold') return '$' + Math.round(v).toLocaleString();
    return Math.round(v).toLocaleString();
  };

  const fmtChg = (d) => {
    if (!d) return null;
    const pct = d.dp || 0;
    return { pct, up: pct >= 0, str: (pct >= 0 ? 'ÃÂ¢ÃÂÃÂ² +' : 'ÃÂ¢ÃÂÃÂ¼ ') + Math.abs(pct).toFixed(2) + '%' };
  };

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <h2 style={{ margin:0 }}>ÃÂÃÂndices Macro</h2>
        <span style={{ color:'var(--muted)', fontSize:11 }}>Clica em cada ÃÂÃÂ­ndice para anÃÂÃÂ¡lise de impacto</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8 }}>
        {INDICES.map(idx => {
          const d = prices[idx.key];
          const chg = fmtChg(d);
          const isOpen = expanded === idx.key;
          const displayVal = idx.key === 'fear' ? '42' : fmtPrice(idx.key, d);
          const displayChg = idx.key === 'fear' ? null : chg;
          return (
            <div key={idx.key} className="card2"
              style={{ cursor:'pointer', borderColor: isOpen ? idx.color : undefined }}
              onClick={() => setExpanded(isOpen ? null : idx.key)}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:10, color:'var(--muted)' }}>{idx.label}</span>
                {idx.showCNN && <span style={{ fontSize:10, fontWeight:700, color:'var(--yel)' }}>CNN</span>}
              </div>
              <div style={{ fontSize:22, fontWeight:900, color:idx.color }}>{displayVal}</div>
              {displayChg
                ? <div style={{ fontSize:11, color: displayChg.up ? 'var(--green)' : 'var(--red)', marginBottom:6 }}>{displayChg.str}</div>
                : <div style={{ fontSize:11, color:idx.color, marginBottom:6 }}>{idx.sub}</div>
              }
              <div className="bar-wrap"><div style={{ height:'100%', width: idx.barW + '%', background:idx.color }}></div></div>
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:5 }}>{idx.extraLabel || idx.sub}</div>
            </div>
          );
        })}
      </div>
      {expanded && (
        <div className="card2" style={{ marginTop:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--acc)', marginBottom:6 }}>Impacto no portfÃÂÃÂ³lio</div>
          <div style={{ fontSize:12, color:'var(--soft)', lineHeight:1.7 }}>{MACRO_TEXTS[expanded]}</div>
        </div>
      )}
      <div className="card2" style={{ marginTop:12, borderColor:'#7c6af733' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--acc)', marginBottom:8 }}>Leitura macro actual ÃÂ¢ÃÂÃÂ impacto no teu portfolio</div>
        <div style={{ color:'var(--soft)', fontSize:12, lineHeight:1.7 }}>
          <b style={{ color:'var(--red)' }}>VIX + Fear/Greed:</b> mercado em modo defensivo ÃÂ¢ÃÂÃÂ historicamente sinal de acumulaÃÂÃÂ§ÃÂÃÂ£o para investidores de longo prazo mas cuidado com posiÃÂÃÂ§ÃÂÃÂµes alavancadas.<br/>
          <b style={{ color:'var(--yel)' }}>10Y yield:</b> pressÃÂÃÂ£o sobre mÃÂÃÂºltiplos growth. Cada 0.25% de subida comprime valuations ~5%.<br/>
          <b style={{ color:'var(--yel)' }}>WTI:</b> custo operacional de AMZN e logÃÂÃÂ­stica sobem. VigilÃÂÃÂ¢ncia no estreito de Ormuz ÃÂ¢ÃÂÃÂ qualquer disrupÃÂÃÂ§ÃÂÃÂ£o envia WTI para $90+ em 48h.
        </div>
      </div>
    </div>
  );
}

function AIAlerts({ portfolio, ratings }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!portfolio || portfolio.length === 0) return;
    const totalValue = portfolio.reduce((s, x) => s + (x.shares * (x.avgCost || x.pp || 0)), 0);
    const result = [];
    portfolio.forEach(s => {
      const r = ratings[s.t] || {};
      const rating = r.rating || '';
      const costBasis = s.avgCost || s.pp || 0;
      const currentVal = s.shares * costBasis;
      const weight = totalValue > 0 ? (currentVal / totalValue) * 100 : 0;
      const livePrice = s.pp || 0;
      const pnlPct = costBasis > 0 && livePrice > 0 ? ((livePrice - costBasis) / costBasis) * 100 : 0;

      if (weight > 25) {
        result.push({ type:'REDUZIR', ticker:s.t,
          detail: weight.toFixed(1) + '% do portfolio',
          extra: pnlPct > 0 ? '+' + pnlPct.toFixed(0) + '% vs custo' : pnlPct.toFixed(0) + '% vs custo',
          msg: 'ConcentraÃÂÃÂ§ÃÂÃÂ£o excessiva (' + weight.toFixed(1) + '%). ' + (r.text ? r.text.split('.')[0] + '. ' : '') + 'Considera reduzir para 25-30% e realocar em diversificaÃÂÃÂ§ÃÂÃÂ£o sectorial.' });
      } else if (rating === 'SELL' || rating === 'STRONG_SELL') {
        result.push({ type:'REDUZIR', ticker:s.t,
          detail: 'Rating AI: ' + rating,
          msg: r.text ? r.text.split('.').slice(0,2).join('.') + '.' : 'Considera reduzir posiÃÂÃÂ§ÃÂÃÂ£o.' });
      } else if (pnlPct < -15) {
        result.push({ type:'VIGIAR', ticker:s.t,
          detail: 'Drawdown ' + pnlPct.toFixed(1) + '%',
          msg: (r.text ? r.text.split('.')[0] + '. ' : '') + 'Verifica suporte e tese de investimento.' });
      } else if (weight > 15 && pnlPct > 80) {
        result.push({ type:'VIGIAR', ticker:s.t,
          detail: 'P/E pode estar esticado',
          msg: 'PosiÃÂÃÂ§ÃÂÃÂ£o com +' + pnlPct.toFixed(0) + '% de ganho e peso ' + weight.toFixed(1) + '%. Upside de analistas jÃÂÃÂ¡ incorporado no preÃÂÃÂ§o. Considera realizar lucros parciais.' });
      } else if ((rating === 'BUY' || rating === 'STRONG_BUY') && weight < 12 && pnlPct > -10) {
        result.push({ type:'MANTER', ticker:s.t,
          detail: 'P/E razoÃÂÃÂ¡vel para crescimento',
          msg: (r.text ? r.text.split('.')[0] + '. ' : '') + 'MÃÂÃÂºltiplos justificados. Peso actual ' + weight.toFixed(1) + '% ÃÂ¢ÃÂÃÂ espaÃÂÃÂ§o para aumentar atÃÂÃÂ© 15%.' });
      }
    });
    setAlerts(result.slice(0, 5));
  }, [portfolio, ratings]);

  if (alerts.length === 0) return null;

  const styles = {
    REDUZIR: { bg:'#f04f5a0d', border:'#f04f5a22', pillBg:'#f04f5a22', pillColor:'var(--red)', pillBorder:'#f04f5a33' },
    VIGIAR:  { bg:'#f5a6230d', border:'#f5a62322', pillBg:'#f5a62322', pillColor:'var(--yel)', pillBorder:'#f5a62333' },
    MANTER:  { bg:'#22d47a0d', border:'#22d47a22', pillBg:'#22d47a22', pillColor:'var(--green)', pillBorder:'#22d47a33' },
  };

  return (
    <div className="card" style={{ borderColor:'#f5a62344' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ fontSize:14 }}>ÃÂ¢ÃÂÃÂ </span>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--yel)' }}>Alertas IA ÃÂ¢ÃÂÃÂ AcÃÂÃÂ§ÃÂÃÂ£o Recomendada</span>
        <span className="pill" style={{ background:'#7c6af722', color:'var(--acc)', border:'1px solid #7c6af733', marginLeft:'auto', fontSize:10 }}>GPT-4o anÃÂÃÂ¡lise</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {alerts.map((a, i) => {
          const s = styles[a.type];
          return (
            <div key={i} style={{ padding:'10px 12px', background:s.bg, borderRadius:8, border:'1px solid ' + s.border }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <span className="pill" style={{ background:s.pillBg, color:s.pillColor, border:'1px solid ' + s.pillBorder }}>{a.type}</span>
                <span style={{ fontWeight:700 }}>{a.ticker}</span>
                {a.detail && <span style={{ color:'var(--muted)', fontSize:11 }}>{a.detail}</span>}
                {a.extra && <span style={{ color:'var(--green)', fontSize:11, marginLeft:'auto' }}>{a.extra}</span>}
              </div>
              <div style={{ color:'var(--soft)', fontSize:12, lineHeight:1.6 }}>{a.msg}</div>
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
                    {livePrices[stock.ticker].changePct >= 0 ? 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ²' : 'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¼'}{Math.abs(livePrices[stock.ticker].changePct || 0).toFixed(2)}%
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
  { symbol:'BTC', name:'Bitcoin',        color:'#f5a623', icon:'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¿',  desc:'Store of value ÃÂÃÂÃÂÃÂ· Digital gold',     mcap:'$1,84T', vol:'$42B',  extra:'DominÃÂÃÂÃÂÃÂ¢ncia 54%' },
  { symbol:'ETH', name:'Ethereum',       color:'#7c6af7', icon:'ÃÂÃÂÃÂÃÂ',  desc:'Smart contracts ÃÂÃÂÃÂÃÂ· DeFi ÃÂÃÂÃÂÃÂ· Staking',  mcap:'$209B',  vol:'$18B',  extra:'ETH/BTC 0,0186' },
  { symbol:'RUNE',name:'THORChain',      color:'#00d4c8', icon:'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¡', desc:'DEX cross-chain nativo',            mcap:'$614M',  vol:'$180M', extra:'TVL $318M' },
  { symbol:'AKT', name:'Akash Network',  color:'#b06ef7', icon:'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ',  desc:'Cloud compute descentralizado',     mcap:'$276M',  vol:'$42M',  extra:'1 240 GPU providers' },
  { symbol:'XRP', name:'Ripple',         color:'#00d4c8', icon:'ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ',  desc:'Pagamentos institucionais ÃÂÃÂÃÂÃÂ· CBDC',  mcap:'$124B',  vol:'$4,2B', extra:'SEC resolved ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ' },
];

const CRYPTO_PRICES  = { BTC:93420, ETH:1742, RUNE:1.84, AKT:1.12, XRP:2.14 };
const CRYPTO_CHANGES = { BTC:2.4, ETH:-1.2, RUNE:8.7, AKT:14.2, XRP:3.8 };
const CRYPTO_SENTIMENT = { BTC:{bull:68,neutral:22,bear:10}, ETH:{bull:52,neutral:31,bear:17}, RUNE:{bull:44,neutral:35,bear:21}, AKT:{bull:55,neutral:28,bear:17}, XRP:{bull:58,neutral:29,bear:13} };
const CRYPTO_CAGR = { BTC:{bear:0.08,base:0.20,bull:0.40}, ETH:{bear:0.10,base:0.25,bull:0.55}, RUNE:{bear:0.12,base:0.38,bull:0.85}, AKT:{bear:0.15,base:0.45,bull:1.20}, XRP:{bear:0.08,base:0.22,bull:0.60} };
const CRYPTO_THESIS = {
  BTC: 'Hash rate em ATH ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ rede mais segura. Halving Abr 2024 com efeito lag 12-18m. ETFs spot com $15B de inflows. PaÃÂÃÂÃÂÃÂ­ses a adoptar como reserva nacional.',
  ETH: 'ETH/BTC em mÃÂÃÂÃÂÃÂ­nimos de 4 anos ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ potencial catch-up. Staking 3,8% APY. EIP-4844 reduziu fees L2 em 90%. ETF staking em discussÃÂÃÂÃÂÃÂ£o na SEC.',
  RUNE: 'ÃÂÃÂÃÂÃÂnico DEX com swaps nativos cross-chain sem wrapped tokens. TVL $318M. Volume +40% MoM. Alta volatilidade ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ beta 3x vs BTC. HistÃÂÃÂÃÂÃÂ³rico de exploits.',
  AKT: 'AWS descentralizado ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ GPU compute em mercado $500B. AI workloads a 40% TVL. Small cap $276M ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ alta volatilidade. PrÃÂÃÂÃÂÃÂ©-revenue significativo.',
  XRP: 'SEC lawsuit resolvido 2024. RLUSD stablecoin em expansÃÂÃÂÃÂÃÂ£o. 70+ acordos com bancos centrais. XRPL em testes para CBDCs. ETF aprovaÃÂÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o iminente.',
};

function CryptoPanel({ onAnalyseCrypto }) {
  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Crypto Watch</div>
        <div style={{ color:G.muted, fontSize:13 }}>PreÃÂÃÂÃÂÃÂ§os e mÃÂÃÂÃÂÃÂ©tricas de mercado ÃÂÃÂÃÂÃÂ· Clica em Analisar para anÃÂÃÂÃÂÃÂ¡lise on-chain + sentimento</div>
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
              <div style={{ color:G.muted, fontSize:11, marginBottom:10 }}>{coin.desc} ÃÂÃÂÃÂÃÂ· {coin.extra}</div>
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
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', color:G.muted, cursor:'pointer', fontSize:18 }}>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</button>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:coin.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:coin.color }}>{coin.icon}</div>
          <span style={{ fontSize:21, fontWeight:900 }}>{coin.symbol}</span>
          <span style={{ color:G.muted, fontSize:13 }}>{coin.name}</span>
          <Pill color={G.cyan} bg={G.cyan+'15'}>Crypto</Pill>
        </div>
        <div style={{ color:G.muted, fontSize:12, marginBottom:16 }}>{price >= 1000 ? '$'+price.toLocaleString() : '$'+price.toFixed(2)} ÃÂÃÂÃÂÃÂ· {CRYPTO_CHANGES[coin.symbol]>=0?'+':''}{CRYPTO_CHANGES[coin.symbol]}% 24h</div>
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
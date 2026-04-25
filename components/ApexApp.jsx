'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { PORTFOLIO_DEFAULT } from '@/lib/portfolio';

const CYCLE = [null, 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
const PILL  = { 'Strong Buy': 'sb', 'Buy': 'b', 'Hold': 'h', 'Sell': 's', 'Strong Sell': 'ss' };

const G = {
  bg: '#f6f4f1', surf: '#fff', surf2: '#f0ece6', bdr: '#e5e0d8', bdr2: '#ccc5b8',
  txt: '#1a1714', txt2: '#7a6f65', txt3: '#b0a59a',
  sb: { bg: '#eaf5ee', c: '#276b44', bdr: '#b8dcc6' },
  b:  { bg: '#eaf0fb', c: '#2352a0', bdr: '#b4caf0' },
  h:  { bg: '#fef8e6', c: '#7a5f00', bdr: '#eedfa0' },
  s:  { bg: '#fdf0e6', c: '#9a3e18', bdr: '#ecc49a' },
  ss: { bg: '#fde6ea', c: '#961c38', bdr: '#eaa8b4' },
  na: { bg: '#f0ece6', c: '#aaa09a', bdr: '#ddd5ca' },
};

function pillStyle(r) {
  const col = G[r ? PILL[r] : 'na'] || G.na;
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', borderRadius: 20, fontFamily: 'DM Mono,monospace', fontSize: 9, fontWeight: 500, letterSpacing: .5, cursor: 'pointer', border: `1px solid ${col.bdr}`, background: col.bg, color: col.c, userSelect: 'none', whiteSpace: 'nowrap' };
}
function verdictStyle(r) {
  const col = G[r ? PILL[r] : 'na'] || G.na;
  return { textAlign: 'center', padding: '18px 20px', borderRadius: 12, border: `1px solid ${col.bdr}`, background: col.bg, marginBottom: 14 };
}
function parseSection(text, key, stops) {
  const lines = text.split('\n'); let collecting = false, result = [];
  const kl = key.toLowerCase(); const sl = stops.map(s => s.toLowerCase());
  for (let line of lines) {
    const t = line.trim(), tl = t.toLowerCase();
    if (collecting && sl.some(s => tl.startsWith(s) && tl.includes(':'))) break;
    if (!collecting) { if (tl.startsWith(kl) && tl.includes(':')) { collecting = true; const rest = t.slice(t.indexOf(':') + 1).trim().replace(/^[-*]\s*/, ''); if (rest) result.push(rest); } }
    else if (t) { result.push(t.replace(/^[-*]\s*/, '').trim()); }
  }
  return result.filter(Boolean);
}
function Spinner() { return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '44px', gap: 14 }}><div style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${G.bdr}`, borderTopColor: G.txt2, animation: 'spin .7s linear infinite' }} /><span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: G.txt3, letterSpacing: 2, textTransform: 'uppercase' }}>A processar</span></div>); }
function Pill({ rating, onClick }) { return (<div onClick={onClick} style={{ ...pillStyle(rating), transition: 'all .12s' }} onMouseEnter={e => { e.currentTarget.style.opacity = '.8'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>{rating || 'N/A'}</div>); }
function SpotlightCard({ label, colorKey, stocks, onOpen }) {
  const col = G[colorKey];
  return (<div style={{ borderRadius: 12, padding: 16, background: col.bg, border: `1px solid ${col.bdr}` }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: col.c, flexShrink: 0 }} /><span style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 500, color: col.c }}>{label}</span></div>{stocks.length === 0 ? <div style={{ fontSize: 11, color: G.txt3, fontStyle: 'italic' }}>Sem posiÃ§Ãµes.</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{stocks.map(x => (<div key={x.t} onClick={() => onOpen(x.t)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,.8)', border: '1px solid rgba(255,255,255,.95)', cursor: 'pointer', transition: 'all .13s' }} onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.8)'; e.currentTarget.style.boxShadow = 'none'; }}><div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, fontWeight: 500, color: col.c }}>{x.t}</div><div style={{ fontSize: 10, color: G.txt3, marginTop: 1 }}>{x.n.split(' ')[0]}</div></div><span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, fontWeight: 500, color: col.c }}>{x.pnl >= 0 ? '+' : ''}{x.pp.toFixed(1)}%</span></div>))}</div>}</div>);
}

function AnalysisPanel({ ticker, port, ratings, onClose, onRatingSet }) {
  const [loading, setLoading] = useState(true); const [result, setResult] = useState(null); const [error, setError] = useState(null); const [conv, setConv] = useState([]); const [fuQ, setFuQ] = useState(''); const [fuLoading, setFuL] = useState(false); const [fuItems, setFuItems] = useState([]);
  const stock = port.find(x => x.t === ticker);
  useEffect(() => {
    if (!stock) return;
    setLoading(true); setResult(null); setError(null); setConv([]); setFuItems([]);
    fetch('/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock, history: [] }) })
      .then(r => r.json()).then(res => { if (res.error) throw new Error(res.error); setConv(res.conv); setResult(res); if (res.rating) onRatingSet(ticker, res.rating, res.text); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [ticker]);
  const sendFU = async () => {
    if (!fuQ.trim() || fuLoading) return; const q = fuQ.trim(); setFuQ(''); setFuL(true);
    const newConv = [...conv, { role: 'user', content: q }]; setFuItems(prev => [...prev, { q, a: null }]);
    try { const res = await fetch('/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock, history: newConv }) }).then(r => r.json()); if (res.error) throw new Error(res.error); setConv(res.conv); setFuItems(prev => prev.map((it, i) => i === prev.length - 1 ? { ...it, a: res.text } : it)); }
    catch (e) { setFuItems(prev => prev.map((it, i) => i === prev.length - 1 ? { ...it, a: 'Erro: ' + e.message } : it)); }
    setFuL(false);
  };
  const rCol = result?.rating ? G[PILL[result.rating]] : null;
  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 460, background: G.surf, borderLeft: `1px solid ${G.bdr}`, zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,.1)' }}>
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${G.bdr}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 20, fontWeight: 500 }}>{ticker}</div><div style={{ fontSize: 12, color: G.txt3, marginTop: 3 }}>{stock?.n}</div></div>
        <button onClick={onClose} style={{ width: 30, height: 30, border: `1px solid ${G.bdr}`, background: 'transparent', color: G.txt3, cursor: 'pointer', fontSize: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>Ã</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
        {stock && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>{[{ l: 'Valor', v: `â¬${stock.v.toFixed(2)}`, c: G.txt },{ l: 'P&L', v: `${stock.pnl >= 0 ? '+' : ''}â¬${Math.abs(stock.pnl).toFixed(2)}`, c: stock.pnl >= 0 ? G.sb.c : G.ss.c },{ l: 'P&L %', v: `${stock.pp >= 0 ? '+' : ''}${stock.pp.toFixed(2)}%`, c: stock.pp >= 0 ? G.sb.c : G.ss.c },{ l: 'Peso', v: `${stock.w.toFixed(2)}%`, c: G.txt }].map(({ l, v, c }) => (<div key={l} style={{ background: G.surf2, border: `1px solid ${G.bdr}`, padding: 12, borderRadius: 10 }}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>{l}</div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 500, color: c }}>{v}</div></div>))}</div>)}
        {loading && <Spinner />}
        {error && <div style={{ padding: 14, background: G.ss.bg, border: `1px solid ${G.ss.bdr}`, borderRadius: 10, color: G.ss.c, fontSize: 12, lineHeight: 1.6 }}>{error}</div>}
        {result && !loading && (<><div style={verdictStyle(result.rating)}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 18, fontWeight: 500, color: rCol?.c, marginBottom: 3 }}>{result.rating || 'N/A'}</div>{result.text.match(/CONFIDENCE:\s*(\w+)/i) && (<div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: rCol?.c, opacity: .65 }}>ConfianÃ§a: {result.text.match(/CONFIDENCE:\s*(\w+)/i)[1]}</div>)}</div><div style={{ background: G.surf2, border: `1px solid ${G.bdr}`, borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.75, color: G.txt2 }}>{[{ k: 'TESE BULL', stops: ['TESE BEAR','CATALISADORES','RISCO PRINCIPAL','VEREDICTO'] },{ k: 'TESE BEAR', stops: ['CATALISADORES','RISCO PRINCIPAL','VEREDICTO'] },{ k: 'CATALISADORES', stops: ['RISCO PRINCIPAL','VEREDICTO'] },{ k: 'RISCO PRINCIPAL', stops: ['VEREDICTO'] },{ k: 'VEREDICTO', stops: [] }].map(({ k, stops }) => { const items = parseSection(result.text, k, stops); if (!items.length) return null; const isList = ['TESE BULL','TESE BEAR','CATALISADORES'].includes(k); return (<div key={k}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', margin: '14px 0 6px' }}>{k.replace('TESE ','')}</div>{isList ? <ul style={{ listStyle: 'none', padding: 0 }}>{items.map((it, i) => (<li key={i} style={{ padding: '2px 0 2px 14px', position: 'relative' }}><span style={{ position: 'absolute', left: 0, color: G.txt3 }}>â</span>{it}</li>))}</ul> : <p style={{ lineHeight: 1.7 }}>{items.join(' ')}</p>}</div>); })}</div>{fuItems.map((it, i) => (<div key={i}><div style={{ marginTop: 12, padding: '11px 13px', background: G.surf2, border: `1px solid ${G.bdr}`, borderRadius: 10 }}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Tu</div><div style={{ fontSize: 13, color: G.txt }}>{it.q}</div></div>{it.a ? <div style={{ marginTop: 5, padding: 13, background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 10 }}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.b.c, opacity: .7, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Apex Analyst</div><div style={{ fontSize: 12, color: G.txt2, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{it.a}</div></div> : <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}><div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${G.bdr}`, borderTopColor: G.txt2, animation: 'spin .7s linear infinite' }} /></div>}</div>))}</>)}
      </div>
      <div style={{ padding: '12px 18px', borderTop: `1px solid ${G.bdr}`, display: 'flex', gap: 7, flexShrink: 0 }}>
        <input value={fuQ} onChange={e => setFuQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendFU()} placeholder="Pergunta ao analista..." style={{ flex: 1, background: G.surf2, border: `1px solid ${G.bdr}`, color: G.txt, fontFamily: 'DM Sans,sans-serif', fontSize: 12, padding: '9px 12px', borderRadius: 8, outline: 'none' }} />
        <button onClick={sendFU} disabled={fuLoading} style={{ padding: '9px 16px', background: G.txt, border: 'none', color: G.bg, fontSize: 12, cursor: 'pointer', borderRadius: 8, fontWeight: 500, opacity: fuLoading ? .6 : 1 }}>Enviar</button>
      </div>
    </div>
  );
}

function BatchAnalyser({ port, ratings, onRatingSet, onClose }) {
  const unrated  = port.filter(x => !ratings[x.t]);
  const [progress, setProgress] = useState(0);
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [log,      setLog]      = useState([]);
  const runRef = useRef(false);

  useEffect(() => {
    if (unrated.length > 0 && !runRef.current) {
      runRef.current = true;
      runBatch();
    }
  }, []); // eslint-disable-line

  async function runBatch() {
    setRunning(true); setDone(false); setLog([]); setProgress(0);
    const list = port.filter(x => !ratings[x.t]);
    for (let i = 0; i < list.length; i++) {
      const stock = list[i];
      setLog(prev => [...prev, { t: stock.t, status: 'a processar...' }]);
      try {
        const res = await fetch('/api/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock }),
        }).then(r => r.json());
        if (res.error) throw new Error(res.error);
        if (res.rating) onRatingSet(stock.t, res.rating, res.text);
        setLog(prev => prev.map((l, idx) => idx === i ? { ...l, status: res.rating || '?', ok: true } : l));
      } catch (e) {
        setLog(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'erro: ' + e.message.slice(0,30), ok: false } : l));
      }
      setProgress(i + 1);
      if (i < list.length - 1) await new Promise(r => setTimeout(r, 3000));
    }
    setRunning(false); setDone(true);
  }

  const pct = unrated.length > 0 ? Math.round((progress / unrated.length) * 100) : 100;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget && !running) onClose(); }}>
      <div style={{ background: G.surf, borderRadius: 16, padding: 28, width: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 500 }}>Analisar Tudo</div>
          <button onClick={onClose} disabled={running}
            style={{ background: 'none', border: `1px solid ${G.bdr}`, cursor: running ? 'not-allowed' : 'pointer', borderRadius: 7, padding: '4px 10px', color: G.txt3, fontSize: 12, opacity: running ? .5 : 1 }}>
            {done ? 'Fechar' : 'Cancelar'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: G.txt2 }}>
          {unrated.length === 0
            ? <span style={{ color: G.sb.c }}>Todos os {port.length} activos já têm rating!</span>
            : `A analisar ${unrated.length} activo(s) com DeepSeek — ~3s entre cada um.`}
        </div>
        {unrated.length > 0 && (
          <>
            <div style={{ background: G.surf2, borderRadius: 8, height: 6, overflow: 'hidden' }}>
              <div style={{ background: G.b.c, height: '100%', width: `${pct}%`, transition: 'width .3s' }} />
            </div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: G.txt3 }}>{progress}/{unrated.length} — {pct}%</div>
          </>
        )}
        {log.length > 0 && (
          <div style={{ overflowY: 'auto', maxHeight: 300, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {log.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: G.surf2, borderRadius: 7, fontSize: 12 }}>
                <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 500 }}>{l.t}</span>
                <span style={{ color: l.ok === true ? G.sb.c : l.ok === false ? G.ss.c : G.txt3 }}>{l.status}</span>
              </div>
            ))}
          </div>
        )}
        {done && <div style={{ fontSize: 12, color: G.sb.c, fontWeight: 500 }}>Concluído. Spotlight actualizado.</div>}
      </div>
    </div>
  );
}) {
  const unrated = port.filter(x => !ratings[x.t]);
  const [progress, setProgress] = useState(0); const [running, setRunning] = useState(false); const [done, setDone] = useState(false); const [log, setLog] = useState([]);
  const run = async () => {
    setRunning(true); setDone(false); setLog([]); setProgress(0);
    for (let i = 0; i < unrated.length; i++) {
      const stock = unrated[i]; setLog(prev => [...prev, { t: stock.t, status: 'a processar...' }]);
      try { const res = await fetch('/api/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock }) }).then(r => r.json()); if (res.error) throw new Error(res.error); if (res.rating) onRatingSet(stock.t, res.rating, res.text); setLog(prev => prev.map((l, idx) => idx === i ? { ...l, status: res.rating || '?', ok: true } : l)); }
      catch (e) { setLog(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'erro', ok: false } : l)); }
      setProgress(i + 1); if (i < unrated.length - 1) await new Promise(r => setTimeout(r, 3000));
    }
    setRunning(false); setDone(true);
  };
  const pct = unrated.length > 0 ? Math.round((progress / unrated.length) * 100) : 100;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget && !running) onClose(); }}>
      <div style={{ background: G.surf, borderRadius: 16, padding: 28, width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 500 }}>Analisar Tudo</div><button onClick={onClose} disabled={running} style={{ background: 'none', border: `1px solid ${G.bdr}`, cursor: 'pointer', borderRadius: 7, padding: '4px 10px', color: G.txt3, fontSize: 12 }}>{done ? 'Fechar' : 'Cancelar'}</button></div>
        <div style={{ fontSize: 12, color: G.txt2 }}>{unrated.length} stock(s) sem rating. AnÃ¡lise com DeepSeek â ~3s entre cada um.{unrated.length === 0 && <span style={{ color: G.sb.c }}> Todos jÃ¡ tÃªm rating!</span>}</div>
        {unrated.length > 0 && (<><div style={{ background: G.surf2, borderRadius: 8, height: 6, overflow: 'hidden' }}><div style={{ background: G.b.c, height: '100%', width: `${pct}%`, transition: 'width .3s' }} /></div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: G.txt3 }}>{progress}/{unrated.length} â {pct}%</div></>)}
        {log.length > 0 && (<div style={{ overflowY: 'auto', maxHeight: 260, display: 'flex', flexDirection: 'column', gap: 4 }}>{log.map((l, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: G.surf2, borderRadius: 7, fontSize: 12 }}><span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 500 }}>{l.t}</span><span style={{ color: l.ok === true ? G.sb.c : l.ok === false ? G.ss.c : G.txt3 }}>{l.status}</span></div>))}</div>)}
        {!running && !done && unrated.length > 0 && (<button onClick={run} style={{ padding: '10px 20px', background: G.txt, border: 'none', color: G.bg, fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 9 }}>Iniciar AnÃ¡lise</button>)}
        {done && <div style={{ fontSize: 12, color: G.sb.c, fontWeight: 500 }}>ConcluÃ­do. Spotlight actualizado.</div>}
      </div>
    </div>
  );
}

export default function ApexApp() {
  const [tab, setTab] = useState('portfolio'); const [ratings, setRatings] = useState({}); const [port, setPort] = useState(PORTFOLIO_DEFAULT); const [filter, setFilter] = useState('all'); const [panel, setPanel] = useState(null); const [showBatch, setShowBatch] = useState(false); const [newT, setNewT] = useState(''); const [newV, setNewV] = useState(''); const [newP, setNewP] = useState('');
  useEffect(() => { fetch('/api/ratings').then(r => r.json()).then(data => { if (!data.error) setRatings(data); }).catch(() => {}); }, []);
  const setRating = useCallback(async (ticker, r, analysisText) => { setRatings(prev => ({ ...prev, [ticker]: r })); await fetch('/api/ratings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker, rating: r, analysis_text: analysisText || null }) }).catch(() => {}); }, []);
  const cycleRating = (ticker) => { const cur = ratings[ticker] || null; const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length]; if (next === null) { setRatings(prev => { const n = { ...prev }; delete n[ticker]; return n; }); } else { setRating(ticker, next, null); } };
  const addStock = () => { const t = newT.toUpperCase().trim(); const v = parseFloat(newV) || 0; const p = parseFloat(newP) || 0; if (!t || !v) return; const tot = port.reduce((s, x) => s + x.v, 0); setPort(prev => [...prev, { t, n: t, v, pnl: v - (v / (1 + p / 100)), pp: p, w: v / tot * 100, s: 'Other', buy_price: null }]); setNewT(''); setNewV(''); setNewP(''); };
  const totalVal = port.reduce((s, x) => s + x.v, 0); const totalPnl = port.reduce((s, x) => s + x.pnl, 0); const ratedCount = Object.keys(ratings).length;
  const filtered = filter === 'all' ? port : port.filter(x => (ratings[x.t] || null) === filter);
  const spGroups = { 'Strong Buy': port.filter(x => ratings[x.t] === 'Strong Buy'), 'Buy': port.filter(x => ratings[x.t] === 'Buy'), 'Sell': port.filter(x => ratings[x.t] === 'Sell'), 'Strong Sell': port.filter(x => ratings[x.t] === 'Strong Sell') };
  const rc = { 'Strong Buy': 0, 'Buy': 0, 'Hold': 0, 'Sell': 0, 'Strong Sell': 0 }; Object.values(ratings).forEach(r => { if (rc[r] !== undefined) rc[r]++; });
  const wins = port.filter(x => x.pnl > 0).length; const tg = port.filter(x => x.pnl > 0).reduce((s, x) => s + x.pnl, 0); const tl = port.filter(x => x.pnl < 0).reduce((s, x) => s + x.pnl, 0);
  const tabItems = [{ id: 'portfolio', label: 'Portfolio' }, { id: 'insider', label: 'Insiders' }, { id: 'news', label: 'NotÃ­cias' }, { id: 'overview', label: 'Overview' }];
  const filterItems = ['all', 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
  return (
    <div style={{ fontFamily: 'DM Sans,sans-serif', background: G.bg, minHeight: '100vh', color: G.txt, fontSize: 14 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fup{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-thumb{background:${G.bdr2};border-radius:2px;} input::placeholder{color:${G.txt3};}`}</style>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(246,244,241,.95)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${G.bdr}`, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase' }}>Apex<span style={{ color: G.txt3 }}> / </span>Intel</div>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>{[{ l: 'Total', v: `â¬${totalVal.toFixed(2)}` },{ l: 'P&L', v: `${totalPnl >= 0 ? '+' : ''}â¬${totalPnl.toFixed(2)}` },{ l: 'Rated', v: `${ratedCount}/${port.length}` }].map(({ l, v }) => (<div key={l}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 500 }}>{v}</div></div>))}<button onClick={() => setShowBatch(true)} style={{ padding: '6px 14px', background: G.txt, border: 'none', color: G.bg, fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 7, letterSpacing: .5 }}>Analisar Tudo</button></div>
      </div>
      <div style={{ display: 'flex', background: G.surf, borderBottom: `1px solid ${G.bdr}`, padding: '0 24px', overflowX: 'auto' }}>{tabItems.map(({ id, label }) => (<div key={id} onClick={() => setTab(id)} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: tab === id ? G.txt : G.txt3, borderBottom: tab === id ? `2px solid ${G.txt}` : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all .15s', userSelect: 'none' }}>{label}</div>))}</div>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 24 }}>
        {tab === 'portfolio' && (<div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 26 }}>{[{ label: 'Strong Buy', key: 'sb', rkey: 'Strong Buy' },{ label: 'Buy', key: 'b', rkey: 'Buy' },{ label: 'Sell', key: 's', rkey: 'Sell' },{ label: 'Strong Sell', key: 'ss', rkey: 'Strong Sell' }].map(({ label, key, rkey }) => (<SpotlightCard key={rkey} label={label} colorKey={key} stocks={spGroups[rkey]} onOpen={setPanel} />))}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase' }}>PosiÃ§Ãµes â {filtered.length} activo{filtered.length !== 1 ? 's' : ''}{filter !== 'all' ? ' filtrados' : ''}</div><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{filterItems.map(f => (<button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 20, border: `1px solid ${filter === f ? G.txt : G.bdr2}`, background: filter === f ? G.txt : G.surf, color: filter === f ? G.bg : G.txt3 }}>{f === 'all' ? 'Todos' : f}</button>))}</div></div>
          <div style={{ display: 'flex', gap: 7, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>{[{ id: 'nt', val: newT, set: setNewT, ph: 'TICKER', w: 95, up: true },{ id: 'nv', val: newV, set: setNewV, ph: 'â¬ Valor', w: 100, num: true },{ id: 'np', val: newP, set: setNewP, ph: 'P&L %', w: 80, num: true }].map(({ id, val, set, ph, w, up, num }) => (<input key={id} value={val} onChange={e => set(up ? e.target.value.toUpperCase() : e.target.value)} placeholder={ph} type={num ? 'number' : 'text'} style={{ width: w, background: G.surf, border: `1px solid ${G.bdr}`, color: G.txt, fontFamily: 'DM Mono,monospace', fontSize: 12, padding: '7px 11px', borderRadius: 8, outline: 'none' }} />))}<button onClick={addStock} style={{ padding: '7px 16px', background: G.surf, border: `1px solid ${G.bdr2}`, color: G.txt2, fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 8 }}>+ Adicionar</button></div>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 110px 60px 114px 88px', padding: '5px 13px', gap: 10, marginBottom: 3 }}>{['','Activo','Valor','P&L','Peso','Rating','AnÃ¡lise'].map((h, i) => (<div key={i} style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: i > 1 ? 'right' : 'left' }}>{h}</div>))}</div>
          <div style={{ display: 'grid', gap: 3 }}>{filtered.map((s, i) => { const r = ratings[s.t] || null; const pos = s.pnl >= 0; return (<div key={s.t} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 110px 60px 114px 88px', alignItems: 'center', padding: '11px 13px', background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 10, gap: 10, animation: `fup .22s ease ${Math.min(i * .025, .3)}s both` }}><div style={{ width: 30, height: 30, borderRadius: 7, background: G.surf2, border: `1px solid ${G.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono,monospace', fontSize: 7, color: G.txt3, fontWeight: 500 }}>{s.t.slice(0, 4)}</div><div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 500 }}>{s.t}</div><div style={{ fontSize: 11, color: G.txt3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.n}</div></div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, textAlign: 'right' }}>â¬{s.v.toFixed(2)}</div><div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, color: pos ? G.sb.c : G.ss.c }}>{pos ? '+' : ''}â¬{Math.abs(s.pnl).toFixed(2)}</div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: pos ? G.sb.c : G.ss.c, opacity: .8, marginTop: 1 }}>{pos ? '+' : ''}{s.pp.toFixed(2)}%</div></div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: G.txt3, textAlign: 'right' }}>{s.w.toFixed(2)}%</div><div style={{ display: 'flex', justifyContent: 'flex-end' }}><Pill rating={r} onClick={() => cycleRating(s.t)} /></div><div style={{ display: 'flex', justifyContent: 'flex-end' }}><button onClick={() => setPanel(s.t)} style={{ padding: '5px 12px', background: G.surf2, border: `1px solid ${G.bdr}`, color: G.txt2, fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 8, whiteSpace: 'nowrap', transition: 'all .13s' }} onMouseEnter={e => { e.currentTarget.style.background = G.txt; e.currentTarget.style.color = G.bg; }} onMouseLeave={e => { e.currentTarget.style.background = G.surf2; e.currentTarget.style.color = G.txt2; }}>{r ? 'Ver anÃ¡lise' : 'Analisar'}</button></div></div>); })}</div>
        </div>)}
        {tab === 'overview' && (<div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(158px,1fr))', gap: 10, marginBottom: 24 }}>{[{ l: 'Total Portfolio', v: `â¬${totalVal.toFixed(0)}`, sub: `${port.length} posiÃ§Ãµes`, c: G.txt2 },{ l: 'Ganhos', v: `+â¬${tg.toFixed(0)}`, sub: `${wins} positivas`, c: G.sb.c },{ l: 'Perdas', v: `â¬${Math.abs(tl).toFixed(0)}`, sub: `${port.length - wins} negativas`, c: G.ss.c },{ l: 'Rated', v: `${ratedCount}`, sub: `de ${port.length}`, c: G.txt2 },{ l: 'Strong Buy', v: `${rc['Strong Buy']}`, c: G.sb.c },{ l: 'Buy', v: `${rc['Buy']}`, c: G.b.c },{ l: 'Hold', v: `${rc['Hold']}`, c: G.h.c },{ l: 'Sell + SS', v: `${rc['Sell'] + rc['Strong Sell']}`, c: G.ss.c }].map(({ l, v, sub, c }) => (<div key={l} style={{ background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 12, padding: 16 }}><div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{l}</div><div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -.5, color: c }}>{v}</div>{sub && <div style={{ fontSize: 11, color: G.txt3, marginTop: 5 }}>{sub}</div>}</div>))}</div></div>)}
        {tab === 'insider' && <InsiderPanel tickers={port.slice(0, 12).map(x => x.t)} />}
        {tab === 'news' && <NewsPanel tickers={port.slice(0, 10).map(x => x.t)} />}
      </div>
      {panel && (<><div onClick={() => setPanel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,.18)', zIndex: 150, backdropFilter: 'blur(2px)' }} /><AnalysisPanel ticker={panel} port={port} ratings={ratings} onClose={() => setPanel(null)} onRatingSet={setRating} /></>)}
      {showBatch && <BatchAnalyser port={port} ratings={ratings} onRatingSet={setRating} onClose={() => setShowBatch(false)} />}
    </div>
  );
}


// ── OVERVIEW PANEL ───────────────────────────────────────
function OverviewPanel({ port, ratings }) {
  const totalVal  = port.reduce((s, x) => s + x.v, 0);
  const totalPnl  = port.reduce((s, x) => s + x.pnl, 0);
  const totalPnlP = totalVal > 0 ? (totalPnl / (totalVal - totalPnl)) * 100 : 0;
  const winners   = port.filter(x => x.pnl > 0);
  const losers    = port.filter(x => x.pnl < 0);
  const tg        = winners.reduce((s, x) => s + x.pnl, 0);
  const tl        = losers.reduce((s, x) => s + x.pnl, 0);
  const winRate   = port.length > 0 ? (winners.length / port.length * 100).toFixed(0) : 0;

  const hhi = port.reduce((s, x) => s + Math.pow(x.w / 100, 2), 0);
  const hhiScore = hhi > 0.25 ? 'Alto' : hhi > 0.12 ? 'Médio' : 'Baixo';
  const hhiColor = hhi > 0.25 ? G.ss.c : hhi > 0.12 ? G.h.c : G.sb.c;

  const top1 = [...port].sort((a, b) => b.v - a.v)[0];
  const top1pct = top1 ? top1.w.toFixed(1) : 0;

  const sectors = {};
  port.forEach(x => { sectors[x.s] = (sectors[x.s] || 0) + x.v; });
  const sectorList = Object.entries(sectors)
    .map(([s, v]) => ({ s, v, pct: (v / totalVal * 100).toFixed(1) }))
    .sort((a, b) => b.v - a.v);
  const techPct = ((sectors['Tech'] || 0) / totalVal * 100).toFixed(1);

  const rc = { 'Strong Buy': 0, 'Buy': 0, 'Hold': 0, 'Sell': 0, 'Strong Sell': 0, 'N/A': 0 };
  port.forEach(x => { const r = ratings[x.t]; if (r && rc[r] !== undefined) rc[r]++; else rc['N/A']++; });
  const bullishVal = port.filter(x => ['Strong Buy','Buy'].includes(ratings[x.t])).reduce((s,x) => s+x.v, 0);
  const bearishVal = port.filter(x => ['Sell','Strong Sell'].includes(ratings[x.t])).reduce((s,x) => s+x.v, 0);
  const bullishPct = (bullishVal / totalVal * 100).toFixed(1);
  const bearishPct = (bearishVal / totalVal * 100).toFixed(1);

  const topWinners = [...port].sort((a, b) => b.pnl - a.pnl).slice(0, 5);
  const topLosers  = [...port].sort((a, b) => a.pnl - b.pnl).slice(0, 5);

  const alerts = [];
  if (top1pct > 30) alerts.push({ type: 'warn', msg: top1.t + ' representa ' + top1pct + '% do portfolio — risco de concentração elevado.' });
  if (parseFloat(techPct) > 70) alerts.push({ type: 'warn', msg: 'Exposição a Tech de ' + techPct + '% — considerar diversificação sectorial.' });
  if (parseFloat(bearishPct) > 20) alerts.push({ type: 'danger', msg: bearishPct + '% do capital em posições Sell/Strong Sell — avaliar saídas.' });
  if (parseFloat(winRate) < 50) alerts.push({ type: 'warn', msg: 'Win rate de ' + winRate + '% — maioria das posições em perda.' });
  if (parseFloat(bullishPct) > 60) alerts.push({ type: 'ok', msg: bullishPct + '% do capital em posições Buy/Strong Buy — posição ofensiva sólida.' });
  if (totalPnlP > 20) alerts.push({ type: 'ok', msg: 'Portfolio com +' + totalPnlP.toFixed(1) + '% de retorno total — performance acima da média.' });
  if (hhi > 0.3) alerts.push({ type: 'danger', msg: 'Índice de concentração (HHI) crítico — um único evento afecta o portfolio de forma significativa.' });

  const StatCard = ({ label, value, sub, color }) => (
    <div style={{ background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -.5, color: color || G.txt }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: G.txt3, marginTop: 5 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase', marginBottom: 4 }}>Alertas &amp; Insights</div>
          {alerts.map((a, i) => {
            const col = a.type === 'danger' ? G.ss : a.type === 'warn' ? G.h : G.sb;
            return (
              <div key={i} style={{ padding: '10px 14px', background: col.bg, border: `1px solid ${col.bdr}`, borderRadius: 9, fontSize: 12, color: col.c, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 700, flexShrink: 0 }}>
                  {a.type === 'danger' ? '▲' : a.type === 'warn' ? '⚠' : '✓'}
                </span>
                {a.msg}
              </div>
            );
          })}
        </div>
      )}
      <div>
        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase', marginBottom: 10 }}>Performance</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          <StatCard label="Valor Total" value={`€${totalVal.toFixed(0)}`} sub={`${port.length} posições`} />
          <StatCard label="P&amp;L Total" value={`${totalPnl >= 0 ? '+' : ''}€${totalPnl.toFixed(0)}`} sub={`${totalPnlP >= 0 ? '+' : ''}${totalPnlP.toFixed(1)}% retorno`} color={totalPnl >= 0 ? G.sb.c : G.ss.c} />
          <StatCard label="Ganhos" value={`+€${tg.toFixed(0)}`} sub={`${winners.length} posições`} color={G.sb.c} />
          <StatCard label="Perdas" value={`-€${Math.abs(tl).toFixed(0)}`} sub={`${losers.length} posições`} color={G.ss.c} />
          <StatCard label="Win Rate" value={`${winRate}%`} sub={`${winners.length}/${port.length} positivas`} color={parseInt(winRate) >= 60 ? G.sb.c : parseInt(winRate) >= 40 ? G.h.c : G.ss.c} />
          <StatCard label="Média P&amp;L" value={`${totalPnl / port.length >= 0 ? '+' : ''}€${(totalPnl / port.length).toFixed(0)}`} sub="por posição" color={totalPnl >= 0 ? G.sb.c : G.ss.c} />
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase', marginBottom: 10 }}>Risco &amp; Concentração</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          <StatCard label="Concentração HHI" value={hhiScore} sub={`Score: ${hhi.toFixed(3)}`} color={hhiColor} />
          <StatCard label="Maior Posição" value={`${top1pct}%`} sub={top1 && top1.t} color={parseFloat(top1pct) > 30 ? G.ss.c : G.txt} />
          <StatCard label="Tech Exposure" value={`${techPct}%`} sub="do portfolio" color={parseFloat(techPct) > 70 ? G.ss.c : G.txt} />
          <StatCard label="Bull Capital" value={`${bullishPct}%`} sub="Buy + Strong Buy" color={G.sb.c} />
          <StatCard label="Bear Capital" value={`${bearishPct}%`} sub="Sell + Strong Sell" color={parseFloat(bearishPct) > 15 ? G.ss.c : G.txt2} />
          <StatCard label="Sem Rating" value={`${rc['N/A']}`} sub={`de ${port.length} activos`} color={rc['N/A'] > 10 ? G.h.c : G.txt2} />
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase', marginBottom: 10 }}>Distribuição por Sector</div>
        <div style={{ background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sectorList.map(({ s, v, pct }) => (
            <div key={s}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{s}</span>
                <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: G.txt2 }}>{pct}% · €{v.toFixed(0)}</span>
              </div>
              <div style={{ background: G.surf2, borderRadius: 4, height: 5, overflow: 'hidden' }}>
                <div style={{ background: G.b.c, height: '100%', width: `${pct}%`, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase', marginBottom: 10 }}>Ratings APEX</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            { label: 'Strong Buy', key: 'sb', r: 'Strong Buy' },
            { label: 'Buy', key: 'b', r: 'Buy' },
            { label: 'Hold', key: 'h', r: 'Hold' },
            { label: 'Sell', key: 's', r: 'Sell' },
            { label: 'Strong Sell', key: 'ss', r: 'Strong Sell' },
            { label: 'Sem rating', key: 'na', r: 'N/A' },
          ].map(({ label, key, r }) => {
            const col = G[key];
            const count = rc[r] || 0;
            const pct = port.length > 0 ? (count / port.length * 100).toFixed(0) : 0;
            return (
              <div key={r} style={{ background: col.bg, border: `1px solid ${col.bdr}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: col.c, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: col.c }}>{count}</div>
                <div style={{ fontSize: 10, color: col.c, opacity: .7, marginTop: 3 }}>{pct}% das posições</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase', marginBottom: 10 }}>Top 5 Vencedores</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topWinners.map(x => (
              <div key={x.t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 9 }}>
                <div>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, fontWeight: 600 }}>{x.t}</div>
                  <div style={{ fontSize: 10, color: G.txt3 }}>{x.n.split(' ')[0]}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: G.sb.c, fontWeight: 600 }}>+€{x.pnl.toFixed(0)}</div>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: G.sb.c, opacity: .8 }}>+{x.pp.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase', marginBottom: 10 }}>Top 5 Perdedores</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topLosers.filter(x => x.pnl < 0).map(x => (
              <div key={x.t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 9 }}>
                <div>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, fontWeight: 600 }}>{x.t}</div>
                  <div style={{ fontSize: 10, color: G.txt3 }}>{x.n.split(' ')[0]}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: G.ss.c, fontWeight: 600 }}>€{x.pnl.toFixed(0)}</div>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: G.ss.c, opacity: .8 }}>{x.pp.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── INSIDER PANEL ─────────────────────────────────────────────
function InsiderPanel({ tickers }) {
  const [rows,    setRows]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const results = [];
    const top15 = [...tickers].slice(0, 15);
    let idx = 0;
    function next() {
      if (cancelled) return;
      if (idx >= top15.length) {
        if (!cancelled) {
          setRows(results.sort((a, b) => new Date(b.date) - new Date(a.date)));
          setLoading(false);
        }
        return;
      }
      const t = top15[idx++];
      fetch(`/api/insiders?symbol=${t}`)
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) d.forEach(item => results.push({ ...item, ticker: item.ticker || t }));
        })
        .catch(() => {})
        .finally(() => setTimeout(next, 200));
    }
    next();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  if (loading) return <Spinner />;
  if (!rows || rows.length === 0) return (
    <div style={{ padding: 16, background: G.na.bg, border: `1px solid ${G.na.bdr}`, borderRadius: 10, color: G.na.c, fontSize: 12 }}>
      Sem dados de insiders disponíveis para os activos actuais.
    </div>
  );

  return (
    <div>
      <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase', marginBottom: 12 }}>
        {rows.length} transacções insider recentes
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        {rows.map((d, i) => {
          const buy = d.type === 'buy';
          const col = buy ? G.sb : G.ss;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 120px 90px 90px', alignItems: 'center', padding: '11px 14px', background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 10, gap: 10 }}>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 600, color: col.c }}>{d.ticker}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{d.name}</div>
                <div style={{ fontSize: 10, color: G.txt3, marginTop: 1 }}>{d.position || 'Insider'}</div>
              </div>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, textAlign: 'right', color: col.c, fontWeight: 600 }}>
                ${Number(d.value || 0).toLocaleString('en-US')}
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontFamily: 'DM Mono,monospace', fontSize: 9, fontWeight: 700, background: col.bg, color: col.c, border: `1px solid ${col.bdr}` }}>
                  {buy ? '▲ COMPRA' : '▼ VENDA'}
                </span>
              </div>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: G.txt3, textAlign: 'right' }}>{d.date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NEWS PANEL ─────────────────────────────────────────────────
function NewsPanel({ tickers }) {
  const [items,   setItems]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const top15 = tickers.slice(0, 15).join(',');
    fetch(`/api/news?tickers=${top15}`)
      .then(r => r.json())
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => { setItems([]); setLoading(false); });
  }, []); // eslint-disable-line

  if (loading) return <Spinner />;
  if (!items || items.length === 0) return (
    <div style={{ padding: 16, background: G.na.bg, border: `1px solid ${G.na.bdr}`, borderRadius: 10, color: G.na.c, fontSize: 12 }}>
      Sem notícias recentes para os activos do portfolio.
    </div>
  );

  return (
    <div>
      <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase', marginBottom: 12 }}>
        Top {items.length} notícias mais recentes
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((n, i) => {
          const sent = n.sentiment > 0.2 ? 'pos' : n.sentiment < -0.2 ? 'neg' : 'neu';
          const sc   = { pos: G.sb, neg: G.ss, neu: G.na }[sent];
          const sl   = { pos: 'Bullish', neg: 'Bearish', neu: 'Neutro' }[sent];
          const dt   = n.datetime ? new Date(n.datetime * 1000).toLocaleDateString('pt-PT') : '';
          const relevant = Math.abs(n.sentiment || 0) > 0.4;
          return (
            <div key={i} onClick={() => window.open(n.url, '_blank')}
              style={{ padding: '14px 16px', background: G.surf, border: `1px solid ${relevant ? sc.bdr : G.bdr}`, borderRadius: 12, cursor: 'pointer', transition: 'box-shadow .15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,.09)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, fontWeight: 700, color: G.b.c, background: G.b.bg, padding: '2px 8px', borderRadius: 20, border: `1px solid ${G.b.bdr}` }}>{n.ticker}</span>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3 }}>{n.source || 'News'}</span>
                  {relevant && (
                    <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, fontWeight: 700, color: sc.c, background: sc.bg, padding: '2px 8px', borderRadius: 20, border: `1px solid ${sc.bdr}` }}>
                      ★ RELEVANTE
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, whiteSpace: 'nowrap' }}>{dt}</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, fontWeight: 500, marginBottom: 10, color: G.txt }}>{n.headline}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontFamily: 'DM Mono,monospace', fontSize: 9, background: sc.bg, color: sc.c, border: `1px solid ${sc.bdr}` }}>{sl}</span>
                <span style={{ fontSize: 11, color: G.txt3 }}>↗ Ver artigo</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

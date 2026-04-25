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
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '4px 10px', borderRadius: 20, fontFamily: 'DM Mono,monospace', fontSize: 9,
    fontWeight: 500, letterSpacing: .5, cursor: 'pointer', border: `1px solid ${col.bdr}`,
    background: col.bg, color: col.c, userSelect: 'none', whiteSpace: 'nowrap',
  };
}

function verdictStyle(r) {
  const col = G[r ? PILL[r] : 'na'] || G.na;
  return {
    textAlign: 'center', padding: '18px 20px', borderRadius: 12,
    border: `1px solid ${col.bdr}`, background: col.bg, marginBottom: 14,
  };
}

function parseSection(text, key, stops) {
  const lines = text.split('\n');
  let collecting = false, result = [];
  const kl = key.toLowerCase();
  const sl = stops.map(s => s.toLowerCase());
  for (let line of lines) {
    const t = line.trim(), tl = t.toLowerCase();
    if (collecting && sl.some(s => tl.startsWith(s) && tl.includes(':'))) break;
    if (!collecting) {
      if (tl.startsWith(kl) && tl.includes(':')) {
        collecting = true;
        const rest = t.slice(t.indexOf(':') + 1).trim().replace(/^[-*]\s*/, '');
        if (rest) result.push(rest);
      }
    } else if (t) {
      result.push(t.replace(/^[-*]\s*/, '').trim());
    }
  }
  return result.filter(Boolean);
}

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '44px', gap: 14 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${G.bdr}`, borderTopColor: G.txt2, animation: 'spin .7s linear infinite' }} />
      <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: G.txt3, letterSpacing: 2, textTransform: 'uppercase' }}>A processar</span>
    </div>
  );
}

function Pill({ rating, onClick }) {
  return (
    <div onClick={onClick} style={{ ...pillStyle(rating), transition: 'all .12s' }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
      {rating || 'N/A'}
    </div>
  );
}

function SpotlightCard({ label, colorKey, stocks, onOpen }) {
  const col = G[colorKey];
  return (
    <div style={{ borderRadius: 12, padding: 16, background: col.bg, border: `1px solid ${col.bdr}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.c, flexShrink: 0 }} />
        <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 500, color: col.c }}>{label}</span>
      </div>
      {stocks.length === 0
        ? <div style={{ fontSize: 11, color: G.txt3, fontStyle: 'italic' }}>Sem posicoes.</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {stocks.map(x => (
              <div key={x.t} onClick={() => onOpen(x.t)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,.8)', border: '1px solid rgba(255,255,255,.95)', cursor: 'pointer', transition: 'all .13s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.8)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, fontWeight: 500, color: col.c }}>{x.t}</div>
                  <div style={{ fontSize: 10, color: G.txt3, marginTop: 1 }}>{x.n.split(' ')[0]}</div>
                </div>
                <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, fontWeight: 500, color: col.c }}>{x.pnl >= 0 ? '+' : ''}{x.pp.toFixed(1)}%</span>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// Analysis Panel
function AnalysisPanel({ ticker, port, ratings, onClose, onRatingSet }) {
  const [loading,   setLoading]  = useState(true);
  const [result,    setResult]   = useState(null);
  const [error,     setError]    = useState(null);
  const [conv,      setConv]     = useState([]);
  const [fuQ,       setFuQ]      = useState('');
  const [fuLoading, setFuL]      = useState(false);
  const [fuItems,   setFuItems]  = useState([]);
  const stock = port.find(x => x.t === ticker);

  useEffect(() => {
    if (!stock) return;
    setLoading(true); setResult(null); setError(null); setConv([]); setFuItems([]);
    fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock, history: [] }),
    })
      .then(r => r.json())
      .then(res => {
        if (res.error) throw new Error(res.error);
        setConv(res.conv);
        setResult(res);
        if (res.rating) onRatingSet(ticker, res.rating, res.text);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]); // eslint-disable-line

  const sendFU = async () => {
    if (!fuQ.trim() || fuLoading) return;
    const q = fuQ.trim();
    setFuQ('');
    setFuL(true);
    const newConv = [...conv, { role: 'user', content: q }];
    setFuItems(prev => [...prev, { q, a: null }]);
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock, history: newConv }),
      }).then(r => r.json());
      if (res.error) throw new Error(res.error);
      setConv(res.conv);
      setFuItems(prev => prev.map((it, i) => i === prev.length - 1 ? { ...it, a: res.text } : it));
    } catch (e) {
      setFuItems(prev => prev.map((it, i) => i === prev.length - 1 ? { ...it, a: 'Erro: ' + e.message } : it));
    }
    setFuL(false);
  };

  const rCol = result && result.rating ? G[PILL[result.rating]] : null;

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 460, background: G.surf, borderLeft: `1px solid ${G.bdr}`, zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,.1)' }}>
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${G.bdr}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 20, fontWeight: 500 }}>{ticker}</div>
          <div style={{ fontSize: 12, color: G.txt3, marginTop: 3 }}>{stock && stock.n}</div>
        </div>
        <button onClick={onClose} style={{ width: 30, height: 30, border: `1px solid ${G.bdr}`, background: 'transparent', color: G.txt3, cursor: 'pointer', fontSize: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>x</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
        {stock && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
            {[
              { l: 'Valor', v: 'EUR' + stock.v.toFixed(2), c: G.txt },
              { l: 'P&L', v: (stock.pnl >= 0 ? '+' : '') + 'EUR' + Math.abs(stock.pnl).toFixed(2), c: stock.pnl >= 0 ? G.sb.c : G.ss.c },
              { l: 'P&L %', v: (stock.pp >= 0 ? '+' : '') + stock.pp.toFixed(2) + '%', c: stock.pp >= 0 ? G.sb.c : G.ss.c },
              { l: 'Peso', v: stock.w.toFixed(2) + '%', c: G.txt },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: G.surf2, border: `1px solid ${G.bdr}`, padding: 12, borderRadius: 10 }}>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>{l}</div>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 500, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <Spinner />}
        {error && <div style={{ padding: 14, background: G.ss.bg, border: `1px solid ${G.ss.bdr}`, borderRadius: 10, color: G.ss.c, fontSize: 12, lineHeight: 1.6 }}>{error}</div>}

        {result && !loading && (
          <>
            <div style={verdictStyle(result.rating)}>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 18, fontWeight: 500, color: rCol && rCol.c, marginBottom: 3 }}>{result.rating || 'N/A'}</div>
              {result.text.match(/CONFIDENCE:\s*(\w+)/i) && (
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: rCol && rCol.c, opacity: .65 }}>
                  Confianca: {result.text.match(/CONFIDENCE:\s*(\w+)/i)[1]}
                </div>
              )}
            </div>

            <div style={{ background: G.surf2, border: `1px solid ${G.bdr}`, borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.75, color: G.txt2 }}>
              {[
                { k: 'TESE BULL',       stops: ['TESE BEAR', 'CATALISADORES', 'RISCO PRINCIPAL', 'VEREDICTO'] },
                { k: 'TESE BEAR',       stops: ['CATALISADORES', 'RISCO PRINCIPAL', 'VEREDICTO'] },
                { k: 'CATALISADORES',   stops: ['RISCO PRINCIPAL', 'VEREDICTO'] },
                { k: 'RISCO PRINCIPAL', stops: ['VEREDICTO'] },
                { k: 'VEREDICTO',       stops: [] },
              ].map(({ k, stops }) => {
                const items = parseSection(result.text, k, stops);
                if (!items.length) return null;
                const isList = ['TESE BULL', 'TESE BEAR', 'CATALISADORES'].includes(k);
                return (
                  <div key={k}>
                    <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', margin: '14px 0 6px' }}>{k.replace('TESE ', '')}</div>
                    {isList
                      ? <ul style={{ listStyle: 'none', padding: 0 }}>{items.map((it, i) => (
                          <li key={i} style={{ padding: '2px 0 2px 14px', position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 0, color: G.txt3 }}>-</span>{it}
                          </li>
                        ))}</ul>
                      : <p style={{ lineHeight: 1.7 }}>{items.join(' ')}</p>
                    }
                  </div>
                );
              })}
            </div>

            {fuItems.map((it, i) => (
              <div key={i}>
                <div style={{ marginTop: 12, padding: '11px 13px', background: G.surf2, border: `1px solid ${G.bdr}`, borderRadius: 10 }}>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Tu</div>
                  <div style={{ fontSize: 13, color: G.txt }}>{it.q}</div>
                </div>
                {it.a
                  ? <div style={{ marginTop: 5, padding: 13, background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 10 }}>
                      <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.b.c, opacity: .7, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Apex Analyst</div>
                      <div style={{ fontSize: 12, color: G.txt2, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{it.a}</div>
                    </div>
                  : <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${G.bdr}`, borderTopColor: G.txt2, animation: 'spin .7s linear infinite' }} />
                    </div>
                }
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ padding: '12px 18px', borderTop: `1px solid ${G.bdr}`, display: 'flex', gap: 7, flexShrink: 0 }}>
        <input value={fuQ} onChange={e => setFuQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendFU()}
          placeholder="Pergunta ao analista..."
          style={{ flex: 1, background: G.surf2, border: `1px solid ${G.bdr}`, color: G.txt, fontFamily: 'DM Sans,sans-serif', fontSize: 12, padding: '9px 12px', borderRadius: 8, outline: 'none' }} />
        <button onClick={sendFU} disabled={fuLoading}
          style={{ padding: '9px 16px', background: G.txt, border: 'none', color: G.bg, fontSize: 12, cursor: 'pointer', borderRadius: 8, fontWeight: 500, opacity: fuLoading ? .6 : 1 }}>
          Enviar
        </button>
      </div>
    </div>
  );
}

// Batch Analyser
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
            ? <span style={{ color: G.sb.c }}>Todos os {port.length} activos ja tem rating!</span>
            : 'A analisar ' + unrated.length + ' activo(s) com DeepSeek - ~3s entre cada um.'}
        </div>
        {unrated.length > 0 && (
          <>
            <div style={{ background: G.surf2, borderRadius: 8, height: 6, overflow: 'hidden' }}>
              <div style={{ background: G.b.c, height: '100%', width: `${pct}%`, transition: 'width .3s' }} />
            </div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: G.txt3 }}>{progress}/{unrated.length} - {pct}%</div>
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
        {done && <div style={{ fontSize: 12, color: G.sb.c, fontWeight: 500 }}>Concluido. Spotlight actualizado.</div>}
      </div>
    </div>
  );
}

// Main App
export default function ApexApp() {
  const [tab,       setTab]       = useState('portfolio');
  const [ratings,   setRatings]   = useState({});
  const [port,      setPort]      = useState(PORTFOLIO_DEFAULT);
  const [filter,    setFilter]    = useState('all');
  const [panel,     setPanel]     = useState(null);
  const [showBatch, setShowBatch] = useState(false);
  const [newT,      setNewT]      = useState('');
  const [newV,      setNewV]      = useState('');
  const [newP,      setNewP]      = useState('');

  useEffect(() => {
    fetch('/api/ratings')
      .then(r => r.json())
      .then(data => { if (data && !data.error) setRatings(data); })
      .catch(() => {});
  }, []);

  const setRating = useCallback(async (ticker, r, analysisText) => {
    setRatings(prev => ({ ...prev, [ticker]: r }));
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, rating: r, analysis_text: analysisText || null }),
    }).catch(() => {});
  }, []);

  const cycleRating = (ticker) => {
    const cur  = ratings[ticker] || null;
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    if (next === null) {
      setRatings(prev => { const n = { ...prev }; delete n[ticker]; return n; });
      fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, rating: 'N/A', analysis_text: null }),
      }).catch(() => {});
    } else {
      setRating(ticker, next, null);
    }
  };

  const addStock = () => {
    const t = newT.toUpperCase().trim();
    const v = parseFloat(newV) || 0;
    const p = parseFloat(newP) || 0;
    if (!t || !v) return;
    const tot = port.reduce((s, x) => s + x.v, 0) + v;
    const newPort = [...port.map(x => ({ ...x, w: (x.v / tot) * 100 })),
      { t, n: t, v, pnl: v - (v / (1 + p / 100)), pp: p, w: (v / tot) * 100, s: 'Other', buy_price: null }];
    setPort(newPort);
    setNewT(''); setNewV(''); setNewP('');
  };

  const totalVal   = port.reduce((s, x) => s + x.v, 0);
  const totalPnl   = port.reduce((s, x) => s + x.pnl, 0);
  const ratedCount = Object.keys(ratings).filter(k => ratings[k] && ratings[k] !== 'N/A').length;
  const filtered   = filter === 'all' ? port : port.filter(x => (ratings[x.t] || null) === (filter === 'N/A' ? null : filter));

  const spGroups = {
    'Strong Buy':  port.filter(x => ratings[x.t] === 'Strong Buy'),
    'Buy':         port.filter(x => ratings[x.t] === 'Buy'),
    'Sell':        port.filter(x => ratings[x.t] === 'Sell'),
    'Strong Sell': port.filter(x => ratings[x.t] === 'Strong Sell'),
  };

  const tabItems    = [{ id: 'portfolio', label: 'Portfolio' }, { id: 'insider', label: 'Insiders' }, { id: 'news', label: 'Noticias' }, { id: 'overview', label: 'Overview' }];
  const filterItems = ['all', 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];

  return (
    <div style={{ fontFamily: 'DM Sans,sans-serif', background: G.bg, minHeight: '100vh', color: G.txt, fontSize: 14 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fup  { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${G.bdr2}; border-radius: 2px; }
        input::placeholder { color: ${G.txt3}; }
      `}</style>

      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(246,244,241,.95)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${G.bdr}`, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase' }}>
          Apex<span style={{ color: G.txt3 }}> / </span>Intel
        </div>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {[
            { l: 'Total', v: 'EUR' + totalVal.toFixed(2) },
            { l: 'P&L', v: (totalPnl >= 0 ? '+' : '') + 'EUR' + totalPnl.toFixed(2) },
            { l: 'Rated', v: ratedCount + '/' + port.length },
          ].map(({ l, v }) => (
            <div key={l}>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
          <button onClick={() => setShowBatch(true)}
            style={{ padding: '6px 14px', background: G.txt, border: 'none', color: G.bg, fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 7, letterSpacing: .5 }}>
            Analisar Tudo
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', background: G.surf, borderBottom: `1px solid ${G.bdr}`, padding: '0 24px', overflowX: 'auto' }}>
        {tabItems.map(({ id, label }) => (
          <div key={id} onClick={() => setTab(id)}
            style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: tab === id ? G.txt : G.txt3, borderBottom: tab === id ? `2px solid ${G.txt}` : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all .15s', userSelect: 'none' }}>
            {label}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 24 }}>
        {tab === 'portfolio' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 26 }}>
              {[
                { label: 'Strong Buy', key: 'sb', rkey: 'Strong Buy' },
                { label: 'Buy',        key: 'b',  rkey: 'Buy' },
                { label: 'Sell',       key: 's',  rkey: 'Sell' },
                { label: 'Strong Sell',key: 'ss', rkey: 'Strong Sell' },
              ].map(({ label, key, rkey }) => (
                <SpotlightCard key={rkey} label={label} colorKey={key} stocks={spGroups[rkey]} onOpen={setPanel} />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, letterSpacing: 1.5, color: G.txt3, textTransform: 'uppercase' }}>
                Posicoes - {filtered.length} activo{filtered.length !== 1 ? 's' : ''}{filter !== 'all' ? ' filtrados' : ''}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {filterItems.map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ padding: '4px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 20, border: `1px solid ${filter === f ? G.txt : G.bdr2}`, background: filter === f ? G.txt : G.surf, color: filter === f ? G.bg : G.txt3 }}>
                    {f === 'all' ? 'Todos' : f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 7, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { id: 'nt', val: newT, set: setNewT, ph: 'TICKER', w: 95, up: true },
                { id: 'nv', val: newV, set: setNewV, ph: 'Valor', w: 100, num: true },
                { id: 'np', val: newP, set: setNewP, ph: 'P&L %', w: 80, num: true },
              ].map(({ id, val, set, ph, w, up, num }) => (
                <input key={id} value={val} onChange={e => set(up ? e.target.value.toUpperCase() : e.target.value)}
                  placeholder={ph} type={num ? 'number' : 'text'}
                  style={{ width: w, background: G.surf, border: `1px solid ${G.bdr}`, color: G.txt, fontFamily: 'DM Mono,monospace', fontSize: 12, padding: '7px 11px', borderRadius: 8, outline: 'none' }} />
              ))}
              <button onClick={addStock}
                style={{ padding: '7px 16px', background: G.surf, border: `1px solid ${G.bdr2}`, color: G.txt2, fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 8 }}>
                + Adicionar
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 110px 60px 114px 88px', padding: '5px 13px', gap: 10, marginBottom: 3 }}>
              {['', 'Activo', 'Valor', 'P&L', 'Peso', 'Rating', 'Analise'].map((h, i) => (
                <div key={i} style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: G.txt3, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: i > 1 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 3 }}>
              {filtered.map((s, i) => {
                const r   = ratings[s.t] && ratings[s.t] !== 'N/A' ? ratings[s.t] : null;
                const pos = s.pnl >= 0;
                return (
                  <div key={s.t}
                    style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 110px 60px 114px 88px', alignItems: 'center', padding: '11px 13px', background: G.surf, border: `1px solid ${G.bdr}`, borderRadius: 10, gap: 10, animation: `fup .22s ease ${Math.min(i * .025, .3)}s both` }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: G.surf2, border: `1px solid ${G.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono,monospace', fontSize: 7, color: G.txt3, fontWeight: 500 }}>
                      {s.t.slice(0, 4)}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 500 }}>{s.t}</div>
                      <div style={{ fontSize: 11, color: G.txt3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.n}</div>
                    </div>
                    <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, textAlign: 'right' }}>EUR{s.v.toFixed(2)}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, color: pos ? G.sb.c : G.ss.c }}>{pos ? '+' : ''}EUR{Math.abs(s.pnl).toFixed(2)}</div>
                      <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: pos ? G.sb.c : G.ss.c, opacity: .8, marginTop: 1 }}>{pos ? '+' : ''}{s.pp.toFixed(2)}%</div>
                    </div>
                    <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: G.txt3, textAlign: 'right' }}>{s.w.toFixed(2)}%</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Pill rating={r} onClick={() => cycleRating(s.t)} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setPanel(s.t)}
                        style={{ padding: '5px 12px', background: G.surf2, border: `1px solid ${G.bdr}`, color: G.txt2, fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 8, whiteSpace: 'nowrap', transition: 'all .13s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = G.txt; e.currentTarget.style.color = G.bg; }}
                        onMouseLeave={e => { e.currentTarget.style.background = G.surf2; e.currentTarget.style.color = G.txt2; }}>
                        {r ? 'Ver analise' : 'Analisar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'overview' && <OverviewPanel port={port} ratings={ratings} />}
        {tab === 'insider' && <InsiderPanel tickers={port.map(x => x.t)} />}
        {tab === 'news' && <NewsPanel tickers={port.map(x => x.t)} />}
      </div>

      {panel && (
        <>
          <div onClick={() => setPanel(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,.18)', zIndex: 150, backdropFilter: 'blur(2px)' }} />
          <AnalysisPanel ticker={panel} port={port} ratings={ratings}
            onClose={() => setPanel(null)} onRatingSet={setRating} />
        </>
      )}

      {showBatch && (
        <BatchAnalyser port={port} ratings={ratings} onRatingSet={setRating} onClose={() => setShowBatch(false)} />
      )}
    </div>
  );
}
undefinedundefinedundefined
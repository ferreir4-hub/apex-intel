'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { PORTFOLIO_DEFAULT } from '@/lib/portfolio';

const G = {
  bg: '#FAF7F4', surf: '#FFFFFF', border: '#E8E2DA', text: '#1A1714',
  muted: '#7A6E66', accent: '#2C5F2E', accentL: '#E8F5E9',
  sell: '#C62828', sellL: '#FFEBEE', warn: '#E65100', warnL: '#FFF3E0',
  hold: '#1565C0', holdL: '#E3F2FD', tag: '#6D4C41', tagL: '#EFEBE9'
};

const RATING_COLORS = {
  STRONG_BUY:  { bg: '#1B5E20', text: '#fff', label: 'Strong Buy' },
  BUY:         { bg: '#2E7D32', text: '#fff', label: 'Buy' },
  HOLD:        { bg: '#1565C0', text: '#fff', label: 'Hold' },
  SELL:        { bg: '#C62828', text: '#fff', label: 'Sell' },
  STRONG_SELL: { bg: '#7B0000', text: '#fff', label: 'Strong Sell' },
};

const fmt = (n, dec=2) => typeof n === 'number' ? n.toFixed(dec) : '0.00';
const fmtK = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n/1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toFixed(0);
};

function RatingPill({ r }) {
  if (!r || !RATING_COLORS[r]) return null;
  const c = RATING_COLORS[r];
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Mono,monospace', letterSpacing: '.5px' }}>
      {c.label}
    </span>
  );
}

function AnalysisPanel({ stock, onClose, onRatingSet }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  async function analyse() {
    setLoading(true); setErr(''); setResult(null);
    try {
      const res = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock }),
      });
      const d = await res.json();
      if (d.error) { setErr(d.error); }
      else {
        setResult(d);
        if (d.rating) {
          onRatingSet(stock.t, d.rating, d.text);
        }
      }
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: G.surf, borderRadius: 16, padding: 28, width: 480, boxShadow: '0 8px 40px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'DM Mono,monospace', fontWeight: 600, fontSize: 15 }}>{stock.t} <span style={{ color: G.muted, fontWeight: 400, fontSize: 13 }}>{stock.n}</span></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: G.muted, fontSize: 20, lineHeight: 1 }}>x</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[['Valor', 'EUR ' + fmt(stock.v)], ['P&L', (stock.pnl >= 0 ? '+' : '') + 'EUR ' + fmt(stock.pnl)], ['Variacao', (stock.pp >= 0 ? '+' : '') + fmt(stock.pp) + '%'], ['Peso', fmt(stock.w) + '%']].map(([k,v]) => (
            <div key={k} style={{ background: G.bg, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: G.muted, marginBottom: 3 }}>{k}</div>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
        {!result && !loading && (
          <button onClick={analyse} style={{ width: '100%', background: G.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Analisar com AI
          </button>
        )}
        {loading && <div style={{ textAlign: 'center', color: G.muted, padding: 20 }}>A analisar...</div>}
        {err && <div style={{ color: G.sell, fontSize: 13, marginTop: 8, padding: '10px 14px', background: G.sellL, borderRadius: 8 }}>{err}</div>}
        {result && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 10 }}><RatingPill r={result.rating} /></div>
            <div style={{ fontSize: 13, color: G.text, lineHeight: 1.6, background: G.bg, borderRadius: 8, padding: '12px 14px' }}>{result.text}</div>
            <button onClick={analyse} style={{ marginTop: 12, background: 'none', border: '1px solid ' + G.border, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, color: G.muted }}>
              Reanalisar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BatchAnalyser({ portfolio, ratings, onRatingSet, onClose }) {
  const unrated = portfolio.filter(s => !ratings[s.t] || ratings[s.t] === 'N/A');
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
      setLog(prev => [...prev, { t: stock.t, status: 'loading' }]);
      try {
        const res = await fetch('/api/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock }),
        });
        const d = await res.json();
        if (d.error) {
          setLog(prev => prev.map(x => x.t === stock.t ? { ...x, status: 'error', msg: d.error } : x));
        } else {
          if (d.rating) onRatingSet(stock.t, d.rating, d.text);
          setLog(prev => prev.map(x => x.t === stock.t ? { ...x, status: 'ok', rating: d.rating } : x));
        }
      } catch (e) {
        setLog(prev => prev.map(x => x.t === stock.t ? { ...x, status: 'error', msg: e.message } : x));
      }
      setProgress(i + 1);
    }
    setRunning(false); setDone(true);
  }

  const total = unrated.length;
  const pct = total > 0 ? Math.round((progress / total) * 100) : 100;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={done ? onClose : undefined}>
      <div style={{ background: G.surf, borderRadius: 16, padding: 28, width: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 500 }}>Analisar Portfolio</div>
          {done && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: G.muted, fontSize: 18 }}>x</button>}
        </div>
        {total === 0 ? (
          <div style={{ color: G.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>Todos os stocks ja foram analisados.</div>
        ) : (
          <>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: G.muted, marginBottom: 6 }}>
                <span>{running ? 'A analisar ' + progress + ' / ' + total : done ? 'Concluido' : 'A preparar...'}</span>
                <span>{pct}%</span>
              </div>
              <div style={{ background: G.bg, borderRadius: 99, height: 6, overflow: 'hidden' }}>
                <div style={{ background: G.accent, width: pct + '%', height: '100%', borderRadius: 99, transition: 'width .4s ease' }} />
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {log.map(entry => (
                <div key={entry.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: G.bg, borderRadius: 8, fontSize: 13 }}>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 600, minWidth: 52 }}>{entry.t}</span>
                  {entry.status === 'loading' && <span style={{ color: G.muted }}>A analisar...</span>}
                  {entry.status === 'ok' && <RatingPill r={entry.rating} />}
                  {entry.status === 'error' && <span style={{ color: G.sell, fontSize: 12 }}>Erro: {(entry.msg || '').slice(0,60)}</span>}
                </div>
              ))}
            </div>
            {done && (
              <button onClick={onClose} style={{ background: G.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontWeight: 600, cursor: 'pointer' }}>
                Fechar
              </button>
            )}
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
    if (!portfolio || portfolio.length === 0) return;
    const tickers = portfolio.map(s => s.t).slice(0, 15).join(',');
    fetch('/api/news?tickers=' + tickers)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setNews(d);
        else setErr(d.error || 'Erro ao carregar noticias');
        setLoading(false);
      })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, [portfolio]);

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: G.muted }}>A carregar noticias...</div>;
  if (err) return <div style={{ padding: 24, color: G.sell, background: G.sellL, borderRadius: 10, margin: 16 }}>{err}</div>;
  if (news.length === 0) return <div style={{ padding: 32, textAlign: 'center', color: G.muted }}>Sem noticias recentes.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      {news.map((n, i) => {
        const relevant = n.sentiment !== undefined ? Math.abs(n.sentiment) > 0.35 : false;
        const ts = n.datetime ? new Date(n.datetime * 1000).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '';
        return (
          <a key={i} href={n.url || '#'} target="_blank" rel="noreferrer"
            style={{ display: 'block', background: G.surf, border: '1px solid ' + G.border, borderRadius: 12, padding: '14px 16px', textDecoration: 'none', color: G.text }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, fontWeight: 700, background: G.accentL, color: G.accent, borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                {n.ticker || ''}
              </span>
              {relevant && (
                <span style={{ fontSize: 11, fontWeight: 700, background: '#FFF8E1', color: '#F57F17', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                  RELEVANTE
                </span>
              )}
              <span style={{ fontSize: 11, color: G.muted, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{ts}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: G.text }}>{n.headline}</div>
            {n.summary && <div style={{ fontSize: 12, color: G.muted, marginTop: 5, lineHeight: 1.4 }}>{n.summary.slice(0, 120)}{n.summary.length > 120 ? '...' : ''}</div>}
            <div style={{ fontSize: 11, color: G.muted, marginTop: 6 }}>{n.source || ''}</div>
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

  const tickers = portfolio.map(s => s.t);

  useEffect(() => {
    if (!selected && tickers.length > 0) setSelected(tickers[0]);
  }, [portfolio]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true); setData([]);
    fetch('/api/insiders?symbol=' + selected)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selected]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {tickers.slice(0, 15).map(t => (
          <button key={t} onClick={() => setSelected(t)}
            style={{ background: selected === t ? G.accent : G.bg, color: selected === t ? '#fff' : G.text, border: '1px solid ' + (selected === t ? G.accent : G.border), borderRadius: 8, padding: '5px 12px', fontSize: 12, fontFamily: 'DM Mono,monospace', fontWeight: 600, cursor: 'pointer' }}>
            {t}
          </button>
        ))}
      </div>
      {loading && <div style={{ textAlign: 'center', color: G.muted, padding: 20 }}>A carregar...</div>}
      {!loading && data.length === 0 && <div style={{ textAlign: 'center', color: G.muted, padding: 20 }}>Sem transacoes de insiders recentes.</div>}
      {!loading && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((d, i) => {
            const isBuy = d.type === 'buy';
            return (
              <div key={i} style={{ background: G.surf, border: '1px solid ' + G.border, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: isBuy ? G.accentL : G.sellL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 20 }}>{isBuy ? '+' : '-'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: G.text }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{d.position}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 700, color: isBuy ? G.accent : G.sell }}>
                    {isBuy ? '+' : '-'}EUR {fmtK(d.value || 0)}
                  </div>
                  <div style={{ fontSize: 11, color: G.muted }}>{d.shares ? fmtK(d.shares) + ' acoes' : ''}</div>
                  <div style={{ fontSize: 11, color: G.muted }}>{d.date || ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OverviewPanel({ portfolio, ratings }) {
  const total = portfolio.reduce((s, x) => s + (x.v || 0), 0);
  const totalPnl = portfolio.reduce((s, x) => s + (x.pnl || 0), 0);
  const totalPnlPct = total > 0 ? (totalPnl / (total - totalPnl)) * 100 : 0;

  // HHI - concentracao
  const hhi = portfolio.reduce((s, x) => s + Math.pow((x.w || 0) / 100, 2), 0);
  const hhiLabel = hhi > 0.25 ? 'Alto' : hhi > 0.12 ? 'Medio' : 'Baixo';
  const hhiColor = hhi > 0.25 ? G.sell : hhi > 0.12 ? G.warn : G.accent;

  // Sector breakdown
  const sectors = {};
  portfolio.forEach(s => {
    const sec = s.s || 'Outro';
    if (!sectors[sec]) sectors[sec] = { value: 0, count: 0 };
    sectors[sec].value += s.v || 0;
    sectors[sec].count++;
  });
  const sectorList = Object.entries(sectors).sort((a,b) => b[1].value - a[1].value);

  // Winners / Losers
  const sorted = [...portfolio].sort((a,b) => (b.pp || 0) - (a.pp || 0));
  const winners = sorted.slice(0, 3);
  const losers = sorted.slice(-3).reverse();

  // Ratings breakdown
  const ratingCounts = { STRONG_BUY: 0, BUY: 0, HOLD: 0, SELL: 0, STRONG_SELL: 0 };
  let rated = 0;
  portfolio.forEach(s => {
    const r = ratings[s.t];
    if (r && ratingCounts[r] !== undefined) { ratingCounts[r]++; rated++; }
  });
  const sellSignals = (ratingCounts.SELL || 0) + (ratingCounts.STRONG_SELL || 0);
  const buySignals = (ratingCounts.STRONG_BUY || 0) + (ratingCounts.BUY || 0);

  // Alertas
  const alerts = [];
  if (hhi > 0.25) alerts.push({ type: 'danger', msg: 'Concentracao muito alta (HHI ' + fmt(hhi*100,0) + '). Top ' + sectorList[0]?.[0] + ' domina ' + fmt(sectorList[0]?.[1].value / total * 100, 0) + '% do portfolio.' });
  if (sellSignals > 0) alerts.push({ type: 'warn', msg: sellSignals + ' stock(s) com sinal de venda. Rever posicoes.' });
  const bigPos = portfolio.filter(s => (s.w || 0) > 30);
  if (bigPos.length > 0) alerts.push({ type: 'warn', msg: bigPos.map(s => s.t + ' (' + fmt(s.w,1) + '%)').join(', ') + ' com peso excessivo (>30%).' });
  const redPnl = portfolio.filter(s => (s.pnl || 0) < 0);
  if (redPnl.length > 3) alerts.push({ type: 'info', msg: redPnl.length + ' posicoes em prejuizo. Considera stop-loss ou media de baixo.' });

  const Card = ({ children, style }) => (
    <div style={{ background: G.surf, border: '1px solid ' + G.border, borderRadius: 14, padding: 18, ...style }}>{children}</div>
  );

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.45,
              background: a.type === 'danger' ? G.sellL : a.type === 'warn' ? G.warnL : G.holdL,
              color: a.type === 'danger' ? G.sell : a.type === 'warn' ? G.warn : G.hold,
              borderLeft: '3px solid ' + (a.type === 'danger' ? G.sell : a.type === 'warn' ? G.warn : G.hold)
            }}>
              {a.type === 'danger' ? '[!] ' : a.type === 'warn' ? '[!] ' : '[i] '}{a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Resumo + HHI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          ['Portfolio Total', 'EUR ' + fmtK(total)],
          ['P&L Total', (totalPnl >= 0 ? '+' : '') + 'EUR ' + fmtK(totalPnl) + ' (' + (totalPnlPct >= 0 ? '+' : '') + fmt(totalPnlPct, 1) + '%)'],
          ['Concentracao HHI', hhiLabel + ' (' + fmt(hhi * 100, 1) + ')'],
        ].map(([k, v], i) => (
          <Card key={k}>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 5 }}>{k}</div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 700, color: i === 2 ? hhiColor : i === 1 ? (totalPnl >= 0 ? G.accent : G.sell) : G.text }}>{v}</div>
          </Card>
        ))}
      </div>

      {/* Sector breakdown */}
      <Card>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Exposicao por Sector</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sectorList.map(([sec, { value, count }]) => {
            const pct = total > 0 ? (value / total) * 100 : 0;
            return (
              <div key={sec}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>{sec} <span style={{ color: G.muted, fontSize: 11 }}>({count} pos.)</span></span>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>{fmt(pct, 1)}%</span>
                </div>
                <div style={{ background: G.bg, borderRadius: 99, height: 7, overflow: 'hidden' }}>
                  <div style={{ background: G.accent, width: pct + '%', height: '100%', borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Winners / Losers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: G.accent, marginBottom: 10 }}>Top Performers</div>
          {winners.map(s => (
            <div key={s.t} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid ' + G.border, fontSize: 12 }}>
              <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>{s.t}</span>
              <span style={{ color: G.accent, fontWeight: 600 }}>{s.pp >= 0 ? '+' : ''}{fmt(s.pp, 1)}%</span>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: G.sell, marginBottom: 10 }}>Piores Performers</div>
          {losers.map(s => (
            <div key={s.t} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid ' + G.border, fontSize: 12 }}>
              <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>{s.t}</span>
              <span style={{ color: G.sell, fontWeight: 600 }}>{s.pp >= 0 ? '+' : ''}{fmt(s.pp, 1)}%</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Ratings breakdown */}
      {rated > 0 && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Distribuicao de Ratings ({rated}/{portfolio.length} analisados)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(ratingCounts).map(([r, n]) => n > 0 ? (
              <div key={r} style={{ background: RATING_COLORS[r].bg, color: RATING_COLORS[r].text, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700 }}>
                {RATING_COLORS[r].label}: {n}
              </div>
            ) : null)}
          </div>
          {rated > 0 && (
            <div style={{ fontSize: 12, color: G.muted, marginTop: 10, lineHeight: 1.5 }}>
              {buySignals > sellSignals ? 'Maioria das posicoes analisadas com sinal positivo. ' : sellSignals > buySignals ? 'Atencao: mais sinais de venda do que compra. ' : 'Portfolio equilibrado em termos de ratings. '}
              Racio Buy/Sell: {buySignals}/{sellSignals}.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function PortfolioTable({ portfolio, ratings, ratingTexts, onAnalyse }) {
  const [filter, setFilter] = useState('Todos');
  const filters = ['Todos', 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
  const rmap = { 'Strong Buy': 'STRONG_BUY', 'Buy': 'BUY', 'Hold': 'HOLD', 'Sell': 'SELL', 'Strong Sell': 'STRONG_SELL' };

  const filtered = filter === 'Todos' ? portfolio : portfolio.filter(s => ratings[s.t] === rmap[filter]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? G.text : G.bg, color: filter === f ? G.surf : G.muted, border: '1px solid ' + G.border, borderRadius: 20, padding: '4px 13px', fontSize: 12, cursor: 'pointer', fontWeight: filter === f ? 600 : 400 }}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 16px' }}>
        {filtered.map(s => {
          const r = ratings[s.t];
          const hasRating = r && RATING_COLORS[r];
          return (
            <div key={s.t} style={{ background: G.surf, border: '1px solid ' + G.border, borderRadius: 12, padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 14 }}>{s.t}</span>
                  <span style={{ fontSize: 12, color: G.muted }}>{s.n}</span>
                  {hasRating && <RatingPill r={r} />}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: G.muted }}>
                  <span>EUR {fmt(s.v)}</span>
                  <span style={{ color: (s.pnl || 0) >= 0 ? G.accent : G.sell }}>
                    {(s.pnl || 0) >= 0 ? '+' : ''}EUR {fmt(s.pnl)} ({(s.pp || 0) >= 0 ? '+' : ''}{fmt(s.pp)}%)
                  </span>
                  <span>{fmt(s.w)}%</span>
                </div>
                {ratingTexts[s.t] && (
                  <div style={{ fontSize: 12, color: G.muted, marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>
                    {ratingTexts[s.t].slice(0, 100)}{ratingTexts[s.t].length > 100 ? '...' : ''}
                  </div>
                )}
              </div>
              <button onClick={() => onAnalyse(s)}
                style={{ background: G.bg, border: '1px solid ' + G.border, borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: G.text, whiteSpace: 'nowrap' }}>
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

  const total = portfolio.reduce((s, x) => s + (x.v || 0), 0);
  const totalPnl = portfolio.reduce((s, x) => s + (x.pnl || 0), 0);
  const ratedCount = portfolio.filter(s => ratings[s.t] && RATING_COLORS[ratings[s.t]]).length;

  // Load saved ratings from API on mount
  useEffect(() => {
    fetch('/api/ratings')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === 'object' && !d.error) {
          const r = {}, t = {};
          Object.entries(d).forEach(([ticker, val]) => {
            if (typeof val === 'object') { r[ticker] = val.rating; t[ticker] = val.text || ''; }
            else { r[ticker] = val; }
          });
          setRatings(r);
          setRatingTexts(t);
        }
      })
      .catch(() => {});
  }, []);

  const handleRatingSet = useCallback((ticker, rating, text) => {
    setRatings(prev => ({ ...prev, [ticker]: rating }));
    setRatingTexts(prev => ({ ...prev, [ticker]: text || '' }));
    // Persist to API
    fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, rating, text: text || '' }),
    }).catch(() => {});
  }, []);

  const tabs = ['Portfolio', 'Insiders', 'Noticias', 'Overview'];

  const ratingGroups = { STRONG_BUY: [], BUY: [], SELL: [], STRONG_SELL: [] };
  portfolio.forEach(s => {
    const r = ratings[s.t];
    if (r && ratingGroups[r]) ratingGroups[r].push(s);
  });

  return (
    <div style={{ minHeight: '100vh', background: G.bg, fontFamily: 'DM Sans,sans-serif', color: G.text }}>
      {/* Header */}
      <div style={{ background: G.surf, borderBottom: '1px solid ' + G.border, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 16, letterSpacing: '.5px' }}>Apex / Intel</div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
          {[['Total', 'EUR ' + fmtK(total)], ['P&L', (totalPnl >= 0 ? '+' : '') + 'EUR ' + fmtK(totalPnl)], ['Rated', ratedCount + '/' + portfolio.length]].map(([k,v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: G.muted }}>{k}</div>
              <div style={{ fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 13, color: k === 'P&L' ? (totalPnl >= 0 ? G.accent : G.sell) : G.text }}>{v}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowBatch(true)}
          style={{ background: G.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Analisar Tudo
        </button>
      </div>

      {/* Ratings summary bar */}
      <div style={{ background: G.surf, borderBottom: '1px solid ' + G.border, padding: '10px 20px', display: 'flex', gap: 20, overflowX: 'auto' }}>
        {Object.entries(ratingGroups).map(([r, stocks]) => (
          <div key={r} style={{ minWidth: 120 }}>
            <div style={{ marginBottom: 5 }}><RatingPill r={r} /></div>
            {stocks.length === 0 ? (
              <div style={{ fontSize: 11, color: G.muted }}>Sem posicoes.</div>
            ) : (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {stocks.map(s => (
                  <span key={s.t} style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', background: G.bg, borderRadius: 4, padding: '2px 5px' }}>{s.t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + G.border, background: G.surf, padding: '0 16px' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: 'none', border: 'none', borderBottom: tab === t ? '2px solid ' + G.accent : '2px solid transparent', padding: '12px 16px', fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? G.text : G.muted, cursor: 'pointer' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: 8 }}>
        {tab === 'Portfolio' && (
          <PortfolioTable portfolio={portfolio} ratings={ratings} ratingTexts={ratingTexts} onAnalyse={setAnalyseStock} />
        )}
        {tab === 'Insiders' && <InsidersPanel portfolio={portfolio} />}
        {tab === 'Noticias' && <NewsPanel portfolio={portfolio} />}
        {tab === 'Overview' && <OverviewPanel portfolio={portfolio} ratings={ratings} />}
      </div>

      {showBatch && (
        <BatchAnalyser portfolio={portfolio} ratings={ratings} onRatingSet={handleRatingSet} onClose={() => setShowBatch(false)} />
      )}
      {analyseStock && (
        <AnalysisPanel stock={analyseStock} onClose={() => setAnalyseStock(null)} onRatingSet={handleRatingSet} />
      )}
    </div>
  );
}

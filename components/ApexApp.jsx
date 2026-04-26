'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PORTFOLIO_DEFAULT } from '../lib/portfolio';

const G = { bg: '#0a0a0f', card: '#111118', border: '#1e1e2e', text: '#e2e8f0', muted: '#64748b', accent: '#6366f1', green: '#22c55e', red: '#ef4444', yellow: '#f59e0b', blue: '#3b82f6', purple: '#a855f7', cyan: '#06b6d4' };
const RATING_META = { STRONG_BUY: { label: 'Strong Buy', color: '#16a34a', bg: '#14532d' }, BUY: { label: 'Buy', color: '#22c55e', bg: '#166534' }, HOLD: { label: 'Hold', color: '#f59e0b', bg: '#78350f' }, SELL: { label: 'Sell', color: '#f97316', bg: '#7c2d12' }, STRONG_SELL: { label: 'Strong Sell', color: '#ef4444', bg: '#7f1d1d' } };
const fmt = (n) => n == null ? '—' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
const fmtK = (n) => { if (n == null) return '—'; if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+'M'; if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(0)+'K'; return n.toFixed(0); };
const fmtPct = (n) => n == null ? '—' : (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
function Pill({ children, color = G.accent, bg }) { return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:9999, fontSize:11, fontWeight:600, letterSpacing:'0.04em', color, background:bg||color+'22', border:`1px solid ${color}44` }}>{children}</span>; }
function Card({ children, style }) { return <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:20, ...style }}>{children}</div>; }
function AnalystPanel({ ticker }) {
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{ fetch(`/api/analyst?ticker=${ticker}`).then(r=>r.json()).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false)); },[ticker]);
  if(loading) return <div style={{color:G.muted,fontSize:13}}>A carregar analistas...</div>;
  if(!data||data.error) return null;
  const {consensus,counts={},total=0,priceTargetMean,priceTargetHigh,priceTargetLow,period}=data;
  const meta=RATING_META[consensus]||RATING_META.HOLD;
  const bars=[{key:'STRONG_BUY',label:'S.Buy',count:counts.strongBuy||0},{key:'BUY',label:'Buy',count:counts.buy||0},{key:'HOLD',label:'Hold',count:counts.hold||0},{key:'SELL',label:'Sell',count:counts.sell||0},{key:'STRONG_SELL',label:'S.Sell',count:counts.strongSell||0}];
  return <div style={{marginTop:16,padding:16,background:'#0d0d1a',borderRadius:10,border:`1px solid ${G.border}`}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
      <span style={{color:G.muted,fontSize:12}}>Wall Street Consensus</span>
      <Pill color={meta.color} bg={meta.bg}>{meta.label}</Pill>
      {period&&<span style={{color:G.muted,fontSize:11}}>{period}</span>}
    </div>
    {total>0&&<div style={{marginBottom:12}}>
      <div style={{display:'flex',height:8,borderRadius:4,overflow:'hidden',gap:1}}>{bars.map(b=>b.count>0&&<div key={b.key} style={{width:`${(b.count/total)*100}%`,background:RATING_META[b.key].color}} title={`${b.label}: ${b.count}`}/>)}</div>
      <div style={{display:'flex',gap:12,marginTop:6}}>{bars.map(b=><div key={b.key} style={{fontSize:11,color:b.count>0?RATING_META[b.key].color:G.muted}}>{b.label} {b.count}</div>)}<div style={{fontSize:11,color:G.muted,marginLeft:'auto'}}>{total} analistas</div></div>
    </div>}
    {priceTargetMean>0&&<div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,color:G.muted}}>Alvo Médio</div><div style={{fontSize:15,fontWeight:700,color:G.text}}>${priceTargetMean?.toFixed(2)}</div></div>
      <div><div style={{fontSize:11,color:G.muted}}>Alto</div><div style={{fontSize:15,fontWeight:600,color:G.green}}>${priceTargetHigh?.toFixed(2)}</div></div>
      <div><div style={{fontSize:11,color:G.muted}}>Baixo</div><div style={{fontSize:15,fontWeight:600,color:G.red}}>${priceTargetLow?.toFixed(2)}</div></div>
    </div>}
  </div>;
}
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PORTFOLIO_DEFAULT } from '../lib/portfolio';

const G = {
  bg:'#0a0a0f',card:'#111118',border:'#1e1e2e',text:'#e2e8f0',muted:'#64748b',
  accent:'#6366f1',green:'#22c55e',red:'#ef4444',yellow:'#f59e0b',
  blue:'#3b82f6',purple:'#a855f7',cyan:'#06b6d4',
};

const RATING_META = {
  STRONG_BUY:  {label:'Strong Buy',  color:'#16a34a',bg:'#14532d'},
  BUY:         {label:'Buy',          color:'#22c55e',bg:'#166534'},
  HOLD:        {label:'Hold',         color:'#f59e0b',bg:'#78350f'},
  SELL:        {label:'Sell',         color:'#f97316',bg:'#7c2d12'},
  STRONG_SELL: {label:'Strong Sell',  color:'#ef4444',bg:'#7f1d1d'},
};

// Normalise portfolio.js shorthand fields → full field names
function normalisePortfolio(raw) {
  const total = raw.reduce((s, p) => s + (p.v || p.value || 0), 0);
  return raw.map(p => ({
    ticker:  p.t  || p.ticker,
    name:    p.n  || p.name,
    value:   p.v  || p.value  || 0,
    pnl:     p.pnl || 0,
    pnlPct:  p.pp || p.pnlPct || 0,
    weight:  p.w  || p.weight || (total > 0 ? ((p.v||p.value||0)/total*100) : 0),
    sector:  p.s  || p.sector || 'Other',
  }));
}

const fmt    = (n) => n==null?'—':new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(n);
const fmtK   = (n) => { if(n==null)return'—'; if(Math.abs(n)>=1e6)return(n/1e6).toFixed(1)+'M'; if(Math.abs(n)>=1e3)return(n/1e3).toFixed(0)+'K'; return n.toFixed(0); };
const fmtPct = (n) => n==null?'—':(n>=0?'+':'')+n.toFixed(2)+'%';

function Pill({children,color=G.accent,bg}){
  return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:9999,fontSize:11,fontWeight:600,letterSpacing:'0.04em',color,background:bg||color+'22',border:`1px solid ${color}44`}}>{children}</span>;
}
function Card({children,style}){
  return <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:20,...style}}>{children}</div>;
}

function AnalystPanel({ticker}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch(`/api/analyst?ticker=${ticker}`).then(r=>r.json()).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false));
  },[ticker]);
  if(loading)return <div style={{color:G.muted,fontSize:13}}>A carregar analistas...</div>;
  if(!data||data.error)return null;
  const {consensus,counts={},total=0,priceTargetMean,priceTargetHigh,priceTargetLow,period}=data;
  const meta=RATING_META[consensus]||RATING_META.HOLD;
  const bars=[
    {key:'STRONG_BUY',label:'S.Buy',count:counts.strongBuy||0},
    {key:'BUY',label:'Buy',count:counts.buy||0},
    {key:'HOLD',label:'Hold',count:counts.hold||0},
    {key:'SELL',label:'Sell',count:counts.sell||0},
    {key:'STRONG_SELL',label:'S.Sell',count:counts.strongSell||0},
  ];
  return(
    <div style={{marginTop:16,padding:16,background:'#0d0d1a',borderRadius:10,border:`1px solid ${G.border}`}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <span style={{color:G.muted,fontSize:12}}>Wall Street Consensus</span>
        <Pill color={meta.color} bg={meta.bg}>{meta.label}</Pill>
        {period&&<span style={{color:G.muted,fontSize:11}}>{period}</span>}
      </div>
      {total>0&&(
        <div style={{marginBottom:12}}>
          <div style={{display:'flex',height:8,borderRadius:4,overflow:'hidden',gap:1}}>
            {bars.map(b=>b.count>0&&<div key={b.key} style={{width:`${(b.count/total)*100}%`,background:RATING_META[b.key].color,transition:'width 0.3s'}} title={`${b.label}: ${b.count}`}/>)}
          </div>
          <div style={{display:'flex',gap:12,marginTop:6}}>
            {bars.map(b=><div key={b.key} style={{fontSize:11,color:b.count>0?RATING_META[b.key].color:G.muted}}>{b.label} {b.count}</div>)}
            <div style={{fontSize:11,color:G.muted,marginLeft:'auto'}}>{total} analistas</div>
          </div>
        </div>
      )}
      {priceTargetMean>0&&(
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          <div><div style={{fontSize:11,color:G.muted}}>Alvo Médio</div><div style={{fontSize:15,fontWeight:700,color:G.text}}>${priceTargetMean?.toFixed(2)}</div></div>
          <div><div style={{fontSize:11,color:G.muted}}>Alto</div><div style={{fontSize:15,fontWeight:600,color:G.green}}>${priceTargetHigh?.toFixed(2)}</div></div>
          <div><div style={{fontSize:11,color:G.muted}}>Baixo</div><div style={{fontSize:15,fontWeight:600,color:G.red}}>${priceTargetLow?.toFixed(2)}</div></div>
        </div>
      )}
    </div>
  );
}

function AnalysisPanel({stock,onClose}){
  const [analysis,setAnalysis]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  useEffect(()=>{
    fetch('/api/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stocks:[stock]})})
      .then(r=>r.json())
      .then(d=>{const result=d.results?.[0];if(result?.error)setError(result.error);else setAnalysis(result);setLoading(false);})
      .catch(e=>{setError(e.message);setLoading(false);});
  },[stock.ticker]);
  const meta=analysis?.rating?RATING_META[analysis.rating]||RATING_META.HOLD:null;
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:28,maxWidth:700,width:'100%',maxHeight:'85vh',overflowY:'auto',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'none',border:'none',color:G.muted,cursor:'pointer',fontSize:20}}>✕</button>
        <div style={{marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <h2 style={{margin:0,color:G.text,fontSize:22}}>{stock.ticker}</h2>
            <span style={{color:G.muted,fontSize:14}}>{stock.name}</span>
          </div>
          <div style={{color:G.muted,fontSize:13,marginTop:4}}>{fmt(stock.value)} · {fmtPct(stock.pnlPct)} · {stock.weight?.toFixed(1)}% do portfolio</div>
        </div>
        <AnalystPanel ticker={stock.ticker}/>
        {loading&&<div style={{textAlign:'center',padding:40}}><div style={{color:G.accent,fontSize:14}}>A analisar com IA 360°...</div><div style={{color:G.muted,fontSize:12,marginTop:8}}>Recolhendo dados de mercado, analistas e contexto setorial</div></div>}
        {error&&<div style={{color:G.red,padding:16,background:G.red+'11',borderRadius:8}}>{error}</div>}
        {analysis&&!loading&&(
          <div style={{marginTop:20}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              {meta&&<Pill color={meta.color} bg={meta.bg}>{meta.label}</Pill>}
              {analysis.confidence&&<span style={{color:G.muted,fontSize:12}}>Confiança: {analysis.confidence}</span>}
            </div>
            <div style={{color:G.text,fontSize:14,lineHeight:1.7,whiteSpace:'pre-wrap',background:'#0d0d1a',padding:16,borderRadius:10}}>{analysis.analysis}</div>
            {analysis.keyRisks&&<div style={{marginTop:12}}><div style={{color:G.yellow,fontSize:12,fontWeight:600,marginBottom:6}}>RISCOS</div><div style={{color:G.muted,fontSize:13}}>{analysis.keyRisks}</div></div>}
            {analysis.catalyst&&<div style={{marginTop:12}}><div style={{color:G.green,fontSize:12,fontWeight:600,marginBottom:6}}>CATALISADORES</div><div style={{color:G.muted,fontSize:13}}>{analysis.catalyst}</div></div>}
          </div>
        )}
      </div>
    </div>
  );
}

async function runBatch(stocks,setRatings){
  try{
    const res=await fetch('/api/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stocks})});
    const data=await res.json();
    if(data.results){
      const map={};
      data.results.forEach(r=>{if(r.ticker&&r.rating)map[r.ticker]=r.rating;});
      setRatings(map);
      await fetch('/api/ratings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ratings:map})});
    }
  }catch(e){console.error('Batch error:',e);}
}

function BatchAnalyser({stocks,ratings,setRatings}){
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);
  const hasRun=useRef(false);
  const handleRun=useCallback(async()=>{
    if(hasRun.current||running)return;
    hasRun.current=true;setRunning(true);
    await runBatch(stocks,setRatings);
    setRunning(false);setDone(true);
  },[stocks,setRatings,running]);
  const rated=Object.keys(ratings).length;
  return(
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      {!done&&!running&&<button onClick={handleRun} style={{background:G.accent,color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13,fontWeight:600}}>Analisar Tudo</button>}
      {running&&<div style={{color:G.accent,fontSize:13}}>A analisar {stocks.length} stocks com IA 360°...</div>}
      {done&&<div style={{color:G.green,fontSize:13}}>✓ {rated} stocks classificados<button onClick={()=>{hasRun.current=false;setDone(false);handleRun();}} style={{marginLeft:8,background:'none',border:`1px solid ${G.border}`,color:G.muted,borderRadius:6,padding:'2px 8px',cursor:'pointer',fontSize:11}}>Reanalisar</button></div>}
    </div>
  );
}

function NewsPanel({tickers}){
  const [news,setNews]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch(`/api/news?tickers=${tickers.slice(0,10).join(',')}`).then(r=>r.json()).then(d=>{setNews(d.news||[]);setLoading(false);}).catch(()=>setLoading(false));
  },[]);
  if(loading)return <div style={{color:G.muted,padding:40,textAlign:'center'}}>A carregar notícias...</div>;
  if(!news.length)return <div style={{color:G.muted,padding:40,textAlign:'center'}}>Sem notícias disponíveis.</div>;
  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {news.slice(0,5).map((item,i)=>{
        const score=item.relevanceScore||0;
        const scoreColor=score>=70?G.green:score>=40?G.yellow:G.muted;
        const sentColor=item.sentiment>0?G.green:item.sentiment<0?G.red:G.muted;
        return(
          <Card key={i} style={{padding:16}}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{color:G.text,textDecoration:'none',fontSize:14,fontWeight:600,lineHeight:1.4,display:'block'}}>{item.headline}</a>
            <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{color:G.muted,fontSize:12}}>{item.source}</span>
              <span style={{color:G.muted,fontSize:12}}>·</span>
              <span style={{color:G.muted,fontSize:12}}>{item.relativeTime||item.datetime}</span>
              {item.tickers?.map(t=><Pill key={t} color={G.accent}>{t}</Pill>)}
              {item.sentiment!==undefined&&<span style={{fontSize:12,color:sentColor}}>{item.sentiment>0.2?'▲ Positivo':item.sentiment<-0.2?'▼ Negativo':'● Neutro'}</span>}
            </div>
            <div style={{marginTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:11,color:G.muted}}>Relevância para o portfolio</span>
                <span style={{fontSize:11,fontWeight:700,color:scoreColor}}>{score}%</span>
              </div>
              <div style={{height:4,background:G.border,borderRadius:2}}>
                <div style={{height:'100%',borderRadius:2,width:`${score}%`,background:`linear-gradient(90deg,${scoreColor}88,${scoreColor})`,transition:'width 0.5s ease'}}/>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// BUG FIX: usa ?symbol= (não ?ticker=) e type é lowercase 'buy'/'sell'
function InsidersPanel({tickers}){
  const [insiders,setInsiders]=useState([]);
  const [loading,setLoading]=useState(false);
  const [selectedTicker,setSelectedTicker]=useState(tickers[0]);
  const load=useCallback((ticker)=>{
    setLoading(true);setInsiders([]);
    fetch(`/api/insiders?symbol=${ticker}`).then(r=>r.json()).then(d=>{
      const arr=Array.isArray(d)?d:(d.insiders||[]);
      setInsiders(arr);setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);
  useEffect(()=>{load(selectedTicker);},[selectedTicker]);
  const buys=insiders.filter(t=>t.type==='buy'||t.type==='BUY');
  const sells=insiders.filter(t=>t.type==='sell'||t.type==='SELL');
  return(
    <div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
        {tickers.slice(0,15).map(t=>(
          <button key={t} onClick={()=>setSelectedTicker(t)} style={{padding:'4px 12px',borderRadius:20,border:`1px solid ${selectedTicker===t?G.accent:G.border}`,background:selectedTicker===t?G.accent+'22':'transparent',color:selectedTicker===t?G.accent:G.muted,cursor:'pointer',fontSize:12,fontWeight:600}}>{t}</button>
        ))}
      </div>
      <div style={{color:G.muted,fontSize:12,marginBottom:16}}>Filtro: transações {'>'} $25K ou {'>'} 500 acções · últimos 180 dias</div>
      {loading&&<div style={{color:G.muted,textAlign:'center',padding:40}}>A carregar insiders...</div>}
      {!loading&&!insiders.length&&<div style={{color:G.muted,textAlign:'center',padding:40}}>Sem transações relevantes para {selectedTicker}.</div>}
      {!loading&&insiders.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {[{label:'Compras',data:buys,color:G.green},{label:'Vendas',data:sells,color:G.red}].map(({label,data,color})=>(
            <div key={label}>
              <div style={{color,fontSize:13,fontWeight:700,marginBottom:10}}>{label} ({data.length})</div>
              {data.length===0&&<div style={{color:G.muted,fontSize:13}}>Sem {label.toLowerCase()}.</div>}
              {data.map((t,i)=>(
                <div key={i} style={{padding:'10px 12px',marginBottom:8,background:color+'11',borderRadius:8,border:`1px solid ${color}22`}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:G.text,fontSize:13,fontWeight:600}}>{t.name||'Insider'}</span>
                    <span style={{color,fontSize:13,fontWeight:700}}>{(t.type==='buy'||t.type==='BUY')?'+':'-'}${fmtK(t.value)}</span>
                  </div>
                  <div style={{color:G.muted,fontSize:12,marginTop:4}}>
                    {t.shares?.toLocaleString()} acções{t.price>0&&` · $${t.price.toFixed(2)}/acção`}{t.date&&` · ${t.date}`}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GrowthChart({portfolio}){
  const totalValue=portfolio.reduce((s,p)=>s+(p.value||0),0);
  const SECTOR_CAGR={
    Technology:{bear:0.06,base:0.14,bull:0.22},Semiconductor:{bear:0.07,base:0.16,bull:0.26},
    Consumer:{bear:0.04,base:0.09,bull:0.14},Healthcare:{bear:0.03,base:0.08,bull:0.14},
    Finance:{bear:0.04,base:0.09,bull:0.15},Energy:{bear:0.02,base:0.06,bull:0.12},
    ETF:{bear:0.05,base:0.10,bull:0.16},Default:{bear:0.04,base:0.10,bull:0.17},
  };
  const getSector=(ticker)=>{
    const t=ticker.toUpperCase();
    if(['GOOGL','MSFT','META','AAPL','NVDA','HOOD','HIMS','NFLX','FRSH','TEM','INFQ','WYFI','DXYZ','OUST'].includes(t))return'Technology';
    if(['MRVL','IONQ','AXTI','SMH','POET'].includes(t))return'Semiconductor';
    if(['AMZN','KO','OSCR'].includes(t))return'Consumer';
    if(['ABCL','NBIS'].includes(t))return'Healthcare';
    if(['KBR','PH','MOS','TMC'].includes(t))return'Energy';
    if(['GOLD'].includes(t))return'ETF';
    return'Default';
  };
  let bearCAGR=0,baseCAGR=0,bullCAGR=0;
  portfolio.forEach(p=>{const w=(p.value||0)/totalValue;const s=getSector(p.ticker);const c=SECTOR_CAGR[s]||SECTOR_CAGR.Default;bearCAGR+=w*c.bear;baseCAGR+=w*c.base;bullCAGR+=w*c.bull;});
  const years=Array.from({length:11},(_,i)=>i);
  const bearVals=years.map(y=>totalValue*Math.pow(1+bearCAGR,y));
  const baseVals=years.map(y=>totalValue*Math.pow(1+baseCAGR,y));
  const bullVals=years.map(y=>totalValue*Math.pow(1+bullCAGR,y));
  const maxVal=bullVals[10];
  const W=580,H=260,PL=70,PR=20,PT=20,PB=40,chartW=W-PL-PR,chartH=H-PT-PB;
  const xPos=(i)=>PL+(i/10)*chartW;
  const yPos=(v)=>PT+chartH-(v/maxVal)*chartH;
  const pathD=(vals)=>vals.map((v,i)=>`${i===0?'M':'L'} ${xPos(i)} ${yPos(v)}`).join(' ');
  const fmtE=(v)=>v>=1e6?'€'+(v/1e6).toFixed(1)+'M':v>=1e3?'€'+(v/1e3).toFixed(0)+'K':'€'+v.toFixed(0);
  return(
    <div>
      <div style={{color:G.text,fontSize:14,fontWeight:600,marginBottom:12}}>Projecção de Crescimento (10 anos)</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W}}>
        {[0.25,0.5,0.75,1].map(p=>{const y=PT+chartH-p*chartH;return(<g key={p}><line x1={PL} x2={W-PR} y1={y} y2={y} stroke={G.border} strokeWidth={1}/><text x={PL-6} y={y+4} fill={G.muted} fontSize={10} textAnchor="end">{fmtE(maxVal*p)}</text></g>);})}
        {[0,2,4,6,8,10].map(y=><text key={y} x={xPos(y)} y={H-PB+16} fill={G.muted} fontSize={10} textAnchor="middle">{y===0?'Hoje':`+${y}a`}</text>)}
        <path d={pathD(bearVals)} fill="none" stroke={G.red} strokeWidth={1.5} strokeDasharray="4 3"/>
        <path d={pathD(baseVals)} fill="none" stroke={G.accent} strokeWidth={2.5}/>
        <path d={pathD(bullVals)} fill="none" stroke={G.green} strokeWidth={1.5} strokeDasharray="4 3"/>
        <text x={xPos(10)+4} y={yPos(bearVals[10])+4} fill={G.red} fontSize={11}>{fmtE(bearVals[10])}</text>
        <text x={xPos(10)+4} y={yPos(baseVals[10])-4} fill={G.accent} fontSize={12} fontWeight="bold">{fmtE(baseVals[10])}</text>
        <text x={xPos(10)+4} y={yPos(bullVals[10])-4} fill={G.green} fontSize={11}>{fmtE(bullVals[10])}</text>
      </svg>
      <div style={{display:'flex',gap:20,marginTop:8}}>
        {[{label:`Bear (${(bearCAGR*100).toFixed(0)}% CAGR)`,color:G.red},{label:`Base (${(baseCAGR*100).toFixed(0)}% CAGR)`,color:G.accent},{label:`Bull (${(bullCAGR*100).toFixed(0)}% CAGR)`,color:G.green}].map(({label,color})=>(
          <div key={label} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color}}><div style={{width:16,height:2,background:color,borderRadius:1}}/>{label}</div>
        ))}
      </div>
    </div>
  );
}

function OverviewPanel({portfolio,ratings}){
  const totalValue=portfolio.reduce((s,p)=>s+(p.value||0),0);
  const totalPnL=portfolio.reduce((s,p)=>s+(p.pnl||0),0);
  const getSector=(ticker)=>{
    const t=ticker.toUpperCase();
    if(['GOOGL','MSFT','META','AAPL','NVDA','HOOD','HIMS','NFLX','FRSH','TEM','INFQ','WYFI'].includes(t))return'Technology';
    if(['MRVL','IONQ','AXTI','SMH','POET'].includes(t))return'Semiconductors';
    if(['AMZN','KO','OSCR'].includes(t))return'Consumer';
    if(['ABCL','NBIS'].includes(t))return'Healthcare';
    if(['KBR','PH','MOS','TMC'].includes(t))return'Industrials';
    if(['GOLD'].includes(t))return'Commodities/ETF';
    if(['DXYZ','IREN','OUST','XPEV'].includes(t))return'Special/Growth';
    return'Other';
  };
  const sectorMap={};
  portfolio.forEach(p=>{const s=getSector(p.ticker);if(!sectorMap[s])sectorMap[s]=0;sectorMap[s]+=p.value||0;});
  const sectors=Object.entries(sectorMap).sort((a,b)=>b[1]-a[1]);
  const hhi=portfolio.reduce((s,p)=>s+Math.pow((p.value/totalValue)*100,2),0);
  const hhiLabel=hhi>2500?'Alta Concentração':hhi>1500?'Concentração Moderada':'Diversificado';
  const hhiColor=hhi>2500?G.red:hhi>1500?G.yellow:G.green;
  const ratingCounts={STRONG_BUY:0,BUY:0,HOLD:0,SELL:0,STRONG_SELL:0};
  portfolio.forEach(p=>{const r=ratings[p.ticker];if(r&&ratingCounts[r]!==undefined)ratingCounts[r]++;});
  const ratedTotal=Object.values(ratingCounts).reduce((s,v)=>s+v,0);
  const alerts=[];
  const topStock=portfolio[0];
  if(topStock&&(topStock.value/totalValue)>0.35)alerts.push({msg:`${topStock.ticker} representa ${((topStock.value/totalValue)*100).toFixed(0)}% do portfolio — peso elevado.`});
  const tech=(sectorMap['Technology']||0)+(sectorMap['Semiconductors']||0);
  if(tech/totalValue>0.6)alerts.push({msg:`Exposição a Tech/Semis: ${((tech/totalValue)*100).toFixed(0)}% — considerar diversificação.`});
  const losers=portfolio.filter(p=>p.pnlPct<-15);
  if(losers.length>0)alerts.push({msg:`${losers.length} posição(ões) com P&L < -15%: ${losers.map(p=>p.ticker).join(', ')}`});
  const winners=[...portfolio].sort((a,b)=>b.pnlPct-a.pnlPct).slice(0,3);
  const topLosers=[...portfolio].sort((a,b)=>a.pnlPct-b.pnlPct).slice(0,3);
  const sectorColors=[G.accent,G.cyan,G.purple,G.green,G.yellow,G.red,'#f97316',G.muted];
  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        {[{label:'Valor Total',value:fmt(totalValue),color:G.text},{label:'P&L Total',value:fmt(totalPnL),color:totalPnL>=0?G.green:G.red},{label:'Posições',value:portfolio.length,color:G.text},{label:'HHI',value:`${hhi.toFixed(0)} — ${hhiLabel}`,color:hhiColor}].map(({label,value,color})=>(
          <Card key={label} style={{padding:16}}><div style={{color:G.muted,fontSize:12,marginBottom:4}}>{label}</div><div style={{color,fontSize:16,fontWeight:700}}>{value}</div></Card>
        ))}
      </div>
      {alerts.length>0&&<Card style={{padding:16}}><div style={{color:G.yellow,fontSize:13,fontWeight:700,marginBottom:10}}>⚠ Alertas</div>{alerts.map((a,i)=><div key={i} style={{color:G.muted,fontSize:13,padding:'6px 0',borderBottom:i<alerts.length-1?`1px solid ${G.border}`:'none'}}>{a.msg}</div>)}</Card>}
      <Card><GrowthChart portfolio={portfolio}/></Card>
      <Card>
        <div style={{color:G.text,fontSize:14,fontWeight:600,marginBottom:16}}>Distribuição Setorial</div>
        {sectors.map(([name,val],i)=>{const pct=(val/totalValue)*100;return(<div key={name} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:G.text,fontSize:13}}>{name}</span><span style={{color:G.muted,fontSize:13}}>{fmt(val)} · {pct.toFixed(1)}%</span></div><div style={{height:6,background:G.border,borderRadius:3}}><div style={{height:'100%',borderRadius:3,width:`${pct}%`,background:sectorColors[i%sectorColors.length]}}/></div></div>);})}
      </Card>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {[{label:'🏆 Top Performers',data:winners,color:G.green},{label:'📉 Piores Performers',data:topLosers,color:G.red}].map(({label,data,color})=>(
          <Card key={label} style={{padding:16}}><div style={{color:G.text,fontSize:13,fontWeight:600,marginBottom:12}}>{label}</div>{data.map(p=><div key={p.ticker} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${G.border}`}}><span style={{color:G.text,fontSize:13,fontWeight:600}}>{p.ticker}</span><span style={{color,fontSize:13}}>{fmtPct(p.pnlPct)}</span></div>)}</Card>
        ))}
      </div>
      {ratedTotal>0&&<Card style={{padding:16}}><div style={{color:G.text,fontSize:14,fontWeight:600,marginBottom:16}}>Distribuição de Ratings IA</div><div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{Object.entries(ratingCounts).map(([r,count])=>{if(!count)return null;const meta=RATING_META[r];return(<div key={r} style={{textAlign:'center',padding:'10px 16px',background:meta.bg,borderRadius:10,border:`1px solid ${meta.color}33`}}><div style={{color:meta.color,fontSize:20,fontWeight:800}}>{count}</div><div style={{color:meta.color,fontSize:11,marginTop:2}}>{meta.label}</div></div>);})}</div></Card>}
    </div>
  );
}

// BUG FIX: API retorna array directo, não {suggestions:[]}
function DiscoverPanel({portfolio}){
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState(null);
  const handleDiscover=async()=>{
    setLoading(true);setError(null);
    try{
      const res=await fetch('/api/discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolio})});
      const data=await res.json();
      // API pode retornar array directo ou {suggestions:[]}
      const arr=Array.isArray(data)?data:(data.suggestions||[]);
      if(!Array.isArray(data)&&data.error)setError(data.error);
      else setSuggestions(arr);
      setDone(true);
    }catch(e){setError(e.message);}
    setLoading(false);
  };
  return(
    <div>
      <div style={{marginBottom:20}}>
        <div style={{color:G.text,fontSize:16,fontWeight:700,marginBottom:8}}>Descobertas AI ✨</div>
        <div style={{color:G.muted,fontSize:13,lineHeight:1.6}}>A IA analisa o teu portfolio e sugere novos stocks que complementam as tuas posições — diversificando gaps sectoriais e adicionando exposição a tendências de crescimento.</div>
      </div>
      {!done&&!loading&&<button onClick={handleDiscover} style={{background:`linear-gradient(135deg,${G.accent},${G.purple})`,color:'#fff',border:'none',borderRadius:10,padding:'12px 24px',cursor:'pointer',fontSize:14,fontWeight:700,boxShadow:`0 4px 20px ${G.accent}44`}}>Descobrir Stocks IA</button>}
      {loading&&<div style={{textAlign:'center',padding:40}}><div style={{color:G.accent,fontSize:15}}>A analisar portfolio e mercados...</div><div style={{color:G.muted,fontSize:13,marginTop:8}}>Pode demorar 15-30 segundos</div></div>}
      {error&&<div style={{color:G.red,padding:16,background:G.red+'11',borderRadius:8,marginTop:16}}>Erro: {error}</div>}
      {done&&suggestions.length>0&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{color:G.muted,fontSize:13}}>{suggestions.length} sugestões geradas</div>
            <button onClick={()=>{setDone(false);setSuggestions([]);}} style={{background:'none',border:`1px solid ${G.border}`,color:G.muted,borderRadius:8,padding:'4px 12px',cursor:'pointer',fontSize:12}}>Regenerar</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {suggestions.map((s,i)=>{
              const ratingMeta=RATING_META[s.rating]||RATING_META.BUY;
              const cagr=s.cagr3y||s.cagr||0;
              const cagrColor=cagr>=20?G.green:cagr>=10?G.yellow:G.muted;
              return(
                <Card key={i} style={{padding:20,position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:ratingMeta.color,borderRadius:'12px 0 0 12px'}}/>
                  <div style={{paddingLeft:12}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:12}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <span style={{color:G.text,fontSize:18,fontWeight:800}}>{s.ticker||s.symbol}</span>
                          <span style={{color:G.muted,fontSize:13}}>{s.name||s.company}</span>
                          <Pill color={ratingMeta.color} bg={ratingMeta.bg}>{ratingMeta.label}</Pill>
                        </div>
                        <div style={{color:G.accent,fontSize:12,marginTop:4}}>{s.sector}</div>
                      </div>
                      {cagr>0&&<div style={{textAlign:'right',minWidth:90}}>
                        <div style={{fontSize:11,color:G.muted}}>CAGR 3a estimado</div>
                        <div style={{fontSize:22,fontWeight:800,color:cagrColor}}>+{cagr}%</div>
                        <div style={{height:4,background:G.border,borderRadius:2,marginTop:4}}><div style={{height:'100%',borderRadius:2,width:`${Math.min(cagr*2.5,100)}%`,background:cagrColor}}/></div>
                      </div>}
                    </div>
                    <div style={{color:G.muted,fontSize:13,lineHeight:1.6}}>{s.thesis||s.reason||s.rationale}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      {done&&suggestions.length===0&&!error&&<div style={{color:G.muted,padding:40,textAlign:'center'}}>Sem sugestões disponíveis. Tenta regenerar.</div>}
    </div>
  );
}

function PortfolioTable({portfolio,ratings,onAnalyse,filterRating}){
  const filtered=filterRating==='Todos'?portfolio:filterRating==='Sem Rating'?portfolio.filter(p=>!ratings[p.ticker]):portfolio.filter(p=>{const rMap={'Strong Buy':'STRONG_BUY','Buy':'BUY','Hold':'HOLD','Sell':'SELL','Strong Sell':'STRONG_SELL'};return ratings[p.ticker]===rMap[filterRating];});
  return(
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {filtered.map(stock=>{
        const rating=ratings[stock.ticker];
        const meta=rating?RATING_META[rating]:null;
        return(
          <div key={stock.ticker} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:G.card,border:`1px solid ${G.border}`,borderRadius:10}}>
            <div style={{minWidth:60}}>
              <div style={{color:G.text,fontSize:14,fontWeight:700}}>{stock.ticker}</div>
              <div style={{color:G.muted,fontSize:11,marginTop:1}}>{stock.name?.slice(0,18)}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{color:G.text,fontSize:14,fontWeight:600}}>{fmt(stock.value)}</div>
              <div style={{color:stock.pnl>=0?G.green:G.red,fontSize:12}}>{fmt(stock.pnl)} ({fmtPct(stock.pnlPct)})</div>
            </div>
            <div style={{color:G.muted,fontSize:12,minWidth:50,textAlign:'right'}}>{stock.weight?.toFixed(1)}%</div>
            {meta?<Pill color={meta.color} bg={meta.bg}>{meta.label}</Pill>:<div style={{minWidth:80}}/>}
            <button onClick={()=>onAnalyse(stock)} style={{background:G.accent+'22',border:`1px solid ${G.accent}44`,color:G.accent,borderRadius:8,padding:'4px 12px',cursor:'pointer',fontSize:12,fontWeight:600}}>Analisar</button>
          </div>
        );
      })}
    </div>
  );
}

export default function MainApexApp(){
  const raw=PORTFOLIO_DEFAULT;
  const [portfolio]=useState(()=>normalisePortfolio(raw));
  const [ratings,setRatings]=useState({});
  const [activeTab,setActiveTab]=useState('Portfolio');
  const [selectedStock,setSelectedStock]=useState(null);
  const [filterRating,setFilterRating]=useState('Todos');

  useEffect(()=>{
    fetch('/api/ratings').then(r=>r.json()).then(d=>{if(d.ratings)setRatings(d.ratings);}).catch(()=>{});
  },[]);

  const totalValue=portfolio.reduce((s,p)=>s+(p.value||0),0);
  const totalPnL=portfolio.reduce((s,p)=>s+(p.pnl||0),0);
  const ratedCount=portfolio.filter(p=>ratings[p.ticker]).length;
  const tabs=['Portfolio','Insiders','Noticias','Overview','Descobertas'];
  const tickers=portfolio.map(p=>p.ticker);
  const ratingGroups={STRONG_BUY:[],BUY:[],SELL:[],STRONG_SELL:[]};
  portfolio.forEach(p=>{const r=ratings[p.ticker];if(r&&ratingGroups[r])ratingGroups[r].push(p.ticker);});

  return(
    <div style={{background:G.bg,minHeight:'100vh',color:G.text,fontFamily:"'DM Sans',sans-serif",padding:'20px 16px'}}>
      <div style={{maxWidth:900,margin:'0 auto'}}>
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.text,letterSpacing:'-0.5px'}}>Apex <span style={{color:G.accent}}>/</span> Intel</h1>
            <BatchAnalyser stocks={portfolio} ratings={ratings} setRatings={setRatings}/>
          </div>
          <div style={{display:'flex',gap:20,marginTop:16,flexWrap:'wrap'}}>
            <div><div style={{color:G.muted,fontSize:11}}>Total</div><div style={{color:G.text,fontSize:18,fontWeight:700}}>{fmt(totalValue)}</div></div>
            <div><div style={{color:G.muted,fontSize:11}}>P&L</div><div style={{color:totalPnL>=0?G.green:G.red,fontSize:18,fontWeight:700}}>{totalPnL>=0?'+':''}{fmt(totalPnL)}</div></div>
            <div><div style={{color:G.muted,fontSize:11}}>Rated</div><div style={{color:G.text,fontSize:18,fontWeight:700}}>{ratedCount}/{portfolio.length}</div></div>
          </div>
          {Object.entries(ratingGroups).some(([,v])=>v.length>0)&&(
            <div style={{display:'flex',gap:12,marginTop:12,flexWrap:'wrap'}}>
              {Object.entries(ratingGroups).map(([r,t])=>{const meta=RATING_META[r];return t.length>0&&(<div key={r} style={{fontSize:12,color:meta.color}}><span style={{fontWeight:700}}>{meta.label}</span><span style={{color:G.muted}}> {t.join(', ')}</span></div>);})}
            </div>
          )}
        </div>

        <div style={{display:'flex',gap:4,marginBottom:24,borderBottom:`1px solid ${G.border}`}}>
          {tabs.map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{background:'none',border:'none',cursor:'pointer',padding:'10px 16px',fontSize:13,fontWeight:600,color:activeTab===tab?G.accent:G.muted,borderBottom:activeTab===tab?`2px solid ${G.accent}`:'2px solid transparent',transition:'all 0.2s',display:'flex',alignItems:'center',gap:6}}>
              {tab}{tab==='Descobertas'&&<span style={{fontSize:9,fontWeight:700,padding:'1px 5px',background:G.purple+'33',color:G.purple,borderRadius:4,border:`1px solid ${G.purple}44`}}>AI</span>}
            </button>
          ))}
        </div>

        {activeTab==='Portfolio'&&(
          <div>
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
              {['Todos','Strong Buy','Buy','Hold','Sell','Strong Sell'].map(f=>(
                <button key={f} onClick={()=>setFilterRating(f)} style={{padding:'4px 12px',borderRadius:20,border:`1px solid ${filterRating===f?G.accent:G.border}`,background:filterRating===f?G.accent+'22':'transparent',color:filterRating===f?G.accent:G.muted,cursor:'pointer',fontSize:12,fontWeight:600}}>{f}</button>
              ))}
            </div>
            <PortfolioTable portfolio={portfolio} ratings={ratings} onAnalyse={setSelectedStock} filterRating={filterRating}/>
          </div>
        )}
        {activeTab==='Insiders'&&<InsidersPanel tickers={tickers}/>}
        {activeTab==='Noticias'&&<NewsPanel tickers={tickers}/>}
        {activeTab==='Overview'&&<OverviewPanel portfolio={portfolio} ratings={ratings}/>}
        {activeTab==='Descobertas'&&<DiscoverPanel portfolio={portfolio}/>}
        {selectedStock&&<AnalysisPanel stock={selectedStock} onClose={()=>setSelectedStock(null)}/>}
      </div>
    </div>
  );
}

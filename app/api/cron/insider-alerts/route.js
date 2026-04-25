import { NextResponse } from 'next/server';
import { PORTFOLIO_DEFAULT } from '@/lib/portfolio';

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tickers = PORTFOLIO_DEFAULT.map(x => x.t);
  const alerts = [];
  const today = new Date();
  const yesterday = new Date(today - 86400000).toISOString().split('T')[0];
  for (const ticker of tickers) {
    try {
      const resp = await fetch(`https://financialmodelingprep.com/api/v4/insider-trading?symbol=${ticker}&limit=10&apikey=${process.env.FMP_API_KEY}`);
      const data = await resp.json();
      if (!Array.isArray(data)) continue;
      for (const tx of data) {
        const txDate = (tx.transactionDate || tx.filingDate || '').split('T')[0];
        if (txDate < yesterday) continue;
        const isBuy = (tx.acquistionOrDisposition || tx.transactionType || '').toUpperCase().startsWith('A');
        if (!isBuy) continue;
        const value = tx.price && tx.securitiesTransacted ? tx.price * tx.securitiesTransacted : tx.value || 0;
        if (value < 100000) continue;
        alerts.push({ ticker, name: tx.reportingName || tx.name || 'N/A', position: tx.typeOfOwner || tx.position || 'Insider', value: Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), date: txDate });
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 250));
  }
  if (alerts.length === 0) return NextResponse.json({ sent: false, message: 'Sem alertas hoje.' });
  const html = `<h2>APEX / Insider Alerts — ${today.toLocaleDateString('pt-PT')}</h2><table>${alerts.map(a => `<tr><td>${a.ticker}</td><td>${a.name}</td><td>${a.position}</td><td>${a.value}</td><td>${a.date}</td></tr>`).join('')}</table>`;
  const emailResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: 'apex@resend.dev', to: process.env.ALERT_EMAIL, subject: `APEX Insider Alert — ${alerts.length} compra(s)`, html }),
  });
  const emailData = await emailResp.json();
  return NextResponse.json({ sent: true, alerts: alerts.length, email: emailData });
}

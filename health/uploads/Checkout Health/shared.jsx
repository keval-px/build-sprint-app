/* global React */
// shared.jsx — Checkout Pulse shared data + presentational components.
// Exports to window so directionA.jsx / directionB.jsx / app.jsx can use them.

const ICON_BASE = 'assets/icons/';
const _svgCache = {};
function Icon({ name, size = 20, color, style, className }) {
  const [html, setHtml] = React.useState(_svgCache[name] || null);
  React.useEffect(() => {
    let live = true;
    if (_svgCache[name] != null) {setHtml(_svgCache[name]);return;}
    fetch(`${ICON_BASE}${name}.svg`).
    then((r) => r.text()).
    then((txt) => {
      const inner = txt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      _svgCache[name] = inner;
      if (live) setHtml(inner);
    }).
    catch(() => {});
    return () => {live = false;};
  }, [name]);
  return (
    <svg
      width={size} height={size} viewBox="0 0 20 20" fill="currentColor"
      aria-hidden="true" className={className}
      style={{ color: color || 'currentColor', flex: '0 0 auto', verticalAlign: 'middle', display: 'inline-block', ...style }}
      dangerouslySetInnerHTML={html ? { __html: html } : undefined} />);


}

// -------------------------------------------------------------------------
// DATA — generic sample store ("Maple & Stone"), Last 30 days
// -------------------------------------------------------------------------
const DATA = {
  store: 'Maple & Stone',
  rangeLabel: 'Last 30 days',
  rangeDates: 'May 6 – Jun 5, 2026',
  updated: 'Jun 5, 2026 · 9:04 am',

  revenueLost: 128470, // HERO
  recoverable: 78000, // sum of top opportunities
  sessions: 8420,
  completed: 1836,
  conversion: 21.8,
  conversionPrev: 23.0,
  conversionBench: 26.0,
  aov: 86,
  timeToPurchase: '5.9 min',
  failedCodeRate: 8.7,
  failedCodeLost: 18120,
  abandonmentRate: 78.2,

  // Industry benchmarks (average for comparable Shopify stores)
  bench: {
    conversion: { label: 'Checkout conversion', ours: 21.8, industry: 26.0, max: 40, higherBetter: true, unit: '%' },
    abandonment: { label: 'Abandonment rate', ours: 78.2, industry: 70.0, max: 100, higherBetter: false, unit: '%' },
    aov: { label: 'Avg. order value', ours: 86, industry: 80, max: 140, higherBetter: true, prefix: true },
    failedCode: { label: 'Failed discount codes', ours: 8.7, industry: 3.0, max: 12, higherBetter: false, unit: '%' },
    time: { label: 'Time to purchase', ours: 5.9, industry: 4.5, max: 10, higherBetter: false, unit: ' min' }
  },

  healthScore: 62,
  healthLabel: 'Needs attention',
  healthBars: [
  { label: 'Conversion', pct: 55, tone: 'warning' },
  { label: 'Funnel flow', pct: 38, tone: 'critical' },
  { label: 'Errors', pct: 64, tone: 'warning' },
  { label: 'Speed', pct: 70, tone: 'caution' }],


  funnel: [
  { name: 'Reached checkout', sessions: 8420, pct: 100 },
  { name: 'Contact info', sessions: 4800, pct: 57.0, dropPct: 43.0, dropN: 3620, lost: 61200, sev: 'lg' },
  { name: 'Chose shipping', sessions: 3420, pct: 40.6, dropPct: 28.8, dropN: 1380, lost: 34500, sev: 'md' },
  { name: 'Entered payment', sessions: 2470, pct: 29.3, dropPct: 27.8, dropN: 950, lost: 20400, sev: 'md' },
  { name: 'Completed purchase', sessions: 1836, pct: 21.8, dropPct: 25.7, dropN: 634, lost: 12370, sev: 'sm' }],


  failedCodes: [
  { code: 'HELLO20', rate: 3.1, lost: 7240 },
  { code: 'HELLO15', rate: 2.4, lost: 5310 },
  { code: 'SAVEMORE', rate: 1.6, lost: 3180 },
  { code: 'CRABBY', rate: 1.0, lost: 1390 },
  { code: 'WELCOME', rate: 0.6, lost: 1000 }],


  geo: [
  { place: 'Illinois', pct: 92 },
  { place: 'Texas', pct: 71 },
  { place: 'Georgia', pct: 66 },
  { place: 'Ohio', pct: 58 },
  { place: 'California', pct: 49 }]

};

// Prioritized recommendations (ranked by $ impact). Shared by both directions.
const PRIORITIES = [
{
  id: 'email',
  sev: 'critical',
  icon: 'EmailIcon',
  title: 'Customers stall at the email field',
  metric: '43%', metricSub: 'abandon at contact',
  what: 'The contact step is your single biggest leak — 43% of shoppers who reach checkout leave before completing it, and the email field is the most-struggled-with field on the page.',
  why: 'Customers hesitate, re-type, and abandon at the very first field. That friction sits in front of every other step, so it caps the conversion of everything downstream.',
  action: 'Turn on accelerated checkout (Shop Pay, Apple Pay) above the form and relax email validation so autofill works cleanly.',
  chips: [{ label: 'Lost here', val: '$61,200' }, { label: 'Field friction', val: '61% of sessions' }],
  recover: 42000,
  primary: 'Enable express checkout',
  secondary: 'See field analysis'
},
{
  id: 'codes',
  sev: 'warning',
  icon: 'DiscountIcon',
  title: '3 discount codes are failing at checkout',
  metric: '8.7%', metricSub: 'of sessions hit an error',
  what: '8.7% of checkout sessions enter a code that fails. HELLO20 and HELLO15 error the most — customers who came to redeem a promo get blocked instead.',
  why: 'A failed code at checkout reads as “the deal is gone.” These are high-intent shoppers ready to pay, and the error sends them away frustrated.',
  action: 'Review and fix the 3 top-failing codes — check expiry dates, eligibility rules, and minimum-spend thresholds.',
  chips: [{ label: 'Revenue lost', val: '$18,120' }, { label: 'Top code', val: 'HELLO20' }],
  recover: 14000,
  primary: 'Review failing codes',
  secondary: 'How codes fail'
},
{
  id: 'shipping',
  sev: 'warning',
  icon: 'ClockIcon',
  title: 'Shipping rates load too slowly',
  metric: '3.0s', metricSub: 'avg rate load time',
  what: 'Shipping options take about 3 seconds to appear, and 29% of shoppers drop at the shipping step while they wait.',
  why: 'A blank, loading screen at a price-sensitive moment gives hesitant buyers a reason to leave. Speed here directly protects mid-funnel conversion.',
  action: 'Cache carrier rates or switch to flat-rate tiers so options render instantly when the step opens.',
  chips: [{ label: 'Lost here', val: '$34,500' }, { label: 'Step drop', val: '29%' }],
  recover: 22000,
  primary: 'Optimize shipping rates',
  secondary: 'View shipping report'
},
{
  id: 'payment',
  sev: 'success',
  icon: 'CheckCircleIcon',
  title: 'Your payment step is healthy',
  metric: '92%', metricSub: 'reach purchase from payment',
  what: 'Once shoppers reach payment, 92% complete the order. Express-pay adoption is at 9% and trending up.',
  why: 'The bottom of your funnel is working. Fixing the upper steps will send more qualified shoppers into a step that already converts well.',
  action: 'No action needed — keep express pay enabled and monitor processing time.',
  chips: [{ label: 'Step completion', val: '92%' }, { label: 'Express pay', val: '9%' }],
  recover: 0,
  primary: null,
  secondary: 'View payment report'
}];


// -------------------------------------------------------------------------
// Small formatting helpers
// -------------------------------------------------------------------------
const fmt = (n) => n.toLocaleString('en-US');
const money = (n) => '$' + n.toLocaleString('en-US');
const TONE_FILL = {
  critical: 'var(--p-color-bg-fill-critical)',
  warning: 'var(--p-color-bg-fill-warning)',
  caution: 'var(--p-color-bg-fill-caution)',
  success: 'var(--p-color-bg-fill-success)',
  info: 'var(--p-color-bg-fill-info)'
};

// -------------------------------------------------------------------------
// Button
// -------------------------------------------------------------------------
function Btn({ variant = 'secondary', icon, children, onClick, full }) {
  return (
    <button className={`cp-btn ${variant}${full ? ' full' : ''}`} onClick={onClick} type="button">
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>);

}

function Badge({ tone = 'default', dot, children }) {
  return (
    <span className={`cp-badge ${tone}`}>
      {dot && <span className="cp-dot" />}
      {children}
    </span>);

}

// -------------------------------------------------------------------------
// Donut — converted vs lost
// -------------------------------------------------------------------------
function Donut({ size = 124, stroke = 11, pct }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = pct / 100 * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E3E3E3" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--cp-accent)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      
      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle"
      style={{ fontSize: 22, fontWeight: 700, fill: 'var(--p-color-text)', fontFeatureSettings: "'tnum'" }}>
        {pct}%
      </text>
      <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle"
      style={{ fontSize: 9.5, fill: 'var(--p-color-text-secondary)', letterSpacing: '.04em' }}>
        CONVERTED
      </text>
    </svg>);

}

// -------------------------------------------------------------------------
// Health ring
// -------------------------------------------------------------------------
function HealthRing({ size = 124, stroke = 11, score, tone = 'warning' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = score / 100 * c;
  const col = tone === 'critical' ? 'var(--p-color-bg-fill-critical)' :
  tone === 'success' ? 'var(--p-color-bg-fill-success)' :
  'var(--p-color-bg-fill-warning)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E3E3E3" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke}
      strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`}
      transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle"
      style={{ fontSize: 30, fontWeight: 700, fill: 'var(--p-color-text)', fontFeatureSettings: "'tnum'" }}>
        {score}
      </text>
      <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle"
      style={{ fontSize: 9.5, fill: 'var(--p-color-text-secondary)', letterSpacing: '.05em' }}>
        / 100
      </text>
    </svg>);

}

function HealthBars({ bars }) {
  return (
    <div className="cp-health-bars">
      {bars.map((b) =>
      <div className="cp-health-bar" key={b.label}>
          <span>{b.label}</span>
          <span className="cp-track"><span style={{ width: b.pct + '%', background: TONE_FILL[b.tone] }} /></span>
        </div>
      )}
    </div>);

}

// -------------------------------------------------------------------------
// Benchmarks — classify a metric against its industry average
// -------------------------------------------------------------------------
const fmtBench = (v, b) => b.prefix ? '$' + v : v + (b.unit || '');

function benchStatus(b) {
  const perf = b.higherBetter ?
  (b.ours - b.industry) / b.industry :
  (b.industry - b.ours) / b.industry;
  if (perf >= 0.05) return { label: 'Above average', tone: 'success', fill: 'var(--p-color-bg-fill-success)' };
  if (perf >= -0.05) return { label: 'On par', tone: 'default', fill: 'var(--p-color-icon-secondary)' };
  if (perf >= -0.20) return { label: 'Below average', tone: 'warning', fill: 'var(--p-color-bg-fill-warning)' };
  return { label: 'Needs attention', tone: 'critical', fill: 'var(--p-color-bg-fill-critical)' };
}

// the gap vs industry, phrased in the metric's own units
function benchDelta(b) {
  const diff = Math.abs(b.ours - b.industry);
  const rounded = Number.isInteger(b.ours) && Number.isInteger(b.industry) ? diff : diff.toFixed(1);
  const better = b.higherBetter ? b.ours > b.industry : b.ours < b.industry;
  const unit = b.prefix ? '' : b.unit || '';
  return { text: `${b.prefix ? '$' : ''}${rounded}${unit}`, better };
}

// Compact benchmark block: status pill + "vs X industry avg" + scale bar w/ marker
function BenchMini({ b, showBar = true }) {
  const s = benchStatus(b);
  const w = Math.min(b.ours / b.max * 100, 100);
  const m = Math.min(b.industry / b.max * 100, 100);
  return (
    <div className="cp-bench">
      <div className="cp-bench-top">
        <span className={`cp-badge ${s.tone} cp-badge-sm`}><span className="cp-dot" />{s.label}</span>
        <span className="cp-bench-note" style={{ fontSize: "10px" }}>vs {fmtBench(b.industry, b)} industry avg</span>
      </div>
      {showBar &&
      <div className="cp-bench-track" title={`Your store: ${fmtBench(b.ours, b)}  ·  Industry average: ${fmtBench(b.industry, b)}`}>
          <span className="cp-bench-fill" style={{ width: w + '%', background: s.fill }} />
          <span className="cp-bench-mark" style={{ left: m + '%' }} />
        </div>
      }
    </div>);

}

// Legend explaining the bar + marker
function BenchLegend() {
  return (
    <span className="cp-bench-legend">
      <span className="cp-lg-bar" /> Your store
      <span className="cp-lg-mark" /> Industry average
    </span>);

}

Object.assign(window, {
  Icon, Btn, Badge, Donut, HealthRing, HealthBars,
  BenchMini, BenchLegend, benchStatus, benchDelta, fmtBench,
  DATA, PRIORITIES, fmt, money, TONE_FILL
});
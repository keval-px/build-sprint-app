/* global React, Icon, Btn, DATA, DirectionA,
   useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle */
// app.jsx — Checkout Pulse shell: chrome, date range, tweaks.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#13ACF1",
  "density": "comfortable",
  "showRecover": true
}/*EDITMODE-END*/;

// Builds a minimal perspective floor-grid as an inline SVG sized to the band.
function buildPerspectiveGrid(w, h) {
  if (w <= 0 || h <= 0) return '';
  const cx = w / 2;
  const vpY = -h * 0.06;          // vanishing point just above the top edge
  const baseY = h;               // foreground (bottom)
  const spread = w * 1.45;       // half-width of the floor at the bottom
  const nV = 30, nH = 26;
  const stroke = 'rgba(22,30,48,0.064)';   // -25% opacity
  let lines = '';
  for (let i = 0; i <= nV; i++) {            // vertical lines → vanishing point
    const bx = cx + ((i / nV) - 0.5) * 2 * spread;
    lines += `<line x1="${bx.toFixed(1)}" y1="${baseY}" x2="${cx}" y2="${vpY.toFixed(1)}"/>`;
  }
  for (let k = 1; k <= nH; k++) {            // horizontal lines, perspective-compressed
    const f = 1 - 1 / (1 + 0.5 * k);
    const y = baseY + (vpY - baseY) * f;
    const half = spread * (1 - f);
    lines += `<line x1="${(cx - half).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx + half).toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g stroke="${stroke}" stroke-width="1" fill="none">${lines}</g></svg>`;
}

const RANGES = ['Today', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'This year'];

function DateRange({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="cp-daterange" ref={ref}>
      <button className="cp-trigger" onClick={() => setOpen((o) => !o)} type="button">
        <Icon name="CalendarIcon" size={16} color="var(--p-color-icon)" />
        {value}
        <Icon name="ChevronDownIcon" size={15} color="var(--p-color-icon-secondary)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className="cp-menu">
          {RANGES.map((r) => (
            <button key={r} role="menuitemradio" aria-checked={r === value}
              onClick={() => { onChange(r); setOpen(false); }}>
              {r}
              {r === value && <Icon name="CheckCircleIcon" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [range, setRange] = React.useState(DATA.rangeLabel);
  const bandRef = React.useRef(null);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--cp-accent', t.accent);
  }, [t.accent]);

  React.useLayoutEffect(() => {
    const draw = () => {
      const band = bandRef.current;
      if (!band) return;
      const appEl = band.parentElement;
      const anchor = document.getElementById('cp-metrics-anchor');
      if (!appEl || !anchor) return;
      const h = Math.max(140, anchor.getBoundingClientRect().top - appEl.getBoundingClientRect().top - 12);
      const w = appEl.clientWidth;
      band.style.height = h + 'px';
      band.innerHTML = buildPerspectiveGrid(w, h);
    };
    draw();
    const id = requestAnimationFrame(draw);   // re-measure after fonts/layout settle
    window.addEventListener('resize', draw);
    const ro = new ResizeObserver(draw);
    if (bandRef.current?.parentElement) ro.observe(bandRef.current.parentElement);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', draw); ro.disconnect(); };
  }, [t.density]);

  return (
    <div className={`cp-app${t.density === 'compact' ? ' dense' : ''}`}>
      <div className="cp-gridband" ref={bandRef} aria-hidden="true"></div>

      {/* controls: date range */}
      <div className="cp-toolbar">
        <div className="cp-toolbar-inner">
          <DateRange value={range} onChange={setRange} />
        </div>
      </div>

      <DirectionA showRecover={t.showRecover} />

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakColor label="Accent" value={t.accent}
          options={['#13ACF1', '#303030', '#0E7C66', '#5C3FD6']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Density" value={t.density}
          options={['comfortable', 'compact']}
          onChange={(v) => setTweak('density', v)} />
        <TweakSection label="Content" />
        <TweakToggle label="Show projected recovery" value={t.showRecover}
          onChange={(v) => setTweak('showRecover', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

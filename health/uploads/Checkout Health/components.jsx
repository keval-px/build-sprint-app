/* global React, Icon, Btn, Badge, fmt, money */
// components.jsx — composite Checkout Pulse widgets shared by both directions.

// ------------------------------------------------------------------ Funnel
// Column funnel: each stage is a solid bar whose height encodes session volume,
// joined to the next stage by a sloped, fading connector that visualises the drop.
function Funnel({ data }) {
  const max = data[0].sessions;
  const N = data.length;
  const VW = 1000,VH = 300,base = VH; // viewBox; preserveAspectRatio="none" → square corners hide x-distortion
  const col = VW / N; // equal column per stage
  const barW = col * 0.72; // bar fills the left ~72%, slope fills the gap to the next bar
  const maxBarH = VH - 4;
  const geom = data.map((s, i) => {
    const h = Math.max(s.sessions / max * maxBarH, 8);
    const x = i * col;
    return { x, w: barW, h, top: base - h, right: x + barW };
  });
  return (
    <div className="cp-funnel2">
      <div className="cp-fn2-cols">
        {data.map((s, i) =>
        <div className={`cp-fn2-col${i === 0 ? ' first' : ''}`} key={s.name}>
            <div className="cp-fn2-name">
              <span className="cp-fn2-nm" title={s.name} style={{ fontSize: "12px", fontWeight: "500", color: "rgb(97, 97, 97)" }}>{s.name}</span>
            </div>
            <div className="cp-fn2-pct">{s.pct}%</div>
            <div className="cp-fn2-meta" style={{ fontSize: "12px", color: "rgb(97, 97, 97)" }}>
              <span className="cp-fn2-count" style={{ color: "rgb(97, 97, 97)", fontSize: "12px", fontWeight: "500" }}>{fmt(s.sessions)}</span>
              {i > 0 &&
            <span className="cp-fn2-trend" style={{ color: "rgb(48, 48, 48)", fontWeight: "600" }}>
                  <Icon name="ArrowRightIcon" size={12} style={{ transform: 'rotate(45deg)' }} />
                  {s.dropPct}%
                </span>
            }
            </div>
          </div>
        )}
      </div>
      <div className="cp-fn2-chart">
        <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" width="100%" height="100%" role="img"
        aria-label="Session volume by checkout stage">
          <defs>
            <linearGradient id="cpFnSlope" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--cp-accent)" stopOpacity="0.42" />
              <stop offset="100%" stopColor="var(--cp-accent)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {geom.map((g, i) => {
            if (i === N - 1) return null;
            const n = geom[i + 1];
            return <polygon key={`s${i}`} points={`${g.right},${g.top} ${n.x},${n.top} ${n.x},${base} ${g.right},${base}`} fill="url(#cpFnSlope)" />;
          })}
          {geom.map((g, i) =>
          <rect key={`b${i}`} x={g.x} y={g.top} width={g.w} height={g.h} fill="var(--cp-accent)">
              <title>{`${data[i].name}: ${fmt(data[i].sessions)} (${data[i].pct}%)${i > 0 ? ` · ${data[i].dropPct}% dropped · ${money(data[i].lost)} lost` : ''}`}</title>
            </rect>
          )}
        </svg>
      </div>
    </div>);

}

// ------------------------------------------------------------ KPI card/strip
function KpiCard({ icon, label, value, foot, footTone, benchmark }) {
  return (
    <div className="cp-card cp-card-pad cp-kpi">
      <div className="cp-kpi-top">
        <span className="cp-label">{label}</span>
      </div>
      <div className="cp-kpi-val" style={{ fontSize: "22px" }}>{value}</div>
      {foot &&
      <div className="cp-kpi-foot">
          {footTone &&
        <span className={`cp-trend ${footTone}`}>
              {footTone === 'up' && <Icon name="ArrowRightIcon" size={13} style={{ transform: 'rotate(-45deg)' }} />}
              {footTone === 'down' && <Icon name="ArrowRightIcon" size={13} style={{ transform: 'rotate(45deg)' }} />}
              {foot.trend}
            </span>
        }
          {foot.text && <span>{foot.text}</span>}
        </div>
      }
      {benchmark && <BenchMini b={benchmark} />}
    </div>);

}

// ------------------------------------------------------------ Switch (toggle)
function Switch({ checked, onChange, label, style }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
    className={`cp-switch${checked ? ' on' : ''}`} style={style}
    onClick={() => onChange(!checked)}>
      <span className="cp-switch-knob" />
    </button>);

}

// --------------------------------------- KPI card with a metric toggle (Dir. A)
// Holds 2+ "views"; a dropdown menu picks which metric the card shows.
function KpiToggleCard({ views }) {
  const [i, setI] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const v = views[i];
  React.useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="cp-card cp-card-pad cp-kpi">
      <div className="cp-kpi-top">
        <div className="cp-kpi-dd" ref={ref}>
          <button type="button" className="cp-kpi-dd-btn" aria-haspopup="listbox" aria-expanded={open}
          onClick={() => setOpen((o) => !o)}>
            <span className="cp-label">{v.label}</span>
            <Icon name="ChevronDownIcon" size={15} className={`cp-kpi-dd-caret${open ? ' open' : ''}`} />
          </button>
          {open &&
          <div className="cp-kpi-dd-menu" role="listbox">
              {views.map((w, idx) =>
            <button key={w.label} type="button" role="option" aria-selected={idx === i}
            className={`cp-kpi-dd-item${idx === i ? ' active' : ''}`}
            onClick={() => {setI(idx);setOpen(false);}}>
                  {w.label}
                </button>
            )}
            </div>
          }
        </div>
      </div>
      <div className="cp-kpi-val" style={{ fontSize: "22px" }}>{v.value}</div>
      {v.foot &&
      <div className="cp-kpi-foot">
          {v.footTone &&
        <span className={`cp-trend ${v.footTone}`}>
              {v.footTone === 'up' && <Icon name="ArrowRightIcon" size={13} style={{ transform: 'rotate(-45deg)' }} />}
              {v.footTone === 'down' && <Icon name="ArrowRightIcon" size={13} style={{ transform: 'rotate(45deg)' }} />}
              {v.foot.trend}
            </span>
        }
          {v.foot.text && <span>{v.foot.text}</span>}
        </div>
      }
      {v.benchmark && <BenchMini b={v.benchmark} />}
    </div>);

}

// --------------------------------------------------- Insight card (Dir. A)
function InsightCard({ rec, showRecover = true, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [done, setDone] = React.useState(false);
  return (
    <div className={`cp-card cp-insight ${rec.sev}`}>
      <div className="cp-insight-head cp-clickable" onClick={() => setOpen((o) => !o)}>
        <span className={`cp-insight-ico ${rec.sev}`}><Icon name={rec.icon} size={19} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cp-insight-title">{rec.title}</div>
          <div className="cp-sub" style={{ fontSize: 12, marginTop: 2 }}>{rec.what}</div>
        </div>
        <div className="cp-insight-metric">
          <div className="cp-m">{rec.metric}</div>
          <div className="cp-ms">{rec.metricSub}</div>
        </div>
        <Icon name="ChevronDownIcon" size={18} color="var(--p-color-icon-secondary)"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', marginTop: 4 }} />
      </div>

      <div className={`cp-collapse ${open ? '' : 'closed'}`}>
        <div>
          <div className="cp-qa">
            <div className="cp-qa-item">
              <span className="cp-qa-tag">Why</span>
              <p>{rec.why}</p>
            </div>
            <div className="cp-qa-item">
              <span className="cp-qa-tag">Do</span>
              <p><span className="cp-em">{rec.action}</span></p>
            </div>
          </div>
        </div>
      </div>

      {(rec.primary || showRecover) &&
      <div className="cp-insight-foot">
          {showRecover && rec.recover > 0 &&
        <span className="cp-recover">Projected recovery <b>up to {money(rec.recover)}/mo</b></span>
        }
          {showRecover && rec.recover === 0 &&
        <span className="cp-recover">On track — no action needed</span>
        }
          {rec.secondary && <Btn variant="plain">{rec.secondary}</Btn>}
          {rec.primary && (done ?
        <span className="cp-done"><Icon name="CheckCircleIcon" size={16} color="var(--p-color-icon-success)" />Added to plan</span> :
        <Btn variant="primary" onClick={() => setDone(true)}>{rec.primary}</Btn>)}
        </div>
      }
    </div>);

}

// ---------------------------------------------------- Failed-codes table
function FailedCodesTable({ rows }) {
  return (
    <table className="cp-table">
      <thead>
        <tr><th>Code</th><th className="r">Error rate</th><th className="r">Revenue lost</th></tr>
      </thead>
      <tbody>
        {rows.map((r) =>
        <tr key={r.code}>
            <td><span className="cp-code">{r.code}</span></td>
            <td className="r">{r.rate}%</td>
            <td className="r cp-strong">{money(r.lost)}</td>
          </tr>
        )}
      </tbody>
    </table>);

}

// ---------------------------------------------------------------- Geo list
function GeoList({ rows }) {
  const max = Math.max(...rows.map((r) => r.pct));
  return (
    <div className="cp-geo">
      {rows.map((r) =>
      <div className="cp-georow" key={r.place}>
          <span>{r.place}</span>
          <span className="cp-gbar"><span style={{ width: r.pct / max * 100 + '%' }} /></span>
          <span className="cp-gpct">{r.pct}%</span>
        </div>
      )}
    </div>);

}

Object.assign(window, {
  Funnel, KpiCard, KpiToggleCard, Switch, InsightCard, FailedCodesTable, GeoList
});
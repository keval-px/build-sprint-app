/* global React, Icon, Btn, Badge, Donut, HealthRing, HealthBars, DATA, PRIORITIES,
   fmt, money, Funnel, KpiCard, KpiToggleCard, InsightCard, FailedCodesTable, GeoList */
// directionA.jsx — "Command Center" layout. Data-forward control panel.

function DirectionA({ showRecover = true }) {
  const d = DATA;
  return (
    <div className="cp-page">

      {/* ---------------- HERO: revenue at risk (open, over the grid) ---------------- */}
      <div className="cp-hero2">
        <div className="cp-hero2-main">
          <div className="cp-inline" style={{ gap: 12, flexWrap: 'wrap' }}>
            <span className="cp-eyebrow">Revenue lost to abandonment · {d.rangeLabel}</span>
            <Badge tone="warning" dot>Checkout health {d.healthScore} · {d.healthLabel}</Badge>
          </div>
          <div className="cp-hero-figure"><span className="cp-cur">$</span>{fmt(d.revenueLost)}</div>
          <p className="cp-hero-advice">
            <b>Most of this is winnable.</b> {d.funnel[1].dropPct}% of shoppers leave at the contact step —
            fixing the email field alone could recover <b>up to {money(PRIORITIES[0].recover)} a month</b>.
            Your 3 biggest opportunities are below.
          </p>
          <div className="cp-inline" style={{ gap: 10, marginTop: 4 }}>
            <Btn variant="primary" icon="MagicIcon">Review opportunities</Btn>
            <Btn variant="secondary" icon="ChartVerticalIcon">Full report</Btn>
          </div>
        </div>
        <div className="cp-hero2-side">
          <span className="cp-eyebrow">Of {fmt(d.sessions)} checkout sessions</span>
          <div className="cp-donut">
            <Donut pct={d.conversion} />
            <div className="cp-donut-legend">
              <div className="cp-legend-item"><span className="cp-sw" style={{ background: 'var(--cp-accent)' }} /><span><b>{fmt(d.completed)}</b> completed</span></div>
              <div className="cp-legend-item"><span className="cp-sw" style={{ background: '#E3E3E3' }} /><span><b>{fmt(d.sessions - d.completed)}</b> abandoned</span></div>
              <div className="cp-legend-item" style={{ marginTop: 4 }}>
                <Icon name="CashDollarIcon" size={15} color="var(--p-color-icon-success)" />
                <span><b style={{ color: 'var(--p-color-text-success)' }}>{money(d.recoverable)}</b> recoverable</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- KPI strip ---------------- */}
      <div className="cp-spread" id="cp-metrics-anchor" style={{ marginBottom: -4 }}>
        <h3 style={{ fontSize: 15 }}>Your metrics vs industry</h3>
        <BenchLegend />
      </div>
      <div className="cp-kpis">
        <KpiCard icon="CartIcon" label="Checkout sessions" value={fmt(d.sessions)}
        foot={{ trend: '6.1%', text: 'vs prev period' }} footTone="up" />
        <KpiToggleCard views={[
          {
            icon: 'ChartVerticalIcon', label: 'Checkout conversion', value: `${d.conversion}%`,
            foot: { trend: `${(d.conversionPrev - d.conversion).toFixed(1)}pts`, text: 'vs prev period' }, footTone: 'down',
            benchmark: d.bench.conversion
          },
          {
            icon: 'AlertTriangleIcon', label: 'Abandonment rate', value: `${d.abandonmentRate}%`,
            foot: { trend: '1.2pts', text: 'vs prev period' }, footTone: 'down',
            benchmark: d.bench.abandonment
          }]
        } />
        <KpiCard icon="ClockIcon" label="Avg. time to purchase" value={d.timeToPurchase}
        foot={{ text: 'Median 3.4 min · 1.7 visits' }} benchmark={d.bench.time} />
        <KpiCard icon="DiscountIcon" label="Failed discount codes" value={`${d.failedCodeRate}%`}
        foot={{ trend: `${money(d.failedCodeLost)} lost`, text: '' }} footTone="down" benchmark={d.bench.failedCode} />
      </div>

      {/* ---------------- Funnel + Health ---------------- */}
      <div className="cp-grid" style={{ gridTemplateColumns: '1.7fr 1fr' }}>
        <div className="cp-card">
          <div className="cp-card-head">
            <h3>Where customers drop off</h3>
            <div className="cp-head-actions"><Badge tone="critical" dot>Biggest leak: contact step</Badge></div>
          </div>
          <div className="cp-card-body" style={{ paddingTop: 6, padding: "13px 20px 20px" }}>
            <Funnel data={d.funnel} />
          </div>
        </div>

        <div className="cp-card">
          <div className="cp-card-head"><h3>Checkout health score</h3></div>
          <div className="cp-card-body">
            <div className="cp-health">
              <HealthRing score={d.healthScore} tone="warning" />
              <div style={{ flex: 1 }}>
                <Badge tone="warning" dot>{d.healthLabel}</Badge>
                <HealthBars bars={d.healthBars} />
              </div>
            </div>
            <hr className="cp-divider" style={{ margin: '16px 0 12px' }} />
            <p className="cp-sub" style={{ fontSize: 12, lineHeight: '18px' }}>
              Funnel flow is dragging your score down most. Clearing the contact-step leak would lift
              health into the <b style={{ color: 'var(--p-color-text)' }}>“Good” (75+)</b> range.
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- Insights & recommendations ---------------- */}
      <div className="cp-stack" style={{ gap: 0 }}>
        <div className="cp-spread" style={{ marginBottom: 4 }}>
          <h3 style={{ fontSize: 16 }}>Insights &amp; recommendations</h3>
          <span className="cp-sub" style={{ fontSize: 12 }}>Ranked by revenue impact · tap a card for the why &amp; the fix</span>
        </div>
        <div className="cp-grid" style={{ gap: 'var(--cp-gap)', marginTop: 8 }}>
          {PRIORITIES.map((rec, i) =>
          <InsightCard key={rec.id} rec={rec} showRecover={showRecover} defaultOpen={i === 0} />
          )}
        </div>
      </div>

      {/* ---------------- Detail row ---------------- */}
      <div className="cp-grid" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="cp-card">
          <div className="cp-card-head">
            <h3>Top failed discount codes</h3>
            <div className="cp-head-actions"><Btn variant="plain">Manage codes</Btn></div>
          </div>
          <div className="cp-card-body" style={{ paddingTop: 8 }}>
            <FailedCodesTable rows={d.failedCodes} />
          </div>
        </div>
        <div className="cp-card">
          <div className="cp-card-head">
            <h3>Highest abandonment by region</h3>
          </div>
          <div className="cp-card-body">
            <GeoList rows={d.geo} />
            <p className="cp-sub" style={{ fontSize: 12, marginTop: 14, lineHeight: '18px' }}>
              Illinois abandons far above the rest — worth testing a regional shipping promo.
            </p>
          </div>
        </div>
      </div>

    </div>);

}

window.DirectionA = DirectionA;
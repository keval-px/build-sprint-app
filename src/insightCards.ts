import {fixResults,fixAssessment,retestResults,actionState,type AppliedFix} from '../shared/fixTracking';
import {ACTION_CHECKS,ACTION_DESTINATIONS,type Mission,type missionSignal} from '../shared/actions';
import type {CheckoutEvent} from '../shared/evidence';
import type {OutcomeFacts} from '../shared/checkoutOutcome';
import type {MonitoringHealth} from '../shared/monitoringHealth';
import {fixOutcomeCopy} from './dashboardCopy';
import {time} from './checkoutRows';

// Insight card markup. main.ts works out each card's numbers; this module only draws them.
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
// busy: saving or loading. retestDisabled: busy or saved statuses not loaded.
export interface CardContext {embedded:boolean;busy:boolean;retestDisabled:boolean;events:CheckoutEvent[];facts:OutcomeFacts;now:number;health:MonitoringHealth;truncated:boolean;money:(minor:number)=>string;storeHandle:string}
export interface InsightCard {
  mission:Mission;open:boolean;fix?:AppliedFix;status:ReturnType<typeof actionState>;signal:ReturnType<typeof missionSignal>;
  recommendation:string;shippingBlockers:number;basketCents:number|null|undefined;inventoryMinor:number|null;
  percent:number;sessionCount:number;controlsDisabled:boolean;
}
export function insightCard(card:InsightCard,ctx:CardContext){
  const {mission,open,fix,status,signal,recommendation,shippingBlockers,basketCents,percent}=card,severity=signal.severity;
  const destination=ACTION_DESTINATIONS[mission.id],hasAmount=basketCents!==null&&basketCents!==undefined,inventory={totalMinor:card.inventoryMinor};
  const summary={sessionCount:card.sessionCount};
  return `<s-section id="mission-${mission.id}">
      <s-stack gap="base">
        <s-stack direction="inline" justifyContent="space-between" gap="small" alignItems="center">
          <s-heading><s-text fontWeight="bold">${escape(mission.title)}</s-text></s-heading>
          <s-badge id="mission-badge-${mission.id}" tone="${status.done?'neutral':severity.tone}">${status.done?'Marked as done':severity.label}</s-badge>
        </s-stack>
        <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 700px) 1.5fr 1fr, 1fr" gap="large-100" alignItems="start">
          <s-stack gap="small" data-explanation="next">
            <s-text type="strong" fontWeight="medium">What we detected</s-text>
            <s-paragraph>${escape(mission.description)}</s-paragraph>
            ${signal.latestAlert!==null?`<s-text color="subdued">Latest matching alert ${escape(time(signal.latestAlert))}</s-text>`:''}
            <s-text type="strong" fontWeight="medium">What you should do next</s-text>
            <s-paragraph data-recommendation-summary>${escape(recommendation)}</s-paragraph>
          </s-stack>
          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <s-stack gap="small" data-action-metric><s-text color="subdued">Checkouts affected</s-text><s-number fontSize="large-100" fontWeight="bold">${mission.count.toLocaleString()}</s-number><s-text color="subdued">${percent}% of ${summary.sessionCount.toLocaleString()} checkouts</s-text></s-stack>
            <s-stack gap="small" data-action-value><s-text color="subdued">${mission.id==='inventory'?'Item value before alert':'Affected basket value'}</s-text><s-number fontSize="large-100" fontWeight="bold" id="risk-${mission.id}">${mission.id==='inventory'?(inventory.totalMinor===null?'Unavailable':ctx.money(inventory.totalMinor)):hasAmount?ctx.money(basketCents!):'Unavailable'}</s-number><s-text color="subdued">${(mission.id==='inventory'?inventory.totalMinor===null:!hasAmount)?'Some prices weren’t recorded':'Not confirmed lost revenue'}</s-text></s-stack>
          </s-grid>
        </s-grid></s-query-container>
        ${fix?`<s-text data-fix-outcome="${mission.id}" tone="${status.returned?'caution':'auto'}">${escape(fixOutcomeCopy(fix,ctx.events,ctx.now,ctx.health,ctx.facts))}</s-text>`:''}
        <s-divider></s-divider>
        <s-stack direction="inline" justifyContent="space-between" gap="small" alignItems="center">
          <s-button variant="secondary" data-mission="${mission.id}" ${mission.count?'':'disabled'} accessibilityLabel="View ${mission.count} affected checkouts: ${escape(mission.title)}">View affected checkouts</s-button>
          <s-button id="toggle-${mission.id}" variant="tertiary" data-toggle-action="${mission.id}" aria-expanded="${open}" aria-controls="metrics-${mission.id} body-${mission.id}" accessibilityLabel="${open?'Hide':'Show'} details: ${escape(mission.title)}">${open?'Hide details':'Show details'}</s-button>
        </s-stack>
        <s-stack id="metrics-${mission.id}" gap="base" ${open?'':'hidden'}>${fix?`<s-divider></s-divider>${fixPanel(mission,fix,ctx)}`:''}</s-stack>
        <s-stack id="body-${mission.id}" data-action-body gap="base" ${open?'':'hidden'}>
          <s-divider></s-divider>
          <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 700px) 1fr 1fr, 1fr" gap="large-100" alignItems="start">
            <s-stack gap="small"><s-heading>Why we flagged this</s-heading><s-paragraph>${escape(severity.reason)}</s-paragraph>${mission.id==='delivery'&&mission.count>shippingBlockers?`<s-text color="subdued">${shippingBlockers} confirmed shipping blocker${shippingBlockers===1?'':'s'} · ${mission.count-shippingBlockers} checkouts with general shipping alerts</s-text>`:''}${mission.id==='payment'?'<s-paragraph>A card decline does not prove checkout is broken. Check whether another payment method is available, and review payment settings before changing them.</s-paragraph>':''}</s-stack>
            <s-stack gap="small"><s-heading>How you can test your change</s-heading><s-paragraph>${escape(ACTION_CHECKS[mission.id])}</s-paragraph>${destination?`<s-stack direction="inline"><s-button variant="secondary" href="https://admin.shopify.com/store/${ctx.storeHandle}/${destination.path}" target="_blank" accessibilityLabel="${destination.label} (opens in a new tab)">${destination.label}</s-button></s-stack>`:''}</s-stack>
          </s-grid></s-query-container>
          <s-divider></s-divider>
          <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base"><s-checkbox id="done-${mission.id}" data-fix-done="${mission.id}" label="Mark as done" accessibilityLabel="Mark as done: ${escape(mission.title)}" ${fix?'checked':''} ${card.controlsDisabled?'disabled':''}></s-checkbox><s-text color="subdued">Marking done records your action; it doesn’t verify the result.</s-text></s-stack>
        </s-stack>
      </s-stack>
    </s-section>`;
}
// Empty state when nothing is flagged; never presented as proof that checkout is healthy.
export function insightList(cards:{done:boolean;rank:number;html:string}[],canAssess:boolean){
  const sorted=[...cards].sort((a,b)=>Number(a.done)-Number(b.done)||a.rank-b.rank);
  return sorted.map((card,index)=>`${card.done&&(index===0||!sorted[index-1].done)?'<s-divider></s-divider><s-heading>Marked as done</s-heading>':''}${card.html}`).join('') || `<s-section><s-stack gap="small"><s-heading>No issues flagged in the checkouts we’ve recorded.</s-heading><s-paragraph color="subdued">${canAssess?'We’ll show comparisons here when enough data supports a warning.':'Some checks need more current data. See Data details below.'}</s-paragraph><s-stack direction="inline"><s-button variant="secondary" data-review-checkouts>Browse recorded checkouts</s-button></s-stack></s-stack></s-section>`;
}
export function fixPanel(mission:Mission,fix:AppliedFix,ctx:CardContext){
  const results=fixResults(fix,ctx.events,ctx.now,ctx.facts);
  const retest=retestResults(fix,ctx.events,ctx.now);
  const health=ctx.health;
  const assessment=fixAssessment(fix,ctx.events,ctx.now,health,ctx.facts);
  const checked=fix.retestedAt!==undefined;
  const retestPanel=mission.id==='unfinished'?'':`<s-stack gap="small"><s-stack direction="inline" gap="small" alignItems="center">${checked?`<s-badge tone="${retest?.returned?'caution':'neutral'}">${retest?.returned?'Alerts after retest':'Retest reported'}</s-badge><s-text color="subdued">Reported by ${ctx.embedded?'your team':'this demo viewer'} · ${escape(time(fix.retestedAt!))}</s-text>`:'<s-text>Repeat the affected checkout and confirm the problem no longer appears.</s-text>'}</s-stack>${retest?.returned?`<s-text>${retest.returned} checkout${retest.returned===1?'':'s'} recorded matching alerts after the retest. Check again.</s-text>`:''}<s-stack direction="inline" gap="small"><s-button data-fix="${mission.id}" data-fix-operation="retest" variant="secondary" ${ctx.retestDisabled?'disabled':''}>${checked?'Record another successful retest':'Record successful retest'}</s-button>${checked?`<s-button data-fix="${mission.id}" data-fix-operation="undo-retest" variant="tertiary" ${ctx.busy?'disabled':''}>Undo retest</s-button>`:''}</s-stack></s-stack>`;
  const rate=(n:number,d:number)=>d?`${Math.round(n/d*100)}% (${n}/${d})`:'No checkouts yet';
  const returned = actionState(fix, ctx.events, ctx.now).returned;
  const resultMessage = !assessment.canAssess
    ? `Result not verified: ${!health.canAssess||fix.partial?"data is limited":"waiting for more checkout activity"}.`
    : returned
    ? `${returned} checkout${returned===1?'':'s'} had new alerts since your last check. Review the fix.`
    : !results.after.checkouts && !results.affectedCompleted
      ? 'Waiting for checkout activity to check the result.'
      : mission.id==='unfinished'
        ? 'Review completed checkouts below and check any that still stop progressing.'
        : 'No new matching alerts recorded since your last check. Keep checking new checkouts.';
  return `<s-divider></s-divider><s-stack gap="base"><s-stack direction="inline" justifyContent="space-between" gap="small"><s-heading>Activity after marking done</s-heading></s-stack>
    ${retestPanel}
    <s-paragraph data-assessment-unavailable ${health.canAssess?'hidden':''}>Result not verified: data is limited.</s-paragraph>
    <s-stack gap="base" data-current-assessment ${health.canAssess?'':'hidden'}>
    <s-banner tone="${returned?'warning':'info'}"><s-paragraph>${escape(resultMessage)}</s-paragraph></s-banner>
    <s-text color="subdued">Marked ${escape(time(fix.appliedAt))} · Before: 30 days · After: ${results.ended?'30 days':'since marking done'}</s-text>
    <s-query-container><s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr 1fr, 1fr" gap="base">
      <s-stack gap="small"><s-text>Previously affected checkouts</s-text><s-text type="strong">${results.affectedTotal?`${results.affectedCompleted} of ${results.affectedTotal} completed after marking done`:"No checkouts to follow"}</s-text></s-stack>
      <s-stack gap="small"><s-text>${mission.id==='unfinished'?'No completion recorded':'Checkouts with alerts'}</s-text><s-text>Before ${rate(fix.baseline.affected,fix.baseline.checkouts)}</s-text><s-text type="strong">After ${assessment.canAssess?rate(results.after.affected,results.after.checkouts):'Not enough data'}</s-text></s-stack>
      <s-stack gap="small"><s-text>New checkout completion</s-text><s-text>Before ${rate(fix.baseline.completed,fix.baseline.checkouts)}</s-text><s-text type="strong">After ${assessment.canAssess?rate(results.after.completed,results.after.checkouts):'Not enough data'}</s-text></s-stack>
    </s-grid></s-query-container>
    <s-text color="subdued">${results.after.checkouts||results.affectedCompleted?'Later purchases do not show whether a change worked.':'Previously affected customers may still return and complete checkout.'}${fix.partial||ctx.truncated?' Some activity is missing.':''}</s-text>
    </s-stack></s-stack>`;
}

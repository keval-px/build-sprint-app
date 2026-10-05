# PRODUCT.md

## 1. The job
When my checkout starts losing revenue because of an error, abnormal behavior, or hidden friction, I want to know what changed, who is affected, how serious it is, and what I should investigate next, so I can fix the problem before more revenue is lost.

Who, by situation (not age or city): Shopify Plus merchants with enough checkout volume for meaningful patterns to emerge, no dedicated person continuously monitoring checkout health, and meaningful revenue at risk when checkout performance degrades. Initial pilot floor: ~3K orders/month; prefer higher-volume merchants whenever possible.

Today they hire: Today most merchants rely on Shopify analytics, occasional manual investigation, and periodic CRO/agency audits. Many only investigate checkout after conversion drops or a customer reports a problem. Very few customer reports problem and some problems are conditional behaviour based so not all face the same problem.

What needs doing: They need to be alerted when checkout behavior materially deviates from normal, understand the evidence and likely impact, and receive a prioritized next action. Positive performance insights can appear in a weekly summary, but should not distract from high-impact alerts.

How they want to feel: They want to feel that someone is continuously watching checkout for them and that important problems will be surfaced before they become expensive.

How they want to look to others: They want to look proactive and in control — the person who catches checkout problems before revenue drops become obvious to management or customers.

(B2B only) The bench: End user: Ecommerce Manager / CRO Manager / Growth Manager. Decision maker: Head/VP of Ecommerce or Growth. Who pays: the ecommerce/growth team or DTC business.

The one we serve first: Head or Manager of Ecommerce at a Shopify Plus DTC brand with meaningful checkout volume but no dedicated person continuously monitoring checkout health.

## 2. The switch
What they'd fire: What they may reduce or replace: manual checkout monitoring, periodic checkout audits, and expensive agency hours spent identifying problems rather than executing strategy.

Push (what's wrong with today): They don't know what the hell is happening in their checkout.
Pull (what your product promises): continuously watches checkout, identifies evidence-backed revenue leaks, prioritizes the most important one, and tells the merchant what to investigate or fix next.
Anxiety (what worries them about switching): Will the alerts actually be useful? Will app produce generic AI advice, false positives, or recommendations without enough evidence? Is customer data handled safely?
Habit (what keeps them where they are): They trust familiar Shopify reports, internal teams, and agency analysts because a human can explain why they reached a conclusion.

The one worry onboarding must remove: The onboarding worry to remove: "Will this product safely monitor my checkout and eventually tell me something I don't already know?"
How I know (what they did, not what they said): The merchant connects Slack, receives a real finding, opens the evidence, assigns the recommended task, implements a fix, returns to see whether the issue recovered, and keeps App installed for continued monitoring.

## 3. The core flow
The story: Protect checkout revenue

1. Customer install the app
2. We reconstructs each observable checkout journey from Shopify events, then aggregates those sessions to identify repeated friction and unusual patterns.
3. Each checkout session contributes observable events and outcomes to the merchant's behavioral baseline: started, progressed through checkout, encountered an observable error, completed, or stopped progressing.
4. If a checkout does not complete, record what was observably happening before abandonment and identify potential contributing signals. Do not claim a causal reason unless the data directly supports it.
5. When evidence crosses a defined threshold, create a prioritized incident and send the merchant a Slack alert containing the issue, evidence, affected volume, estimated exposure, confidence, and recommended next action.
6. The ecommerce team reviews the incident and assigns the recommended action to the appropriate owner — engineering, ecommerce, payments, logistics, or marketing.
7. The owner implements the change.
8. continues monitoring after the change to determine whether the abnormal pattern recovered.
9. shows the incident timeline: detected → investigated → action taken → recovered/not recovered, together with measurable changes after the intervention.
...
[last]. I know app is watching my checkout, and if something important starts leaking revenue, my team will know where to look before the problem becomes expensive.

Things they do today: Merchants either do little continuous checkout monitoring, manually review Shopify analytics, use session/heatmap tools, or rely on CRO teams to periodically investigate behavior, recommend changes, hand work to implementation teams, and later measure whether conversion changed.

Things they do with my product: With App: Shopify checkout events are continuously aggregated to identify abnormal patterns such as repeated payment errors, delivery errors, discount failures, inventory errors, input validation problems, checkout progression changes, and Checkout UI Extension failures. App then groups related events into merchant-level incidents and uses AI to help explain the evidence and suggest the next investigation. Web Pixels API helps solid.

What can go wrong:
Step [n]: Do not alert merely because a metric is low. Compare current behavior against an appropriate merchant-specific baseline such as the same hour/day pattern and require sufficient volume before triggering.
Step [n]: If checkout abandonment materially exceeds this merchant's expected range with sufficient observations, create an incident showing the current rate, expected baseline, affected sessions, segments, and confidence.


Next story (only once this one works end to end): App observes an unusual increase in discount-related checkout errors → groups them into one incident → Slack says which discount-related error is appearing, how often, when it started, who is affected, and how many checkout sessions encountered it.

## 4. Onboarding
First value (the moment it first does the job for them): The merchant receives a credible Slack alert about something meaningful they did not already know, together with enough evidence to decide what to do.
The worry it removes (from section 2): I don't have to manually watch this anymore as app is monitoring it and will tell us when this pattern becomes abnormal again.

From opening the link to the first value:
Because a genuine incident may take time to occur, onboarding should immediately show that monitoring is live, what signals are being collected, current baseline status, and a clearly labeled simulated Slack alert — without pretending the simulation is product value. Would love to show Monitoring active > 2,483 checkout events analyzed > Baseline building > 0 significant incidents detected

Login: not required as shopify app itself holds account details
What we don't ask on day one: Shopify requires some permissions while installing an app, we would ask what needed
What we ask later, and when: write a review once they see fixed version of the checkout.

## 5. v1
Does (one person finishes the one job): Surfaces only the highest-priority active incidents. The merchant should usually see 0–3 things requiring attention, not a checklist of everything that could theoretically be improved. AI-assisted diagnosis for incidents that have already been detected by the deterministic/data layer. AI summarizes the evidence, identifies plausible explanations, recommends the next investigation, and states confidence. AI does not decide whether an incident exists. No weak alerts sent as facts. Low-confidence patterns remain inside analysis until sufficient evidence exists; every merchant-facing alert includes the evidence and confidence behind it.
Doesn't (parked, not forgotten): Tips like adding a post-purchase offer or help information to clarify merchant doubts. Baymard standards, or our own standards over time about what works best. AI best practices from industry/competitor checkouts.
Nice to have, only after the must-haves work: [leave empty this week]

Example AI input
Your backend sends:
Incident type: DISCOUNT_ERROR_SPIKE
Current: 36 errors / 412 checkouts
Historical baseline: 3–6 / comparable period
Started: 14:20 UTC
Device split: 81% mobile
Error messages: [...]
Targets: [...]
Completed checkout rate affected cohort: X
Overall store rate: Y

Then AI generates:
Likely diagnosis
Discount-related checkout errors increased materially above this store's baseline beginning at 14:20.
Possible explanation
A currently promoted code may be incompatible with one or more cart conditions.
Recommended investigation
Verify recently created/edited discounts and reproduce checkout with affected cart conditions.
Confidence
Medium.
App has evidence of abnormal discount errors, but not enough evidence yet to identify the exact configuration responsible.

That's useful AI.


How I'll know it worked (what they do again, not what they say): They pay to keep App watching.

## 6. The riskiest guess
If this is false, the product is pointless: App must repeatedly identify meaningful checkout problems or abnormal patterns that merchants would otherwise discover later, struggle to diagnose, or never notice. Merely sending alerts about obvious metrics is not enough. Even when App finds a real pattern, merchants must trust the evidence enough to take action.
How I tested it, and what happened: We have manually diagnosed checkout/customer-behavior problems using tools such as Microsoft Clarity, which suggests useful patterns can be found. We have not yet proven that Shopify event data alone can automatically surface enough valuable problems or that merchants will act on automated findings.
What changed in the plan: What changed in the plan: Instead of building a broad AI checkout optimizer, V1 will first build reliable checkout event collection, merchant-specific baselines, a small number of high-confidence incident detectors, Slack alerts, and AI-assisted diagnosis on top of verified incidents.

## 7. Milestones

1. I can use one store’s real checkout data to find one real checkout problem the merchant didn’t already know about.
2. I can detect when checkout behavior meaningfully deviates from that normal baseline.  
3. I can explain the evidence and use AI to suggest likely causes without presenting guesses as facts.  
4. I can alert the merchant at the right time without overwhelming them with noise.  

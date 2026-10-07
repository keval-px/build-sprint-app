// Install ONLY in build-sprint-demo → Settings → Customer events → Custom pixel.
// Anonymous test telemetry only. No API tokens, buyer details, amounts, or raw errors.
// This public collector does not authenticate Shopify events; never use it as production evidence.
const endpoint = "https://neighborly-nightingale-843.convex.site/api/test-events";
const expectedHost = "build-sprint-demo.myshopify.com";
const storageName = "build-sprint-test-checkout";

async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

let sequence = Promise.resolve();
function collect(event) {
    sequence = sequence.then(async () => {
      if (event.context?.document?.location?.hostname !== expectedHost) return;
      const token = event.data?.checkout?.token;
      let sessionId = token ? await digest(expectedHost + ":" + token) : await browser.sessionStorage.getItem(storageName);
      // Do not invent a checkout session if Shopify did not provide its identity.
      if (!sessionId) return;
      if (token) await browser.sessionStorage.setItem(storageName, sessionId);
      const type = event.data?.alert?.type;
      const category = type === "DISCOUNT_ERROR" ? "discount"
        : type === "PAYMENT_ERROR" ? "payment"
        : type === "DELIVERY_ERROR" ? "delivery"
        : ["INPUT_INVALID", "INPUT_REQUIRED", "CONTACT_ERROR"].includes(type) ? "validation" : null;
      const payload = {
        eventId: await digest(expectedHost + ":" + event.id),
        sessionId,
        name: event.name,
        timestamp: Date.parse(event.timestamp),
        category: event.name === "alert_displayed" ? category : null,
      };
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), keepalive: true,
      });
      if (!response.ok) console.warn("Checkout test event was not saved. HTTP " + response.status);
      if (event.name === "checkout_completed") await browser.sessionStorage.removeItem(storageName);
    }).catch(() => console.warn("Checkout test collection failed. No buyer data logged."));
}

analytics.subscribe("checkout_started", collect);
analytics.subscribe("checkout_contact_info_submitted", collect);
analytics.subscribe("checkout_address_info_submitted", collect);
analytics.subscribe("checkout_shipping_info_submitted", collect);
analytics.subscribe("payment_info_submitted", collect);
analytics.subscribe("checkout_completed", collect);
analytics.subscribe("alert_displayed", collect);

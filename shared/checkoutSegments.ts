export type DeviceClass='mobile'|'desktop'|'tablet';
// Classify in the pixel; never send or retain the browser's raw user-agent.
export function deviceClass(userAgent:unknown):DeviceClass|undefined{
 if(typeof userAgent!=='string'||!userAgent)return;
 if(/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent))return 'tablet';
 if(/iPhone|iPod|Android.*Mobile|Windows Phone/i.test(userAgent))return 'mobile';
 if(/Windows NT|Macintosh|X11|CrOS/i.test(userAgent))return 'desktop';
}
export function hasExpressPayment(transactions:unknown):true|undefined{
 if(!Array.isArray(transactions))return;
 // Wallet evidence is positive-only: absent transactions do not mean standard pay.
 if(transactions.some(t=>t&&typeof t==='object'&&t.paymentMethod?.type==='wallet'))return true;
}

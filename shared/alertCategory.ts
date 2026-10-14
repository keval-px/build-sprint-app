import type {ErrorCategory} from './evidence.ts';
// Normalize locally; raw messages, targets and buyer-entered values never leave the pixel.
export function alertCategory(type?:string,target?:string,message?:string):ErrorCategory|null{
  // A normal delivery recalculation is not a purchase-blocking error.
  // Match only the exact safe template seen in browser tests; unknown alerts stay visible.
  if(/^The shipping options have changed for your order\. Review your selection\.$/i.test((message??'').trim()))return null;
  const discountTarget=/(?:^|[.\[\]_])(?:discountCodes?|discount_codes?|giftCards?|gift_cards?|reductionCode)(?:$|[.\[\]_])/i.test(target??'');
  // This exact English template was reproduced in the demo checkout. It contains no buyer data.
  const discountTemplate=/^Enter a valid discount code(?: or gift card)?[.!]?$/i.test((message??'').trim());
  if(type==='DISCOUNT_ERROR'||discountTarget||discountTemplate)return 'discount';
  if(type==='INVENTORY_ERROR'||type==='MERCHANDISE_ERROR')return 'inventory';
  if(type==='PAYMENT_ERROR')return 'payment';
  if(type==='DELIVERY_ERROR')return 'delivery';
  return ['INPUT_INVALID','INPUT_REQUIRED','CONTACT_ERROR'].includes(type??'')?'validation':null;
}

// Keep only a fixed label. Never transmit the message or buyer address.
// Unknown wording and untranslated alerts remain general delivery alerts.
export function shippingBlocker(type?: string, message?: string): "no_shipping_available" | undefined {
  if (type !== "DELIVERY_ERROR") return undefined;
  const normalized = (message ?? "").trim();
  if (normalized === "Items in the cart do not meet price or weight requirements to qualify for shipping. Update your cart and try again.") return "no_shipping_available";
  if (normalized === "Your order cannot be shipped to the selected address. Review your address to ensure it's correct and try again, or select a different address.") return "no_shipping_available";
  return /^(?:Shipping not available|Your order cannot be shipped to the selected address|This order can(?:not|'t) be shipped to the address you entered)\.?$/i.test(normalized)
    ? "no_shipping_available" : undefined;
}

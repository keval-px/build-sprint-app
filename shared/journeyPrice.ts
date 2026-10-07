import type {CheckoutEvent} from './evidence.ts';

export interface SavedBasket {
  sessionId?: string;
  subtotalCents: number | null;
  totalCents?: number | null;
  recovered?: boolean;
}
const valid=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=0;

// Prefer a unique exact Shopify match. Equal dates, amounts, or list positions
// never establish an identity. Browser prices remain independent observations.
export function journeyPrice(sessionId:string,completed:boolean,events:CheckoutEvent[],currency:string,orders:SavedBasket[],abandoned:SavedBasket[],legacy:SavedBasket[]=[]):number|undefined {
  const unique=(rows:SavedBasket[])=>{const matches=rows.filter(row=>row.sessionId===sessionId);return matches.length===1?matches[0]:undefined;};
  const price=(row:SavedBasket|undefined)=>{
    if(!row)return undefined;
    const value=row.totalCents===undefined?row.subtotalCents:row.totalCents;
    return valid(value)?value:undefined;
  };
  const server=completed?unique(orders):unique(abandoned.filter(row=>!row.recovered));
  const saved=price(server);
  if(saved!==undefined)return saved;
  const historical=price(unique(legacy));
  if(historical!==undefined&&!completed)return historical;
  return events.filter(event=>event.name!=='alert_displayed'&&event.currency===currency&&valid(event.subtotalCents)).sort((a,b)=>b.timestamp-a.timestamp)[0]?.subtotalCents;
}

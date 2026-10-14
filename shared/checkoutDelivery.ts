// Retry a transient failure once with the identical anonymous event ID. The
// receiver deduplicates it; capacity/validation refusals are never retried.
export async function deliverCheckoutEvent(endpoint:string,payload:unknown,send:typeof fetch=fetch):Promise<boolean> {
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await send(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true});
   if(response.ok)return true;
   if(response.status<500)return false;
  }catch{/* No Shopify payloads or buyer data are logged. */}
 }
 return false;
}

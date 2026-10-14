// A checkout app error has no checkout token. Associate it only with a recent
// token-bearing event from the same Shopify browser client in this tab.
export function recentCheckout(saved:string,at:number,clientHash:string|null,requireClient=false):string|null {
 try {
  const value=JSON.parse(saved);
  if(typeof value.sessionId!=='string'||!/^[a-f0-9]{64}$/.test(value.sessionId)||!Number.isFinite(value.at)||!Number.isFinite(at)||at<value.at||at-value.at>=15*60000)return null;
  if(requireClient&&(!clientHash||value.clientHash!==clientHash))return null;
  return value.sessionId;
 }catch{return null;}
}

export interface ShopifyBridge {idToken:()=>Promise<string>}
export function isEvidenceRead(path:string,method:string){
  return method==='GET'&&(path==='evidence'||path.startsWith('evidence?'));
}
// App Bridge retries invalid sessions only when it owns the Authorization
// header. Give it ownership for same-origin evidence reads; all other calls
// keep explicit authentication and cannot be replayed by that interceptor.
export async function shopifyRequestInit(path:string,method:string,backendOrigin:string,pageOrigin:string,bridge:ShopifyBridge):Promise<RequestInit>{
  const bridgeOwnsAuth=isEvidenceRead(path,method)&&backendOrigin===pageOrigin;
  return {method,...(bridgeOwnsAuth?{}:{headers:{Authorization:`Bearer ${await bridge.idToken()}`}}),cache:'no-store',signal:AbortSignal.timeout(90000)};
}
export function invalidSessionResponse(retryEvidenceRead=false){
  return new Response(JSON.stringify({error:'Shopify session is invalid or expired.'}),{status:401,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(retryEvidenceRead?{'X-Shopify-Retry-Invalid-Session-Request':'1'}:{})}});
}

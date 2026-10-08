import {checkoutIdentity} from './checkoutIdentity.ts';
// Keep only Shopify's app display name, never an error message or stack trace.
export function appDisplayName(value:unknown):string|undefined {
 if(typeof value!=='string')return undefined;
 const name=value.trim();
 return name.length>0&&name.length<=120&&!/[\p{C}<>]/u.test(name)?name:undefined;
}
// Shopify exposes the same App ID as a numeric ID or a GraphQL global ID.
export function appIdentityHashes(value:string):string[] {
 const match=/^(?:gid:\/\/shopify\/App\/)?([1-9][0-9]{0,29})$/.exec(value);
 return match?[checkoutIdentity(match[1]),checkoutIdentity(`gid://shopify/App/${match[1]}`)]:[];
}

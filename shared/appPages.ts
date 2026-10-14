export const appPages = {
 overview: {path:'/api/shopify/app',title:'Overview'},
 journeys: {path:'/api/shopify/app/checkouts',title:'Checkouts'},
 history: {path:'/api/shopify/app/fix-history',title:'Fix history'},
 alerts: {path:'/api/shopify/app/alerts',title:'Alerts'},
} as const;
export type AppPage = keyof typeof appPages;
export function appPageAt(path:string):AppPage|undefined {
 return (Object.keys(appPages) as AppPage[]).find(page=>appPages[page].path===path);
}
export function appPageHref(page:AppPage,filters:Record<string,string|null>={}) {
 const query=new URLSearchParams();
 for(const [key,value] of Object.entries(filters))if(value)query.set(key,value);
 return appPages[page].path+(query.size?'?'+query.toString():'');
}

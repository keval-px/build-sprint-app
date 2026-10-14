import {cronJobs} from 'convex/server';
import {internal} from './_generated/api';
const crons=cronJobs();
crons.interval('sync Shopify purchases',{minutes:1},internal.shopify.syncAutomatically,{});
export default crons;

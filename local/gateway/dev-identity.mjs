import {identity as localIdentity} from '../settings.mjs';
// Compatibility adapter for the imported gateway checks. One identity owner.
export const identity = Object.freeze({...localIdentity, storeDomain:localIdentity.store});

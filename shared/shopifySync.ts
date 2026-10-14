// Reject reads that finished after uninstall or a newer installation replaced
// the connection. Background work must not revive a revoked snapshot.
export function canSaveSyncedSnapshot(startedAt:number,connectedAt:number|undefined,revokedAt:number|undefined){
 return connectedAt!==undefined&&connectedAt<=startedAt&&(revokedAt===undefined||(startedAt>revokedAt&&connectedAt>revokedAt));
}

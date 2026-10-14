// What the page receives: the stored snapshot without its email counts.
export type AbandonedRecords=Omit<AbandonedSnapshot,'emailSent'|'emailNotSent'>;
export interface AbandonedSnapshot {importedOn:string; emailSent:number; emailNotSent:number; records:{recordHash:string;sessionId:string|null;subtotalCents:number;currency:'USD';recovered:boolean}[]}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync, symlinkSync, linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadPrivateConfiguration} from './private-config.mjs';
import {identity} from './dev-identity.mjs';

const synthetic = {clientId:identity.clientId,clientSecret:'PUBLIC-TEST-VECTOR-NOT-A-SHOPIFY-CREDENTIAL'};
test('private loader accepts only exact identity, owner-only regular file and bounded schema',()=>{
  const root=mkdtempSync(join(tmpdir(),'checkout-gain-config-test-'));
  const dir=join(root,'private'), file=join(dir,'shopify-dev.json');
  mkdirSync(dir,{mode:0o700});
  const write = value=>writeFileSync(file,typeof value==='string'?value:JSON.stringify(value),{mode:0o600});
  const rejects = ()=>assert.throws(()=>loadPrivateConfiguration(dir),e=>e.message==='Private configuration is missing or invalid; verify the approved handoff and owner-only permissions.');
  try {
    rejects();
    write(synthetic); assert.deepEqual(loadPrivateConfiguration(dir),synthetic);
    chmodSync(file,0o644); rejects(); chmodSync(file,0o600);
    chmodSync(dir,0o755); rejects(); chmodSync(dir,0o700);
    for (const bad of ['{public-test-malformed', {...synthetic,clientId:'existing-live-app'}, {...synthetic,accessToken:'not-allowed'}, {...synthetic,clientSecret:''}, {...synthetic,clientSecret:'contains a whitespace character'},'x'.repeat(4097)]) { write(bad); rejects(); }
    rmSync(file); const target=join(root,'test-value.json'); writeFileSync(target,JSON.stringify(synthetic),{mode:0o600});
    symlinkSync(target,file); rejects(); rmSync(file);
    linkSync(target,file); rejects(); rmSync(file);
    const alias=join(root,'alias'); symlinkSync(dir,alias); assert.throws(()=>loadPrivateConfiguration(alias));
  } finally { rmSync(root,{recursive:true,force:true}); }
});

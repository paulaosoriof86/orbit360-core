'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const p=require('./gravicentra-i66-greenapi-existing-config-readonly.cjs');
const secret=()=>({tenantId:'alianzas-soluciones',pais:'GT',idInstance:'710522720868',senderWid:'15555550100@c.us',
  apiUrl:'https://api.green-api.com',apiTokenInstance:'SYNTHETIC_PRIVATE_TOKEN_123456789'});
const response=data=>({ok:true,headers:{get:()=>null},arrayBuffer:async()=>Buffer.from(JSON.stringify(data))});
test('readiness performs only two provider metadata GETs and emits only fixed booleans',async()=>{
  const s=secret(),calls=[];const r=await p.probeProviderReadiness(s,{runtimeReader:async()=>s,fetchImpl:async(url,options)=>{
    calls.push({url,options});return response(url.includes('/getStateInstance/')?{stateInstance:'authorized'}:{wid:s.senderWid,privateValue:'NEVER_PRINT'});}});
  assert.equal(r.runtimeSecretAccessVerified,true);assert.equal(r.providerAuthorized,true);assert.equal(r.settingsIdentityMatches,true);assert.equal(calls.length,2);
  for(const x of calls){assert.equal(x.options.method,'GET');assert.equal(x.options.redirect,'error');assert.equal(x.options.body,undefined);assert.match(x.url,/\/(getStateInstance|getSettings)\//);}
  assert.equal(Object.values(r).every(x=>typeof x==='boolean'),true);assert.equal(JSON.stringify(r).includes(s.apiTokenInstance),false);assert.equal(JSON.stringify(r).includes('NEVER_PRINT'),false);
});
test('runtime impersonation failure is explicit even if provider credentials work',async()=>{
  const s=secret(),r=await p.probeProviderReadiness(s,{runtimeReader:async()=>{throw Error('RAW_PRIVATE_IAM_DETAILS');},
    fetchImpl:async url=>response(url.includes('/getStateInstance/')?{stateInstance:'authorized'}:{wid:s.senderWid})});
  assert.equal(r.runtimeSecretAccessVerified,false);assert.equal(r.providerAuthorized,true);assert.equal(JSON.stringify(r).includes('RAW_PRIVATE'),false);
});
for(const kind of ['scope','token','origin'])test('invalid '+kind+' cannot call provider',async()=>{
  const s=secret();if(kind==='scope')s.tenantId='foreign';if(kind==='token')s.apiTokenInstance='';if(kind==='origin')s.apiUrl='https://api.green-api.com.evil.invalid';
  let requests=0;const r=await p.probeProviderReadiness(s,{runtimeReader:async()=>s,fetchImpl:async()=>{requests++;return response({});}});
  assert.equal(requests,0);assert.equal(r.providerRequestMade,false);
});
test('unauthorized provider does not request settings or expose response',async()=>{
  let calls=0;const r=await p.probeProviderReadiness(secret(),{runtimeReader:async()=>secret(),fetchImpl:async()=>{calls++;return response({stateInstance:'notAuthorized',privateToken:'secret'});}});
  assert.equal(calls,1);assert.equal(r.providerAuthorized,false);assert.equal(r.settingsIdentityMatches,false);assert.equal(JSON.stringify(r).includes('privateToken'),false);
});
test('wrong instance metadata and oversized response are never accepted',async()=>{
  const opts={runtimeReader:async()=>secret(),fetchImpl:async url=>response(url.includes('/getStateInstance/')?{stateInstance:'authorized'}:{wid:'15555550199@c.us'})};
  assert.equal((await p.probeProviderReadiness(secret(),opts)).settingsIdentityMatches,false);
  opts.fetchImpl=async()=>({ok:true,headers:{get:()=> '65537'}});assert.equal((await p.probeProviderReadiness(secret(),opts)).providerAuthorized,false);
});
test('exceptions containing credential-bearing URLs are never emitted',async()=>{
  const s=secret(),r=await p.probeProviderReadiness(s,{runtimeReader:async()=>s,fetchImpl:async()=>{throw Error('https://api.green-api.com/'+s.apiTokenInstance);}});
  assert.equal(r.providerRequestMade,true);assert.equal(r.providerAuthorized,false);assert.equal(JSON.stringify(r).includes(s.apiTokenInstance),false);
});
test('runtime failure categories distinguish denied IAM, missing resource, transport and SDK without error text',async()=>{
  for(const [code,key] of [[7,'runtimeSecretPermissionDenied'],[403,'runtimeSecretPermissionDenied'],[16,'runtimeSecretUnauthenticated'],
    [5,'runtimeSecretNotFound'],[14,'runtimeSecretTransientFailure'],[999,'runtimeSecretUnknownFailure']]){
    const r=await p.probeProviderReadiness(secret(),{runtimeReader:async progress=>{
      progress.runtimeSourceCredentialReady=true;progress.runtimeSdkReady=true;progress.runtimeIdentityTokenReady=true;progress.runtimeSecretReadAttempted=true;
      throw Object.assign(Error('SENSITIVE_EXCEPTION_TEXT'),{code});},fetchImpl:async()=>response({})});
    assert.equal(r[key],true);assert.equal(r.runtimeSecretReadReturned,false);assert.equal(r.runtimeSecretAccessVerified,false);
    assert.equal(Object.values(r).every(v=>typeof v==='boolean'),true);assert.equal(JSON.stringify(r).includes('SENSITIVE'),false);
  }
  const sdk=await p.probeProviderReadiness(secret(),{runtimeReader:async()=>{throw new TypeError('PRIVATE_SDK_DETAILS');},fetchImpl:async()=>response({})});
  assert.equal(sdk.runtimeSecretClientTypeError,true);assert.equal(sdk.runtimeSecretPermissionDenied,false);
});
test('returned but mismatched runtime secret is reported separately from permission denial',async()=>{
  const r=await p.probeProviderReadiness(secret(),{runtimeReader:async progress=>{
    progress.runtimeSecretReadReturned=true;progress.runtimeSecretResponseBounded=true;progress.runtimeSecretJsonParsed=true;
    return{...secret(),tenantId:'foreign'};},fetchImpl:async()=>response({})});
  assert.equal(r.runtimeSecretScopeMismatch,true);assert.equal(r.runtimeSecretPermissionDenied,false);assert.equal(r.runtimeSecretJsonParsed,true);
});

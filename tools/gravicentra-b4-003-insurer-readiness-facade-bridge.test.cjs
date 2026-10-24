'use strict';
// I6.5/B4-003: regression for a role-switch cache invalidation traversing the
// installed operational facade. Synthetic identities only; no network/writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const operationalSource=fs.readFileSync('orbit360-platform/data/store-firestore-product-operational-p0.js','utf8');
const insurerSource=fs.readFileSync('orbit360-platform/modules/aseguradoras.js','utf8');
const start=insurerSource.indexOf('  function protectedDirectoryReadiness(){');
const end=insurerSource.indexOf('  function render(h)',start);
assert.ok(start>=0&&end>start,'INSURER_READINESS_OWNER_MISSING');

function readiness(store){
 const scope={__store:store};
 vm.runInNewContext('const S=()=>__store;\n'+insurerSource.slice(start,end)+
  '\nthis.directory=protectedDirectoryReadiness;this.policies=insurerPolicyCountReadiness;',scope);
 return [scope.directory(),scope.policies()];
}

const win={Orbit:{
 auth:{productUser:{productReadOnly:true,uid:'synthetic-member',tenantId:'synthetic-tenant',
  roles:['Dirección','Asesor'],activeRole:'Dirección'}},
 session:{rol:()=> 'Dirección'},
 productRuntimeBrowserProvidersP0:{initialize(){},callFunction(){},
  browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true}
}};
vm.runInNewContext(operationalSource,{window:win,Orbit:win.Orbit,
 document:{dispatchEvent(){}},CustomEvent:function(){},Promise,Map,Set,Date,
 setTimeout,clearTimeout,console},{timeout:1000});

const readState={serverConfirmedCollections:[],snapshotErrors:{},deniedCollections:[]};
const base={__productReadOnlyP0:true,_protectedCandidate:true,
 _productStatus:()=>Object.assign({ready:true,status:'ready-read-only',
  noFallback:true,writeEnabled:false},readState),
 on(){return ()=>{}},all(){return []},get(){return null},where(){return []},
 find(){return null},raw(){return {}}};
win.Orbit.productOperationalWriteP0.install(base);
const facade=win.Orbit.store;

assert.equal(facade._protectedCandidate,true,'FACADE_MUST_FORWARD_PROTECTED_READ_AUTHORITY');
assert.deepEqual(readiness(facade),['loading','loading'],
 'INVALIDATED_SCOPE_MUST_NEVER_DISPLAY_FALSE_EMPTY_DIRECTORY');
readState.serverConfirmedCollections=['aseguradoras'];
assert.deepEqual(readiness(facade),['ready','loading'],
 'DIRECTORY_READY_MUST_NOT_IMPLY_POLICY_COUNT_READY');
readState.serverConfirmedCollections=['aseguradoras','polizas'];
assert.deepEqual(readiness(facade),['ready','ready']);
readState.serverConfirmedCollections=[];
readState.deniedCollections=['aseguradoras','polizas'];
assert.deepEqual(readiness(facade),['denied','denied']);
readState.deniedCollections=[];
readState.snapshotErrors={aseguradoras:'functions/unavailable',polizas:'functions/unavailable'};
assert.deepEqual(readiness(facade),['failed','failed']);
assert.deepEqual(readiness({}),['ready','ready'],'LEGACY_UNPROTECTED_CONTRACT_PRESERVED');

console.log('B4_003_INSURER_READINESS_FACADE_BRIDGE_PASS real_facade=true unconfirmed=loading denied=denied failed=failed directFirestore=0 operationalWrites=0');

#!/usr/bin/env node
'use strict';

const clean=v=>String(v==null?'':v).trim();

export function selectRevealableInsurerCredentialTargetInPage(){
  const orbit=globalThis.Orbit;
  const rows=orbit&&orbit.store&&typeof orbit.store.all==='function'?(orbit.store.all('aseguradoras')||[]):[];
  const portalsOf=a=>[].concat(a&&a.portales||[]);
  for(const a of rows){
    const portals=portalsOf(a);
    for(let i=0;i<portals.length;i++){
      const p=portals[i]||{};
      const inline=[p.password,p.pass,p.contrasena,p.clave].some(v=>String(v==null?'':v).trim().length>0);
      if(inline)return{id:String(a&&a.id||''),index:i,source:'record'};
    }
  }
  for(const a of rows){
    const portals=portalsOf(a);
    for(let i=0;i<portals.length;i++){
      const p=portals[i]||{},ref=String(p.credentialRef||'').trim();
      if(!ref)continue;
      let state={available:false,revealAvailable:false};
      try{
        state=orbit&&orbit.secureResources&&typeof orbit.secureResources.credentialStatus==='function'
          ?orbit.secureResources.credentialStatus(ref,{module:'aseguradoras'})||state
          :state;
      }catch{}
      if(state&&(state.revealAvailable||state.available))return{id:String(a&&a.id||''),index:i,source:'provider'};
    }
  }
  return null;
}

function selftest(){
  const original=globalThis.Orbit;
  const set=(rows,status)=>{globalThis.Orbit={store:{all:k=>k==='aseguradoras'?rows:[]},secureResources:{credentialStatus:status||(()=>({available:false,revealAvailable:false}))}};};
  let placeholderSkipped=false,directPreferred=false,providerSelected=false,missingReturnsNull=false;
  try{
    set([{id:'a1',portales:[{credentialRef:'backend-required'}]},{id:'a2',portales:[{password:'direct-secret'}]}],()=>({available:false,revealAvailable:false}));
    const first=selectRevealableInsurerCredentialTargetInPage();
    placeholderSkipped=first?.id==='a2'&&first?.source==='record';
    directPreferred=placeholderSkipped;
    set([{id:'a1',portales:[{credentialRef:'ref-ok'}]}],ref=>ref==='ref-ok'?{available:true,revealAvailable:true}:{available:false});
    const second=selectRevealableInsurerCredentialTargetInPage();
    providerSelected=second?.id==='a1'&&second?.source==='provider';
    set([{id:'a1',portales:[{credentialRef:'backend-required'}]}],()=>({available:false,revealAvailable:false}));
    missingReturnsNull=selectRevealableInsurerCredentialTargetInPage()===null;
  }finally{globalThis.Orbit=original;}
  const ok=placeholderSkipped&&directPreferred&&providerSelected&&missingReturnsNull;
  console.log(JSON.stringify({ok,status:ok?'INSURER_REVEAL_TARGET_SEMANTICS_SELFTEST_PASS':'INSURER_REVEAL_TARGET_SEMANTICS_SELFTEST_FAIL',classification:ok?'PASS':'VALIDATOR_STALE',placeholderSkipped,directPreferred,providerSelected,missingReturnsNull,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
  if(!ok)process.exit(41);
}

if(process.argv.includes('--selftest'))selftest();

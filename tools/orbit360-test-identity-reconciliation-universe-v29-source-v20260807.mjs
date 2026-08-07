#!/usr/bin/env node
'use strict';
import { fingerprint, identityKeys, reconcileIdentity, adjudicateClientUniverse, loadDemoIdentitySetFromSeed, SOURCE_CONTRACT } from './orbit360-identity-reconcile-universe-v29-v20260807.mjs';

const BASE='ays_clients_insurers_20260714';
const row=(id,data)=>({id,data});
const baseline=Array.from({length:414},(_,i)=>row(`base-${i+1}`,{tipoPersona:'Física',pais:'GT',nombreCompleto:`Persona Canonica ${i+1}`,_migration:{batchTemplate:BASE}}));
const focal=Array.from({length:16},(_,i)=>row(`post-${i+1}`,{tipoPersona:'Fisica',pais:'GT',nombreCompleto:`PERSONA CANÓNICA ${i+1}`}));
const targets=focal.map(x=>fingerprint(x.id));
const checks=[];const check=(id,ok)=>checks.push({id,ok:!!ok});

const exact=reconcileIdentity([...baseline,...focal],targets,new Set());
check('source-contract-exact-duplicate-records-16',SOURCE_CONTRACT.exactDuplicateRecords===16&&SOURCE_CONTRACT.exactDuplicateCriterion==='IDENTIDAD_NORMALIZADA_IGUAL');
check('baseline-414',exact.baselineCount===414);
check('focal-16',exact.targetCount===16&&exact.nonbaselineCount===16);
check('exact-normalized-identity-resolves-16',exact.unresolved===0&&exact.contradictions===0&&exact.counts.DUPLICADO===16);
check('exact-name-basis-no-pii-output',exact.items.every(x=>x.basis==='IDENTIDAD_NORMALIZADA_SOURCE_CONTRACT'&&!('name' in x)&&!('document' in x)));
const universe=adjudicateClientUniverse([...baseline,...focal],exact);
check('universe-414-after-16-objective-duplicates',universe.effective===414&&universe.classification==='PASS_DATA_CONTRACT'&&universe.excludedFocal===16);

const strongBaseline=baseline.map(x=>({...x,data:{...x.data}}));strongBaseline[0].data.numeroDocumento='ABC-123';
const strongFocal=focal.map(x=>({...x,data:{...x.data}}));strongFocal[0].data.numeroDocumento='ABC123';
const strong=reconcileIdentity([...strongBaseline,...strongFocal],targets,new Set());
check('strong-document-exact-precedence',strong.items.find(x=>x.fingerprint===targets[0])?.basis==='DOCUMENTO_FUERTE_EXACTO');

const conflictBaseline=baseline.map(x=>({...x,data:{...x.data}}));conflictBaseline[0].data.numeroDocumento='DOC-A';
const conflictFocal=focal.map(x=>({...x,data:{...x.data}}));conflictFocal[0].data.numeroDocumento='DOC-B';
const conflict=reconcileIdentity([...conflictBaseline,...conflictFocal],targets,new Set());
check('same-name-different-strong-document-contradiction',conflict.contradictions===1&&conflict.items.find(x=>x.fingerprint===targets[0])?.classification==='CONTRADICCION_IDENTIDAD');

const uniqueFocal=focal.map(x=>({...x,data:{...x.data}}));uniqueFocal[0].data.nombreCompleto='Demo Exact Identity';
const demoGeneric=identityKeys(uniqueFocal[0].data).find(x=>x.basis==='IDENTIDAD_NORMALIZADA_SOURCE_CONTRACT').generic;
const demo=reconcileIdentity([...baseline,...uniqueFocal],targets,new Set([demoGeneric]));
check('demo-exact-identity-classifies-residual',demo.items.find(x=>x.fingerprint===targets[0])?.classification==='RESIDUAL_PROTOTIPO');

const legitItems=exact.items.map((x,i)=>i===0?{...x,classification:'ALTA_LEGITIMA_POSTERIOR',basis:'EXTERNAL_REGISTERED_CREATION_AUDIT'}:x);
const legit={...exact,items:legitItems};const stale=adjudicateClientUniverse([...baseline,...focal],legit);
check('legitimate-post-baseline-does-not-force-414',stale.effective===415&&stale.classification==='VALIDATOR_STALE');

const actualDemo=loadDemoIdentitySetFromSeed();
check('current-demo-seed-parses-in-memory',actualDemo.size>0);
check('no-raw-pii-in-fixture-output',!JSON.stringify({items:exact.items}).includes('Persona Canonica'));

const failed=checks.filter(x=>!x.ok);const out={schemaVersion:'orbit360-v29-identity-reconciliation-source-fixtures-v1',status:failed.length?'STOP_V29_SOURCE_FIXTURES':'PASS_V29_IDENTITY_RECONCILIATION_SOURCE',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,secretsRead:false,firebaseAccess:false,browserExecuted:false,hostingTouched:false,writes:0,productionTouched:false,containsPII:false,ok:failed.length===0};console.log(JSON.stringify(out,null,2));process.exit(failed.length?41:0);

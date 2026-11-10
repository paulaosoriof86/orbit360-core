const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');

const bridge=fs.readFileSync('orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js','utf8');
const engine=fs.readFileSync('orbit360-platform/core/policy-receipts-engine.js','utf8');
const store=fs.readFileSync('orbit360-platform/data/store-firestore-product-operational-p0.js','utf8');

assert.match(bridge,/data-rp-source-receipt/,'insurer source number must have a distinct input');
assert.match(bridge,/\['numeroReciboFuente','\[data-rp-source-receipt\]',false\]/,'source number must be part of the edit patch');
assert.match(bridge,/data-rp-serie value="\$\{esc\(val\(r\.serie\|\|r\.cuota\)\)\}"/,'source number must not overwrite internal series display');
assert.match(engine,/action:'update',collection:'recibosEsperados',id,payload:nextPatch/,'receipt update is a sparse patch');
const calculation=engine.match(/const affectsPortfolio=(\[[^;]+?\.some\(k=>Object\.prototype\.hasOwnProperty\.call\(nextPatch,k\)\))/);
assert(calculation,'portfolio mutation predicate must be directly inspectable');
assert.match(engine,/if\(portfolio&&portfolio\.carteraActiva!==false&&affectsPortfolio\)/);
const dependsOnPortfolio=(nextPatch)=>vm.runInNewContext(calculation[1],{nextPatch});
assert.equal(dependsOnPortfolio({numeroReciboFuente:'ASEG-2026-999'}),false,'insurer reference only must leave cartera untouched');
assert.equal(dependsOnPortfolio({serie:'2/12'}),false,'internal series only must leave cartera untouched');
assert.equal(dependsOnPortfolio({fechaLimite:'2026-12-01'}),true,'due-date edits must synchronize cartera');
assert.equal(dependsOnPortfolio({primaTotal:155.25}),true,'amount edits must synchronize cartera');

assert.match(store,/var preserveConcurrentFields=x\.action==='update'&&\(x\.collection==='recibosEsperados'\|\|x\.collection==='carteraPrimas'\)/,'existing receipt and cartera rows must use field patches');
assert.match(store,/payload:x\.action==='remove'\?null:clone\(preserveConcurrentFields\?x\.payload:x\.row\)/,'mutation transport must not send a stale full row on updates');
assert.doesNotMatch(store,/payload:x\.action==='remove'\?null:clone\(x\.row\)/,'forbid the regressive full-row writer');
console.log('I6_6_RECEIPT_SOURCE_NUMBER_AND_CONCURRENT_SPARSE_PATCH_PASS');

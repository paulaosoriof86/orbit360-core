'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=process.argv[2]||process.cwd();
const read=pathName=>fs.readFileSync(path.join(root,pathName),'utf8');
const backend=read('functions/product-ops-leads-domain.js');
const store=read('orbit360-platform/data/store-firestore-product-operational-p0.js');
const del=read('orbit360-platform/core/record-delete.js');
const ui=read('orbit360-platform/core/ciclo.js');
function extraction(source,start,end){const a=source.indexOf(start);assert(a>=0,start+' missing');const b=source.indexOf(end,a+start.length);assert(b>a,end+' missing');return source.slice(a,b);}
const helper=backend.match(/function protectedEndorsementLink\([\s\S]*?\n}\n/);
assert(helper,'protected link predicate exists');
const protectedLink=new Function('text',helper[0]+'\nreturn protectedEndorsementLink;')((x,max=1000)=>String(x==null?'':x).trim().slice(0,max));
const base={workflowType:'endorsement_request',endorsementStage:'SOLICITADO',polizaId:'p1'};
const policy={ultimoEndosoId:'',historial:[]};
test('Applied endorsement is protected without special QA identity',()=>{
  assert.equal(protectedLink({...base,endorsementStage:'APLICADO'},policy,'g1'),true);
  assert.equal(protectedLink({...base,policyUpdatedId:'p1'},policy,'g1'),true);
  assert.equal(protectedLink(base,{...policy,ultimoEndosoId:'g1'},'g1'),true);
  assert.equal(protectedLink(base,{...policy,historial:[{gestionId:'g1'}]},'g1'),true);
});
test('Pending, unrelated or missing-policy management cannot use board-hide',()=>{
  assert.equal(protectedLink(base,policy,'g1'),false);
  assert.equal(protectedLink({...base,endorsementStage:'APLICADO'},null,'g1'),false);
  assert.equal(protectedLink({...base,workflowType:'ordinary',endorsementStage:'APLICADO'},policy,'g1'),false);
});
test('Original archive guard retains protection on applied and referenced endosos',()=>{
  assert(backend.includes('ENDOSO_APPLIED_OR_REFERENCED_ARCHIVE_FORBIDDEN'));
  assert(backend.includes("if(operation==='archive_management')"));
  assert(backend.includes("if(!prepared&&entityType==='gestiones'&&after.workflowType==='endorsement_request'&&operation!=='hide_management_card')"));
});
test('Separate command requires signed operations role/country and a linked policy',()=>{
  assert(backend.includes("'hide_management_card'"));
  assert(backend.includes("operation==='hide_management_card'&&!ADMIN_ROLES.has(roleState.activeRole)"));
  assert(backend.includes('assertRecordCountryScope(authz.member,before,after);'));
  assert(backend.includes('OPS_BOARD_HIDE_POLICY_SCOPE_MISMATCH'));
  assert(backend.includes('OPS_BOARD_HIDE_ONLY_APPLIED_OR_REFERENCED_ENDORSEMENT'));
});
test('Hide command writes only card metadata and leaves policy and history',()=>{
  const block=extraction(backend,"else if(operation==='hide_management_card'){","else if(operation==='resolve_management')");
  assert(block.includes('after.opsBoardHidden=true'));
  assert(block.includes('after.opsBoardHiddenReason=why'));
  assert(block.includes('after.opsBoardHiddenByUid=authz.actor.uid'));
  assert(!/after\.(?:archivado|deleted|eliminado|historial|comentarios|endorsementStage|policyUpdatedId)\s*=/.test(block));
  assert(!/tx\.(?:set|update|delete)\(\s*(?:ps|policy|policyRef)/.test(block));
  assert(backend.includes("notificationSuppressed:operation==='hide_management_card'"));
});
test('UI keeps two-step confirmation and durable board-hiding readback',()=>{
  assert(del.includes('const boardOnly = isPolicyProtectedEndorsement(collection,row);'));
  assert(del.includes('¿Retirar'));
  assert(del.includes('Motivo obligatorio'));
  assert(del.includes('opsBoardHiddenReason:text(reason)'));
  assert(del.includes("await st.updateDurable('gestiones',id,boardPatch)"));
  assert(del.includes('OPS_BOARD_HIDE_HISTORY_PRESERVATION_REQUIRED'));
  assert(!extraction(del,'if(boardOnly){','const patch = {').includes('deleted: true'));
});
test('Active Ops excludes board-hidden cards, historic data can include them',()=>{
  assert(ui.includes('(opts.includeBoardHidden === true || g.opsBoardHidden !== true)'));
  assert(store.includes("return'hide_management_card'"));
  assert(store.includes('OPS_BOARD_HIDE_SERVER_READBACK_REQUIRED'));
  assert(store.includes("'opsBoardHiddenByRole','opsBoardHiddenByUid','opsBoardHiddenByName'"));
  assert(backend.includes('response.opsBoardHideReadback'));
});
for(const [name,source] of [['backend',backend],['store',store],['delete',del],['ui',ui]])test(name+' JS syntax',()=>assert.doesNotThrow(()=>new Function(source)));

'use strict';
// Browser owner exercised with synthetic DOM/domain. No network or writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const moduleSource=fs.readFileSync(path.join(root,'orbit360-platform/modules/conciliaciones.js'),'utf8');
const clientSource=fs.readFileSync(path.join(root,'orbit360-platform/core/cobros-reconciliation-domain-client.js'),'utf8');
function fixture({role='Dirección',preview,apply,resolution}={}){
 const calls=[],state={reloads:0},nodes={
  '[data-conc-application-status]':{textContent:''},
  '[data-conc-application-targets]':{innerHTML:''},
  '[data-conc-apply]':{hidden:false,disabled:false,textContent:'Aprobar y aplicar'},
  '[data-conc-resolve]':{disabled:false,textContent:'Guardar vinculación'},
  '[data-conc-resolution-receipt]':{value:''},'[data-conc-resolution-type]':{value:''},
  '[data-conc-resolution-date]':{value:''},'[data-conc-resolution-paid]':{value:''},
  '[data-conc-resolution-attested]':{checked:false},'[data-conc-resolution-reason]':{value:''}
 };
 const back={querySelector:key=>nodes[key]};
 const window={location:{reload(){state.reloads++;}},Orbit:{modules:{},ui:{},kit:{},store:{all:()=>[]},session:{rol:()=>role},
  reconciliationDomain:{
   async previewProposalApplication(...args){calls.push({operation:'preview',args});return Array.isArray(preview)?preview.shift():preview;},
   async resolveProposalApplication(...args){calls.push({operation:'resolve',args});await Promise.resolve();return resolution;},
   async applyProposalApplication(...args){calls.push({operation:'apply',args});await Promise.resolve();if(apply instanceof Error)throw apply;return apply;}
  }}};
 vm.runInNewContext(moduleSource,{window,Orbit:window.Orbit,document:{addEventListener(){}}});
 return{module:window.Orbit.modules.conciliaciones,calls,nodes,back,state,
  row:{sourceEntityId:'qa-proposal',original:{origenLibroActivo:true,sourceRunId:'qa-run',monto:999,reciboId:'caller-cannot-override'}}};
}
const eligible={ok:true,eligible:true,planDigest:'a'.repeat(64),currency:'GTQ',targets:[{receiptId:'qa-r',installment:1,mode:'DIRECT',amount:100}]};
let checks=0;
(async()=>{
 const readonly=fixture({role:'Asesor',preview:eligible});await readonly.module.verificarAplicacion(readonly.row,readonly.back);
 assert.equal(readonly.calls.length,0);assert.equal(readonly.nodes['[data-conc-apply]'].hidden,true);checks++;
 const missing=fixture({preview:eligible});missing.row.original.sourceRunId='';await missing.module.verificarAplicacion(missing.row,missing.back);
 assert.equal(missing.calls.length,0);assert.match(missing.nodes['[data-conc-application-status]'].textContent,/referencia acreditada/);checks++;
 const hold=fixture({preview:{ok:true,eligible:false,status:'REVIEW_REQUIRED',question:'¿A qué recibo corresponde la fila?'}});
 await hold.module.verificarAplicacion(hold.row,hold.back);assert.equal(hold.calls.length,1);
 assert.equal(hold.nodes['[data-conc-apply]'].hidden,true);assert.match(hold.nodes['[data-conc-application-status]'].textContent,/qué recibo/);checks++;
 const good=fixture({preview:eligible,apply:{ok:true,readbackConfirmed:true,applicationId:'qa-application'}});
 await good.module.verificarAplicacion(good.row,good.back);
 assert.equal(good.nodes['[data-conc-apply]'].hidden,false);assert.equal(good.nodes['[data-conc-apply]'].disabled,false);checks++;
 assert.match(good.nodes['[data-conc-application-targets]'].innerHTML,/GTQ 100.00/);assert.doesNotMatch(good.nodes['[data-conc-application-targets]'].innerHTML,/999/);checks++;
 await Promise.all([good.nodes['[data-conc-apply]'].onclick(),good.nodes['[data-conc-apply]'].onclick()]);
 const applied=good.calls.filter(c=>c.operation==='apply');assert.equal(applied.length,1);assert.deepEqual(applied[0].args,['qa-proposal','qa-run','a'.repeat(64)]);assert.equal(good.state.reloads,1);checks++;
 const unconfirmed=fixture({preview:eligible,apply:{ok:true,applicationId:'qa-application'}});
 await unconfirmed.module.verificarAplicacion(unconfirmed.row,unconfirmed.back);await unconfirmed.nodes['[data-conc-apply]'].onclick();
 assert.equal(unconfirmed.state.reloads,0);assert.equal(unconfirmed.nodes['[data-conc-apply]'].hidden,true);assert.match(unconfirmed.nodes['[data-conc-application-status]'].textContent,/No se confirmó/);checks++;
 const changed=fixture({preview:eligible,apply:{ok:true,status:'REVIEW_REQUIRED',question:'Los datos cambiaron; actualiza.'}});
 await changed.module.verificarAplicacion(changed.row,changed.back);await changed.nodes['[data-conc-apply]'].onclick();assert.equal(changed.state.reloads,0);assert.match(changed.nodes['[data-conc-application-status]'].textContent,/cambiaron/);checks++;
 const already=fixture({preview:{ok:true,readbackConfirmed:true,applicationId:'qa-application'}});
 await already.module.verificarAplicacion(already.row,already.back);assert.equal(already.nodes['[data-conc-apply]'].hidden,true);assert.match(already.nodes['[data-conc-application-status]'].textContent,/No se generará otro cobro/);checks++;
 // The client sends no frontend-derived receipt, date, amount or evidence.
 const transport=[];
 const browser={location:{hostname:'app.example.invalid'},OrbitBackend:{tenantId:'qa-tenant',featureFlags:{cobrosReconciliationDomainActive:true}},Orbit:{session:{rol:()=>'Dirección'},
  productRuntimeBrowserProvidersP0:{async callFunction(name,payload,region){transport.push({name,payload,region});return{ok:true};}}}};
 vm.runInNewContext(clientSource,{window:browser,Orbit:browser.Orbit,location:browser.location});
 await browser.Orbit.reconciliationDomain.previewProposalApplication('qa-proposal','qa-run');
 await browser.Orbit.reconciliationDomain.applyProposalApplication('qa-proposal','qa-run','digest');
 assert.deepEqual(JSON.parse(JSON.stringify(transport[0].payload.payload)),{proposalId:'qa-proposal',sourceRunId:'qa-run'});
 assert.deepEqual(JSON.parse(JSON.stringify(transport[1].payload.payload)),{proposalId:'qa-proposal',sourceRunId:'qa-run',planDigest:'digest'});checks++;
 assert.equal(transport[0].name,'orbit360CobrosReconciliationCommand');assert.equal(transport[1].region,'us-central1');checks++;
 const question={ok:true,status:'REVIEW_REQUIRED',eligible:false,question:'Selecciona el recibo exacto.',
  source:{policyNumber:'P-001',amount:100,currency:'GTQ',reportedDate:'2026-11-10'},
  resolutionOptions:[{policyId:'qa-p',receiptId:'qa-r',policyTerm:'2026-01-01 — 2027-01-01',installment:'1/1',dueDate:'2026-11-01',amount:100,currency:'GTQ',alreadyPaid:false}]};
 const linking=fixture({preview:[question,eligible],resolution:{ok:true,status:'RESOLUTION_SAVED',readbackConfirmed:true,resolutionId:'qa-resolution'}});
 await linking.module.verificarAplicacion(linking.row,linking.back);
 assert.match(linking.nodes['[data-conc-application-targets]'].innerHTML,/Guardar vinculación/);
 assert.match(linking.nodes['[data-conc-application-targets]'].innerHTML,/no aplica pagos/);checks++;
 await linking.nodes['[data-conc-resolve]'].onclick();assert.equal(linking.calls.filter(x=>x.operation==='resolve').length,0);checks++;
 for(const [key,value] of Object.entries({receipt:'0',type:'BANK_STATEMENT_MATCH',date:'2026-11-10',paid:'2026-11-10',reason:'Fuente comprobada'}))linking.nodes['[data-conc-resolution-'+key+']'].value=value;
 linking.nodes['[data-conc-resolution-attested]'].checked=true;
 await Promise.all([linking.nodes['[data-conc-resolve]'].onclick(),linking.nodes['[data-conc-resolve]'].onclick()]);
 assert.equal(linking.calls.filter(x=>x.operation==='resolve').length,1);assert.equal(linking.calls.filter(x=>x.operation==='apply').length,0);
 assert.equal(linking.state.reloads,0);assert.equal(linking.nodes['[data-conc-apply]'].hidden,false);checks++;
 const bindingSent=linking.calls.find(x=>x.operation==='resolve').args[2];
 assert.equal(bindingSent.policyId,'qa-p');assert.equal(bindingSent.receiptId,'qa-r');assert.equal(bindingSent.sourceAttestation,true);assert.equal('amount' in bindingSent,false);checks++;
 const saveFail=fixture({preview:question,resolution:{ok:true,status:'REVIEW_REQUIRED',question:'Importe diferente al recibo'}});
 await saveFail.module.verificarAplicacion(saveFail.row,saveFail.back);
 for(const [key,value] of Object.entries({receipt:'0',type:'BANK_STATEMENT_MATCH',date:'2026-11-10',paid:'2026-11-10'}))saveFail.nodes['[data-conc-resolution-'+key+']'].value=value;
 saveFail.nodes['[data-conc-resolution-attested]'].checked=true;await saveFail.nodes['[data-conc-resolve]'].onclick();
 assert.match(saveFail.nodes['[data-conc-application-status]'].textContent,/Importe diferente/);assert.equal(saveFail.state.reloads,0);checks++;
 await browser.Orbit.reconciliationDomain.resolveProposalApplication('qa-proposal','qa-run',{policyId:'qa-p',receiptId:'qa-r',evidenceType:'BANK_STATEMENT_MATCH',evidenceAsOfDate:'2026-11-10',paidDate:'2026-11-10',sourceAttestation:true,amount:999});
 assert.equal(transport[2].payload.operation,'resolve_proposal_application');assert.equal(transport[2].payload.payload.sourceAttestation,true);assert.equal('amount' in transport[2].payload.payload,false);checks++;
 console.log(JSON.stringify({status:'PASS',checks,scope:'UI_AND_CANONICAL_CLIENT_SYNTHETIC_ONLY',networkCalls:0,businessWrites:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});

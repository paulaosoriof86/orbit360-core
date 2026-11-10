'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const backend = fs.readFileSync('functions/cobros-reconciliation-domain.js','utf8');
const processor = fs.readFileSync('functions/notification-outbox-processor.js','utf8');
const inbox = fs.readFileSync('functions/ops-advisor-inbox.js','utf8');
const ui = fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');

const reportStart = backend.indexOf('async function reportAdvisorPayment(');
const reportEnd = backend.indexOf('\nasync function applyPayment(',reportStart);
assert(reportStart>=0&&reportEnd>reportStart,'advisor report must remain a distinct operation');
const report = backend.slice(reportStart,reportEnd);
assert.match(report,/REPORTED_PENDING_OPERATIVE_VALIDATION/,'report must remain pending operative validation');
assert.match(report,/tx\.set\(receiptRef, receiptPatch, \{ merge: true \}\)/,'report must update expected receipt');
assert.match(report,/tx\.set\(managementRef, management, \{ merge: true \}\)/,'report must create an Ops task');
assert.match(report,/tx\.set\(paymentNotificationRef\(authz\.tenantId, eventId\)/,'outbox must be in same atomic transaction');
assert.match(report,/eventSource: 'reconciliation'/,'outbox must declare its canonical reconciliation source');
assert.match(report,/targets: \[\{ type: 'role', id: 'operations' \}\]/,'notify the operational role, not a handpicked user');
assert.match(report,/channels: \['in_app'\]/,'external delivery is not authorized');
assert.match(report,/pais: notificationCountry/,'country must travel with the event');
assert.match(report,/if \(!\['GT', 'CO'\]\.includes\(notificationCountry\)\)/,'undefined country must fail closed');
assert.match(report,/PAYMENT_REPORT_COUNTRY_OUTSIDE_MEMBERSHIP/,'advisor country must match signed membership');
assert.match(report,/pais: notificationCountry/,'linked Ops management must preserve country');
assert.doesNotMatch(report,/tx\.set\([^\n]*collection\('cobros'\)/,'a report must not apply a collection cobro');
assert.match(report,/paymentState: 'REPORTED_PENDING_OPERATIVE_VALIDATION'/,'report status must remain pending validation');
assert.match(processor,/const eventSource = norm\(row\.eventSource \|\| 'workflow'\)/);
assert.match(processor,/eventSource === 'reconciliation' \? reconciliationEventRef\(tenantId, eventId\)/,'outbox must verify the reconciliation canonical event');
assert.match(processor,/RECONCILIATION_EVENT_OUTBOX_MISMATCH/,'wrong receipt or management event must fail closed');
assert.match(processor,/CANONICAL_EVENT_NOT_COMMITTED/,'orphan outbox must fail closed');
assert.match(processor,/eventSource:text\(row\.eventSource\|\|'workflow',80\),pais:text\(row\.pais,8\)/,'internal projection must preserve country context');
assert.match(ui,/Reporte de asesor rechazado/,'UI must give technical trace to diagnosis');
assert.match(ui,/No se aplicó ningún pago/,'UI must distinguish report from application');

const text=(v,max=1000)=>String(v==null?'':v).trim().slice(0,max);
const norm=v=>text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const unique=v=>Array.from(new Set([].concat(v||[]).map(x=>text(x)).filter(Boolean)));
const opsRole=v=>/operativo|admin|direccion|superadmin|super admin/.test(norm(v));
const advisorRole=v=>/asesor|comercial|asistente/.test(norm(v));
const allowedAdvisorIds=a=>a.opsScope==='own'?[a.advisorId]:(a.opsScope==='team'?(a.teamAdvisorIds||[]):[]);
const before=inbox.indexOf('function recipientMatch(');
const after=inbox.indexOf('\nfunction activeMember(',before);
assert(before>=0&&after>before,'recipient authorization must be available');
const context={text,norm,unique,opsRole,advisorRole,allowedAdvisorIds};
vm.createContext(context);
vm.runInContext(inbox.slice(before,after),context);
const event={eventSource:'reconciliation',pais:'GT',asesorId:'ase_1'};
const target={type:'role',id:'operations'};
const auth=(role,countries,scope='all',advisorId='')=>({uid:'reader',activeRole:role,member:{countries},opsScope:scope,advisorId});
assert.equal(context.recipientMatch(target,auth('Operativo',['GT']),'actor',event),true);
assert.equal(context.recipientMatch(target,auth('AdminTenant',['GT']),'actor',event),true);
assert.equal(context.recipientMatch(target,auth('SuperAdmin',['GT']),'actor',event),true);
assert.equal(context.recipientMatch(target,auth('Direccion',['GT']),'actor',event),true);
assert.equal(context.recipientMatch(target,auth('SuperAdmin',['CO']),'actor',event),false,'cross-country event must be denied');
assert.equal(context.recipientMatch(target,auth('Asesor',['GT'],'own','ase_1'),'actor',event),false,'advisor cannot read operations notices');
assert.equal(context.recipientMatch(target,auth('Operativo',['GT'],'none'),'actor',event),false,'opsScope none must be denied');
assert.equal(context.recipientMatch(target,auth('Operativo',['GT'],'own','ase_other'),'actor',event),false,'unrelated advisor scope must be denied');
assert.equal(context.recipientMatch(target,auth('Operativo',['GT'],'own','ase_1'),'actor',event),true,'own-scope matching advisor allowed');
assert.equal(context.recipientMatch(target,auth('Direccion',['GT']),'reader',event),false,'actor self-alert must not duplicate');
const visibleStart=inbox.indexOf('function visible('),visibleEnd=inbox.indexOf('\nfunction project(',visibleStart);
assert(visibleStart>=0&&visibleEnd>visibleStart);
vm.runInContext(inbox.slice(visibleStart,visibleEnd),context);
const management={archivado:false,workflowType:'advisor_payment_validation',pais:'CO',asesorId:'ase_1'};
assert.equal(context.visible(management,auth('Operativo',['GT']),'ops'),false,'GT Ops must not see CO payment management');
assert.equal(context.visible(management,auth('Operativo',['CO']),'ops'),true,'CO Ops may see CO payment management');

const updateStart=inbox.indexOf('async function updateInboxState(');
const updateEnd=inbox.indexOf('\nexports.orbit360GetAdvisorOpsInbox',updateStart);
assert(updateStart>=0&&updateEnd>updateStart,'inbox state owner must exist');
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
let writes=0;
const negative={authorize:async()=>({tenantId:'alianzas-soluciones',uid:'reader',activeRole:'operativo'}),cleanId:x=>x,
  norm,inbox:async()=>({notices:[{eventId:'evt_own',targetType:'role'}]}),HttpsError,text,opsRole,
  inboxStateCollection:()=>{writes++;throw Error('unauthorized write was attempted');}};
vm.createContext(negative);
vm.runInContext(inbox.slice(updateStart,updateEnd),negative);
(async()=>{
  await assert.rejects(negative.updateInboxState({auth:{uid:'reader'},data:{noticeId:'evt_other',action:'resolve'}},false),
    e=>e&&e.code==='permission-denied');
  assert.equal(writes,0,'foreign notification rejection must happen before state write');
  console.log('I6_6_ADVISOR_REPORT_OPS_NOTIFICATION_AND_SCOPE_PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});

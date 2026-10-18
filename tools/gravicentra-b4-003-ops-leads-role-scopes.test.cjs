'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const norm=x=>String(x==null?'':x).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_'),text=x=>String(x==null?'':x).trim(),unique=x=>[...new Set([].concat(x||[]).map(text).filter(Boolean))];
function grab(p,a,b,n,extra={}){const s=fs.readFileSync(p,'utf8'),i=s.indexOf(a),j=s.indexOf(b,i+1);assert.ok(i>=0&&j>i);const c={norm,text,unique,Set,Object,Array,...extra};vm.runInNewContext(s.slice(i,j)+'\nthis.fn={'+n+'};',c);return c.fn;}
const ops=grab('functions/product-ops-leads-domain.js','function scope(m,domain,activeRole){','function collaborationWriteDirection(','scope,advisorAllowed');
const m={roles:['Asesor','Operativo'],advisorId:'a1',dataScopes:{default:'todos',modules:{leads:'propios',ops:'equipo'}},teamAdvisorIds:['a2'],roleVisibleAdvisorIds:{Operativo:['a3']}};
let n=0;function eq(a,b){assert.equal(a,b);n++};eq(ops.scope(m,'ops','operativo'),'team');eq(ops.scope(m,'leads','operativo'),'own');eq(ops.scope(m,'ops','asesor'),'own');eq(ops.advisorAllowed(m,'a3','ops','operativo'),true);eq(ops.advisorAllowed(m,'a2','ops','operativo'),false);
m.dataScopes.modules.ops='ninguno';eq(ops.scope(m,'ops','operativo'),'none');m.dataScopes.modules.ops='invalid';eq(ops.scope(m,'ops','operativo'),'none');m.dataScopes.modules.ops='todos';eq(ops.scope(m,'ops','operativo'),'all');
const inbox=grab('functions/ops-advisor-inbox.js','function scopeOf(member,domain,activeRole) {','function teamAdvisorIds(member,activeRole) {','scopeOf',{advisorIdOf:x=>text(x?.advisorId),rolesOf:x=>x.roles.map(norm)});eq(inbox.scopeOf(m,'ops','asesor'),'own');eq(inbox.scopeOf(m,'ops','operativo'),'all');m.dataScopes.modules.ops='ninguno';eq(inbox.scopeOf(m,'ops','operativo'),'none');
const team=grab('functions/ops-advisor-inbox.js','function teamAdvisorIds(member,activeRole) {','async function authorize(','teamAdvisorIds',{advisorIdOf:x=>text(x?.advisorId)});eq(team.teamAdvisorIds(m,'Operativo').includes('a3'),true);eq(team.teamAdvisorIds(m,'Operativo').includes('a2'),false);
console.log('B4_003_OPS_LEADS_ROLE_SCOPE_SOURCE_QA_PASS checks='+n+' mock_only_no_writes');

const srcFs=require('node:fs');
const domain=srcFs.readFileSync('functions/product-ops-leads-domain.js','utf8');
assert.match(domain,/collabDirection=entityType==='negocios'\?collaborationWriteDirection\(before,after\):''/,'NO_STALE_COLLABORATION_DIRECTION_ON_UNRELATED_SAVE');
assert.match(domain,/eventId:collabDirection&&collab&&collab.eventId\?text\(collab.eventId,180\):eventId/,'SAME_CANONICAL_EVENT_INBOX_AND_COMMENT');
const cyc=grab('orbit360-platform/core/ciclo.js','function collaborationState(n,board){','function actionQueueRanks(board){','collaborationState',{Orbit:{sharedInboxState:{lookup:()=>({known:true,globalResolved:false})}}});
const thread=[{direction:'operations',eventId:'operations-request'},{direction:'advisor',eventId:'advisor-return'}];
assert.equal(cyc.collaborationState({comentarios:thread},'ops').needsAction,false,'OLD_OPERATIONS_TURN_NOT_CURRENT');
assert.equal(cyc.collaborationState({comentarios:thread},'leads').needsAction,true,'LATEST_ADVISOR_TURN_CURRENT');
console.log('B4_003_COLLABORATION_LATEST_TURN_AND_NOTIFICATION_ID_QA_PASS checks=4');

const sourceCycle=require('node:fs').readFileSync('orbit360-platform/core/ciclo.js','utf8');
assert.match(sourceCycle,/policy\.dataScope\(surface\)/,'ROLE_EFFECTIVE_DATA_SCOPE_AUTHORITY');
assert.match(sourceCycle,/return value\|\|'none'/,'NO_SCOPE_WIDENING_ON_UNKNOWN_ROLE');
assert.doesNotMatch(sourceCycle,/surface==='leads'\)return own\?'own'/,'MULTIROL_LEADS_NOT_FORCED_TO_ADVISOR');

// C03.03 authenticated writer guard: reject missing/pending/invited/contradictory
// membership states before any transaction. Synthetic source-only VM proof.
const membershipGate=grab('functions/product-ops-leads-domain.js','function active(m){','function scope(m,domain,activeRole){','active');
const membershipCases=[
 [{status:'active'},true,'active'],
 [{estado:'activo'},true,'activo_alias'],
 [{status:'active',estado:'activo'},true,'matching_active_aliases'],
 [{},false,'absent_state'],
 [{active:true},false,'boolean_only_not_sufficient'],
 [{status:'pending'},false,'pending'],
 [{status:'invited'},false,'invited'],
 [{status:'invitado'},false,'invitado'],
 [{status:'blocked'},false,'blocked'],
 [{status:'deleted'},false,'deleted'],
 [{status:'suspended'},false,'suspended'],
 [{status:'active',estado:'pending'},false,'conflicting_alias'],
 [{status:'pending',estado:'active'},false,'conflicting_reverse'],
 [{status:'active',active:false},false,'disabled_boolean'],
 [{status:'active',activo:false},false,'inactive_spanish_boolean'],
 [{status:'active',inactivo:true},false,'inactivo_flag']
];
for(const [member,expected,label] of membershipCases)assert.equal(membershipGate.active(member),expected,'C03_OPS_LEADS_MEMBERSHIP_'+label);
assert.match(domain,/!active\(member\)\|\|text\(member\.tenantId,180\)!==tenantId/,'C03_WRITER_MUST_VALIDATE_ACTIVE_MEMBER_AND_TENANT');
console.log('B4_003_C03_OPS_LEADS_MEMBERSHIP_WRITER_SOURCE_QA_PASS checks='+membershipCases.length+' mock_only_no_writes');

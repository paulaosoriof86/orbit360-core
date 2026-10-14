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

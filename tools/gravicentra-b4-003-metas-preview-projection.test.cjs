'use strict';
// Executes the unchanged Inicio owner against fixtures created by the actual
// Preview writer. In-memory Firestore only; no SDK, credentials or network.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=path.resolve(process.argv[2]||'.'),output=process.argv[3],rosterRepo=path.resolve(process.argv[4]||repo);
const harness=fs.readFileSync(path.join(repo,'tools/gravicentra-b4-003-operational-write-security-regression.test.cjs'),'utf8').split('const cases=')[0];
assert.ok(harness.includes('return{tenant,uid,own,rows,writes'));
// Expose the canonical harness loader so both owners share the same database.
const prefix=harness.replace('return{tenant,uid,own,rows,writes','return{load,tenant,uid,own,rows,writes');
const sandbox=vm.createContext({require,console,Buffer,process:{argv:['node','qa',path.join(repo,'functions')]}});
vm.runInContext(prefix,sandbox,{filename:'canonical-security-harness.cjs'});
const e=vm.runInContext("env({role:'SuperAdmin',scope:'todos',countries:['GT','CO']})",sandbox);
const rosterPath=path.join(rosterRepo,'functions/assignable-advisor-roster.js'),roster=e.load(rosterPath);
const rowPath=(c,id)=>`tenants/${e.tenant}/data/${c}/items/${id}`;
const period='QA-B4-003',businessMonth='2026-10';
const runFor=pais=>'roster_20261030_'+pais;
const goalId=(pais,tipo)=>'b4003qa_metas_'+runFor(pais)+'_'+tipo;
const markers=pais=>({__syntheticQa:true,__metasPreviewQa:true,__metasPreviewRunId:runFor(pais),__metasPreviewActorUid:e.uid,pais,periodo:period});
const audit=(pais,operation)=>({collection:'auditoria',action:'insert',id:'b4003qa_metas_'+runFor(pais)+'_audit_'+(operation==='restore'?'restore0001':'create00001'),payload:{...markers(pais),modulo:'equipo',accion:operation==='restore'?'restaurar_prueba_metas':'editar_meta_institucional'}});
async function command(pais,operation='write'){
 const mutations=['prima','recaudo'].map(tipo=>operation==='restore'?{collection:'metas',action:'remove',id:goalId(pais,tipo)}:{collection:'metas',action:'insert',id:goalId(pais,tipo),payload:{...markers(pais),mes:period,moneda:pais==='GT'?'GTQ':'COP',tipo,valor:tipo==='prima'?125:100}});
 const r=e.request([...mutations,audit(pais,operation)]);r.data.metaPreviewQa={version:1,runId:runFor(pais),operation,pais,periodo:period};return e.mod.orbit360ProductOperationalCommandPreview(r);
}
async function dashboard(month,country='TODOS'){
 const r=e.request([]);Object.assign(r.data,{purpose:'inicio',month,country});return roster.orbit360AssignableAdvisorRosterPreview(r);
}
const businessGoal={id:'normal-institutional-prima',tenantId:e.tenant,pais:'GT',mes:businessMonth,periodo:businessMonth,moneda:'GTQ',tipo:'prima',valor:7000};
e.rows.set(rowPath('metas',businessGoal.id),businessGoal);
e.rows.set(rowPath('asesores',e.own),{id:e.own,nombre:'Synthetic advisor',activo:true,roles:['Asesor'],paises:['GT','CO']});
let calendarQueries=0;
const cases=[
 ['writer_creates_reserved_period_institutional_fixtures',async()=>{await command('GT');await command('CO');for(const pais of ['GT','CO'])for(const tipo of ['prima','recaudo']){const row=e.rows.get(rowPath('metas',goalId(pais,tipo)));assert.equal(row.mes,period);assert.equal(row.periodo,period);assert.equal(row.asesorId,undefined);}}],
 ['all_120000_valid_calendar_months_exclude_fixtures',async()=>{
  const writesBefore=e.writes.length;
  for(let year=0;year<=9999;year++)for(let month=1;month<=12;month++){
   const key=String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0'),r=await dashboard(key);calendarQueries++;
   assert.equal(r.ok,true);assert.equal(r.globalMetas.CO,undefined,'CO fixture leaked into '+key);
   if(key===businessMonth){assert.equal(r.globalMetas.GT.prima,7000);assert.equal(r.globalMetas.GT.recaudo,0);}
   else assert.equal(r.globalMetas.GT,undefined,'GT fixture leaked into '+key);
   assert.equal(r.rows[0].metas.GT.produccion,0);assert.equal(r.rows[0].metas.CO.produccion,0);
  }
  assert.equal(e.writes.length,writesBefore);
 }],
 ['reserved_period_is_not_a_dashboard_query',async()=>{await assert.rejects(()=>dashboard(period),err=>err.code==='invalid-argument');}],
 ['projection_would_count_calendar_fixture_without_isolation',async()=>{
  // Discriminating control: the unchanged projection really does count a QA
  // marked row if its calendar month is conventional. Restore the test double.
  const p=rowPath('metas',goalId('GT','prima')),original=e.rows.get(p);e.rows.set(p,{...original,mes:businessMonth,periodo:businessMonth});
  const r=await dashboard(businessMonth);assert.equal(r.globalMetas.GT.prima,7125);e.rows.set(p,original);
  assert.equal((await dashboard(businessMonth)).globalMetas.GT.prima,7000);
 }],
 ['complete_restore_preserves_normal_institutional_projection',async()=>{
  await command('GT','restore');await command('CO','restore');
  const r=await dashboard(businessMonth);assert.equal(r.globalMetas.GT.prima,7000);assert.equal(r.globalMetas.CO,undefined);assert.deepEqual(e.rows.get(rowPath('metas',businessGoal.id)),businessGoal);
  for(const pais of ['GT','CO'])for(const tipo of ['prima','recaudo'])assert.equal(e.rows.has(rowPath('metas',goalId(pais,tipo))),false);
 }]
];
const gitBlob=file=>{const b=fs.readFileSync(file);return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');};
(async()=>{const tests=[];for(const [id,fn] of cases){try{await fn();tests.push({id,pass:true});}catch(error){tests.push({id,pass:false,error:error.message,code:error.code});}}
 const result={schema:'gravicentra-metas-preview-projection-isolation-v1',syntheticOnly:true,externalRequests:0,writerSourceBlob:gitBlob(path.join(repo,'functions/product-operational-domain.js')),unchangedRosterSourceBlob:gitBlob(rosterPath),calendarQueries,total:tests.length,passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,releaseAccepted:false};
 if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=2;});

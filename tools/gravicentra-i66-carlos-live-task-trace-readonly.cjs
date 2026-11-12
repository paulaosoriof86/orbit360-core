'use strict';
// I6.6 targeted Carlos incident: actual (not synthetic) tasks, Ops gestiones,
// Leads business records. Service-authenticated READ ONLY, no text/PII leaks.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const admin=require('firebase-admin');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const text=x=>String(x==null?'':x).trim();
const masked=x=>crypto.createHash('sha256').update(TENANT+'|'+x).digest('hex').slice(0,12);
const ts=x=>x&&typeof x.toMillis==='function'?x.toMillis():
  x&&typeof x.seconds==='number'?x.seconds*1000:
  typeof x==='number'?x:Date.parse(text(x)||'1970-01-01')||0;
const date=x=>new Date(ts(x)).toISOString().slice(0,10);
const isNov=x=>ts(x)>=Date.parse('2026-11-09T00:00:00-06:00');
const col=(root,name)=>root.collection('data').doc(name).collection('items');
function identity(members,advisors){
  const desired=x=>norm(x).startsWith('carlos castro');
  const names=r=>[r.nombre,r.nombreCompleto,r.fullName,r.displayName,r.name];
  const advisorIds=new Set(),uids=new Set();
  for(const d of advisors.docs){const r=d.data()||{};if(names(r).some(desired)){
    advisorIds.add(d.id);for(const uid of [r.authUid,r.uid,r.userId])if(uid)uids.add(text(uid));
  }}
  const matches=members.docs.filter(d=>{
    const m=d.data()||{};
    return names(m).some(desired)||advisorIds.has(text(m.asesorId||m.advisorId))||uids.has(d.id);
  });
  assert.equal(matches.length,1,'I66_CARLOS_TASK_ACTOR_NOT_EXACT_UNIQUE');
  const m=matches[0].data()||{};
  assert.equal(norm(m.activeRole),'operativo');
  assert.ok(m.active!==false&&m.activo!==false&&['active','activo'].includes(norm(m.status||m.estado)));
  const countries=[].concat(m.countries||m.paises||[]).map(x=>text(x).toUpperCase()).filter(x=>x==='GT'||x==='CO');
  assert.ok(countries.length>=1,'I66_CARLOS_TASK_COUNTRY_SCOPE_MISSING');
  return{uid:matches[0].id,advisorIds,countries:Array.from(new Set(countries))};
}
async function main(){
  assert.equal(process.env.GCLOUD_PROJECT,PROJECT);
  assert.equal(process.env.GI_I66_CARLOS_TRACE_MODE,'readonly');
  assert.ok(!process.env.FIRESTORE_EMULATOR_HOST);
  const service=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean)
    .map(v=>{try{return JSON.parse(v);}catch{return null;}})
    .find(x=>x?.project_id===PROJECT&&x.type==='service_account'&&x.private_key);
  assert.ok(service,'I66_CARLOS_TASK_SERVICE_IDENTITY_HOLD');
  admin.initializeApp({credential:admin.credential.cert(service),projectId:PROJECT});
  const root=admin.firestore().collection('tenants').doc(TENANT);
  const [members,advisors,allTasks]=await Promise.all([
    root.collection('members').limit(150).get(),col(root,'asesores').limit(400).get(),
    col(root,'tareas').limit(750).get()
  ]);
  assert.ok(members.size<150&&advisors.size<400&&allTasks.size<750,'I66_CARLOS_TASK_SCAN_LIMIT');
  const actor=identity(members,advisors);
  const tasks=allTasks.docs.map(d=>({id:d.id,row:d.data()||{}}));
  const owns=r=>r.ownerUid===actor.uid||r.createdByUid===actor.uid||r.updatedByUid===actor.uid||
    actor.advisorIds.has(text(r.asesorId||r.advisorId));
  const related=tasks.filter(x=>owns(x.row));
  const sourceVisible=t=>!!text(t.pais)&&actor.countries.includes(text(t.pais).toUpperCase());
  const byCountry={};
  for(const country of actor.countries){
    const visible=tasks.filter(x=>text(x.row.pais).toUpperCase()===country)
      .sort((a,b)=>Number(!!a.row.done)-Number(!!b.row.done)||
        String(a.row.fecha||'9999').localeCompare(String(b.row.fecha||'9999'))||a.id.localeCompare(b.id));
    byCountry[country]={totalRows:visible.length,firstEightMask:visible.slice(0,8).map(x=>masked(x.id))};
  }
  const taskCases=related.map(x=>{
    const r=x.row,kind=actor.countries.includes(text(r.pais).toUpperCase())?'ALLOWED':
      text(r.pais)?'DIFFERENT_COUNTRY':'COUNTRY_MISSING';
    const country=text(r.pais).toUpperCase(),position=sourceVisible(r)?
      tasks.filter(t=>text(t.row.pais).toUpperCase()===country)
        .sort((a,b)=>Number(!!a.row.done)-Number(!!b.row.done)||
          String(a.row.fecha||'9999').localeCompare(String(b.row.fecha||'9999'))||a.id.localeCompare(b.id))
        .findIndex(t=>t.id===x.id)+1:0;
    return{mask:masked(x.id),ownerUidExact:r.ownerUid===actor.uid,
      createdByUidExact:r.createdByUid===actor.uid,assignedAdvisorMatch:actor.advisorIds.has(text(r.asesorId||r.advisorId)),
      countryClass:kind,createdSinceNov09:isNov(r.createdAt||r.fecha),
      date:date(r.createdAt||r.fecha),done:r.done===true,
      country:country||'MISSING',wouldBeOutsideFirstEight:position>8,
      rankInCountry:position,hasTitle:!!text(r.t)};
  }).sort((a,b)=>b.date.localeCompare(a.date));
  const listCreated=async name=>{
    const snapshot=await col(root,name).where('createdByUid','==',actor.uid).limit(250).get();
    assert.ok(snapshot.size<250,'I66_CARLOS_'+name.toUpperCase()+'_SCAN_LIMIT');
    return{total: snapshot.size,sinceNov09:snapshot.docs.filter(d=>isNov((d.data()||{}).createdAt)).length,
      missingCountry:snapshot.docs.filter(d=>!text((d.data()||{}).pais)).length};
  };
  const [gestiones,negocios]=await Promise.all([listCreated('gestiones'),listCreated('negocios')]);
  const report={schema:'gi.i66.carlos.actual-task-trace.readonly.v1',dateGuatemala:'2026-11-12',
    tenant:'A_S_GT_CO_CANONICAL',actor:'CARLOS_OPERATIVO_SOURCE_MATCHED',
    allowedCountries:actor.countries,countryTaskCounts:byCountry,
    allTenantTaskCount:tasks.length,carloRelatedTaskCount:related.length,
    recentCarlosTasks:taskCases.filter(x=>x.createdSinceNov09),
    relatedTasksOverview:{missingCountry:taskCases.filter(x=>x.countryClass==='COUNTRY_MISSING').length,
      countryOutOfScope:taskCases.filter(x=>x.countryClass==='DIFFERENT_COUNTRY').length,
      outsideFirstEight:taskCases.filter(x=>x.wouldBeOutsideFirstEight).length},
    gestionesCreatedByCarlos:gestiones,leadsCreatedByCarlos:negocios,
    limitation:'Not an exact user-reported task ID correlation; actor and source date only.',
    writes:0,clientContentsExported:false};
  const dest=text(process.env.GI_I66_CARLOS_TRACE_REPORT);
  if(dest){const prefix=text(process.env.RUNNER_TEMP)+'/';
    assert.ok(prefix.startsWith('/home/runner/work/_temp/')&&dest.startsWith(prefix));
    assert.ok(dest.endsWith('/gi-i66-carlos-actual-task-readonly.json'));
    fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  }
  console.log('I66_CARLOS_REAL_TASK_READONLY='+JSON.stringify({countryCount:actor.countries.length,
    countries:actor.countries,totalTasks:tasks.length,related:related.length,
    recent:report.recentCarlosTasks.length,missingCountry:report.relatedTasksOverview.missingCountry,
    outsideFirstEight:report.relatedTasksOverview.outsideFirstEight,
    gestiones:gestiones.total,leads:negocios.total,writes:0}));
}
main().catch(e=>{console.error(/^I66_CARLOS_[A-Z0-9_]+$/.test(text(e.message))?e.message:'I66_CARLOS_TASK_READONLY_HOLD');process.exitCode=1;});

import fs from 'node:fs';
import path from 'node:path';
import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';

const tenant=String(process.env.TENANT_HINT||'').trim();
const project=String(process.env.PROJECT_ID||'').trim();
const lockPath=process.env.B1_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B1_EXECUTION_LOCK_20260919.json';
const out=process.argv[2];
if(!tenant||!project||!out) throw new Error('B1_NORMALIZE_ARGS');

const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));
const scope=lock.boundaries&&lock.boundaries.advisorCanonicalNormalization||{};
if(scope.authorized!==true||scope.maxCreates!==5||scope.updatesExisting!==false||scope.deletes!==false||
   scope.legacyWrites!==false||scope.authWrites!==false||scope.membershipWrites!==false||scope.idempotent!==true){
  throw new Error('B1_NORMALIZE_NOT_AUTHORIZED');
}

const sa=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
const app=initializeApp({credential:cert(sa),projectId:project},'b1-advisor-normalize');
const db=getFirestore(app),auth=getAuth(app);
const clean=(v,m=500)=>String(v==null?'':v).trim().slice(0,m);
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,160)).filter(Boolean))];

const receipt={
  schema:'GRAVICENTRA_B1_ADVISOR_CANONICAL_NORMALIZATION_V1',
  tenantId:tenant,status:'FAIL',creates:[],noops:[],skipped:[],
  writes:0,legacyWrites:0,authWrites:0,membershipWrites:0
};

try{
  const canonical=db.collection('tenants').doc(tenant).collection('data').doc('asesores').collection('items');
  const legacyA=db.collection('tenantId').doc(tenant).collection('asesores');
  const legacyB=db.collection('tenants').doc(tenant).collection('asesores');
  const before=await canonical.get();
  receipt.canonicalCountBefore=before.size;

  const members=await db.collection('tenants').doc(tenant).collection('members').get();
  for(const md of members.docs){
    const m=md.data()||{};
    const st=clean(m.status||m.estado||'active',40).toLowerCase();
    const advisorId=clean(m.advisorId,160);
    if(!advisorId||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st)) continue;

    const target=canonical.doc(advisorId);
    const existing=await target.get();
    if(existing.exists){receipt.noops.push(advisorId);continue;}

    const [la,lb]=await Promise.all([legacyA.doc(advisorId).get(),legacyB.doc(advisorId).get()]);
    const legacySnap=la.exists?la:(lb.exists?lb:null);
    if(!legacySnap){receipt.skipped.push({advisorId,reason:'NO_MATCHING_LEGACY_SOURCE'});continue;}
    const legacy=legacySnap.data()||{};

    let user=null;
    try{user=await auth.getUser(md.id);}catch{}

    const roles=uniq(m.roles||m.rolesAsignados||legacy.roles||legacy.rolesAsignados);
    const countries=uniq(m.countries||m.paises||legacy.paises||legacy.countries);
    const row=Object.assign({},legacy,{
      id:advisorId,
      tenantId:tenant,
      nombre:clean(legacy.nombre||legacy.name||(user&&user.displayName),180),
      email:clean(legacy.email||legacy.correo||(user&&user.email),320).toLowerCase(),
      authUid:md.id,
      roles,
      paises:countries,
      rolDefault:clean(m.defaultRole||m.activeRole||legacy.rolDefault||legacy.rol||roles[0],80),
      paisDefault:clean(m.countryDefault||legacy.paisDefault||legacy.pais||countries[0],20),
      dataScopes:m.dataScopes||legacy.dataScopes||{},
      modulosExtra:uniq(m.modulesExtra||m.modulosExtra||legacy.modulosExtra),
      modulosRestringidos:uniq(m.modulesRestricted||m.modulosRestringidos||legacy.modulosRestringidos),
      accessProvisioned:!!user,
      membershipStatus:st||'active',
      canonicalizedAt:FieldValue.serverTimestamp(),
      canonicalizedFrom:la.exists?'legacy_tenantId':'legacy_tenants'
    });

    if(receipt.creates.length>=scope.maxCreates) throw new Error('B1_NORMALIZE_MAX_CREATES_EXCEEDED');
    await target.create(row);
    receipt.creates.push(advisorId);
    receipt.writes++;
  }

  const after=await canonical.get();
  receipt.canonicalCountAfter=after.size;
  const firstApply=receipt.canonicalCountBefore===2&&receipt.writes===scope.expectedCreates&&receipt.canonicalCountAfter===7;
  const replay=receipt.canonicalCountBefore>=7&&receipt.writes===0&&receipt.canonicalCountAfter===receipt.canonicalCountBefore;
  if(!firstApply&&!replay) throw new Error('B1_NORMALIZE_CARDINALITY_INVALID:'+JSON.stringify({
    before:receipt.canonicalCountBefore,writes:receipt.writes,after:receipt.canonicalCountAfter,skipped:receipt.skipped.length
  }));
  receipt.replay=replay;
  receipt.status='PASS';
} finally {
  await deleteApp(app).catch(()=>{});
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('B1_ADVISOR_NORMALIZATION='+receipt.status);
  console.log('B1_ADVISOR_NORMALIZATION_WRITES='+receipt.writes);
}

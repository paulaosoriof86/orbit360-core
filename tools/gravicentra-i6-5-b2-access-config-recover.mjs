import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'').trim();
const OUT=process.env.ACCESS_RECOVERY_PROOF_FILE||((process.env.RUNNER_TEMP||'.')+'/b2-access-config-recovery.json');
const LOCK=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const need=(v,c)=>{if(!v)throw new Error(c);};
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v??null))).digest('hex');
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}}throw new Error('B2_ACCESS_RECOVERY_SERVICE_ACCOUNT');}
need(TENANT==='alianzas-soluciones','B2_ACCESS_RECOVERY_TENANT_INVALID');
const lock=JSON.parse(fs.readFileSync(LOCK,'utf8'));
const auth=lock?.boundaries?.accessConfigRecovery;
need(auth?.authorized===true&&auth?.tenantId===TENANT&&auth?.configPath===`tenants/${TENANT}/config/access`,'B2_ACCESS_RECOVERY_NOT_AUTHORIZED');
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b2-access-recovery-'+Date.now());
const db=getFirestore(app),ref=db.collection('tenants').doc(TENANT).collection('config').doc('access');
const eventId='cfg_recovery_'+crypto.createHash('sha256').update(TENANT+'|Operativo|cotizador|comparativo|2026-09-24').digest('hex').slice(0,24);
const eventRef=db.collection('tenants').doc(TENANT).collection('configEvents').doc(eventId);
const APPROVED_SCOPES=Object.freeze({'Dirección':'all','SuperAdmin':'all','AdminTenant':'all','Admin':'all','Finanzas':'all','Operativo':'all','Marketing':'team','Asesor':'own','Asistente':'team','Comercial':'own'});
const proof={schema:'GRAVICENTRA_B2_ACCESS_CONFIG_RECOVERY_V2',status:'FAIL',tenantId:TENANT,configPath:auth.configPath,eventId,writes:0};
try{
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref),before=snap.exists?(snap.data()||{}):{};
    const rp=before.rolePermissions&&typeof before.rolePermissions==='object'?JSON.parse(JSON.stringify(before.rolePermissions)):{};
    const oper=rp.Operativo&&typeof rp.Operativo==='object'?rp.Operativo:{};
    const conflicts=['cotizador','comparativo'].filter(m=>oper[m]&&oper[m].ver===false);
    need(conflicts.length===0,'B2_ACCESS_RECOVERY_EXPLICIT_DENY_CONFLICT:'+conflicts.join(','));
    const beforeDigest=digest(before);
    rp.Operativo=Object.assign({},oper,{
      cotizador:Object.assign({},oper.cotizador||{},{ver:true,editar:true}),
      comparativo:Object.assign({},oper.comparativo||{},{ver:true,editar:true})
    });
    const existingScopes=before.roleScopes&&typeof before.roleScopes==='object'?Object.assign({},before.roleScopes):{};
    const scopeConflicts=Object.entries(existingScopes).filter(([role,value])=>APPROVED_SCOPES[role]&&String(value)!==APPROVED_SCOPES[role]);
    need(scopeConflicts.length===0,'B2_ACCESS_RECOVERY_EXPLICIT_SCOPE_CONFLICT:'+JSON.stringify(scopeConflicts));
    const recoveredScopes=Object.assign({},APPROVED_SCOPES,existingScopes);
    const next=Object.assign({},before,{
      schemaVersion:'gravicentra-access-policy-v1',
      rolePermissions:rp,
      roleScopes:recoveredScopes,
      updatedAt:FieldValue.serverTimestamp(),
      updatedByUid:'gravicentra-recovery-b2'
    });
    tx.set(ref,next,{merge:false});
    tx.set(eventRef,{
      schemaVersion:'orbit360-tenant-domain-config-recovery-v1',
      tenantId:TENANT,domain:'access',actor:{uid:'gravicentra-recovery-b2',activeRole:'Recovery'},
      reason:'Restore previously approved Operativo access to Cotizador and Comparativo after canonical access migration omitted rolePermissions.',
      beforeDigest,afterDigest:digest(Object.assign({},next,{updatedAt:null})),
      recoveredOverrides:{Operativo:{cotizador:{ver:true,editar:true},comparativo:{ver:true,editar:true}}},
      createdAt:FieldValue.serverTimestamp()
    },{merge:false});
  });
  const afterSnap=await ref.get(),after=afterSnap.data()||{},op=after.rolePermissions?.Operativo||{};
  need(op.cotizador?.ver===true&&op.cotizador?.editar===true&&op.comparativo?.ver===true&&op.comparativo?.editar===true,'B2_ACCESS_RECOVERY_READBACK_MISMATCH');
  need(Object.entries(APPROVED_SCOPES).every(([role,value])=>after.roleScopes?.[role]===value),'B2_ACCESS_RECOVERY_SCOPE_REGRESSION:'+JSON.stringify(after.roleScopes||{}));
  proof.status='PASS';proof.writes=2;proof.rolePermissionRoles=Object.keys(after.rolePermissions||{});proof.operativo={cotizador:op.cotizador,comparativo:op.comparativo};proof.roleScopes=after.roleScopes||{};proof.afterDigest=digest(after);
  fs.writeFileSync(OUT,JSON.stringify(proof,null,2)+'\n');
  console.log('B2_ACCESS_CONFIG_RECOVERY=PASS '+JSON.stringify({eventId,writes:proof.writes,operativo:proof.operativo}));
}catch(e){proof.error=String(e?.message||e);fs.writeFileSync(OUT,JSON.stringify(proof,null,2)+'\n');throw e;}finally{await deleteApp(app).catch(()=>{});}

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const OUT=process.env.I5_EVIDENCE_DIR||path.join(process.env.RUNNER_TEMP||process.cwd(),'gravicentra-i5-evidence');
const START=new Date(process.env.I5_CREDENTIAL_DIAG_START||'2026-09-13T00:02:55.000Z');
const END=new Date(process.env.I5_CREDENTIAL_DIAG_END||'2026-09-13T00:07:18.999Z');
const EXPECTED_REFS=Number(process.env.I5_CREDENTIAL_EXPECTED_REFS||2);
const clean=v=>String(v==null?'':v).trim();
const backendNorm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const frontendRole=v=>{const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);};
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I5_CREDENTIAL_DIAGNOSTIC_SERVICE_ACCOUNT_UNAVAILABLE');}
function harnessRolesRaw(m){if(Array.isArray(m?.roles))return m.roles.map(clean).filter(Boolean);if(Array.isArray(m?.rolesAsignados))return m.rolesAsignados.map(clean).filter(Boolean);return [m?.role||m?.rol].map(clean).filter(Boolean);}
function backendRolesRaw(m){return [...(Array.isArray(m?.roles)?m.roles:[]),...(Array.isArray(m?.rolesAsignados)?m.rolesAsignados:[]),...(Array.isArray(m?.assignedRoles)?m.assignedRoles:[]),...(Array.isArray(m?.rolesDisponibles)?m.rolesDisponibles:[])].map(clean).filter(Boolean);}
function harnessActiveRaw(m,rs){return clean(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);}
function activeMember(m){const s=backendNorm(m?.status||m?.estado||'active');return m&&m.active!==false&&m.activo!==false&&!['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(s);}
function timestampIso(v){try{return v?.toDate?.().toISOString?.()||'';}catch{return'';}}

fs.mkdirSync(OUT,{recursive:true});
const evidence={schemaVersion:'gravicentra-i5-credential-diagnostic-v1',gate:'I5',status:'FAIL',readOnly:true,productionMutationPerformed:false,dataMutationPerformed:false,writesExecuted:0,window:{start:START.toISOString(),end:END.toISOString()},expectedCredentialRefs:EXPECTED_REFS,selectedSuperAdmin:null,credentialAudit:{total:0,counts:{status:0,reveal:0,copy:0},superAdminRows:[],allRoleActionCounts:{}},classification:'UNRESOLVED',errors:[]};
const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i5-credential-diagnostic');
const auth=getAuth(app),db=getFirestore(app);
try{
  const members=await db.collection('tenants').doc(TENANT).collection('members').get();
  const listed=await auth.listUsers(1000),users=new Map(listed.users.map(u=>[u.uid,u]));
  const candidates=[];
  for(const doc of members.docs){
    const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);if(!u||u.disabled||u.emailVerified!==true||!activeMember(m))continue;
    const raw=harnessRolesRaw(m),canon=raw.map(frontendRole),activeRaw=harnessActiveRaw(m,raw),activeCanon=frontendRole(activeRaw);
    if(activeCanon==='SuperAdmin'&&canon.includes('SuperAdmin'))candidates.unshift({m,raw,canon,activeRaw,activeCanon,selectionMode:'persisted-active'});
    else if(canon.includes('SuperAdmin'))candidates.push({m,raw,canon,activeRaw,activeCanon,selectionMode:'assigned-role'});
  }
  const selected=candidates[0]||null;
  if(selected){
    const backRaw=backendRolesRaw(selected.m),backNorm=backRaw.map(backendNorm),requested=backendNorm('SuperAdmin');
    evidence.selectedSuperAdmin={available:true,selectionMode:selected.selectionMode,harnessAssignedRaw:selected.raw,harnessAssignedCanonical:selected.canon,harnessActiveRaw:selected.activeRaw,harnessActiveCanonical:selected.activeCanon,backendAssignedRaw:backRaw,backendAssignedNormalized:backNorm,requestedRoleRaw:'SuperAdmin',requestedRoleNormalized:requested,backendActiveCandidateNormalized:backendNorm('SuperAdmin'),backendRoleAssignmentCompatible:backNorm.includes(requested),candidateCount:candidates.length};
  }else evidence.selectedSuperAdmin={available:false,candidateCount:0};

  const q=await db.collection('tenants').doc(TENANT).collection('auditEvents').where('createdAt','>=',Timestamp.fromDate(START)).where('createdAt','<=',Timestamp.fromDate(END)).get();
  const rows=[];
  for(const d of q.docs){const x=d.data()||{},action=clean(x.action);if(!/^credential\.(status|reveal|copy)$/.test(action))continue;rows.push({createdAt:timestampIso(x.createdAt),action,activeRole:clean(x.activeRole),activeRoleNormalized:backendNorm(x.activeRole),outcome:clean(x.outcome),hasCredentialRef:!!clean(x.credentialRef),insurerIdPresent:!!clean(x.insurerId),portalIdPresent:!!clean(x.portalId),containsSecrets:x.containsSecrets===true});}
  rows.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  evidence.credentialAudit.total=rows.length;
  for(const r of rows){const op=r.action.split('.')[1],key=`${r.activeRoleNormalized||'unknown'}:${op}:${r.outcome||'unknown'}`;evidence.credentialAudit.allRoleActionCounts[key]=(evidence.credentialAudit.allRoleActionCounts[key]||0)+1;if(r.activeRoleNormalized==='superadmin'||r.activeRoleNormalized==='super_admin'){evidence.credentialAudit.superAdminRows.push(r);if(Object.prototype.hasOwnProperty.call(evidence.credentialAudit.counts,op))evidence.credentialAudit.counts[op]++;}}
  const compatible=evidence.selectedSuperAdmin?.backendRoleAssignmentCompatible===true,c=evidence.credentialAudit.counts;
  if(evidence.selectedSuperAdmin?.available!==true)evidence.classification='SUPERADMIN_MEMBERSHIP_NOT_AVAILABLE';
  else if(!compatible)evidence.classification='ROLE_ALIAS_MISMATCH_PROVEN';
  else if(c.reveal>=EXPECTED_REFS)evidence.classification='BACKEND_REVEAL_COMPLETED_UI_WAIT_DIVERGENCE';
  else if(c.reveal>0)evidence.classification='PARTIAL_BACKEND_REVEAL_COMPLETION';
  else if(c.status>0)evidence.classification='SUPERADMIN_STATUS_AUDITED_BUT_REVEAL_NOT_COMMITTED';
  else evidence.classification='NO_SUPERADMIN_CREDENTIAL_AUDIT_IN_FAILURE_WINDOW';
  evidence.status='PASS';
}catch(e){evidence.errors.push(clean(e?.stack||e?.message||e));process.exitCode=1;}finally{await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i5-credential-diagnostic.json'),JSON.stringify(evidence,null,2)+'\n');console.log('I5_CREDENTIAL_DIAGNOSTIC_STATUS='+evidence.status);console.log('I5_CREDENTIAL_DIAGNOSTIC_CLASSIFICATION='+evidence.classification);console.log('I5_CREDENTIAL_DIAGNOSTIC_WRITES=0');}

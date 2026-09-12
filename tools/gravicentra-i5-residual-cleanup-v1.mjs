import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const PROD=String(process.env.PRODUCTION_URL||'https://ays-orbit-360-lab.web.app').replace(/\/$/,'');
const EVIDENCE=String(process.env.I5_CONTROLLED_WRITE_EVIDENCE||'');
const OUT=String(process.env.I5_RESIDUAL_CLEANUP_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd());
const EXECUTE=process.argv.includes('--execute');
const ALLOWED=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo']);
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I5_RESIDUAL_SERVICE_ACCOUNT_UNAVAILABLE');}
function rolesOf(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(clean).filter(Boolean))];}
function activeRole(m,roles){const preferred=clean(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||'');if(preferred&&roles.includes(preferred)&&ALLOWED.has(norm(preferred)))return preferred;return roles.find(r=>ALLOWED.has(norm(r)))||'';}
function dataItems(db,c){return db.collection('tenants').doc(TENANT).collection('data').doc(c).collection('items');}
async function actor(db,auth){const snap=await db.collection('tenants').doc(TENANT).collection('members').get();for(const d of snap.docs){const m=d.data()||{},uid=clean(m.uid||d.id),roles=rolesOf(m),role=activeRole(m,roles),state=norm(m.status||m.estado||'active');if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,role};}catch{}}throw new Error('I5_RESIDUAL_PRIVILEGED_ACTOR_UNAVAILABLE');}
async function activate(page,auth,a){const token=await auth.createCustomToken(a.uid,{gravicentraI5RollbackCleanup:true});await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:8000});const s=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);need(s?.started===true,'I5_RESIDUAL_PRODUCT_APP_NOT_STARTED');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});const gate=page.locator('[data-legal-gate].open');if(await gate.count()){const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');if(await chk.count())await chk.check();if(await ok.count())await ok.click();await gate.waitFor({state:'detached',timeout:5000}).catch(()=>{});}const session=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));if(session.active!==a.role){need(session.assigned.includes(a.role),'I5_RESIDUAL_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),a.role),'I5_RESIDUAL_ROLE_SWITCH_REJECTED');}await page.waitForFunction(r=>Orbit.session?.rol?.()===r,a.role,{timeout:5000});}

fs.mkdirSync(OUT,{recursive:true});
const result={schemaVersion:'gravicentra-i5-residual-cleanup-v1',gate:'I5',status:'NOOP',sameServerOwner:true,syntheticInsurerId:'',cleanupExecuted:false,finalAbsent:false,auditPersisted:false,errors:[]};
if(!EXECUTE){fs.writeFileSync(path.join(OUT,'i5-residual-cleanup.json'),JSON.stringify(result,null,2)+'\n');console.log('I5_RESIDUAL_CLEANUP=READY_NO_EXECUTION');process.exit(0);}
need(process.env.I5_EMERGENCY_CLEANUP_AUTHORIZED==='true','I5_RESIDUAL_CLEANUP_NOT_AUTHORIZED');
need(EVIDENCE&&fs.existsSync(EVIDENCE),'I5_RESIDUAL_CONTROLLED_WRITE_EVIDENCE_MISSING');
const prior=JSON.parse(fs.readFileSync(EVIDENCE,'utf8'));
const insurerId=clean(prior.syntheticInsurerId);
result.syntheticInsurerId=insurerId;
if(!insurerId){result.finalAbsent=true;fs.writeFileSync(path.join(OUT,'i5-residual-cleanup.json'),JSON.stringify(result,null,2)+'\n');console.log('I5_RESIDUAL_CLEANUP=NO_ID_NOOP');process.exit(0);}
const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i5-residual');
const auth=getAuth(app),db=getFirestore(app),insurerRef=dataItems(db,'aseguradoras').doc(insurerId);
let browser;
try{
  if(!(await insurerRef.get()).exists){result.status='ALREADY_ABSENT';result.finalAbsent=true;}
  else{
    const a=await actor(db,auth);browser=await chromium.launch({headless:true});const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const page=await ctx.newPage();page.setDefaultTimeout(12000);await page.goto(PROD,{waitUntil:'domcontentloaded',timeout:20000});await activate(page,auth,a);
    const auditId=`audasg_i5_rollback_${Date.now().toString(36)}`;const requestId=`i5_rollback_cleanup_${Date.now().toString(36)}_${insurerId}`;
    const response=await page.evaluate(async x=>{const p=Orbit.productRuntimeBrowserProvidersP0,m=Orbit.auth?.productUser||{};if(!p||typeof p.callFunction!=='function')throw new Error('I5_RESIDUAL_PROVIDER_UNAVAILABLE');return p.callFunction('orbit360ProductOperationalCommand',{tenantId:m.tenantId,activeRole:Orbit.session?.rol?.()||m.activeRole,requestId:x.requestId,mutations:[{action:'insert',collection:'auditoriaAsegExterna',id:x.auditId,payload:{id:x.auditId,aseguradoraId:x.insurerId,cambio:'I5 emergency residual cleanup',motivo:'Rollback automático I5 después de fallo de aceptación LIVE',i5Synthetic:true,rollback:true,containsSecrets:false}},{action:'remove',collection:'aseguradoras',id:x.insurerId}]},'us-central1');},{insurerId,auditId,requestId});
    need(response?.ok===true&&response?.serverOwned===true&&Number(response?.mutationCount)===2,'I5_RESIDUAL_SAME_OWNER_CLEANUP_REJECTED');
    need(!(await insurerRef.get()).exists,'I5_RESIDUAL_FINAL_ABSENCE_FAILED');
    need((await dataItems(db,'auditoriaAsegExterna').doc(auditId).get()).exists,'I5_RESIDUAL_AUDIT_MISSING');
    result.status='CLEANED';result.cleanupExecuted=true;result.finalAbsent=true;result.auditPersisted=true;
  }
}catch(e){result.status='FAIL';result.errors.push(clean(e?.stack||e?.message||e));process.exitCode=1;}finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i5-residual-cleanup.json'),JSON.stringify(result,null,2)+'\n');console.log('I5_RESIDUAL_CLEANUP_STATUS='+result.status);console.log('I5_RESIDUAL_FINAL_ABSENT='+result.finalAbsent);}

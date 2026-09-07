import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||'');
const BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4A_POSTFIX_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const PRIVILEGED=['Dirección','SuperAdmin','AdminTenant','Operativo'];
const clean=v=>String(v==null?'':v).trim();
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const role=v=>{const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);};
const roles=m=>{const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(role).filter(Boolean))];};
const activeRole=(m,rs)=>role(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I4A_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');}
function redact(v){return String(v==null?'':v).replace(/cred_[a-f0-9]{32}/gi,'cred_[REDACTED]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[EMAIL_REDACTED]').replace(/[A-Za-z0-9_-]{80,}/g,'[LONG_VALUE_REDACTED]').slice(0,700);}
async function activate(page,token){const x=await page.evaluate(async tok=>{const p=Orbit?.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return await Orbit.productAppP0.activate();},token);need(x?.started===true,'PRODUCT_APP_DID_NOT_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});}
async function setRole(page,target){const before=await page.evaluate(()=>({active:Orbit?.session?.rol?.()||'',assigned:Orbit?.session?.allowedRoles?.()||[]}));if(before.active===target)return;need(before.assigned.includes(target),'ROLE_NOT_ASSIGNED:'+target);need(await page.evaluate(r=>Orbit.session.set(r),target),'ROLE_SWITCH_REJECTED:'+target);await page.waitForTimeout(250);need(await page.evaluate(()=>Orbit?.session?.rol?.()||'')===target,'ROLE_SWITCH_NOT_EFFECTIVE:'+target);}
async function go(page,hash,key){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForFunction(k=>Orbit?.route?.key===k,key,{timeout:12000});await page.waitForTimeout(800);}

async function validatePolicyLabels(page){
  await go(page,'#/polizas','polizas');
  return await page.evaluate(()=>{
    const re=/entorno de validaci[oó]n/i;
    const rows=[...document.querySelectorAll('#host tbody tr')].map((tr,index)=>({index,text:String(tr.textContent||'').replace(/\s+/g,' ').trim()}));
    let raw=[],all=[];try{raw=Orbit.store.raw()?.polizas||[];}catch{}try{all=Orbit.store.all('polizas')||[];}catch{}
    const stringify=p=>[p?.id,p?.numero,p?.nombre,p?.descripcion,p?.referencia].map(v=>String(v||'')).join(' | ');
    return {
      route:Orbit?.route?.key||'',
      rowCount:rows.length,
      syntheticDomRows:rows.filter(x=>re.test(x.text)).slice(0,10),
      labAutoRows:rows.filter(x=>/LAB-AUTO-GT-001/.test(x.text)).slice(0,5),
      labHogarRows:rows.filter(x=>/LAB-HOGAR-CO-001/.test(x.text)).slice(0,5),
      rawCount:raw.length,
      operationalCount:all.length,
      rawSynthetic:raw.map(stringify).filter(x=>re.test(x)).length,
      operationalSynthetic:all.map(stringify).filter(x=>re.test(x)).length
    };
  });
}

async function validateFinance(page){
  return await page.evaluate(()=>{
    const policies=Orbit.store.all('polizas')||[];
    const target=policies.find(p=>String(p?.numero||p?.id||'')==='AUTO39012');
    const out={targetFound:!!target,target:null,clientSummary:null,indexSummary:null,receipts:null,portfolio:null,cobros:null,global:null};
    if(!target)return out;
    const clientId=target.clienteId;
    const active=policies.filter(p=>p?.clienteId===clientId&&(p.estado==='Vigente'||p.estado==='Por renovar'));
    const expectedPremium=active.reduce((s,p)=>{const n=Orbit.ui.finiteNumber(p?.primaTotal);return s+(n==null?0:n);},0);
    const summary=Orbit.q.clienteResumen(clientId);
    const idx=Orbit.q.clientesResumenIndex().get(clientId);
    const receiptsAll=Orbit.store.all('recibosEsperados')||[];
    const portfolioAll=Orbit.store.all('carteraPrimas')||[];
    const cobrosAll=Orbit.store.all('cobros')||[];
    const linkedReceipts=receiptsAll.filter(r=>r&&r.polizaId!=null&&policies.some(p=>p.id===r.polizaId&&p.clienteId===clientId));
    const linkedPortfolio=portfolioAll.filter(r=>r&&r.polizaId!=null&&policies.some(p=>p.id===r.polizaId&&p.clienteId===clientId));
    const directCobros=cobrosAll.filter(c=>c?.clienteId===clientId);
    const qReceipts=Orbit.q.recibosEsperadosDe(clientId)||[];
    const qPortfolio=Orbit.q.carteraPrimasDe(clientId)||[];
    const qCobros=Orbit.q.cobrosDe(clientId)||[];
    const ids=a=>a.map(x=>String(x?.id||'')).filter(Boolean).sort();
    const equal=(a,b)=>JSON.stringify(ids(a))===JSON.stringify(ids(b));
    out.target={id:String(target.id||''),numero:String(target.numero||''),clienteId:String(clientId||''),primaTotal:target.primaTotal,primaTotalType:typeof target.primaTotal,legacyPrimaPresent:Object.prototype.hasOwnProperty.call(target,'prima'),legacyPrimaValue:target.prima};
    out.clientSummary={expectedPremium,actualPremium:summary?.primaAnual,match:summary?.primaAnual===expectedPremium,activePolicyCount:active.length};
    out.indexSummary={actualPremium:idx?.primaAnual,match:idx?.primaAnual===expectedPremium};
    out.receipts={collectionCount:receiptsAll.length,linkedExpectedCount:linkedReceipts.length,queryCount:qReceipts.length,idsMatch:equal(linkedReceipts,qReceipts),allQueryRowsPolicyLinked:qReceipts.every(r=>{const p=policies.find(p=>p.id===r.polizaId);return !!p&&p.clienteId===clientId;})};
    out.portfolio={collectionCount:portfolioAll.length,linkedExpectedCount:linkedPortfolio.length,queryCount:qPortfolio.length,idsMatch:equal(linkedPortfolio,qPortfolio),allQueryRowsPolicyLinked:qPortfolio.every(r=>{const p=policies.find(p=>p.id===r.polizaId);return !!p&&p.clienteId===clientId;})};
    out.cobros={collectionCount:cobrosAll.length,directExpectedCount:directCobros.length,queryCount:qCobros.length,idsMatch:equal(directCobros,qCobros),allQueryRowsDirectClient:qCobros.every(c=>c?.clienteId===clientId)};
    out.global={primaVigente:Orbit.q.primaVigenteGlobal(),cartera:Orbit.q.carteraGlobal()};
    return out;
  });
}

const sa=serviceAccount();
const app=initializeApp({credential:cert(sa),projectId:PROJECT},'gravicentra-i4a-postfix-readonly');
const auth=getAuth(app),db=getFirestore(app);
const evidence={schemaVersion:'gravicentra-i4a-postfix-readonly-v1',gate:'I4A',status:'POSTFIX_VALIDATION_FAIL',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,writesExecuted:0,secretsRecorded:false,privilegedRole:'',policyLabels:null,finance:null,consoleErrors:[],pageErrors:[],checks:{},errors:[]};
let browser,context;
try{
  need(PREVIEW&&SOURCE&&BUILD,'I4A_POSTFIX_ENV_INCOMPLETE');
  const memberships=await db.collection('tenants').doc(TENANT).collection('members').get(),listed=await auth.listUsers(1000),users=new Map(listed.users.map(u=>[u.uid,u])),pool=[];
  for(const doc of memberships.docs){const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;const rs=roles(m);pool.push({uid,roles:rs,active:activeRole(m,rs)});}
  let selected=null,targetRole='';for(const r of PRIVILEGED){const exact=pool.find(x=>x.active===r&&x.roles.includes(r)),fallback=exact||pool.find(x=>x.roles.includes(r));if(fallback){selected=fallback;targetRole=r;break;}}
  need(selected&&targetRole,'I4A_NO_PRIVILEGED_ACTIVE_MEMBERSHIP');evidence.privilegedRole=targetRole;
  const token=await auth.createCustomToken(selected.uid,{gravicentraI4APostfixReadonly:true});
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('console',m=>{if(m.type()==='error')evidence.consoleErrors.push(redact(m.text()));});page.on('pageerror',e=>evidence.pageErrors.push(redact(e?.message||e)));
  await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:6000});await activate(page,token);await setRole(page,targetRole);
  evidence.policyLabels=await validatePolicyLabels(page);
  evidence.finance=await validateFinance(page);
  const p=evidence.policyLabels,f=evidence.finance;
  evidence.checks={
    exactBuild:await page.evaluate(({s,b})=>window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.sourceSha===s&&window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.buildId===b,{s:SOURCE,b:BUILD}),
    policyNoSyntheticDom:p.syntheticDomRows.length===0,
    policyLabAutoPreserved:p.labAutoRows.length>0,
    policyLabHogarPreserved:p.labHogarRows.length>0,
    policyStoreClean:p.rawSynthetic===0&&p.operationalSynthetic===0,
    auto39012Found:f.targetFound===true,
    auto39012CanonicalValue:f.target?.primaTotal===2678.53&&f.target?.primaTotalType==='number',
    clientSummaryPremiumMatch:f.clientSummary?.match===true,
    clientIndexPremiumMatch:f.indexSummary?.match===true,
    receiptsPolicyJoin:f.receipts?.idsMatch===true&&f.receipts?.allQueryRowsPolicyLinked===true,
    portfolioPolicyJoin:f.portfolio?.idsMatch===true&&f.portfolio?.allQueryRowsPolicyLinked===true,
    cobrosDirectClientPreserved:f.cobros?.idsMatch===true&&f.cobros?.allQueryRowsDirectClient===true,
    noPageErrors:evidence.pageErrors.length===0
  };
  const failed=Object.entries(evidence.checks).filter(([,v])=>v!==true).map(([k])=>k);
  if(failed.length)throw new Error('POSTFIX_CHECKS_FAILED:'+failed.join(','));
  evidence.status='POSTFIX_CAUSAL_REGRESSION_PASS';
}catch(e){evidence.errors.push(redact(e?.message||e));process.exitCode=1;}
finally{
  if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});
  fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'i4a-postfix-readonly.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('I4A_POSTFIX_STATUS='+evidence.status);
  console.log('I4A_POSTFIX_CHECKS='+JSON.stringify(evidence.checks));
  console.log('I4A_POSTFIX_CONSOLE_ERRORS='+evidence.consoleErrors.length);
  console.log('I4A_POSTFIX_PAGE_ERRORS='+evidence.pageErrors.length);
  console.log('I4A_POSTFIX_WRITES=0');
}

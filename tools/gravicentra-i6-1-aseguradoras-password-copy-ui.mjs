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
const OUT=process.env.I61_AUTH_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const TARGETS=['Dirección','SuperAdmin','AdminTenant','Operativo','Asesor'];
const PRIV=new Set(['Dirección','SuperAdmin','AdminTenant','Operativo']);
const CREDENTIAL_WAIT_BOUND_MS=20000;
const clean=v=>String(v==null?'':v).trim();
function need(ok,code){if(!ok)throw new Error(code);}
need(/^[0-9a-f]{40}$/.test(SOURCE),'I61_INSURER_UI_SOURCE_SHA_INVALID');
need(/^gi-i61-[0-9a-f]{12}-[0-9a-f]{12}$/.test(BUILD)&&BUILD.includes(SOURCE.slice(0,12)),'I61_INSURER_UI_BUILD_INVALID');
need(/^https:\/\/[A-Za-z0-9._-]+\.web\.app$/.test(PREVIEW),'I61_INSURER_UI_PREVIEW_INVALID');

function role(v){const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);}
function roles(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(role).filter(Boolean))];}
function activeRole(m,rs){return role(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);}
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I61_INSURER_UI_SERVICE_ACCOUNT_UNAVAILABLE');}
async function activate(page,token){const x=await page.evaluate(async tok=>{const p=Orbit?.productRuntimeBrowserProvidersP0;const c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return await Orbit.productAppP0.activate();},token);need(x?.started===true,'I61_INSURER_UI_PRODUCT_NOT_STARTED');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});}
async function acceptEphemeralLegalGate(page){const gate=page.locator('[data-legal-gate].open');await gate.waitFor({state:'visible',timeout:2200});const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');need(await chk.count()===1,'I61_INSURER_UI_LEGAL_CHECKBOX_MISSING');need(await ok.count()===1,'I61_INSURER_UI_LEGAL_ACCEPT_MISSING');await chk.check();need(await ok.isEnabled(),'I61_INSURER_UI_LEGAL_ACCEPT_DISABLED');await ok.click();await gate.waitFor({state:'detached',timeout:4000});return {completed:true,persistence:'ephemeral-browser-localStorage',backendWrite:false};}
async function setRole(page,target){const before=await page.evaluate(()=>({active:Orbit?.session?.rol?.()||'',assigned:Orbit?.session?.allowedRoles?.()||[]}));if(before.active===target)return 'persisted-active';need(before.assigned.includes(target),'I61_INSURER_UI_ROLE_NOT_ASSIGNED:'+target);need(await page.evaluate(r=>Orbit.session.set(r),target),'I61_INSURER_UI_ROLE_SWITCH_REJECTED:'+target);await page.waitForTimeout(180);need(await page.evaluate(()=>Orbit?.session?.rol?.()||'')===target,'I61_INSURER_UI_ROLE_SWITCH_NOT_EFFECTIVE:'+target);return 'assigned-switch';}
async function openInsurer(page,id){await page.evaluate(x=>{location.hash='#/aseguradoras?ficha='+encodeURIComponent(x);},id);await page.waitForFunction(x=>Orbit?.route?.key==='aseguradoras'&&String(Orbit?.route?.params?.ficha||'')===String(x)&&!!document.querySelector('#asg-ficha'),id,{timeout:12000});await page.waitForTimeout(180);}
async function clickTab(page,tab,container){await page.evaluate(t=>{const el=document.querySelector('#asg-ficha [data-tab="'+t+'"]');if(!el)throw new Error('I61_INSURER_UI_TAB_MISSING:'+t);el.click();},tab);await page.waitForFunction(sel=>!!document.querySelector(sel),container,{timeout:8000});await page.waitForTimeout(180);}
function telemetry(page){const t={page:[],req:[],http:[]};page.on('pageerror',e=>t.page.push(String(e?.message||e).slice(0,200)));page.on('requestfailed',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin)t.req.push(q.url());}catch{}});page.on('response',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin&&q.status()>=400)t.http.push(q.status());}catch{}});return t;}
function checkTelemetry(t){need(t.page.length===0,'I61_INSURER_UI_PAGE_ERRORS');need(t.req.length===0,'I61_INSURER_UI_SAME_ORIGIN_REQUEST_FAILURES');need(t.http.length===0,'I61_INSURER_UI_SAME_ORIGIN_HTTP_ERRORS');return {pageErrors:0,sameOriginRequestFailures:0,sameOriginHttpErrors:0};}
async function operationalWriteState(page){const s=await page.evaluate(()=>{try{return Orbit?.store?._operationalWriteStatus?.()||null;}catch{return null;}});need(s&&Number.isFinite(Number(s.pending))&&Number.isFinite(Number(s.committed))&&Number.isFinite(Number(s.failed)),'I61_INSURER_UI_OPERATIONAL_WRITE_STATUS_UNAVAILABLE');return {pending:Number(s.pending),committed:Number(s.committed),failed:Number(s.failed)};}
function writeDelta(before,after){return {pending:after.pending-before.pending,committed:after.committed-before.committed,failed:after.failed-before.failed};}
async function installAuditObserver(page){await page.evaluate(()=>{window.__gravicentraI61SecureAudit=[];document.addEventListener('orbit:secure-resource-audit',e=>{const d=e?.detail||{};window.__gravicentraI61SecureAudit.push({action:String(d.action||''),result:String(d.result||'')});});});}
async function auditObservation(page){return await page.evaluate(()=>Array.isArray(window.__gravicentraI61SecureAudit)?window.__gravicentraI61SecureAudit.map(x=>({action:String(x.action||''),result:String(x.result||'')})):[]);}
async function clearClipboard(page){const ok=await page.evaluate(async()=>{try{await navigator.clipboard.writeText('');return true;}catch{return false;}});need(ok,'I61_INSURER_UI_CLIPBOARD_CLEAR_FAILED');}
async function readClipboard(page){return await page.evaluate(async()=>{try{return await navigator.clipboard.readText();}catch{return ''}});}
async function waitPasswordClipboard(page){await page.waitForFunction(async()=>{try{const v=await navigator.clipboard.readText();return typeof v==='string'&&v.trim().length>0&&!v.includes('Usuario: ')&&!v.includes('\nContraseña: ');}catch{return false;}},null,{timeout:CREDENTIAL_WAIT_BOUND_MS});return await readClipboard(page);}
async function waitCredentialClipboard(page){await page.waitForFunction(async()=>{try{const v=await navigator.clipboard.readText();const marker='\nContraseña: ';const at=v.indexOf(marker);const pwd=at>=0?v.slice(at+marker.length).trim():'';return typeof v==='string'&&v.includes('Usuario: ')&&at>=0&&!!pwd&&pwd!=='—';}catch{return false;}},null,{timeout:CREDENTIAL_WAIT_BOUND_MS});return await readClipboard(page);}
async function waitBankClipboard(page){await page.waitForFunction(async()=>{try{const v=await navigator.clipboard.readText();return typeof v==='string'&&v.includes('Banco: ')&&v.includes('\nCuenta: ')&&v.includes('\nMoneda: ')&&v.includes('\nTitular: ');}catch{return false;}},null,{timeout:CREDENTIAL_WAIT_BOUND_MS});}

async function installClipboardTrace(page){
  return await page.evaluate(()=>{
    const meta=v=>{const s=String(v==null?'':v);return {length:s.length,nonEmpty:s.trim().length>0,hasUsuario:s.includes('Usuario: '),hasPasswordMarker:s.includes('\nContraseña: '),hasNewline:s.includes('\n')};};
    const state={events:[],nextLogical:0,activeLogical:null,startedAt:performance.now(),vaultWrapped:false,navigatorWrapped:false};
    window.__gravicentraI61ClipboardTraceState=state;
    const elapsed=()=>Number((performance.now()-state.startedAt).toFixed(3));
    const push=(kind,origin,value,extra={})=>state.events.push({seq:state.events.length+1,tMs:elapsed(),kind,origin,logicalWriteId:state.activeLogical,...meta(value),...extra});
    const clip=navigator.clipboard;
    if(clip&&typeof clip.writeText==='function'){
      const originalNavigator=clip.writeText.bind(clip);
      const wrappedNavigator=async value=>{
        const inherited=state.activeLogical!=null;
        if(!inherited)state.activeLogical=++state.nextLogical;
        const logicalId=state.activeLogical;
        push('writer','navigator.clipboard.writeText',value,{delegatedFromVault:inherited,handlerOwnerOnStack:String(new Error().stack||'').includes('client-insurer-operational-directory-owner-v20260722.js')});
        try{return await originalNavigator(value);}finally{if(!inherited&&state.activeLogical===logicalId)state.activeLogical=null;}
      };
      try{Object.defineProperty(clip,'writeText',{configurable:true,writable:true,value:wrappedNavigator});state.navigatorWrapped=clip.writeText===wrappedNavigator;}catch{}
    }
    if(Orbit?.vault&&typeof Orbit.vault.copyText==='function'){
      const originalVault=Orbit.vault.copyText.bind(Orbit.vault);
      const wrappedVault=async value=>{
        const previous=state.activeLogical;
        const logicalId=++state.nextLogical;
        state.activeLogical=logicalId;
        const eventIndex=state.events.length;
        push('writer','Orbit.vault.copyText',value,{delegatesToNavigator:false,handlerOwnerOnStack:String(new Error().stack||'').includes('client-insurer-operational-directory-owner-v20260722.js')});
        try{return await originalVault(value);}finally{
          const delegated=state.events.some((e,i)=>i>eventIndex&&e.logicalWriteId===logicalId&&e.origin==='navigator.clipboard.writeText');
          if(state.events[eventIndex])state.events[eventIndex].delegatesToNavigator=delegated;
          state.activeLogical=previous;
        }
      };
      try{Orbit.vault.copyText=wrappedVault;state.vaultWrapped=Orbit.vault.copyText===wrappedVault;}catch{}
    }
    document.addEventListener('click',e=>{
      const password=e.target?.closest?.('[data-od-password-copy]');
      const credentials=e.target?.closest?.('[data-od-credential-copy]');
      if(!password&&!credentials)return;
      state.events.push({seq:state.events.length+1,tMs:elapsed(),kind:'handler-trigger',origin:password?'password-copy-control':'credential-copy-control',logicalWriteId:null,length:0,nonEmpty:false,hasUsuario:false,hasPasswordMarker:false,hasNewline:false});
    },true);
    return {vaultWrapped:state.vaultWrapped,navigatorWrapped:state.navigatorWrapped};
  });
}
async function resetClipboardTrace(page){await page.evaluate(()=>{const s=window.__gravicentraI61ClipboardTraceState;if(!s)return;s.events=[];s.nextLogical=0;s.activeLogical=null;s.startedAt=performance.now();window.__gravicentraI61LastClipboardProof=null;});}
async function observePasswordClipboard(page,index){
  return await page.evaluate(async i=>{
    await new Promise(r=>setTimeout(r,900));
    let value='';try{value=await navigator.clipboard.readText();}catch{}
    const secret=(document.querySelector('#af-portales [data-portal="'+i+'"] [data-od-credential-secret]')?.textContent||'').trim();
    const s=window.__gravicentraI61ClipboardTraceState||{events:[]};
    const events=(s.events||[]).map(e=>({seq:Number(e.seq)||0,tMs:Number(e.tMs)||0,kind:String(e.kind||''),origin:String(e.origin||''),logicalWriteId:e.logicalWriteId==null?null:Number(e.logicalWriteId),length:Number(e.length)||0,nonEmpty:e.nonEmpty===true,hasUsuario:e.hasUsuario===true,hasPasswordMarker:e.hasPasswordMarker===true,hasNewline:e.hasNewline===true,delegatedFromVault:e.delegatedFromVault===true,delegatesToNavigator:e.delegatesToNavigator===true,handlerOwnerOnStack:e.handlerOwnerOnStack===true}));
    const logicalIds=[...new Set(events.filter(e=>e.kind==='writer'&&e.logicalWriteId!=null).map(e=>e.logicalWriteId))];
    const lastWriter=[...events].reverse().find(e=>e.kind==='writer')||null;
    const final={length:value.length,nonEmpty:value.trim().length>0,hasUsuario:value.includes('Usuario: '),hasPasswordMarker:value.includes('\nContraseña: '),hasNewline:value.includes('\n'),matchesVisibleSecret:!!secret&&secret!=='Oculta'&&value===secret};
    const proof={handlerOrigin:events.some(e=>e.kind==='handler-trigger'&&e.origin==='password-copy-control')?'password-copy-control':null,writerOrigin:lastWriter?.origin||null,logicalWriteCount:logicalIds.length,secondLogicalWrite:logicalIds.length>1,vaultToNavigatorDelegation:events.some(e=>e.origin==='Orbit.vault.copyText'&&e.delegatesToNavigator===true),ownerOnWriterStack:events.some(e=>e.kind==='writer'&&e.handlerOwnerOnStack===true),events,final};
    window.__gravicentraI61LastClipboardProof=proof;
    return proof;
  },index);
}

async function probe(page,target){
  const writeBefore=await operationalWriteState(page);need(writeBefore.pending===0,'I61_INSURER_UI_PREEXISTING_PENDING_OPERATIONAL_WRITE');
  await installAuditObserver(page);
  const clipboardTraceInstallation=await installClipboardTrace(page);
  const candidates=await page.evaluate(()=>{const rows=Orbit.store.all('aseguradoras')||[];const credential=rows.find(a=>a&&Array.isArray(a.portales)&&a.portales.some(p=>p&&p.credentialRef))||null;const hasNumber=a=>a&&Array.isArray(a.cuentas)&&a.cuentas.some(c=>c&&(c.numero||c.numeroCuenta||c.accountNumber));const banks=rows.find(hasNumber)||rows.find(a=>a&&Array.isArray(a.cuentas)&&a.cuentas.length>0)||null;return {credential:credential?{id:credential.id,portalCount:credential.portales.length,refIndexes:credential.portales.map((p,i)=>p&&p.credentialRef?i:null).filter(Number.isInteger),userBearing:credential.portales.filter(p=>p&&(p.usuario||p.user||p.login||p.emailUsuario||p.correoUsuario)).length}:null,banks:banks?{id:banks.id,count:banks.cuentas.length,numberBearing:banks.cuentas.filter(a=>a&&(a.numero||a.numeroCuenta||a.accountNumber)).length}:null};});
  need(candidates.credential?.id&&candidates.credential.refIndexes.length>0,'I61_INSURER_UI_CREDENTIAL_DATASET_UNAVAILABLE');need(candidates.banks?.id,'I61_INSURER_UI_BANK_DATASET_UNAVAILABLE');need(candidates.banks.numberBearing>0,'I61_INSURER_UI_NUMBER_BEARING_BANK_DATASET_UNAVAILABLE');
  const candidate=candidates.credential;
  await openInsurer(page,candidate.id);await clickTab(page,'plataformas','#af-portales');
  const state=await page.evaluate(meta=>{let secure={};try{secure=Orbit?.secureResources?.selfTest?.()||{};}catch{}return {ownerVersion:Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.version||'',compositionRevision:Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.compositionRevision||'',barrierRevision:Orbit?.__clientInsurerVisualStabilityBarrierV20260721?.directoryVisibilityRevision||'',providerRegistered:secure.credentialProvider===true,rows:document.querySelectorAll('#af-portales [data-portal]').length,cards:document.querySelectorAll('#af-portales .od-operational-portal-card[data-portal]').length,credentialBoxes:document.querySelectorAll('#af-portales .od-credential-box').length,userVisible:[...document.querySelectorAll('#af-portales [data-od-credential-user]')].filter(x=>{const t=(x.textContent||'').trim();return t&&!/sin usuario/i.test(t);}).length,refRows:meta.refIndexes.map(index=>{const row=document.querySelector('#af-portales [data-portal="'+index+'"]');return {index,card:!!row,reveal:!!row?.querySelector('[data-od-credential-reveal="'+index+'"]'),passwordCopy:!!row?.querySelector('[data-od-password-copy="'+index+'"]'),credentialCopy:!!row?.querySelector('[data-od-credential-copy="'+index+'"]'),unavailable:!!row&&/contraseña no disponible|pendiente de conexión segura/i.test(row.textContent||'')};}),allRevealCount:document.querySelectorAll('#af-portales [data-od-credential-reveal]').length,allPasswordCopyCount:document.querySelectorAll('#af-portales [data-od-password-copy]').length,allCredentialCopyCount:document.querySelectorAll('#af-portales [data-od-credential-copy]').length,stable:Orbit?.__clientInsurerVisualStabilityState?.expectedReady===true};},candidate);
  need(state.ownerVersion==='20260915.1','I61_INSURER_UI_OWNER_VERSION_MISMATCH');need(state.compositionRevision==='20260915.1-i6-1-direct-password-copy','I61_INSURER_UI_OWNER_COMPOSITION_MISMATCH');need(state.barrierRevision==='20260902.1-latest-operational-owner-precedence','I61_INSURER_UI_BARRIER_MISMATCH');need(state.rows===candidate.portalCount&&state.cards===candidate.portalCount,'I61_INSURER_UI_PORTAL_CARD_COUNT_MISMATCH');need(state.credentialBoxes===candidate.portalCount,'I61_INSURER_UI_CREDENTIAL_BOX_COUNT_MISMATCH');need(state.stable,'I61_INSURER_UI_VIEW_NOT_STABLE');if(candidate.userBearing>0&&PRIV.has(target))need(state.userVisible>0,'I61_INSURER_UI_USERNAME_NOT_VISIBLE');

  let revealResolved=0,passwordCopyResolved=0,credentialCopyResolved=0,rehidden=0,advisorRestricted=false,bankCopyResolved=false;
  const passwordCopyTrace=[];
  if(target==='Asesor'){
    need(state.allRevealCount===0,'I61_INSURER_UI_ADVISOR_REVEAL_EXPOSED');need(state.allPasswordCopyCount===0,'I61_INSURER_UI_ADVISOR_PASSWORD_COPY_EXPOSED');need(state.allCredentialCopyCount===0,'I61_INSURER_UI_ADVISOR_CREDENTIAL_COPY_EXPOSED');advisorRestricted=true;
  }else{
    need(PRIV.has(target),'I61_INSURER_UI_ROLE_CLASS_UNEXPECTED');need(state.providerRegistered,'I61_INSURER_UI_PROVIDER_NOT_REGISTERED');
    for(const row of state.refRows){need(row.card,'I61_INSURER_UI_REF_CARD_MISSING:'+row.index);need(row.reveal,'I61_INSURER_UI_REF_REVEAL_MISSING:'+row.index);need(row.passwordCopy,'I61_INSURER_UI_REF_PASSWORD_COPY_MISSING:'+row.index);need(row.credentialCopy,'I61_INSURER_UI_REF_CREDENTIAL_COPY_MISSING:'+row.index);need(!row.unavailable,'I61_INSURER_UI_REF_MARKED_UNAVAILABLE:'+row.index);}
    for(const index of candidate.refIndexes){await page.locator('#af-portales [data-portal="'+index+'"] [data-od-credential-reveal="'+index+'"]').click();await page.waitForFunction(i=>{const t=(document.querySelector('#af-portales [data-portal="'+i+'"] [data-od-credential-secret]')?.textContent||'').trim();return !!t&&t!=='Oculta';},index,{timeout:CREDENTIAL_WAIT_BOUND_MS});revealResolved++;}
    for(const index of candidate.refIndexes){await clearClipboard(page);await resetClipboardTrace(page);await page.locator('#af-portales [data-portal="'+index+'"] [data-od-password-copy="'+index+'"]').click();const proof=await observePasswordClipboard(page,index);passwordCopyTrace.push(proof);need(proof.handlerOrigin==='password-copy-control','I61_PASSWORD_COPY_HANDLER_NOT_OBSERVED');need(proof.logicalWriteCount>0,'I61_PASSWORD_COPY_WRITER_NOT_OBSERVED');need(proof.final.nonEmpty&&proof.final.matchesVisibleSecret&&!proof.final.hasUsuario&&!proof.final.hasPasswordMarker,'I61_PASSWORD_COPY_NOT_PASSWORD_ONLY');passwordCopyResolved++;}
    for(const index of candidate.refIndexes){await clearClipboard(page);await page.locator('#af-portales [data-portal="'+index+'"] [data-od-credential-copy="'+index+'"]').click();const v=await waitCredentialClipboard(page);need(v.includes('Usuario: ')&&v.includes('\nContraseña: '),'I61_CREDENTIAL_COPY_FORMAT_INVALID');credentialCopyResolved++;}
    await clearClipboard(page);
    await page.waitForFunction(indexes=>indexes.every(i=>(document.querySelector('#af-portales [data-portal="'+i+'"] [data-od-credential-secret]')?.textContent||'').trim()==='Oculta'),candidate.refIndexes,{timeout:9000});rehidden=candidate.refIndexes.length;
  }

  await openInsurer(page,candidates.banks.id);await clickTab(page,'bancos','#af-cuentas');
  const banks=await page.evaluate(()=>({rows:document.querySelectorAll('#af-cuentas [data-cta]').length,cards:document.querySelectorAll('#af-cuentas .od-operational-bank-card[data-cta]').length,numberVisible:[...document.querySelectorAll('#af-cuentas [data-od-bank-number]')].filter(x=>{const t=(x.textContent||'').trim();return t&&!/pendiente/i.test(t);}).length,copyButtons:[...document.querySelectorAll('#af-cuentas [data-od-bank-copy-all]')].filter(x=>!x.disabled).length,stable:Orbit?.__clientInsurerVisualStabilityState?.expectedReady===true}));
  need(banks.rows===candidates.banks.count&&banks.cards===candidates.banks.count,'I61_INSURER_UI_BANK_CARD_COUNT_MISMATCH');
  if(PRIV.has(target)&&candidates.banks.numberBearing>0){need(banks.numberVisible>0,'I61_INSURER_UI_BANK_NUMBER_NOT_VISIBLE');need(banks.copyButtons>0,'I61_INSURER_UI_BANK_COPY_ACTION_MISSING');await clearClipboard(page);await page.locator('#af-cuentas [data-od-bank-copy-all]:not([disabled])').first().click();await waitBankClipboard(page);bankCopyResolved=true;await clearClipboard(page);}
  need(banks.stable,'I61_INSURER_UI_BANK_VIEW_NOT_STABLE');

  const audits=await auditObservation(page);
  if(PRIV.has(target)){
    const revealAudits=audits.filter(x=>x.action==='credential.reveal');const copyAudits=audits.filter(x=>x.action==='credential.copy');
    need(revealAudits.length===candidate.refIndexes.length,'I61_INSURER_UI_REVEAL_AUDIT_COUNT_MISMATCH');need(copyAudits.length===candidate.refIndexes.length*2,'I61_INSURER_UI_COPY_AUDIT_COUNT_MISMATCH');need(revealAudits.every(x=>x.result==='ok'),'I61_INSURER_UI_REVEAL_AUDIT_NOT_OK');need(copyAudits.every(x=>x.result==='ok'),'I61_INSURER_UI_COPY_AUDIT_NOT_OK');
  }else need(audits.filter(x=>/^credential\./.test(x.action)).length===0,'I61_INSURER_UI_ADVISOR_CREDENTIAL_AUDIT_UNEXPECTED');
  const writeAfter=await operationalWriteState(page);const delta=writeDelta(writeBefore,writeAfter);need(delta.pending===0&&delta.committed===0&&delta.failed===0,'I61_INSURER_UI_OPERATIONAL_WRITE_DELTA_NONZERO');
  return {credentialCandidate:{portalCount:candidate.portalCount,refCount:candidate.refIndexes.length,userBearing:candidate.userBearing},state,banks,revealResolvedCount:revealResolved,passwordCopyResolvedCount:passwordCopyResolved,credentialCopyResolvedCount:credentialCopyResolved,rehiddenCount:rehidden,advisorRestricted,bankCopyResolved,clipboardTrace:{installation:clipboardTraceInstallation,passwordCopies:passwordCopyTrace},secureAuditObservation:{credentialRevealCount:audits.filter(x=>x.action==='credential.reveal').length,credentialCopyCount:audits.filter(x=>x.action==='credential.copy').length},operationalWriteProof:{before:writeBefore,after:writeAfter,delta,pass:true}};
}

const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i6-1-insurer-ui');
const auth=getAuth(app),db=getFirestore(app);
const members=await db.collection('tenants').doc(TENANT).collection('members').get(),listed=await auth.listUsers(1000),users=new Map(listed.users.map(u=>[u.uid,u]));
const pool=[];for(const doc of members.docs){const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;const rs=roles(m);pool.push({uid,roles:rs,active:activeRole(m,rs)});}
const selected=new Map();for(const target of TARGETS){const exact=pool.find(x=>x.active===target&&x.roles.includes(target));const fallback=exact||pool.find(x=>x.roles.includes(target));if(fallback)selected.set(target,{...fallback,selectionMode:exact?'persisted-active':'assigned-role'});}
fs.mkdirSync(OUT,{recursive:true});
const ev={schemaVersion:'gravicentra-i6-1-aseguradoras-password-copy-ui-v2-safe-trace',gate:'I6.1',status:'FAIL',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,operationalWritesExecuted:null,userIdentitiesRecorded:false,tokensRecorded:false,secretsRecorded:false,clipboardContentsRecorded:false,roles:{},errors:[]};
let browser;
try{
  need(selected.size===TARGETS.length,'I61_INSURER_UI_REQUIRED_ROLES_UNAVAILABLE');browser=await chromium.launch({headless:true});
  for(const target of TARGETS){const s=selected.get(target),rec={pass:false,selectionMode:s.selectionMode};let context,page;try{const token=await auth.createCustomToken(s.uid,{gravicentraI61ReadOnly:true});context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});page=await context.newPage();page.setDefaultTimeout(12000);const tel=telemetry(page);await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:5000});await activate(page,token);rec.legalGate=await acceptEphemeralLegalGate(page);rec.roleMode=await setRole(page,target);rec.evidence=await probe(page,target);rec.telemetry=checkTelemetry(tel);await page.screenshot({path:path.join(OUT,'aseguradoras-'+target.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()+'.png'),fullPage:true});rec.pass=true;}catch(e){rec.error=String(e?.message||e);if(page)try{rec.clipboardTrace=await page.evaluate(()=>window.__gravicentraI61LastClipboardProof||null);}catch{}ev.errors.push(target+':'+rec.error);}finally{if(context)await context.close().catch(()=>{});}ev.roles[target]=rec;}
  const deltas=TARGETS.map(r=>ev.roles[r]?.evidence?.operationalWriteProof?.delta).filter(Boolean);ev.operationalWritesExecuted=deltas.reduce((n,d)=>n+Math.max(0,Number(d.committed)||0),0);ev.operationalWriteAttemptsObserved=deltas.reduce((n,d)=>n+Math.max(0,Number(d.committed)||0)+Math.max(0,Number(d.failed)||0)+Math.max(0,Number(d.pending)||0),0);ev.status=TARGETS.every(r=>ev.roles[r]?.pass===true)&&ev.operationalWritesExecuted===0&&ev.operationalWriteAttemptsObserved===0?'PASS':'FAIL';if(ev.status!=='PASS')process.exitCode=1;
}catch(e){ev.errors.push(String(e?.message||e));process.exitCode=1;}
finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i6-1-aseguradoras-password-copy-ui.json'),JSON.stringify(ev,null,2)+'\n');console.log('I61_ASEGURADORAS_PASSWORD_COPY_UI='+ev.status);console.log('I61_ROLE_PASS='+Object.entries(ev.roles).filter(([,x])=>x.pass).map(([r])=>r).join(','));console.log('I61_ROLE_FAIL='+Object.entries(ev.roles).filter(([,x])=>!x.pass).map(([r])=>r).join(','));console.log('I61_OPERATIONAL_WRITES='+(ev.operationalWritesExecuted==null?'unproven':ev.operationalWritesExecuted));}

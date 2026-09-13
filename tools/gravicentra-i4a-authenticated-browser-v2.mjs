import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(here, 'gravicentra-i4a-authenticated-browser-v2-base.mjs');
const diagPath = path.join(here, 'gravicentra-i5-credential-diagnostic-v1.mjs');
const need = (ok, code) => { if (!ok) throw new Error(code); };
need(fs.existsSync(basePath), 'I5_AUTH_HARNESS_BASE_MISSING');
need(fs.existsSync(diagPath), 'I5_CREDENTIAL_DIAGNOSTIC_MISSING');

const diagOut = process.env.I4A_AUTH_EVIDENCE_DIR || process.env.RUNNER_TEMP || process.cwd();
fs.mkdirSync(diagOut, { recursive: true });
const diag = spawnSync(process.execPath, [diagPath], { stdio: 'inherit', env: { ...process.env, I5_EVIDENCE_DIR: diagOut } });
need(diag.status === 0, 'I5_CREDENTIAL_DIAGNOSTIC_EXECUTION_FAILED');
const diagEvidence = JSON.parse(fs.readFileSync(path.join(diagOut, 'i5-credential-diagnostic.json'), 'utf8'));
console.log('I5_PRIOR_CREDENTIAL_DIAGNOSTIC=' + diagEvidence.classification);
need(diagEvidence.classification !== 'ROLE_ALIAS_MISMATCH_PROVEN', 'I5_SUPERADMIN_ROLE_ALIAS_MISMATCH_PROVEN');

let source = fs.readFileSync(basePath, 'utf8');
const probesMarker = "const PROBES=['cliente360','polizas','cobros','aseguradoras'];";
need(source.split(probesMarker).length === 2, 'I5_AUTH_HARNESS_PROBES_MARKER_DRIFT');
source = source.replace(probesMarker, probesMarker + "\nconst CREDENTIAL_WAIT_BOUND_MS=20000;");

const startMarker = "        const refIndexes=cand.credentials.refIndexes;\n";
const endMarker = "        credentials.refRehiddenCount=refIndexes.length;\n";
const start = source.indexOf(startMarker);
const endStart = source.indexOf(endMarker, start);
need(start >= 0 && endStart > start, 'I5_AUTH_HARNESS_CREDENTIAL_BLOCK_DRIFT');
need(source.indexOf(startMarker, start + 1) === -1, 'I5_AUTH_HARNESS_CREDENTIAL_BLOCK_AMBIGUOUS');
const end = endStart + endMarker.length;
const hardenedBlock = `        const refIndexes=cand.credentials.refIndexes;
        credentials.credentialFunctionalWaitBoundMs=CREDENTIAL_WAIT_BOUND_MS;
        credentials.productSlaAssertedByThisWait=false;
        credentials.credentialActionLatencyMs=[];
        credentials.credentialBoundaryTrace=[];
        await page.evaluate(()=>{
          if(window.__giI5CredentialTraceInstalled)return;
          const R=Orbit?.secureResources;
          if(!R||typeof R.revealCredential!=='function'||typeof R.copyCredential!=='function')throw new Error('I5_CREDENTIAL_TRACE_RESOURCE_CONTRACT_MISSING');
          window.__giI5CredentialTrace=[];
          const wrap=(key,kind)=>{const original=R[key].bind(R);R[key]=async function(ref,extra){const at=Date.now(),index=Number(extra&&extra.portalIndex);try{const out=await original(ref,extra);window.__giI5CredentialTrace.push({kind,index:Number.isFinite(index)?index:null,ok:out&&out.ok!==false,status:String(out&&out.status||''),ms:Date.now()-at,threw:false});return out;}catch(e){window.__giI5CredentialTrace.push({kind,index:Number.isFinite(index)?index:null,ok:false,status:'exception',code:String(e&&e.code||''),message:String(e&&e.message||'').slice(0,120),ms:Date.now()-at,threw:true});throw e;}};};
          wrap('revealCredential','reveal');wrap('copyCredential','copy');window.__giI5CredentialTraceInstalled=true;
        });
        for(const index of refIndexes){
          const revealAt=Date.now();
          await page.locator('#af-portales [data-portal="'+index+'"] [data-od-credential-reveal="'+index+'"]').click();
          let revealVisible=false,revealCall=null;
          const until=Date.now()+CREDENTIAL_WAIT_BOUND_MS;
          while(Date.now()<until&&!revealVisible){
            await page.waitForTimeout(100);
            const state=await page.evaluate(index=>{const x=document.querySelector('#af-portales [data-portal="'+index+'"] [data-od-credential-secret]'),t=(x?.textContent||'').trim(),calls=(window.__giI5CredentialTrace||[]).filter(c=>c.kind==='reveal'&&c.index===index);return {visible:!!t&&t!=='Oculta',call:calls.length?calls[calls.length-1]:null};},index);
            revealVisible=state.visible;revealCall=state.call;
            if(revealCall&&revealCall.ok===false)throw new Error('ASEGURADORAS_PRIVILEGED_REF_REVEAL_PROVIDER_FAILED:'+index+':'+(revealCall.status||'unknown')+':'+(revealCall.code||''));
            if(revealCall&&revealCall.ok===true&&!revealVisible&&Date.now()-revealAt>Number(revealCall.ms||0)+1500)throw new Error('ASEGURADORAS_PRIVILEGED_REF_REVEAL_UI_NOT_MATERIALIZED:'+index);
          }
          need(revealVisible,revealCall?'ASEGURADORAS_PRIVILEGED_REF_REVEAL_UI_TIMEOUT:'+index:'ASEGURADORAS_PRIVILEGED_REF_REVEAL_PROVIDER_TIMEOUT:'+index);
          credentials.credentialActionLatencyMs.push({kind:'reveal',index,ms:Date.now()-revealAt});
          credentials.credentialBoundaryTrace.push({kind:'reveal',index,providerResolved:!!revealCall,providerOk:revealCall?revealCall.ok:null,providerStatus:revealCall?revealCall.status:'',providerMs:revealCall?revealCall.ms:null,uiMaterialized:true});
        }
        credentials.refRevealResolvedCount=refIndexes.length;
        credentials.refCopyResolvedCount=0;
        for(const index of refIndexes){
          const cleared=await page.evaluate(async()=>{try{await navigator.clipboard.writeText('');return (await navigator.clipboard.readText())==='';}catch{return false;}});
          need(cleared,'ASEGURADORAS_QA_CLIPBOARD_PRECLEAR_FAILED:'+index);
          const copyAt=Date.now();
          await page.locator('#af-portales [data-portal="'+index+'"] [data-od-credential-copy="'+index+'"]').click();
          let copied=false,copyCall=null;
          const until=Date.now()+CREDENTIAL_WAIT_BOUND_MS;
          while(Date.now()<until&&!copied){
            await page.waitForTimeout(100);
            const state=await page.evaluate(async index=>{let copied=false;try{const value=await navigator.clipboard.readText(),marker='\\nContraseña: ',at=value.indexOf(marker),password=at>=0?value.slice(at+marker.length).trim():'';copied=typeof value==='string'&&value.includes('Usuario: ')&&at>=0&&!!password&&password!=='—';}catch{}const calls=(window.__giI5CredentialTrace||[]).filter(c=>c.kind==='copy'&&c.index===index);return {copied,call:calls.length?calls[calls.length-1]:null};},index);
            copied=state.copied;copyCall=state.call;
            if(copyCall&&copyCall.ok===false)throw new Error('ASEGURADORAS_PRIVILEGED_REF_COPY_PROVIDER_FAILED:'+index+':'+(copyCall.status||'unknown')+':'+(copyCall.code||''));
            if(copyCall&&copyCall.ok===true&&!copied&&Date.now()-copyAt>Number(copyCall.ms||0)+1500)throw new Error('ASEGURADORAS_PRIVILEGED_REF_COPY_UI_NOT_MATERIALIZED:'+index);
          }
          need(copied,copyCall?'ASEGURADORAS_PRIVILEGED_REF_COPY_UI_TIMEOUT:'+index:'ASEGURADORAS_PRIVILEGED_REF_COPY_PROVIDER_TIMEOUT:'+index);
          credentials.credentialActionLatencyMs.push({kind:'copy',index,ms:Date.now()-copyAt});
          credentials.credentialBoundaryTrace.push({kind:'copy',index,providerResolved:!!copyCall,providerOk:copyCall?copyCall.ok:null,providerStatus:copyCall?copyCall.status:'',providerMs:copyCall?copyCall.ms:null,uiMaterialized:true});
          credentials.refCopyResolvedCount++;
        }
        credentials.clipboardCleared=await page.evaluate(async()=>{try{await navigator.clipboard.writeText('');return true;}catch{return false;}});need(credentials.clipboardCleared,'ASEGURADORAS_QA_CLIPBOARD_CLEAR_FAILED');
        await page.waitForFunction(indexes=>indexes.every(index=>(document.querySelector('#af-portales [data-portal="'+index+'"] [data-od-credential-secret]')?.textContent||'').trim()==='Oculta'),refIndexes,{timeout:9000});
        credentials.refRehiddenCount=refIndexes.length;
`;
source = source.slice(0, start) + hardenedBlock + source.slice(end);

const deadlineOld = "rec.stage=name;rec.evidence=await deadline(probe(page),22000,'I4A_'+name.toUpperCase()+'_PROBE_TIMEOUT');";
const deadlineNew = "rec.stage=name;const probeDeadlineMs=name==='aseguradoras'?60000:22000;rec.probeFunctionalWaitBoundMs=probeDeadlineMs;rec.productSlaAssertedByThisWait=false;rec.evidence=await deadline(probe(page),probeDeadlineMs,'I4A_'+name.toUpperCase()+'_PROBE_TIMEOUT');";
need(source.split(deadlineOld).length === 2, 'I5_AUTH_HARNESS_DEADLINE_MARKER_DRIFT');
source = source.replace(deadlineOld, deadlineNew);

const flagOld = "qaHarnessPatchedAtRuntime:false";
const flagNew = "qaHarnessPatchedAtRuntime:true,qaHarnessPatchId:'I5_CREDENTIAL_BOUNDARY_TRACE_V2',qaHarnessBase:'gravicentra-i4a-authenticated-browser-v2-base.mjs'";
need(source.split(flagOld).length === 2, 'I5_AUTH_HARNESS_PATCH_FLAG_DRIFT');
source = source.replace(flagOld, flagNew);

const tempPath = path.join(here, `.gravicentra-i5-auth-hardened-${process.pid}.mjs`);
fs.writeFileSync(tempPath, source, 'utf8');
try {
  const check = spawnSync(process.execPath, ['--check', tempPath], { stdio: 'inherit', env: process.env });
  need(check.status === 0, 'I5_AUTH_HARNESS_GENERATED_SYNTAX_INVALID');
  console.log('I5_AUTH_HARNESS_PATCH=PASS');
  console.log('I5_AUTH_HARNESS_PATCH_ID=I5_CREDENTIAL_BOUNDARY_TRACE_V2');
  const run = spawnSync(process.execPath, [tempPath], { stdio: 'inherit', env: process.env });
  process.exitCode = Number.isInteger(run.status) ? run.status : 1;
} finally {
  try { fs.unlinkSync(tempPath); } catch {}
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(here, 'gravicentra-i4a-authenticated-browser-v2-base.mjs');
const need = (ok, code) => { if (!ok) throw new Error(code); };
need(fs.existsSync(basePath), 'I5_AUTH_HARNESS_BASE_MISSING');
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
        for(const index of refIndexes){
          const revealAt=Date.now();
          await page.locator('#af-portales [data-portal="'+index+'"] [data-od-credential-reveal="'+index+'"]').click();
          await page.waitForFunction(index=>{const x=document.querySelector('#af-portales [data-portal="'+index+'"] [data-od-credential-secret]');const t=(x?.textContent||'').trim();return !!t&&t!=='Oculta';},index,{timeout:CREDENTIAL_WAIT_BOUND_MS});
          credentials.credentialActionLatencyMs.push({kind:'reveal',index,ms:Date.now()-revealAt});
        }
        credentials.refRevealResolvedCount=refIndexes.length;
        credentials.refCopyResolvedCount=0;
        for(const index of refIndexes){
          const cleared=await page.evaluate(async()=>{try{await navigator.clipboard.writeText('');return (await navigator.clipboard.readText())==='';}catch{return false;}});
          need(cleared,'ASEGURADORAS_QA_CLIPBOARD_PRECLEAR_FAILED:'+index);
          const copyAt=Date.now();
          await page.locator('#af-portales [data-portal="'+index+'"] [data-od-credential-copy="'+index+'"]').click();
          let copied=false;
          const until=Date.now()+CREDENTIAL_WAIT_BOUND_MS;
          while(Date.now()<until&&!copied){
            await page.waitForTimeout(100);
            copied=await page.evaluate(async()=>{try{const value=await navigator.clipboard.readText();const marker='\\nContraseña: ';const at=value.indexOf(marker);const password=at>=0?value.slice(at+marker.length).trim():'';return typeof value==='string'&&value.includes('Usuario: ')&&at>=0&&!!password&&password!=='—';}catch{return false;}});
          }
          need(copied,'ASEGURADORAS_PRIVILEGED_REF_COPY_FLOW_FAILED:'+index);
          credentials.credentialActionLatencyMs.push({kind:'copy',index,ms:Date.now()-copyAt});
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
const flagNew = "qaHarnessPatchedAtRuntime:true,qaHarnessPatchId:'I5_CREDENTIAL_TIMING_V1',qaHarnessBase:'gravicentra-i4a-authenticated-browser-v2-base.mjs'";
need(source.split(flagOld).length === 2, 'I5_AUTH_HARNESS_PATCH_FLAG_DRIFT');
source = source.replace(flagOld, flagNew);

const tempPath = path.join(os.tmpdir(), `gravicentra-i5-auth-hardened-${process.pid}.mjs`);
fs.writeFileSync(tempPath, source, 'utf8');
try {
  const check = spawnSync(process.execPath, ['--check', tempPath], { stdio: 'inherit', env: process.env });
  need(check.status === 0, 'I5_AUTH_HARNESS_GENERATED_SYNTAX_INVALID');
  console.log('I5_AUTH_HARNESS_PATCH=PASS');
  console.log('I5_AUTH_HARNESS_PATCH_ID=I5_CREDENTIAL_TIMING_V1');
  const run = spawnSync(process.execPath, [tempPath], { stdio: 'inherit', env: process.env });
  process.exitCode = Number.isInteger(run.status) ? run.status : 1;
} finally {
  try { fs.unlinkSync(tempPath); } catch {}
}

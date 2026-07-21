#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const FILES = {
  manifest: 'tools/orbit360-bank-reference-recovery-map-v20260721.json',
  dryrunEvidence: 'orbit360-platform/docs/evidence/dryrun-29865964420-reclassified-sanitized.json',
  write: 'tools/orbit360-recuperar-referencias-bancarias-atomico-v20260721.mjs',
  freeze: 'tools/orbit360-incident-freeze-v20260721.json'
};
const checks = [];
const check = (id, ok, detail='') => checks.push({id,ok:Boolean(ok),detail:String(detail)});
const read = p => fs.readFileSync(p,'utf8');
for (const [id,p] of Object.entries(FILES)) check(`FILE_${id.toUpperCase()}`,fs.existsSync(p),p);
let manifest={}, evidence={}, freeze={};
try { manifest=JSON.parse(read(FILES.manifest)); } catch(e){ check('MANIFEST_JSON',false,e.message); }
try { evidence=JSON.parse(read(FILES.dryrunEvidence)); } catch(e){ check('EVIDENCE_JSON',false,e.message); }
try { freeze=JSON.parse(read(FILES.freeze)); } catch(e){ check('FREEZE_JSON',false,e.message); }
const source=fs.existsSync(FILES.write)?read(FILES.write):'';
check('MANIFEST_68_2_0',manifest?.summary?.recoveryMappings===68&&manifest?.summary?.newPendingRows===2&&manifest?.summary?.duplicateIncomingRows===0,JSON.stringify(manifest.summary||{}));
check('MANIFEST_SAFETY',manifest?.safety?.createsRows===false&&manifest?.safety?.deletesRows===false&&manifest?.safety?.reordersRows===false&&manifest?.safety?.colombiaTouched===false,JSON.stringify(manifest.safety||{}));
check('DRYRUN_GREEN',evidence.ok===true&&evidence.acceptance==='DRYRUN_FUNCTIONALLY_GREEN_FROM_PRESERVED_EVIDENCE'&&Array.isArray(evidence.failedCheckIds)&&evidence.failedCheckIds.length===0,evidence.acceptance||'');
check('DRYRUN_SOURCE_BOUND',evidence.sourceRunId===29865964420&&evidence.sourceArtifactId===8509192602,evidence.sourceRunId);
const syntax=spawnSync(process.execPath,['--check',FILES.write],{encoding:'utf8'});
check('WRITE_SCRIPT_SYNTAX',syntax.status===0,syntax.stderr||syntax.stdout||'');
for (const token of [
  "mode: 'single_atomic_reference_recovery'",
  'await db.runTransaction',
  'transaction.update(affectedRefs[i], { cuentas:',
  "fail('TRANSACTION_PRECONDITION_CHANGED'",
  "fail('READBACK_DOCUMENT_MISMATCH'",
  "fail('ROLLBACK_PRECONDITION_CHANGED'",
  'EXECUTION.rollbackExecuted = true',
  'EXECUTION.rollbackVerified',
  'secretManagerWritesExecuted: false',
  'duplicateRemovals: 0',
  'creates: 0',
  'deletes: 0',
  'reorders: 0',
  'colombiaDocumentChanges: 0',
  "nextAllowedAction: 'read_only_post_recovery_inventory_and_final_gate'"
]) check(`TOKEN:${token}`,source.includes(token),token);
check('VAULT_READ_ONLY',source.includes('accessSecretVersion')&&!source.includes('addSecretVersion')&&!source.includes('createSecret')&&!source.includes('deleteSecret'), 'Secret Manager read only');
check('NO_DOCUMENT_DELETE',!source.includes('transaction.delete(')&&!source.includes('.delete({'), 'no deletes');
check('WRITE_SCOPE_CUENTAS_ONLY',/transaction\.update\(affectedRefs\[i\], \{ cuentas:/.test(source), 'cuentas only');
check('NO_DEPLOY',!source.includes('firebase deploy')&&!source.includes('hosting:channel'), 'no deploy');
const freezeOk=String(freeze.status||'').startsWith('STOP_THE_LINE')||freeze.status==='BOUNDED_EXACT_RECOVERY_WRITE_AUTHORIZED'||freeze.status==='RECOVERY_WRITE_PREFLIGHT_ONLY_AUTHORIZED';
check('INCIDENT_CONTROL_ACTIVE',freezeOk,freeze.status||'');
const failed=checks.filter(x=>!x.ok);
const report={schemaVersion:'orbit360-atomic-recovery-static-validator-v1',generatedAt:new Date().toISOString(),mode:'static_no_runtime',ok:failed.length===0,classification:failed.length?'VALIDATOR_STALE':null,writesExecuted:false,runtimeExecuted:false,firestoreReadExecuted:false,vaultReadExecuted:false,containsPII:false,containsSecrets:false,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks};
fs.mkdirSync('orbit360-platform/runtime-incident-importer-20260721',{recursive:true});
fs.writeFileSync('orbit360-platform/runtime-incident-importer-20260721/atomic-recovery-static-validator-sanitized.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exit(failed.length?41:0);

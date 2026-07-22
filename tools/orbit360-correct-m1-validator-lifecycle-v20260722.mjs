#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repo=process.cwd();
const branch='ays/backend-tenant-lab-v99-20260703';
const scriptRel='tools/orbit360-correct-m1-validator-lifecycle-v20260722.mjs';
const workflowRel='.github/workflows/orbit360-correct-m1-validator-lifecycle-v20260722.yml';
const files={
  validator:'orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js',
  architecture:'orbit360-platform/tools/orbit360-block0-architecture-gate-v20260717.js',
  overlay:'tools/orbit360-gate-contract-overlay-v20260718.json',
  academy:'orbit360-platform/data/academia-v1221-m1-visual-integrity.js',
  manifest:'tools/orbit360-critical-runtime-integrity-manifest-v20260721.json',
  freeze:'tools/orbit360-incident-freeze-v20260721.json',
  doc:'orbit360-platform/docs/BLOQUE1-CAUSA-RAIZ-VALIDATOR-LIFECYCLE-PREFLIGHT-20260722.md',
  evidence:'orbit360-platform/docs/evidence/m1-validator-lifecycle-correction-1-0-38-20260722-sanitized.json'
};
const baseBlobs={
  [files.validator]:'d1970bc9b16d6897ceef5605ca3a790c07add19b',
  [files.architecture]:'a06bf0ccdcb6c1438665294bd9c6d3522402fd44',
  [files.overlay]:'528a81dc9fb68b2f3b2372b41a9ba73e3a84ff13',
  [files.academy]:'e0b604543b4b3927b7ba8ba3d8523de839d53910',
  [files.manifest]:'5261770de538a29964d05985dce1be903fba5f3b'
};
const allowedFinal=new Set(Object.values(files));
function run(args,capture=false){return execFileSync(args[0],args.slice(1),{cwd:repo,encoding:'utf8',stdio:capture?'pipe':'inherit'});}
function fail(msg){console.error(msg);process.exit(1);}
function read(rel){return fs.readFileSync(path.join(repo,rel),'utf8');}
function write(rel,text){fs.mkdirSync(path.dirname(path.join(repo,rel)),{recursive:true});fs.writeFileSync(path.join(repo,rel),text,'utf8');}
function replaceOnce(text,from,to,label){const count=text.split(from).length-1;if(count!==1)fail(`REPLACE_COUNT:${label}:${count}`);return text.replace(from,to);}
function replaceCount(text,from,to,expected,label){const count=text.split(from).length-1;if(count!==expected)fail(`REPLACE_COUNT:${label}:${count}:${expected}`);return text.split(from).join(to);}

if(run(['git','branch','--show-current'],true).trim()!==branch)fail('BRANCH_MISMATCH');
const freezeBefore=JSON.parse(read(files.freeze));
if(freezeBefore.status!=='STOP_THE_LINE_STATIC_PREFLIGHT_1_0_37_VALIDATOR_STALE')fail('FREEZE_STATUS_MISMATCH');
if(!freezeBefore.classification.includes('VALIDATOR_STALE'))fail('VALIDATOR_STALE_CLASSIFICATION_MISSING');
for(const [rel,expected] of Object.entries(baseBlobs)){
  const actual=run(['git','hash-object',rel],true).trim();
  if(actual!==expected)fail(`BASE_BLOB_MISMATCH:${rel}:${actual}:${expected}`);
}

let validator=read(files.validator);
const oldLifecycle=`check('FREEZE_STOP_THE_LINE', String(freeze.status || '').startsWith('STOP_THE_LINE'), freeze.status || 'missing');
check('FREEZE_FUNCTIONAL_DEFECT', Array.isArray(freeze.classification) && freeze.classification.includes('FUNCTIONAL_DEFECT'), JSON.stringify(freeze.classification || []));
check('FREEZE_BLOCKS_GATE', Array.isArray(freeze.blockedGateIds) && freeze.blockedGateIds.includes('block1-client360-insurers-lab-v20260717'), JSON.stringify(freeze.blockedGateIds || []));
check('FREEZE_NO_RUNTIME', freeze.allowedActions && freeze.allowedActions.includes('static_visual_owner_remediation_only') && freeze.blockedActions && freeze.blockedActions.includes('run_second_final_gate'), 'freeze scope');
check('AUTHORIZATION_CONSUMED', authorization.allowedExecutions === 0 && authorization.runtimeAllowed === false && authorization.deployAllowed === false, JSON.stringify({allowedExecutions:authorization.allowedExecutions,runtimeAllowed:authorization.runtimeAllowed,deployAllowed:authorization.deployAllowed}));
check('OVERLAY_1037', overlay.gatePatch && overlay.gatePatch.contractVersion === '1.0.37' && String(overlay.contractRevision || '').startsWith('1.0.37'), overlay.contractRevision || 'missing');
check('OVERLAY_FUNCTIONAL_DEFECT', overlay.classification === 'FUNCTIONAL_DEFECT', overlay.classification || 'missing');
check('MANIFEST_1037', manifest.contractVersion === '1.0.37', manifest.contractVersion || 'missing');`;
const newLifecycle=`const blockedActions = Array.isArray(freeze.blockedActions) ? freeze.blockedActions : [];
const activeStaticAuthorization = authorization.active === true && authorization.consumed === false && authorization.allowedExecutions === 1 && authorization.action === 'final_block1_static_preflight_1_0_38_only' && authorization.expectedContractVersion === '1.0.38';
const consumedStaticAuthorization = authorization.active === false && authorization.consumed === true && authorization.allowedExecutions === 0 && ['1.0.37','1.0.38'].includes(authorization.expectedContractVersion);
const authorizationIsStaticOnly = authorization.runtimeAllowed === false && authorization.browserAllowed === false && authorization.firestoreReadAllowed === false && authorization.vaultReadAllowed === false && authorization.secretsAllowed === false && authorization.writesAllowed === false && authorization.deployAllowed === false && authorization.functionsDeployAllowed === false && authorization.rulesDeployAllowed === false && authorization.productionAllowed === false;
check('FREEZE_M1_OPEN', freeze.stateClarification && freeze.stateClarification.m1Closed === false, JSON.stringify(freeze.stateClarification || {}));
check('FREEZE_FUNCTIONAL_DEFECT_PRESERVED', Array.isArray(freeze.classification) && freeze.classification.includes('FUNCTIONAL_DEFECT'), JSON.stringify(freeze.classification || []));
check('FREEZE_BLOCKS_FINAL_GATE_RERUN', Array.isArray(freeze.blockedGateIds) && freeze.blockedGateIds.includes('block1-client360-insurers-lab-v20260717') && blockedActions.includes('run_second_final_gate'), JSON.stringify(freeze.blockedGateIds || []));
check('FREEZE_NO_RUNTIME_BROWSER_DEPLOY', blockedActions.includes('run_runtime') && blockedActions.includes('open_browser') && blockedActions.includes('deploy_hosting_lab') && freeze.stateClarification && freeze.stateClarification.runtimeAuthorized === false && freeze.stateClarification.deployAuthorized === false, freeze.status || 'missing');
check('AUTHORIZATION_STATIC_LIFECYCLE', authorizationIsStaticOnly && (activeStaticAuthorization || consumedStaticAuthorization), JSON.stringify({active:authorization.active,consumed:authorization.consumed,allowedExecutions:authorization.allowedExecutions,action:authorization.action,expectedContractVersion:authorization.expectedContractVersion}));
check('OVERLAY_1038', overlay.gatePatch && overlay.gatePatch.contractVersion === '1.0.38' && String(overlay.contractRevision || '').startsWith('1.0.38'), overlay.contractRevision || 'missing');
check('OVERLAY_VALIDATOR_STALE', overlay.classification === 'VALIDATOR_STALE', overlay.classification || 'missing');
check('MANIFEST_1038', manifest.contractVersion === '1.0.38', manifest.contractVersion || 'missing');`;
validator=replaceOnce(validator,oldLifecycle,newLifecycle,'validator-lifecycle-block');
validator=replaceOnce(validator,"contractVersion: '1.0.37'","contractVersion: '1.0.38'",'validator-contract-version');
validator=replaceOnce(validator,"revision: '20260722.1',","revision: '20260722.1',\n  validatorLifecycleRevision: 'phase-aware-static-authorization-v1',",'validator-lifecycle-revision');
write(files.validator,validator);

let architecture=read(files.architecture);
architecture=replaceOnce(architecture,"check('M1_VISUAL_REMEDIATION_CONTRACT_1037', visualRemediation.contractVersion === '1.0.37', visualRemediation.contractVersion || 'missing');","check('M1_VISUAL_REMEDIATION_CONTRACT_1038', visualRemediation.contractVersion === '1.0.38', visualRemediation.contractVersion || 'missing');",'architecture-contract');
write(files.architecture,architecture);

let overlay=read(files.overlay);
overlay=replaceCount(overlay,'"classification": "FUNCTIONAL_DEFECT"','"classification": "VALIDATOR_STALE"',2,'overlay-classification');
overlay=replaceCount(overlay,'"diagnosticRevision": "visual-review-semantic-responsive-remediation-v1"','"diagnosticRevision": "validator-lifecycle-phase-aware-v1"',2,'overlay-diagnostic');
overlay=replaceOnce(overlay,'"contractRevision": "1.0.37-visual-review-semantic-responsive-remediation-v1"','"contractRevision": "1.0.38-validator-lifecycle-phase-aware-v1"','overlay-revision');
overlay=replaceOnce(overlay,'"contractVersion": "1.0.37"','"contractVersion": "1.0.38"','overlay-gate-version');
overlay=replaceOnce(overlay,'"status": "STOP_LINE_VISUAL_REMEDIATION_STATIC_ONLY"','"status": "STOP_LINE_VALIDATOR_LIFECYCLE_STATIC_ONLY"','overlay-status');
overlay=replaceOnce(overlay,'"diagnosticRule": "The technical gate remains historical PASS, but the single human visual review failed on visible semantics and responsive containment. Correct only the canonical visual owner, its style owner, validator and Academy. No data, vault, importer, Auth, Store, Rules, Functions or production changes are allowed."','"diagnosticRule": "The visual product remediation is preserved. The binding preflight failed because the dedicated validator required post-consumption lifecycle states while a valid one-use static authorization was active. Correct only validator lifecycle semantics, dependent architecture assertions, overlay, manifest, documentation and Academy."','overlay-rule');
overlay=replaceOnce(overlay,'"acceptancePolicy": "Static remediation may be accepted only when the dedicated contract returns PASS with zero writes, runtime, browser and deploy. A later official preflight and any Hosting LAB deployment require separate one-use authorization; the final gate is not rerun."','"acceptancePolicy": "Validator lifecycle correction is accepted only when the dedicated contract returns PASS 29/29 and architecture returns GO_STATIC_ARCHITECTURE 35/35 with zero writes, runtime, browser and deploy. The binding preflight may then run once under a new static-only authorization; the final gate is not rerun."','overlay-policy');
overlay=replaceOnce(overlay,'"baselineOverlayContract": "1.0.36-active-role-scope-ceiling-v1"','"baselineOverlayContract": "1.0.37-visual-review-semantic-responsive-remediation-v1"','overlay-baseline');
overlay=replaceOnce(overlay,'"visualRemediationRevision": "20260722.1",','"visualRemediationRevision": "20260722.1",\n    "validatorLifecycleRevision": "phase-aware-static-authorization-v1",','overlay-lifecycle-field');
overlay=replaceOnce(overlay,'"contentVersion:\'1.227\'"','"contentVersion:\'1.228\'"','overlay-academy-version');
overlay=replaceOnce(overlay,'"_m1visualv:1227"','"_m1visualv:1228"','overlay-academy-marker');
overlay=replaceOnce(overlay,'"visualSemanticsRemediation:true"','"validatorLifecyclePhaseAware:true"','overlay-academy-capability');
overlay=replaceOnce(overlay,'"1.0.37",\n        "routerTenantBootstrap"','"1.0.38",\n        "routerTenantBootstrap"','overlay-manifest-token');
overlay=replaceOnce(overlay,'"contractVersion: \'1.0.37\'",\n        "FREEZE_STOP_THE_LINE",','"contractVersion: \'1.0.38\'",\n        "FREEZE_M1_OPEN",\n        "AUTHORIZATION_STATIC_LIFECYCLE",','overlay-validator-tokens');
overlay=replaceOnce(overlay,'"M1_VISUAL_REMEDIATION_CONTRACT_1037"','"M1_VISUAL_REMEDIATION_CONTRACT_1038"','overlay-architecture-token');
overlay=replaceOnce(overlay,'"orbit360-platform/docs/BLOQUE1-FUNCTIONAL-DEFECT-REVISION-VISUAL-20260722.md"','"orbit360-platform/docs/BLOQUE1-FUNCTIONAL-DEFECT-REVISION-VISUAL-20260722.md",\n    "orbit360-platform/docs/BLOQUE1-CAUSA-RAIZ-VALIDATOR-LIFECYCLE-PREFLIGHT-20260722.md"','overlay-doc');
write(files.overlay,overlay);

let academy=read(files.academy);
academy=replaceCount(academy,'contenido M1 1.227','contenido M1 1.228',1,'academy-comment');
academy=replaceCount(academy,"contentVersion==='1.227'","contentVersion==='1.228'",1,'academy-guard');
academy=replaceCount(academy,'_m1visualv:1227','_m1visualv:1228',2,'academy-lesson-markers');
academy=replaceOnce(academy,"sec('🧪','Defecto y validador','FUNCTIONAL_DEFECT describe una falla del producto; VALIDATOR_STALE describe una prueba que no cubre la experiencia real. Un check verde no reemplaza la conducta visible y verificable.'),","sec('🧪','Defecto y validador','FUNCTIONAL_DEFECT describe una falla del producto; VALIDATOR_STALE describe una prueba que no cubre la experiencia real. Un check verde no reemplaza la conducta visible y verificable.'),\n    sec('🔄','Ciclo de vida de una autorización estática','Durante un preflight de un solo uso, la autorización debe estar activa y aún no consumida. Solo al terminar pasa a consumida. Un validador no puede exigir simultáneamente ambos estados; debe aceptar la fase autorizada o la fase consumida sin habilitar runtime, navegador ni deploy.'),",'academy-section');
academy=replaceOnce(academy,"{p:'Un preflight local verde demuestra que el navegador recibió el fix…',ops:['Sí, siempre','No; los activos críticos desplegados deben coincidir en bytes y SHA-256','Solo si cambió el comentario del archivo'],ok:1},","{p:'Un preflight local verde demuestra que el navegador recibió el fix…',ops:['Sí, siempre','No; los activos críticos desplegados deben coincidir en bytes y SHA-256','Solo si cambió el comentario del archivo'],ok:1},\n    {p:'Durante un preflight estático autorizado de un solo uso, la autorización debe estar…',ops:['Activa y no consumida hasta finalizar','Consumida antes de iniciar','Con runtime y navegador habilitados'],ok:0},",'academy-quiz');
academy=replaceOnce(academy,'&&x._m1visualv!==1227;','&&x._m1visualv!==1227&&x._m1visualv!==1228;','academy-filter');
academy=replaceOnce(academy,'Math.max(+next._cv||0,1227)','Math.max(+next._cv||0,1228)','academy-cv');
academy=replaceCount(academy,"contentVersion:'1.227'","contentVersion:'1.228'",1,'academy-final-version');
academy=replaceOnce(academy,'visualSemanticsRemediation:true,apply:apply','visualSemanticsRemediation:true,validatorLifecyclePhaseAware:true,apply:apply','academy-capability');
write(files.academy,academy);

let manifest=read(files.manifest);
manifest=replaceOnce(manifest,'"contractVersion": "1.0.37"','"contractVersion": "1.0.38"','manifest-version');
write(files.manifest,manifest);

const doc=`# Bloque 1 — Causa raíz del preflight 1.0.37: ciclo de vida del validador\n\nFecha: 2026-07-22  \nRepositorio: \`paulaosoriof86/orbit360-core\`  \nRama: \`ays/backend-tenant-lab-v99-20260703\`  \nPR: #5 draft/open  \nGate: \`block1-client360-insurers-lab-v20260717\`\n\n## Clasificación\n\n\`VALIDATOR_STALE\`\n\nEl preflight central del contrato 1.0.37 sí cerró \`GO_GATE_CONTRACT\` con 1314/1314 checks. El fallo posterior no provenía del owner visual, los datos, la bóveda, el entorno ni el pipeline.\n\n## Primer check real fallido\n\n\`FREEZE_STOP_THE_LINE\`\n\nEl validador visual exigía que el freeze permaneciera en el estado anterior a la remediación y, simultáneamente, que la autorización ya estuviera consumida. Durante un preflight válido de un solo uso, la autorización debe estar activa y no consumida hasta finalizar.\n\nLos otros dos checks fallidos fueron \`FREEZE_NO_RUNTIME\` y \`AUTHORIZATION_CONSUMED\`. Los dos fallos de arquitectura fueron propagación directa: \`M1_VISUAL_REMEDIATION_CONTRACT_EXECUTES\` y \`M1_VISUAL_REMEDIATION_CONTRACT_PASS\`.\n\n## Corrección\n\nEl contrato 1.0.38 hace el validador consciente del ciclo de vida. Acepta una autorización estática activa de un solo uso o su estado consumido posterior, pero en ambos casos exige secretos, Firestore, escrituras, runtime, navegador, Functions, Rules, producción y deploy en falso. También exige que M1 siga abierto y que la reejecución del gate final permanezca bloqueada.\n\n## Alcance preservado\n\nNo se modifican el owner visual, estilos, datos, credenciales, cuentas, Auth, Orbit.store, importadores, Firebase, Functions, Rules ni producción. Se mantienen 414 clientes, 26 aseguradoras, 7 asesores, 91 referencias bancarias válidas y 26/26 credenciales.\n\n## Claude / prototipo\n\nClasificación: \`REPLICABLE_CLAUDE_ACUMULADO\`. Patrón reusable: los validadores deben distinguir fase autorizada y fase consumida sin relajar permisos.\n\n## Academia\n\nContenido 1.228: diferencia entre autorización estática activa y consumida, y prohibición de habilitar runtime o deploy para satisfacer el validador.\n\n## Siguiente acción\n\nAceptar la corrección solo con contrato visual 29/29 y arquitectura 35/35. Después crear una nueva autorización de un solo uso para repetir únicamente el preflight vinculante bajo contrato 1.0.38. No repetir el gate final.\n`;
write(files.doc,doc);

for(const rel of [files.validator,files.architecture,files.academy])run(['node','--check',rel]);
const visual=JSON.parse(run(['node',files.validator],true));
if(visual.status!=='PASS'||visual.contractVersion!=='1.0.38'||visual.passed!==29||visual.failed!==0)fail('VISUAL_VALIDATOR_NOT_PASS');
const arch=JSON.parse(run(['node',files.architecture],true));
if(arch.status!=='GO_STATIC_ARCHITECTURE'||arch.passed!==35||arch.failed!==0)fail('ARCHITECTURE_NOT_PASS');

const evidence={schemaVersion:'orbit360-m1-validator-lifecycle-correction-proof-v1',issuedAt:new Date().toISOString(),repository:'paulaosoriof86/orbit360-core',branch,gateId:'block1-client360-insurers-lab-v20260717',classification:'VALIDATOR_STALE',contractVersion:'1.0.38',validatorLifecycleRevision:'phase-aware-static-authorization-v1',status:'PASS',visualContract:{status:visual.status,total:visual.total,passed:visual.passed,failed:visual.failed},architecture:{status:arch.status,total:arch.total,passed:arch.passed,failed:arch.failed},productOwnerChanged:false,execution:{operationalWrites:0,firestoreReads:0,firestoreWrites:0,secretsRead:false,vaultRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,functionsDeployed:false,rulesDeployed:false,productionTouched:false,mainTouched:false,mergeExecuted:false},containsPII:false,containsSecrets:false};
write(files.evidence,JSON.stringify(evidence,null,2)+'\n');
const freeze=JSON.parse(read(files.freeze));
freeze.schemaVersion='orbit360-incident-freeze-v58-validator-lifecycle-correction-passed-preflight-1-0-38-pending';
freeze.updatedAt='2026-07-22';
freeze.status='VALIDATOR_LIFECYCLE_CORRECTION_PASSED_SINGLE_USE_PREFLIGHT_1_0_38_PENDING';
freeze.validatorLifecycleCorrection={status:'PASS',classification:'VALIDATOR_STALE',contractVersion:'1.0.38',revision:'phase-aware-static-authorization-v1',path:files.evidence,visualChecksPassed:29,visualChecksFailed:0,architectureChecksPassed:35,architectureChecksFailed:0,productOwnerChanged:false,writesExecuted:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false};
freeze.allowedActions=['prepare_single_use_static_preflight_authorization_1_0_38','run_single_use_static_preflight_1_0_38_after_authorization'];
freeze.blockedActions=(freeze.blockedActions||[]).filter(x=>x!=='rerun_static_preflight_before_validator_correction'&&x!=='modify_visual_product_owner');
for(const x of ['run_static_preflight_without_single_use_authorization','modify_visual_product_owner','run_second_final_gate','run_runtime','open_browser','deploy_hosting_lab'])if(!freeze.blockedActions.includes(x))freeze.blockedActions.push(x);
freeze.validatorCorrectionBoundary=Object.assign({},freeze.validatorCorrectionBoundary,{nextContractVersion:'1.0.38',status:'PASS',productOwnersFrozen:true});
freeze.stateClarification=Object.assign({},freeze.stateClarification,{m1BindingPreflight:'FAILED_VALIDATOR_STALE_CORRECTED',m1ValidatorLifecycleCorrection:'PASS',m1NextBindingPreflight:'PENDING_SINGLE_USE_AUTHORIZATION_1_0_38',m1Closed:false,gateRerunAuthorized:false,runtimeAuthorized:false,deployAuthorized:false,productionTouched:false,reimportRequired:false});
freeze.nextAllowedStep='Create and consume one separate single-use authorization for the binding static preflight under contract 1.0.38. Allow no secrets, Firestore, writes, runtime, browser or deploy. Do not rerun the final gate.';
write(files.freeze,JSON.stringify(freeze,null,2)+'\n');

fs.rmSync(path.join(repo,scriptRel),{force:true});
fs.rmSync(path.join(repo,workflowRel),{force:true});
run(['git','add','-A']);
const staged=run(['git','diff','--cached','--name-only'],true).trim().split(/\r?\n/).filter(Boolean);
for(const rel of staged){const temp=rel===scriptRel||rel===workflowRel;if(!temp&&!allowedFinal.has(rel))fail(`UNEXPECTED_STAGED_PATH:${rel}`);}
for(const rel of allowedFinal)if(!staged.includes(rel))fail(`EXPECTED_PATH_NOT_STAGED:${rel}`);
run(['git','config','user.name','github-actions[bot]']);
run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
run(['git','commit','-m','fix(m1): hacer phase-aware el validador estático 1.0.38']);
run(['git','push','origin',`HEAD:${branch}`]);
console.log(JSON.stringify({status:'PASS',classification:'VALIDATOR_STALE',contractVersion:'1.0.38',visualChecks:'29/29',architectureChecks:'35/35',productOwnerChanged:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,temporaryArtifactsRetired:true,commit:run(['git','rev-parse','HEAD'],true).trim()},null,2));

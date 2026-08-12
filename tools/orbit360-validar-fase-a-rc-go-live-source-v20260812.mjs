import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const rel = (...parts) => path.join(ROOT, ...parts);
const contractPath = rel('tools', 'orbit360-fase-a-rc-go-live-contract-v20260812.json');
const manifestPath = rel('tools', 'orbit360-fase-a-rc-manifest-v20260812.json');
const continuityPath = rel('orbit360-platform', 'docs', 'ORBIT360-GO-LIVE-DATA-CONTINUITY-20260812.md');
const runtimeEvidencePath = rel('orbit360-platform', 'runtime-gate-crm-v20260716', 'fase-a-ops-leads-crm-runtime-v3-failure-sanitized-v20260812.json');
const workflowPath = rel('.github', 'workflows', 'orbit360-fase-a-rc-go-live-source-v20260812.yml');
const requestPath = rel('.github', 'orbit360-requests', 'fase-a-go-live-production-20260812-authorization.json');
const outputPath = rel('orbit360-platform', 'runtime-gate-crm-v20260716', 'fase-a-rc-go-live-source-sanitized-v20260812.json');

const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

for (const p of [contractPath, manifestPath, continuityPath, runtimeEvidencePath, workflowPath]) {
  add(`file:${path.relative(ROOT, p)}`, fs.existsSync(p));
}

let contract = {};
let manifest = {};
let evidence = {};
let continuity = '';
let workflow = '';
try { contract = readJson(contractPath); } catch (error) { add('contract_json', false, error.message); }
try { manifest = readJson(manifestPath); } catch (error) { add('manifest_json', false, error.message); }
try { evidence = readJson(runtimeEvidencePath); } catch (error) { add('runtime_evidence_json', false, error.message); }
try { continuity = fs.readFileSync(continuityPath, 'utf8'); } catch (error) { add('continuity_read', false, error.message); }
try { workflow = fs.readFileSync(workflowPath, 'utf8'); } catch (error) { add('workflow_read', false, error.message); }

add('branch_contract', contract.branch === 'ays/backend-tenant-lab-v99-20260703');
if (process.env.GITHUB_REF_NAME) add('branch_runtime', process.env.GITHUB_REF_NAME === contract.branch, process.env.GITHUB_REF_NAME);
add('source_head_contract', contract.sourceHead === '0bf2b98210fea72ee888efee7c6e6348b6efc72e');
add('fase_a_100', contract?.faseA?.functionalReadinessPercent === 100 && contract?.faseA?.status === 'CLOSED');
add('manifest_fase_a_100', manifest?.faseA?.functionalReadinessPercent === 100 && manifest?.faseA?.status === 'CLOSED');
add('runtime_routes_9_of_9', evidence.routeChecksTotal === 9 && evidence.routeChecksPassed === 9 && evidence.routeChecksFailed === 0);
add('runtime_reclassified_validator_stale', evidence.ok === true && evidence.reclassifiedAs === 'VALIDATOR_STALE');
add('runtime_snapshot_unchanged', evidence.snapshotIntegrity === 'VERIFIED_UNCHANGED');
add('runtime_zero_writes', evidence.firestoreWrites === 0 && evidence.authWrites === 0 && evidence.operationalWrites === 0);
add('runtime_no_prod_or_deploy', evidence.productionTouched === false && evidence.deploys === 0);
add('request_absent', !fs.existsSync(requestPath), path.relative(ROOT, requestPath));
add('source_only_prod_not_touched', contract?.production?.status === 'NOT_TOUCHED');
add('source_only_deploy_forbidden', contract?.production?.deployAllowedDuringSourcePreparation === false);
add('source_only_secrets_forbidden', contract?.production?.secretsAllowedDuringSourcePreparation === false);
add('source_only_writes_forbidden', contract?.production?.writesAllowedDuringSourcePreparation === false);
add('backup_before_mutation', contract?.backupRollback?.requiredBeforeAnyProductionMutation === true && contract?.backupRollback?.blockDeployIfUnproven === true);
add('hosting_checkpoint_before_deploy', contract?.backupRollback?.hostingReleaseCheckpointRequiredBeforeDeploy === true);
add('crm_delta_required', contract?.dataContinuity?.preGoLiveOperationalDeltaRequired === true && contract?.dataContinuity?.fullReloadAfterGoLive === false);
add('prod_system_of_record', contract?.dataContinuity?.productionBecomesSystemOfRecordAfterGoLive === true);
add('new_external_sources_outside_deploy', contract?.dataContinuity?.newExternalSourcesDuringSameDeploy === false);
add('bank_never_direct_cobros', contract?.newSourcePolicy?.estado_cuenta_bancario === 'STAGING_AND_RECONCILIATION_ONLY_NEVER_DIRECT_COBROS_WRITE');
add('modules_preserve_data', contract?.moduleEvolution?.preserveProductionData === true && contract?.moduleEvolution?.noDatabaseReseedOnCodeDeploy === true);

for (const token of [
  'producción es el sistema operativo de registro',
  'no se hace una recarga completa',
  'planilla_comisiones',
  'estado_cuenta_bancario',
  'nunca escribe directamente `cobros_realizados`',
  'expand -> backfill compatible',
  'Feature flags/configuración por tenant',
  'STOP_RETRY'
]) add(`continuity:${token}`, continuity.includes(token));

add('workflow_readonly_permissions', workflow.includes('permissions:\n  contents: read'));
add('workflow_no_secrets', !workflow.includes('secrets.'));
add('workflow_no_firebase_deploy', !/firebase\s+(deploy|hosting:channel:deploy)|gcloud\s+.*deploy/i.test(workflow));
add('workflow_no_production_request_creation', !workflow.includes('fase-a-go-live-production-20260812-authorization.json'));

const failed = checks.filter((c) => !c.ok);
const report = {
  schemaVersion: 'orbit360-fase-a-rc-go-live-source-sanitized-v1',
  status: failed.length === 0 ? 'PASS_FASE_A_RC_GO_LIVE_SOURCE_PACKAGE_READY' : 'FAIL_FASE_A_RC_GO_LIVE_SOURCE_PACKAGE',
  classification: failed.length === 0 ? 'RELEASE_PACKAGE_SOURCE_READY' : 'PIPELINE_MECHANISM_FAILURE',
  releaseId: contract.releaseId || null,
  sourceHead: process.env.GITHUB_SHA || contract.sourceHead || null,
  faseAFunctionalReadinessPercent: contract?.faseA?.functionalReadinessPercent ?? null,
  authenticatedRouteChecksPassed: evidence.routeChecksPassed ?? null,
  snapshotIntegrity: evidence.snapshotIntegrity ?? null,
  requestAbsent: !fs.existsSync(requestPath),
  productionTouched: false,
  secretsAccessed: false,
  firebaseAccessed: false,
  browserExecuted: false,
  deploys: 0,
  writes: 0,
  crmCutoverMode: 'INCREMENTAL_DELTA_DRY_RUN_DIFF',
  newExternalSourcesIncludedInDeploy: false,
  productionBecomesSystemOfRecordAfterGoLive: contract?.dataContinuity?.productionBecomesSystemOfRecordAfterGoLive === true,
  nextAction: failed.length === 0 ? 'EXPLICIT_SINGLE_PRODUCTION_AUTHORIZATION_THEN_CANONICAL_PREFLIGHT_BACKUP_DELTA_DEPLOY_SMOKE' : 'STOP_FIX_SOURCE_PACKAGE_BEFORE_PRODUCTION',
  checksTotal: checks.length,
  checksFailed: failed.length,
  failedChecks: failed,
  ok: failed.length === 0
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

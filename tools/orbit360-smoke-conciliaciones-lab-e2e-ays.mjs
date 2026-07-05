#!/usr/bin/env node
/* Orbit 360 · A&S conciliaciones LAB E2E smoke
   Synthetic-only. No real data. No Firestore writes. No payment application.

   Flow:
   synthetic proposals -> persistence plan -> dry-run executor -> local mirror executor
   -> transition validator -> adapter validator/readiness -> report

   Usage:
     node tools/orbit360-smoke-conciliaciones-lab-e2e-ays.mjs
     node tools/orbit360-smoke-conciliaciones-lab-e2e-ays.mjs --strict-adapter
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-conciliaciones-lab-e2e-smoke';
const TENANT = 'alianzas-soluciones';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const TMP_DIR = path.join(root, '_orbit360_tmp', 'smoke-conciliaciones-lab-e2e');
const STRICT_ADAPTER = args.includes('--strict-adapter');

const tools = {
  plan: 'tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs',
  executor: 'tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs',
  transition: 'tools/orbit360-validar-transicion-conciliacion-ays.mjs',
  adapter: 'tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs'
};

function writeJson(file, data){ fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function rel(file){ return path.relative(root, file).replace(/\\/g, '/'); }
function runStep(name, commandArgs, expectZero = true){
  const startedAt = new Date().toISOString();
  const res = spawnSync(process.execPath, commandArgs, { cwd: root, encoding: 'utf8' });
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  const ok = expectZero ? res.status === 0 : true;
  const step = { name, command: ['node', ...commandArgs].join(' '), exitCode: res.status, ok, startedAt, endedAt: new Date().toISOString(), stdout_tail: stdout.slice(-2000), stderr_tail: stderr.slice(-2000) };
  return step;
}
function failStep(name, message){ return { name, command: '', exitCode: 1, ok: false, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), stdout_tail: '', stderr_tail: message }; }

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const errors=[]; const warnings=[]; const steps=[];
for(const [name, relPath] of Object.entries(tools)){
  if(!fs.existsSync(path.join(root, relPath))) errors.push(`Falta herramienta ${name}: ${relPath}`);
}

const proposalsPath = path.join(TMP_DIR, 'propuestas-sinteticas-conciliaciones.json');
const planPath = path.join(TMP_DIR, 'plan-persistencia-conciliaciones.json');
const mirrorPath = path.join(TMP_DIR, 'lab-mirror-conciliaciones.json');
const transitionPath = path.join(TMP_DIR, 'transicion-conciliacion.json');

if(!errors.length){
  const proposals = {
    source_type: 'planilla_comisiones',
    dryrun_id: 'dryrun_smoke_conciliaciones_lab_e2e',
    tenant_id: TENANT,
    proposals: [
      {
        id: 'conc_smoke_001',
        proposal_id: 'conc_smoke_001',
        tenant_id: TENANT,
        source_type: 'planilla_comisiones',
        manifest_id: 'manifest_smoke_conciliaciones',
        dryrun_id: 'dryrun_smoke_conciliaciones_lab_e2e',
        source_ref: { file: 'SMOKE-SINTETICO-NO-REAL.xlsx', sheet: 'Planilla', row_ref: 'row-001' },
        country: 'GT',
        currency: 'GTQ',
        score: 96,
        score_decision: 'MATCH_EXACTO',
        proposed_action: 'PROPONER_APLICACION_CON_CONFIRMACION',
        queue_state: 'PROPUESTA',
        review_state: 'PENDIENTE',
        links: { cobro_id: 'cobro_sintetico_001', poliza_id: 'poliza_sintetica_001', comision_id: 'comision_sintetica_001' },
        origin_candidate_state: 'MATCH_EXACTO_SMOKE'
      },
      {
        id: 'conc_smoke_002',
        proposal_id: 'conc_smoke_002',
        tenant_id: TENANT,
        source_type: 'estado_cuenta_bancario',
        manifest_id: 'manifest_smoke_conciliaciones',
        dryrun_id: 'dryrun_smoke_conciliaciones_lab_e2e',
        source_ref: { file: 'SMOKE-BANCO-SINTETICO-NO-REAL.xlsx', sheet: 'Banco', row_ref: 'row-002' },
        country: 'CO',
        currency: 'COP',
        score: 74,
        score_decision: 'MATCH_PROBABLE',
        proposed_action: 'ENVIAR_A_BANDEJA_VALIDACION',
        queue_state: 'PROPUESTA',
        review_state: 'PENDIENTE',
        links: { cobro_id: 'cobro_sintetico_002', poliza_id: 'poliza_sintetica_002' },
        origin_candidate_state: 'MATCH_PROBABLE_SMOKE'
      }
    ]
  };
  writeJson(proposalsPath, proposals);

  steps.push(runStep('preparar-plan-persistencia', [tools.plan, '--proposals', rel(proposalsPath), '--tenant', TENANT, '--out', rel(planPath)]));
  if(steps.at(-1).ok && fs.existsSync(planPath)){
    const plan = readJson(planPath);
    if(!['PLAN_LISTO','PLAN_CON_ADVERTENCIAS'].includes(plan.decision)) errors.push(`Plan no listo: ${plan.decision}`);
    if((plan.summary?.total || 0) !== 2) errors.push(`Plan debería tener 2 operaciones, tiene ${plan.summary?.total || 0}.`);
  } else {
    errors.push('No se generó plan de persistencia sintético.');
  }

  if(!errors.length){
    steps.push(runStep('ejecutor-dry-run', [tools.executor, '--plan', rel(planPath), '--mode', 'dry-run']));
    steps.push(runStep('ejecutor-local-mirror', [tools.executor, '--plan', rel(planPath), '--mode', 'local-mirror', '--execute-lab', 'CONFIRMO_ESCRITURA_LAB_CONCILIACIONES', '--lab-store-out', rel(mirrorPath)]));
    if(steps.at(-1).ok && fs.existsSync(mirrorPath)){
      const mirror = readJson(mirrorPath);
      const concCount = Array.isArray(mirror.conciliaciones) ? mirror.conciliaciones.length : 0;
      const auditCount = Array.isArray(mirror.auditLog) ? mirror.auditLog.length : 0;
      if(concCount < 2) errors.push(`Mirror debe tener al menos 2 conciliaciones; tiene ${concCount}.`);
      if(auditCount < 2) errors.push(`Mirror debe tener al menos 2 auditLog; tiene ${auditCount}.`);
      const first = mirror.conciliaciones?.[0] || {};
      writeJson(transitionPath, {
        proposal: first,
        from_queue_state: 'PROPUESTA',
        to_queue_state: 'EN_REVISION',
        actor: { id: 'usr_smoke_backend', role: 'operaciones' },
        reason: 'Smoke sintético de transición de propuesta a revisión.'
      });
      steps.push(runStep('validar-transicion-propuesta-revision', [tools.transition, '--transition', rel(transitionPath)]));
    } else {
      errors.push('No se generó mirror local de conciliaciones.');
    }
  }

  const adapterStep = runStep('validar-adapter-firestore-lab', [tools.adapter], true);
  if(!adapterStep.ok){
    if(STRICT_ADAPTER) errors.push('Adapter Firestore LAB no validó en modo strict. Ejecutar integración local -Apply y repetir smoke.');
    else warnings.push('Adapter Firestore LAB aún puede estar pendiente de -Apply local; se registra como readiness pendiente, no como falla del smoke sintético.');
  }
  steps.push(adapterStep);
}

for(const step of steps){
  if(!step.ok && step.name !== 'validar-adapter-firestore-lab') errors.push(`${step.name} falló con exit ${step.exitCode}.`);
}

const passedSteps = steps.filter((s)=>s.ok).length;
const failedSteps = steps.filter((s)=>!s.ok).length;
const adapterOk = steps.find((s)=>s.name === 'validar-adapter-firestore-lab')?.ok || false;
const decision = errors.length ? 'SMOKE_BLOQUEADO' : (warnings.length || !adapterOk ? 'SMOKE_OK_CON_READINESS_PENDIENTE' : 'SMOKE_OK');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = {
  version: VERSION,
  created_at: new Date().toISOString(),
  tenant_id: TENANT,
  decision,
  strict_adapter: STRICT_ADAPTER,
  synthetic_files: { proposals: rel(proposalsPath), plan: rel(planPath), mirror: rel(mirrorPath), transition: rel(transitionPath) },
  summary: { steps: steps.length, passed: passedSteps, failed: failedSteps, errors: errors.length, warnings: warnings.length, adapter_ok: adapterOk },
  steps,
  errors,
  warnings,
  restrictions: ['synthetic-only','no real data','no Firestore writes','no payment application','no cobros mutation','no deploy','no merge']
};
const reportJson = path.join(REPORT_DIR, `SMOKE-CONCILIACIONES-LAB-E2E-AYS-${stamp}.json`);
const reportTxt = path.join(REPORT_DIR, `SMOKE-CONCILIACIONES-LAB-E2E-AYS-${stamp}.txt`);
writeJson(reportJson, report);
const txt = [
  '============================================================',
  'ORBIT 360 - SMOKE CONCILIACIONES LAB E2E A&S',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Tenant: ${TENANT}`,
  `Decision: ${decision}`,
  `Strict adapter: ${STRICT_ADAPTER ? 'SI' : 'NO'}`,
  'Restricciones: sintético, sin datos reales, sin Firestore, sin pagos, sin deploy.',
  '============================================================',
  '',
  `Pasos: ${steps.length}`,
  `OK: ${passedSteps}`,
  `Fallos: ${failedSteps}`,
  `Adapter OK: ${adapterOk ? 'SI' : 'NO'}`,
  '',
  ...steps.map((s)=>`${s.ok ? 'OK' : 'WARN/FAIL'} ${s.name} exit=${s.exitCode}`),
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e)=>`ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map((w)=>`WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(reportTxt, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);

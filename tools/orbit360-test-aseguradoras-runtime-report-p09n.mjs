import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSameOriginHostP09l } from './orbit360-aseguradoras-same-origin-host-p09l.mjs';

function assert(condition, message) { if (!condition) throw new Error(message); }

const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-p09n-report-'));
const capability = {
  async status() { return { connected: true, code: 'READY', tasks: [], writeAllowed: false }; },
  async resolveBatchReferences() { return { ok: true, connected: true, provided: 0, missing: [], items: [], sourceRefs: {}, referencesExposed: false }; },
  async execute() { return { ok: true, writeAllowed: false }; }
};
const host = createSameOriginHostP09l({
  appRoot: path.resolve('orbit360-platform'),
  capability,
  discovery: { records: [], issues: [] },
  reportDir
});
const ready = await host.start();
try {
  let response = await fetch(ready.bootstrapUrl, { redirect: 'manual' });
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0];
  assert(response.status === 302 && cookie, 'debe crear sesión privada');

  const report = {
    version: 'p09n-v1',
    generatedAt: new Date().toISOString(),
    reason: 'synthetic',
    tenantId: 'alianzas-soluciones',
    route: 'aseguradoras',
    runtime: { bootstrapReady: true, preflightReady: true, sourceConnectionReady: true, snapshotsReady: true, errorCount: 0 },
    actor: { userPresent: true, activeRole: 'Dirección', activeRoleAssigned: true, tenantMatch: true, roleCount: 2, email: 'forbidden@example.test' },
    viewport: { width: 1280, height: 800, bucket: 'desktop', devicePixelRatio: 1, horizontalOverflow: false },
    ui: { routeAseguradoras: true, panelMounted: true, formMounted: true, panelVisible: true, formVisible: true, forbiddenVisibleTerms: [], forbiddenVisibleCount: 0, controls: { buttons: 3, inputs: 8, disabled: 1 }, fullText: 'forbidden customer payload' },
    flow: { previewGenerated: true, previewExecutable: true, executionCompleted: true, executionOk: true, historyPersisted: true, historyRuns: 1, historyItems: 1, resumableDocuments: 0 },
    navigationReloaded: true,
    counts: { sources: 2, manifests: 1, proposals: 1, rules: 0, presentations: 0, bindings: 0, reviews: 1 },
    gates: [
      { id: 'runtime_ready', state: 'approved' },
      { id: 'module_boundary', state: 'pending', reason: 'visual_boundary_review_pending' }
    ],
    claudeGate: { ready: true, status: 'ready_for_super_accumulated_claude_package', pending: [] },
    localPath: 'C:/forbidden/private/source.xlsx',
    fileRef: 'backend-ref://forbidden'
  };
  response = await fetch(`${ready.origin}/__orbit360/runtime-report`, {
    method: 'POST',
    headers: { Cookie: cookie, Origin: ready.origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ report })
  });
  const accepted = await response.json();
  assert(response.status === 200 && accepted.accepted === true, 'debe aceptar reporte sanitizado');
  assert(accepted.claudeGate === 'not_ready', 'host debe derivar gate y rechazar listo manipulado');
  assert(!JSON.stringify(accepted).includes(reportDir), 'respuesta no debe exponer carpeta privada');

  const jsonFiles = fs.readdirSync(reportDir).filter(name => name.endsWith('.json'));
  const mdFiles = fs.readdirSync(reportDir).filter(name => name.endsWith('.md'));
  assert(jsonFiles.length === 1 && mdFiles.length === 1, 'debe persistir JSON y Markdown privados');
  const saved = JSON.parse(fs.readFileSync(path.join(reportDir, jsonFiles[0]), 'utf8'));
  const text = fs.readFileSync(path.join(reportDir, mdFiles[0]), 'utf8');
  assert(saved.claudeGate.ready === false && saved.claudeGate.pending.includes('module_boundary'), 'gate persistido debe derivarse de gates oficiales');
  assert(saved.actor.activeRole === 'Dirección' && !('email' in saved.actor), 'debe conservar rol sin identidad');
  const serialized = JSON.stringify(saved) + text;
  for (const forbidden of ['forbidden@example.test', 'forbidden customer payload', 'C:/forbidden', 'backend-ref://']) {
    assert(!serialized.includes(forbidden), `reporte filtró dato prohibido: ${forbidden}`);
  }
  assert(saved.writeAllowed === false && saved.enablesCotizador === false && saved.enablesComparativo === false, 'reporte no habilita ni escribe');

  response = await fetch(`${ready.origin}/__orbit360/runtime-report`, {
    method: 'POST',
    headers: { Cookie: cookie, Origin: 'http://malicious.invalid', 'Content-Type': 'application/json' },
    body: JSON.stringify({ report })
  });
  assert(response.status === 403, 'origen ajeno debe bloquearse');
} finally {
  await host.stop();
  fs.rmSync(reportDir, { recursive: true, force: true });
}
console.log('OK orbit360-test-aseguradoras-runtime-report-p09n');
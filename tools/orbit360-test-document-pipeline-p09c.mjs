import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createDocumentBackendBridgeP09c } from './orbit360-document-backend-bridge-p09c.mjs';

function assert(condition, message) { if (!condition) throw new Error(message); }
function fakeStore(seed = {}) {
  const db = JSON.parse(JSON.stringify(seed));
  return {
    all(c) { return (db[c] || []).slice(); },
    get(c, id) { return (db[c] || []).find(row => row.id === id) || null; },
    insert(c, row) { (db[c] = db[c] || []).push(JSON.parse(JSON.stringify(row))); return row; },
    update(c, id, patch) { const row = (db[c] || []).find(item => item.id === id); if (!row) return null; Object.assign(row, JSON.parse(JSON.stringify(patch))); return row; },
    remove(c, id) { db[c] = (db[c] || []).filter(row => row.id !== id); },
    where(c, fn) { return (db[c] || []).filter(fn); },
    find(c, fn) { return (db[c] || []).find(fn) || null; },
    _emit() {}, raw() { return db; }
  };
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-p09c-pipeline-'));
const allowed = path.join(temp, 'allowed'); const tools = path.join(temp, 'tools');
fs.mkdirSync(allowed); fs.mkdirSync(tools);
const sourcePath = path.join(allowed, 'rates.xlsx'); fs.writeFileSync(sourcePath, 'synthetic workbook');
const inspector = `#!/usr/bin/env python3
import argparse,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('--output',required=True);p.add_argument('--purpose');p.add_argument('--hints');a=p.parse_args();src=Path(a.input);h=hashlib.sha256(src.read_bytes()).hexdigest();x=json.loads(Path(a.hints).read_text());out={'schemaVersion':'orbit360_excel_rule_facts_p06b_v1','document':{'id':x['documentId'],'tenantId':x['tenantId'],'aseguradoraId':x['aseguradoraId'],'sourceHash':h,'fileName':src.name,'version':'v1'},'workbook':{'sheetCount':1},'facts':[],'candidateTables':[],'outputRoutes':[],'candidateGroups':[],'summary':{'factCount':0},'flags':{'containsCustomerPayload':False,'containsSecrets':False},'writeAllowed':False,'requiresHumanValidation':True};Path(a.output).write_text(json.dumps(out),encoding='utf-8')
`;
fs.writeFileSync(path.join(tools, 'orbit360-extract-excel-rule-facts-p06b.py'), inspector, { mode: 0o755 });

const Orbit = {};
const context = { window: { Orbit }, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise };
context.window.window = context.window;
vm.createContext(context);
for (const file of [
  'orbit360-platform/core/document-provider-registry-p09.js',
  'orbit360-platform/core/document-provider-bridge-p09b.js',
  'orbit360-platform/core/aseguradoras-knowledge-runtime-p09.js',
  'orbit360-platform/modules/aseguradoras-knowledge-p09.js'
]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
Orbit.excelRuleProposalAdapterP06b = { mappingTemplate(manifest) { return { ok: true, code: 'MAPPING_TEMPLATE_READY', combinations: [], document: manifest.document, writeAllowed: false, requiresHumanValidation: true }; } };
Orbit.store = fakeStore({ aseguradoras: [{ id: 'insurer-demo', tenantId: 'tenant-demo', nombre: 'Compañía Demo', pais: 'GT', docs: [] }], actividades: [] });
Orbit.tenant = { id: 'tenant-demo' };
const backendBridge = createDocumentBackendBridgeP09c({
  allowedRoots: [allowed], toolsRoot: tools,
  async resolveSource(input) { return input.fileRef === 'drive://tenant-demo/rates-v1' ? { localPath: sourcePath, fileRef: input.fileRef } : null; }
});
const registered = await Orbit.documentProviderBridgeP09b.registerAvailable({ bridge: backendBridge });
assert(registered.ok, 'bridge debe registrarse');
const actor = { id: 'admin-demo', tenantId: 'tenant-demo', activeRole: 'AdminTenant', roles: ['AdminTenant'] };
const source = { id: 'rates-v1', nombre: 'rates.xlsx', tipoFuente: 'tarifario_excel', archivoRef: 'drive://tenant-demo/rates-v1', pais: 'GT', moneda: 'GTQ', producto: 'Auto', version: 'v1' };
const inspection = await Orbit.services.aseguradorasKnowledgeP09.inspect({ tenantId: 'tenant-demo', aseguradoraId: 'insurer-demo', source, actor, purpose: 'training' });
assert(inspection.ok && inspection.manifest.document.tenantId === 'tenant-demo', 'pipeline debe devolver manifiesto directo');
const fingerprint = Orbit.aseguradorasKnowledgeRuntimeP09.currentFingerprint(Orbit.store, 'tenant-demo', 'insurer-demo');
const plan = Orbit.services.aseguradorasKnowledgeP09.buildPlan(inspection, { actor, reason: 'Validación sintética metadata-only', confirmed: true, expectedFingerprint: fingerprint });
assert(plan.ok && plan.enablesCotizador === false, 'plan debe quedar sin habilitación');
const persisted = Orbit.services.aseguradorasKnowledgeP09.persist(plan, actor);
assert(persisted.ok, 'writer debe persistir en store inyectado');
const read = Orbit.services.aseguradorasKnowledgeP09.read({ tenantId: 'tenant-demo', aseguradoraId: 'insurer-demo' });
assert(read.summary.sources === 1 && read.summary.manifests === 1 && read.summary.proposals === 1, 'read model debe reflejar fuente/manifiesto/propuesta');
assert(read.summary.enabledCotizador === 0 && read.summary.enabledComparativo === 0, 'ningún módulo debe habilitarse');
assert(Orbit.store.all('actividades').some(row => row.containsRawPayload === false && row.enablesCotizador === false), 'auditoría debe ser sanitizada');
fs.rmSync(temp, { recursive: true, force: true });
console.log('OK orbit360-test-document-pipeline-p09c');

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { runAuthorizedDocumentTask, runnerStatus } from './orbit360-document-backend-runner-p09c.mjs';

function assert(condition, message) { if (!condition) throw new Error(message); }
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-p09c-runner-'));
const allowed = path.join(temp, 'allowed');
const outside = path.join(temp, 'outside');
const tools = path.join(temp, 'tools');
fs.mkdirSync(allowed); fs.mkdirSync(outside); fs.mkdirSync(tools);

const stub = `#!/usr/bin/env python3
import argparse,json,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('--output',required=True);p.add_argument('--purpose',default='training');p.add_argument('--hints');p.add_argument('--hints-json');p.add_argument('--directory-json');p.add_argument('--include-sensitive-values',action='store_true');a=p.parse_args()
raw=Path(a.input).read_bytes();h=hashlib.sha256(raw).hexdigest();hints_path=a.hints or a.hints_json;hints=json.loads(Path(hints_path).read_text()) if hints_path else {}
out={'schemaVersion':'stub','sourceHash':h,'documentId':hints.get('documentId'),'document':{'id':hints.get('documentId'),'tenantId':hints.get('tenantId'),'aseguradoraId':hints.get('aseguradoraId'),'sourceHash':h},'flags':{'containsCustomerPayload':False,'containsSecrets':False},'apiKey':'must-drop','rawBytes':'must-drop','routeKey':'keep-me','writeAllowed':False,'requiresHumanValidation':True}
Path(a.output).write_text(json.dumps(out),encoding='utf-8')
print(json.dumps({'ok':True}))
`;
for (const name of ['orbit360-extract-excel-rule-facts-p06b.py', 'orbit360-extract-pdf-manifest-p07b.py']) {
  fs.writeFileSync(path.join(tools, name), stub, { mode: 0o755 });
}
const xlsx = path.join(allowed, 'source.xlsx');
fs.writeFileSync(xlsx, Buffer.from('synthetic xlsx bytes'));
const pdf = path.join(allowed, 'source.pdf');
fs.writeFileSync(pdf, Buffer.from('%PDF synthetic bytes'));
const outsideFile = path.join(outside, 'outside.xlsx');
fs.writeFileSync(outsideFile, 'outside');
const hash = crypto.createHash('sha256').update(fs.readFileSync(xlsx)).digest('hex');
const base = {
  tenantId: 'tenant-demo', aseguradoraId: 'insurer-demo', documentId: 'doc-demo',
  fileRef: 'drive://doc-demo', purpose: 'training', localPath: xlsx,
  dimensiones: { pais: 'GT', moneda: 'GTQ', producto: 'Auto' }
};
const status = runnerStatus({ toolsRoot: tools });
assert(status.connected && status.tasks.length === 2, 'runner debe detectar extractores');
const excel = await runAuthorizedDocumentTask({ ...base, task: 'excel_manifest', sourceHash: hash }, { allowedRoots: [allowed], toolsRoot: tools });
assert(excel.ok && excel.code === 'EXCEL_MANIFEST_READY_FOR_REVIEW', 'excel debe ejecutar');
assert(excel.result.routeKey === 'keep-me', 'debe conservar clave funcional');
assert(!('apiKey' in excel.result) && !('rawBytes' in excel.result), 'debe quitar secretos y payload');
assert(excel.result.flags.containsRawPayload === false && excel.enablesCotizador === false, 'debe forzar metadata-only');
const pdfResult = await runAuthorizedDocumentTask({ ...base, task: 'pdf_manifest', documentId: 'doc-pdf', localPath: pdf, fileRef: 'drive://doc-pdf', directory: [{ id: 'i', nombre: 'Ficticia' }] }, { allowedRoots: [allowed], toolsRoot: tools });
assert(pdfResult.ok && pdfResult.code === 'PDF_MANIFEST_READY_FOR_REVIEW', 'pdf debe ejecutar');
const wrongHash = await runAuthorizedDocumentTask({ ...base, task: 'excel_manifest', sourceHash: 'bad' }, { allowedRoots: [allowed], toolsRoot: tools });
assert(!wrongHash.ok && wrongHash.code === 'SOURCE_HASH_MISMATCH', 'hash incorrecto debe bloquear');
const pathEscape = await runAuthorizedDocumentTask({ ...base, task: 'excel_manifest', localPath: outsideFile }, { allowedRoots: [allowed], toolsRoot: tools });
assert(!pathEscape.ok && pathEscape.code === 'SOURCE_OUTSIDE_ALLOWED_ROOT', 'ruta fuera de root debe bloquear');
const remote = await runAuthorizedDocumentTask({ ...base, task: 'excel_manifest', localPath: 'https://example.test/a.xlsx' }, { allowedRoots: [allowed], toolsRoot: tools });
assert(!remote.ok && remote.code === 'REMOTE_REFERENCE_REQUIRES_RESOLVER', 'URL remota no debe pasar al runner');
const sensitiveTraining = await runAuthorizedDocumentTask({ ...base, task: 'excel_manifest', includeSensitiveValues: true }, { allowedRoots: [allowed], toolsRoot: tools });
assert(!sensitiveTraining.ok && sensitiveTraining.code === 'SENSITIVE_VALUES_REQUIRE_OPERATIONAL_PURPOSE', 'training no permite PII');
const sensitiveNoReason = await runAuthorizedDocumentTask({ ...base, task: 'excel_manifest', purpose: 'operational', includeSensitiveValues: true, authorization: { allowSensitiveValues: true } }, { allowedRoots: [allowed], toolsRoot: tools });
assert(!sensitiveNoReason.ok && sensitiveNoReason.code === 'SENSITIVE_VALUES_REASON_REQUIRED', 'operational requiere motivo');
fs.rmSync(temp, { recursive: true, force: true });
console.log('OK orbit360-test-document-backend-runner-p09c');

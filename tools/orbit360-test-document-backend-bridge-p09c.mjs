import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDocumentBackendBridgeP09c } from './orbit360-document-backend-bridge-p09c.mjs';
function assert(condition, message) { if (!condition) throw new Error(message); }
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-p09c-bridge-'));
const allowed = path.join(temp, 'allowed'); const tools = path.join(temp, 'tools');
fs.mkdirSync(allowed); fs.mkdirSync(tools);
const file = path.join(allowed, 'source.xlsx'); fs.writeFileSync(file, 'fixture');
const stub = `#!/usr/bin/env python3
import argparse,json,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('--output',required=True);p.add_argument('--purpose');p.add_argument('--hints');a=p.parse_args();h=hashlib.sha256(Path(a.input).read_bytes()).hexdigest();x=json.loads(Path(a.hints).read_text());Path(a.output).write_text(json.dumps({'sourceHash':h,'document':{'id':x['documentId'],'tenantId':x['tenantId'],'aseguradoraId':x['aseguradoraId']},'flags':{}}))
`;
fs.writeFileSync(path.join(tools, 'orbit360-extract-excel-rule-facts-p06b.py'), stub, { mode: 0o755 });
const noResolver = createDocumentBackendBridgeP09c({ allowedRoots: [allowed], toolsRoot: tools });
assert((await noResolver.status()).connected === false, 'sin resolver no debe conectar');
const bridge = createDocumentBackendBridgeP09c({
  allowedRoots: [allowed], toolsRoot: tools,
  async resolveSource(input) {
    assert(input.fileRef === 'drive://source', 'resolver recibe referencia, no ruta cliente');
    return { localPath: file, fileRef: input.fileRef };
  }
});
const status = await bridge.status(); assert(status.connected && status.tasks.includes('excel_manifest'), 'bridge debe estar listo');
const result = await bridge.execute('excel_manifest', { tenantId: 'tenant-a', aseguradoraId: 'ins-a', documentId: 'doc-a', fileRef: 'drive://source', purpose: 'training' });
assert(result.documentId === 'doc-a' && result.runnerExecution.code === 'EXCEL_MANIFEST_READY_FOR_REVIEW', 'bridge debe devolver manifiesto directo al registry');
const unresolved = createDocumentBackendBridgeP09c({ allowedRoots: [allowed], toolsRoot: tools, resolveSource: async () => null });
assert((await unresolved.execute('excel_manifest', { tenantId: 't', aseguradoraId: 'i', documentId: 'd', fileRef: 'drive://none' })).code === 'SOURCE_REFERENCE_NOT_RESOLVED', 'referencia no resuelta debe bloquear');
fs.rmSync(temp, { recursive: true, force: true });
console.log('OK orbit360-test-document-backend-bridge-p09c');

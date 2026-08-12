#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const TARGET_COLLECTION = 'financiero_historico';
export const AUDIT_COLLECTION = 'auditoriaImportaciones';
export const FORBIDDEN_OPERATIONAL_COLLECTIONS = Object.freeze(['finmovs','cobros','recibosEsperados','carteraPrimas','polizas','clientes']);
export const WRITE_REQUEST_SCHEMA = 'orbit360-financiero-historico-write-request-v1';
export const PACKAGE_SCHEMA = 'orbit360-financiero-historico-normalized-private-v1';
export const WRITER_SCHEMA = 'orbit360-financiero-historico-canonical-writer-v1';

function fail(code, detail='') { const e = new Error(code + (detail ? ':' + detail : '')); e.code = code; throw e; }
function clean(v) { return String(v == null ? '' : v).trim(); }
export function sha256(v) { return crypto.createHash('sha256').update(v).digest('hex'); }
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function sanitizeError(e) { return clean(e && e.message || e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,600); }
function traceComplete(r) { return !!(r && clean(r.sourceFile) && clean(r.sourceSheet) && r.sourceRow != null && clean(r.sourceBlock) && clean(r.periodo) && clean(r.traceHash)); }
function explicitDecision(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const record = raw.record && typeof raw.record === 'object' ? raw.record : raw;
  const decision = clean(raw.persistStatus || raw.persistenceStatus || raw.decision || record.persistStatus || record.persistenceStatus || record.decision).toUpperCase();
  if (decision === 'IMPORTABLE') return 'IMPORTABLE';
  if (decision === 'REQUIERE_VALIDACION' || decision === 'REQUIERE VALIDACION') return 'REQUIERE_VALIDACION';
  return 'UNCLASSIFIED';
}
function recordOf(item) { return item && item.record && typeof item.record === 'object' ? item.record : item; }
export function deterministicId(tenantId, r) {
  const key = [tenantId, clean(r.sourceFile), clean(r.sourceSheet), String(r.sourceRow ?? ''), clean(r.sourceBlock), clean(r.traceHash)].join('|');
  return 'fh_' + sha256(key).slice(0,40);
}
export function canonicalRecord(tenantId, r) {
  if (!r || typeof r !== 'object') fail('DATA_CONTRACT_FAILURE','ROW_INVALID');
  if (clean(r.tenantId) !== tenantId) fail('DATA_CONTRACT_FAILURE','TENANT_MISMATCH');
  if (clean(r.destino) !== TARGET_COLLECTION) fail('DATA_CONTRACT_FAILURE','TARGET_COLLECTION_MISMATCH');
  if (!traceComplete(r)) fail('DATA_CONTRACT_FAILURE','TRACEABILITY_INCOMPLETE');
  if (!['GT','CO'].includes(clean(r.pais).toUpperCase())) fail('DATA_CONTRACT_FAILURE','COUNTRY_UNSUPPORTED');
  const expectedCurrency = clean(r.pais).toUpperCase() === 'GT' ? 'GTQ' : 'COP';
  if (clean(r.moneda).toUpperCase() !== expectedCurrency) fail('DATA_CONTRACT_FAILURE','COUNTRY_CURRENCY_MISMATCH');
  if (r.esCobro === true || r.esCartera === true || r.esPoliza === true || r.esCliente === true) fail('DATA_CONTRACT_FAILURE','OPERATIONAL_INFERENCE_FORBIDDEN');
  const copy = JSON.parse(JSON.stringify(r));
  copy.tenantId = tenantId;
  copy.destino = TARGET_COLLECTION;
  copy.persistenceStatus = 'PERSISTED_HISTORICAL_SOURCE';
  copy.writeOperational = false;
  copy.promotedToFinmovs = false;
  copy.writerVersion = 'v20260812';
  delete copy.persistStatus;
  delete copy.decision;
  return copy;
}
export function buildPlan(pkg, { tenantId } = {}) {
  if (!pkg || pkg.schemaVersion !== PACKAGE_SCHEMA) fail('DATA_CONTRACT_FAILURE','PACKAGE_SCHEMA');
  const tenant = clean(tenantId || pkg.tenantId);
  if (!tenant || clean(pkg.tenantId) !== tenant) fail('DATA_CONTRACT_FAILURE','PACKAGE_TENANT');
  if (!Array.isArray(pkg.rows)) fail('DATA_CONTRACT_FAILURE','ROWS_MISSING');
  const creates = [], holds = [], unclassified = [];
  for (let index = 0; index < pkg.rows.length; index++) {
    const item = pkg.rows[index];
    const decision = explicitDecision(item);
    const r = recordOf(item);
    if (decision === 'REQUIERE_VALIDACION') { holds.push({ index, traceHash: clean(r && r.traceHash) }); continue; }
    if (decision !== 'IMPORTABLE') { unclassified.push(index); continue; }
    const data = canonicalRecord(tenant, r);
    const id = deterministicId(tenant, data);
    const dataDigest = sha256(stable(data));
    creates.push({ coll: TARGET_COLLECTION, id, data, dataDigest });
  }
  if (unclassified.length) fail('DATA_CONTRACT_FAILURE','PERSISTENCE_DECISION_REQUIRED');
  const ids = new Set(creates.map(x => x.id));
  if (ids.size !== creates.length) fail('DATA_CONTRACT_FAILURE','DETERMINISTIC_ID_COLLISION_IN_PACKAGE');
  const targetIdDigest = sha256(creates.map(x => x.id).sort().join('\n'));
  const planDigest = sha256(stable(creates.map(x => ({id:x.id,dataDigest:x.dataDigest}))));
  return {
    schemaVersion: WRITER_SCHEMA,
    tenantId: tenant,
    targetCollection: TARGET_COLLECTION,
    forbiddenOperationalCollections: [...FORBIDDEN_OPERATIONAL_COLLECTIONS],
    counts: { sourceRows: pkg.rows.length, importable: creates.length, requiereValidacion: holds.length },
    creates, holds, targetIdDigest, planDigest,
    writeOperational: false,
    promotionToFinmovs: false
  };
}
async function countColl(db, tenant, coll) { const snap = await db.collection('tenantId').doc(tenant).collection(coll).count().get(); return snap.data().count; }
async function existingDocs(db, tenant, coll, ids) {
  const out = new Map();
  for (let i=0;i<ids.length;i+=30) {
    const refs = ids.slice(i,i+30).map(id => db.collection('tenantId').doc(tenant).collection(coll).doc(id));
    const docs = await db.getAll(...refs); for (const d of docs) if (d.exists) out.set(d.id,d.data());
  }
  return out;
}
async function createChunked(db, tenant, ops, created) {
  for (let i=0;i<ops.length;i+=300) { const b=db.batch(); const chunk=ops.slice(i,i+300); for (const op of chunk) b.create(db.collection('tenantId').doc(tenant).collection(op.coll).doc(op.id),op.data); await b.commit(); for (const op of chunk) created.push({coll:op.coll,id:op.id}); }
}
async function deleteCreated(db, tenant, created) {
  for (let i=created.length;i>0;i-=300) { const chunk=created.slice(Math.max(0,i-300),i); const b=db.batch(); for (const op of chunk) b.delete(db.collection('tenantId').doc(tenant).collection(op.coll).doc(op.id)); await b.commit(); }
}
function writeEvidence(file, obj) { if(!file) return; fs.mkdirSync(path.dirname(file),{recursive:true}); const data=JSON.stringify(obj,null,2)+'\n'; const tmp=file+'.tmp-'+process.pid; fs.writeFileSync(tmp,data,'utf8'); JSON.parse(fs.readFileSync(tmp,'utf8')); fs.renameSync(tmp,file); }

export async function executeCli(env = process.env) {
  const mode = clean(env.ORBIT360_FIN_HIST_MODE || 'DRY_RUN').toUpperCase();
  const tenant = clean(env.ORBIT360_TENANT_ID || '');
  const packagePath = clean(env.ORBIT360_FIN_HIST_PACKAGE || '');
  const requestPath = clean(env.ORBIT360_FIN_HIST_REQUEST || '');
  const evidencePath = clean(env.ORBIT360_FIN_HIST_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/financiero-historico-canonical-writer-evidence.json');
  const result = { schemaVersion: WRITER_SCHEMA, mode, tenantId:tenant, status:'STARTED', targetCollection:TARGET_COLLECTION, firestoreRead:false, firestoreWrites:0, operationalWrites:0, writes:{historical:0,audit:0}, skips:{idempotent:0}, holds:0, rollback:{executed:false,restored:false}, containsPII:false, containsSecrets:false };
  try {
    if (!tenant) fail('DATA_CONTRACT_FAILURE','TENANT_REQUIRED');
    if (!packagePath || !fs.existsSync(packagePath)) fail('ENVIRONMENT_FAILURE','NORMALIZED_PACKAGE_MISSING');
    const bytes = fs.readFileSync(packagePath);
    const packageDigest = sha256(bytes);
    const pkg = JSON.parse(bytes.toString('utf8'));
    const plan = buildPlan(pkg,{tenantId:tenant});
    result.packageDigest=packageDigest; result.planDigest=plan.planDigest; result.targetIdDigest=plan.targetIdDigest; result.counts=plan.counts; result.holds=plan.counts.requiereValidacion;
    if (mode === 'STATIC_SYNTHETIC') { result.status='SOURCE_ONLY_PASS'; result.ok=true; writeEvidence(evidencePath,result); return result; }
    if (!['DRY_RUN','WRITE'].includes(mode)) fail('PIPELINE_MECHANISM_FAILURE','MODE_INVALID');
    if (!env.SERVICE_ACCOUNT) fail('ENVIRONMENT_FAILURE','SERVICE_ACCOUNT_MISSING');
    const request = mode === 'WRITE' ? JSON.parse(fs.readFileSync(requestPath,'utf8')) : null;
    if (mode === 'WRITE') {
      if (!requestPath || !fs.existsSync(requestPath)) fail('AUTHORIZATION_REQUIRED','REQUEST_MISSING');
      if (request.schemaVersion !== WRITE_REQUEST_SCHEMA || request.approved !== true || request.tenantId !== tenant || request.packageDigest !== packageDigest || request.planDigest !== plan.planDigest || request.targetIdDigest !== plan.targetIdDigest || request.targetCollection !== TARGET_COLLECTION || request.writeOperational !== false || request.promoteToFinmovs !== false || Number(request.maxHistoricalCreates) !== plan.counts.importable) fail('AUTHORIZATION_REQUIRED','REQUEST_MISMATCH');
    }
    const admin = (await import('firebase-admin')).default;
    const sa=JSON.parse(env.SERVICE_ACCOUNT); admin.initializeApp({credential:admin.credential.cert(sa),projectId:sa.project_id}); const db=admin.firestore(); result.firestoreRead=true;
    const watched=[TARGET_COLLECTION,...FORBIDDEN_OPERATIONAL_COLLECTIONS]; result.before={}; for(const c of watched) result.before[c]=await countColl(db,tenant,c);
    const existing = await existingDocs(db,tenant,TARGET_COLLECTION,plan.creates.map(x=>x.id));
    const pending=[]; for(const op of plan.creates){ const prev=existing.get(op.id); if(!prev){pending.push(op);continue;} const prevDigest=sha256(stable(prev)); if(prevDigest===op.dataDigest) result.skips.idempotent++; else fail('DATA_CONTRACT_FAILURE','TARGET_ID_COLLISION_DIFFERENT_CONTENT'); }
    result.plan={sourceRows:plan.counts.sourceRows,importable:plan.counts.importable,requiresValidation:plan.counts.requiereValidacion,creates:pending.length,idempotentSkips:result.skips.idempotent,forbiddenOperationalWrites:true};
    if (mode === 'DRY_RUN') { result.after={...result.before}; result.status='PREWRITE_READY'; result.ok=true; writeEvidence(evidencePath,result); return result; }
    const created=[];
    try {
      await createChunked(db,tenant,pending,created); result.writes.historical=pending.length;
      const auditId='finhist_'+plan.planDigest.slice(0,24);
      const audit={tenantId:tenant,batchId:auditId,sourceType:'financiero_historico',targetCollection:TARGET_COLLECTION,packageDigest,planDigest:plan.planDigest,targetIdDigest:plan.targetIdDigest,counts:plan.counts,created:pending.length,idempotentSkips:result.skips.idempotent,holds:plan.counts.requiereValidacion,writeOperational:false,promotedToFinmovs:false,status:'written_controlled',confirmedAt:new Date().toISOString(),confirmedBy:clean(request.confirmedBy||'authorized_operator'),reason:clean(request.reason||'Persistencia durable independiente de financiero_historico'),rollbackAvailable:true};
      await db.collection('tenantId').doc(tenant).collection(AUDIT_COLLECTION).doc(auditId).create(audit); created.push({coll:AUDIT_COLLECTION,id:auditId}); result.writes.audit=1;
      result.after={}; for(const c of watched) result.after[c]=await countColl(db,tenant,c);
      for(const c of FORBIDDEN_OPERATIONAL_COLLECTIONS) if(result.after[c]!==result.before[c]) fail('SECURITY_FAILURE','FORBIDDEN_OPERATIONAL_COLLECTION_CHANGED:'+c);
      if(result.after[TARGET_COLLECTION]!==result.before[TARGET_COLLECTION]+pending.length) fail('DATA_CONTRACT_FAILURE','POSTWRITE_TARGET_COUNT');
      result.firestoreWrites=created.length; result.operationalWrites=0; result.status='WRITE_PASS'; result.ok=true;
    } catch(e) {
      await deleteCreated(db,tenant,created); result.rollback.executed=true; result.rollback.restored=(await countColl(db,tenant,TARGET_COLLECTION))===result.before[TARGET_COLLECTION]; if(!result.rollback.restored) fail('SECURITY_FAILURE','ROLLBACK_INCOMPLETE'); throw e;
    }
  } catch(e) { result.status=result.rollback.executed&&result.rollback.restored?'ROLLED_BACK_SAFE':'BLOCKED'; result.classification=String(e.code||'PIPELINE_MECHANISM_FAILURE'); result.error=sanitizeError(e); result.ok=false; }
  writeEvidence(evidencePath,result); return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const result = await executeCli(); console.log(JSON.stringify(result,null,2)); if(!result.ok) process.exit(41);
}

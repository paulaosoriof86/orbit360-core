'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const ops = require('./ops-leads-domain').__opsLeadsDomain;

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';

function clean(value, max = 180) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}
function norm(value) {
  return clean(value, 120).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function sha(value) {
  return crypto.createHash('sha256').update(String(value == null ? '' : value), 'utf8').digest('hex');
}
function roles(row) {
  return Array.from(new Set([].concat(row.roles || [], row.activeRole || [], row.rolActivo || [], row.role || [], row.rol || []).map(norm).filter(Boolean)));
}
function countries(row) {
  return Array.from(new Set([].concat(row.countries || [], row.paises || [], row.country || [], row.pais || []).map(v => clean(v, 8).toUpperCase()).filter(Boolean)));
}
function active(row) {
  const status = norm(row.status || row.estado);
  return row.active !== false && row.activo !== false && !['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(status);
}
function eligibleGtAdvisor(row) {
  const ps = countries(row);
  const rs = roles(row);
  const advisorRole = rs.some(r => ['asesor','asesora','comercial'].includes(r) || r.startsWith('asesor_') || r.startsWith('asesora_'));
  return active(row) && advisorRole && (!ps.length || ps.includes('GT'));
}
function designatedPaula(row) {
  const parts = norm(row.nombre || row.name).split('_').filter(Boolean);
  return parts.includes('paula') && parts.includes('osorio');
}
function businessRef(db, storageMode, id) {
  return storageMode === 'canonicalV2'
    ? db.collection('tenants').doc(TENANT_ID).collection('workflow').doc('negocios').collection('items').doc(id)
    : db.collection('tenantId').doc(TENANT_ID).collection('negocios').doc(id);
}
async function storageMode(db) {
  const s = await db.collection('tenants').doc(TENANT_ID).collection('config').doc('workflow').get();
  return s.exists && s.data().storageMode === 'canonicalV2' ? 'canonicalV2' : 'legacyCompatible';
}
async function deleteIfExists(db, refs) {
  const batch = db.batch();
  let deletes = 0;
  for (const ref of refs) {
    const s = await ref.get();
    if (s.exists) { batch.delete(ref); deletes++; }
  }
  if (deletes) await batch.commit();
  let absent = 0;
  for (const ref of refs) {
    const s = await ref.get();
    if (!s.exists) absent++;
  }
  return { deletes, absent, total: refs.length };
}

async function main() {
  if (PROJECT_ID !== EXPECTED_PROJECT_ID) throw new Error('WRONG_PROJECT');

  const app = getApps()[0] || initializeApp({ projectId: EXPECTED_PROJECT_ID });
  const db = getFirestore(app);

  const advisorsSnap = await db.collection('tenantId').doc(TENANT_ID).collection('asesores').get();
  const advisors = advisorsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
  const designated = advisors.filter(row => designatedPaula(row) && eligibleGtAdvisor(row));
  if (designated.length !== 1) throw new Error('DESIGNATED_ADVISOR_NOT_UNIQUE');
  const advisorId = designated[0].id;
  const advisorCommitment = sha(advisorId);

  const nonce = clean(process.env.GITHUB_RUN_ID || Date.now(), 80);
  const uid = 's507_syn_uid_' + nonce;
  const businessId = 's507_syn_neg_' + sha(nonce).slice(0, 18);
  const requestId = 's507_syn_req_' + sha('req|' + nonce).slice(0, 18);
  const eventId = 'evt_' + sha(TENANT_ID + '|' + requestId).slice(0, 28);
  const correlationId = 's507_syn_corr_' + sha('corr|' + nonce).slice(0, 18);
  const caseId = 's507_syn_case_' + sha('case|' + nonce).slice(0, 18);

  const memberRef = db.collection('tenants').doc(TENANT_ID).collection('members').doc(uid);
  const reqRef = db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(requestId);
  const evtRef = db.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(eventId);
  const outboxRef = db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(eventId);

  const mode = await storageMode(db);
  const bizRef = businessRef(db, mode, businessId);
  const refs = [memberRef, bizRef, reqRef, evtRef, outboxRef];

  const member = {
    schemaVersion: 'ays-cotcomp-s507-synthetic-actor-v1',
    tenantId: TENANT_ID,
    uid,
    status: 'active',
    active: true,
    roles: ['SuperAdmin'],
    activeRole: 'SuperAdmin',
    defaultRole: 'SuperAdmin',
    countries: ['GT'],
    dataScopes: { workflow: 'all' },
    synthetic: true,
    proofRunId: 's507-' + nonce
  };

  const payload = {
    id: businessId,
    nombre: 'Synthetic QA S5.07',
    tipo: 'Prospecto web sintético',
    pais: 'GT',
    moneda: 'GTQ',
    canal: 'Web CotComp',
    producto: 'Vehículo / Movilidad',
    ramo: 'Vehículo / Movilidad',
    prioridad: 'Media',
    origen: 'Web CotComp',
    asesorId: advisorId,
    descripcion: 'Synthetic QA only. No customer data.',
    cotcompRef: {
      role: 'public_handoff',
      caseId,
      journeyId: 'GT_AUTO_MOTO_HYBRID',
      correlationId,
      quoteCasePath: 'synthetic-only',
      intakeStatus: 'lead_recibido'
    },
    notificationTitle: 'Synthetic QA · Solicitud piloto Web CotComp',
    notificationMessage: 'Synthetic QA only. No customer data.'
  };

  const command = {
    auth: { uid },
    data: {
      tenantId: TENANT_ID,
      operation: 'create_business',
      requestId,
      reason: 'Synthetic S5.07 designated advisor rehearsal',
      payload
    }
  };

  let result;
  let retry;
  let conflictDenied = false;
  try {
    await memberRef.create(member);
    result = await ops.executeCommand(command);

    const [b, q, e, o] = await Promise.all([bizRef.get(), reqRef.get(), evtRef.get(), outboxRef.get()]);
    if (!b.exists || !q.exists || !e.exists || !o.exists) throw new Error('READBACK_MISSING');
    const business = b.data() || {};
    const outbox = o.data() || {};
    const assigned = clean(business.asesorId) === advisorId;
    const leadsVisible = !!(result.projection && result.projection.leadsVisible);
    const advisorVisible = !!(result.projection && result.projection.advisorVisible);
    const targeted = [].concat(outbox.targets || []).some(t => t && t.type === 'advisor' && clean(t.id) === advisorId);
    if (!assigned || !leadsVisible || !advisorVisible || !targeted) throw new Error('LEADS_ASSIGNMENT_READBACK_FAILED');
    if (norm(business.etapa) !== 'nuevo' || clean(business.origen) !== 'Web CotComp') throw new Error('LEAD_LIFECYCLE_TRUTH_FAILED');

    retry = await ops.executeCommand(command);
    if (retry.reused !== true || retry.entityId !== businessId || retry.eventId !== eventId) throw new Error('IDEMPOTENT_RETRY_FAILED');

    const changed = JSON.parse(JSON.stringify(command));
    changed.data.payload.descripcion = 'Changed synthetic payload';
    try {
      await ops.executeCommand(changed);
    } catch (error) {
      if (error && error.code === 'failed-precondition') conflictDenied = true;
      else throw error;
    }
    if (!conflictDenied) throw new Error('IDEMPOTENCY_CONFLICT_NOT_DENIED');

    const cleanup = await deleteIfExists(db, refs);
    if (cleanup.absent !== cleanup.total) throw new Error('FINAL_ABSENCE_FAILED');

    process.stdout.write(JSON.stringify({
      schemaVersion: 'ays-cotcomp-s507-designated-routing-rehearsal-v1',
      projectId: EXPECTED_PROJECT_ID,
      tenantId: TENANT_ID,
      syntheticOnly: true,
      realCustomerDataUsed: false,
      productionTouched: false,
      providerRaterUsed: false,
      issued: false,
      bound: false,
      paid: false,
      designatedAdvisorResolved: true,
      designatedAdvisorIdCommitment: advisorCommitment,
      businessAssignedToDesignatedAdvisor: true,
      leadsVisible: true,
      advisorVisible: true,
      advisorTargetedOutbox: true,
      businessStage: 'nuevo',
      origin: 'Web CotComp',
      retryReused: true,
      changedPayloadConflictDenied: true,
      cleanupDeletes: cleanup.deletes,
      finalAbsent: cleanup.absent,
      finalExpectedAbsent: cleanup.total
    }, null, 2) + '\n');
  } catch (error) {
    try { await deleteIfExists(db, refs); } catch (cleanupError) {}
    console.error(JSON.stringify({
      schemaVersion: 'ays-cotcomp-s507-designated-routing-rehearsal-v1',
      syntheticOnly: true,
      realCustomerDataUsed: false,
      productionTouched: false,
      error: clean(error && (error.code || error.message) || 'unknown', 180)
    }));
    process.exit(1);
  }
}

main();

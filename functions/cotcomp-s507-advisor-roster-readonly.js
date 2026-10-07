'use strict';

const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';

function clean(value, max = 160) {
  return String(value == null ? '' : value).trim().slice(0, max);
}
function norm(value) {
  return clean(value, 120).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
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
function advisorRole(row) {
  return roles(row).some(r => ['asesor','asesora','comercial'].includes(r) || r.startsWith('asesor_') || r.startsWith('asesora_'));
}
function eligible(row, country) {
  const cs = countries(row);
  return active(row) && advisorRole(row) && (!cs.length || cs.includes(country));
}
function triage(row) {
  return row.pilotTriage === true || row.publicHandoffTriage === true;
}

async function main() {
  if (PROJECT_ID !== EXPECTED_PROJECT_ID) throw new Error('WRONG_PROJECT');
  const app = getApps()[0] || initializeApp({ projectId: EXPECTED_PROJECT_ID });
  const db = getFirestore(app);
  const ref = db.collection('tenantId').doc(TENANT_ID).collection('asesores');
  const snap = await ref.get();
  const rows = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));

  const activeRows = rows.filter(active);
  const gt = rows.filter(row => eligible(row, 'GT'));
  const co = rows.filter(row => eligible(row, 'CO'));
  const gtTriage = gt.filter(triage);
  const coTriage = co.filter(triage);

  const result = {
    schemaVersion: 'ays-cotcomp-s507-advisor-roster-readonly-v1',
    projectId: EXPECTED_PROJECT_ID,
    tenantId: TENANT_ID,
    sourcePath: 'tenantId/{tenant}/asesores',
    readOnly: true,
    containsCustomerData: false,
    containsAdvisorPII: false,
    recordsScanned: rows.length,
    activeRows: activeRows.length,
    gtEligibleAdvisorCount: gt.length,
    coEligibleAdvisorCount: co.length,
    gtExplicitTriageCount: gtTriage.length,
    coExplicitTriageCount: coTriage.length,
    gtRoutingState: gtTriage.length === 1 ? 'EXPLICIT_TRIAGE_READY' : gt.length === 1 ? 'SOLE_ELIGIBLE_READY' : gt.length === 0 ? 'NO_ELIGIBLE_ADVISOR' : 'AMBIGUOUS_REQUIRES_RULE',
    coRoutingState: coTriage.length === 1 ? 'EXPLICIT_TRIAGE_READY' : co.length === 1 ? 'SOLE_ELIGIBLE_READY' : co.length === 0 ? 'NO_ELIGIBLE_ADVISOR' : 'AMBIGUOUS_REQUIRES_RULE'
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch(error => {
  console.error(JSON.stringify({
    schemaVersion: 'ays-cotcomp-s507-advisor-roster-readonly-v1',
    readOnly: true,
    containsCustomerData: false,
    containsAdvisorPII: false,
    error: clean(error && (error.code || error.message) || 'unknown', 160)
  }));
  process.exit(1);
});

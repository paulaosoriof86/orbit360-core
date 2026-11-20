'use strict';
const assert = require('node:assert/strict');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = 'ays-orbit-360-lab';
const caseDate = '2026-11-19';
const numbers = ['1-AU-136553', 'AUTO-47012', '91-8342189', 'AUTO-45016', 'AUTO-44959', 'AUTO - 509478'];
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const paid = r => norm(r.estado) === 'PAGADO' || norm(r.paymentState).startsWith('PAID_');
const isActive = r => r.carteraActiva !== false &&
  !['ANULADO','CANCELADO','CANCELADA','SUPERSEDED','REEMPLAZADO'].includes(norm(r.estadoCartera || r.estado));
function sequence(row) {
  for (const v of [row.numeroCuota, row.secuencia, row.referenciaCuotaInterna, row.cuota, row.numeroReciboFuente]) {
    const m = /^(\d{1,2})(?:\s*\/\s*\d{1,2})?$/.exec(String(v ?? '').trim());
    if (m) return Number(m[1]);
  }
  return null;
}
async function read() {
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  assert.ok(!process.env.FIRESTORE_EMULATOR_HOST);
  const db = getFirestore(initializeApp({projectId}));
  const data = db.collection('tenants').doc('alianzas-soluciones').collection('data');
  const items = key => data.doc(key).collection('items');
  const policies = await items('polizas').where('numero','in',numbers).limit(51).get();
  assert.ok(policies.size < 51);
  let matches = 0;
  for (const doc of policies.docs) {
    const p = doc.data();
    if (norm(p.pais) !== 'GT' || !p.clienteId || !p.vigenciaInicio || !p.vigenciaFin ||
        p.vigenciaInicio > caseDate || p.vigenciaFin <= caseDate) continue;
    const client = (await items('clientes').doc(p.clienteId).get()).data();
    if (!client) continue;
    const names = norm([client.nombre,client.nombreCompleto,client.nombres,client.apellido,client.apellidos].filter(Boolean).join(' '));
    if (!names.includes('EDSON') || !names.includes('MORATAYA') || !names.includes('PINEDA')) continue;
    matches++;
    const receipts = await items('recibosEsperados').where('polizaId','==',doc.id).limit(121).get();
    assert.ok(receipts.size <= 120);
    const quotas = [];
    for (const rd of receipts.docs) {
      const r = rd.data(), index = sequence(r);
      if (![1,2,3].includes(index)) continue;
      const [portfolio, collections] = await Promise.all(['carteraPrimas','cobros'].map(key =>
        items(key).where('reciboId','==',rd.id).limit(12).get()));
      assert.ok(portfolio.size < 12 && collections.size < 12);
      quotas.push({index, due:r.fechaVencimientoContractual||r.vence||r.fechaVencimiento||null,
        gross:r.primaTotal??null,receiptState:r.estado||null,receiptPaid:paid(r),
        portfolio:portfolio.size,activePortfolio:portfolio.docs.filter(x=>isActive(x.data())).length,
        cobros:collections.size,paidCobros:collections.docs.filter(x=>paid(x.data())).length});
    }
    console.log('I66_PAYMENT_INCIDENT_READBACK '+JSON.stringify({policy:p.numero,term:p.vigenciaInicio,
      receiptCount:receipts.size,quotas:quotas.sort((a,b)=>a.index-b.index),writes:0}));
  }
  assert.ok(matches > 0,'NO_VERIFIED_CURRENT_CLIENT_POLICY_MATCH');
}
read().catch(e=>{console.error(e.message); process.exitCode=1;});

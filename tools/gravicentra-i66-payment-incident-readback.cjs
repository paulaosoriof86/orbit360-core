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
  const batch = require('../artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_BULK_20261119_ROBLE_NOV20_259.json');
  const roster = await items('asesores').limit(401).get();
  assert.ok(roster.size < 401, 'ADVISOR_ROSTER_BOUND');
  const named = roster.docs.filter(doc => {
    const row = doc.data();
    return [row.nombre, row.nombreCompleto, row.displayName, row.name].some(value => {
      const words = norm(value).split(/\s+/);
      return words.includes('FERNANDO') && words.includes('ARIAS');
    }) && row.activo !== false && row.active !== false;
  });
  const expected = new Set(named.flatMap(doc => [doc.id, doc.data().id, doc.data().asesorId].filter(Boolean)));
  for (const caseId of ['ROBLE_NOV20_0001', 'ROBLE_NOV20_0006']) {
    const row = batch.rows.find(source => source.caseId === caseId && source.insurer === 'ROBLE');
    assert.ok(row, 'APPROVED_SOURCE_ROW_MISSING');
    const found = await items('polizas').where('numero', '==', row.policy).limit(12).get();
    assert.ok(found.size < 12, 'POLICY_EDITION_BOUND');
    const terms = found.docs.filter(doc => {
      const p = doc.data(), start = p.vigenciaInicio || p.vigenciaIni;
      return norm(p.pais)==='GT' && start && start <= caseDate && p.vigenciaFin > caseDate;
    });
    const result = {caseId, currentTerms:terms.length, matchingAdvisorProfiles:named.length, writes:0};
    if (terms.length === 1 && named.length === 1) {
      const policy = terms[0];
      result.policyAssignedToExpected = expected.has(policy.data().asesorId);
      result.policyHasAdvisor = Boolean(policy.data().asesorId);
      for (const collection of ['recibosEsperados','comisiones','finmovs']) {
        const linked = await items(collection).where('polizaId','==',policy.id).limit(121).get();
        assert.ok(linked.size < 121,'LINKED_COLLECTION_BOUND');
        if(collection==='recibosEsperados'){
          const expectedSource = caseId==='ROBLE_NOV20_0001' ? '0f31141ac773f188328e5b8ff052e3e4f965da6d9199b0931ef083121bc753b6' : '078593a923e602118f7075ab712979f517561c9711b6bb13f691dde1d52c795c';
          const referenceMatches = linked.docs.filter(doc => {
            const receipt=doc.data();
            return [receipt.numeroReciboFuente,receipt.numeroRequerimiento,receipt.requerimiento,receipt.referenciaAseguradora]
              .filter(Boolean).some(value => require('node:crypto').createHash('sha256')
                .update('ROBLE|'+row.policy+'|'+String(value).trim()).digest('hex') === expectedSource);
          });
          result.settledSourceReceiptMatches=referenceMatches.length;
          if(referenceMatches.length===1){
            const target=referenceMatches[0], receipt=target.data();
            result.sourceReceiptAssignedToExpected=expected.has(receipt.asesorId);
            result.sourceReceiptPaid=paid(receipt);
            const issued=await items('cobros').where('reciboId','==',target.id).limit(6).get();
            assert.ok(issued.size<6,'SOURCE_RECEIPT_PAYMENTS_BOUND');
            result.linkedPayments=issued.size;
          }
        }
        result[collection] = {count:linked.size,
          rowsWithAdvisor:linked.docs.filter(doc=>Boolean(doc.data().asesorId)).length,
          expectedAdvisor:linked.docs.filter(doc=>expected.has(doc.data().asesorId)).length};
      }
    }
    console.log('I66_ADVISOR_ASSIGNMENT_READBACK '+JSON.stringify(result));
  }

  // Restrict the read to GT clients in the two outstanding issuance cases.
  // Log only aggregate relationships; names, document IDs and vehicle data stay in Firestore.
  for(const [label,prefixes,surnames] of [
    ['policy_capture',['Sergio','SERGIO'],['LOPEZ']],
    ['vehicle_change',['Ashlyn','ASHLYN','Ashley','ASHLEY'],['AGUILAR']]
  ]){
    const candidates=new Map();
    for(const prefix of prefixes){
      const docs=await items('clientes').where('nombre','>=',prefix).where('nombre','<=',prefix+'\uf8ff').limit(41).get();
      assert.ok(docs.size<41,'CLIENT_PREFIX_SCAN_AMBIGUOUS');
      for(const doc of docs.docs){
        const client=doc.data(),words=norm(client.nombre).split(/\s+/);
        if(norm(client.pais)==='GT' && surnames.every(s=>words.includes(s))) candidates.set(doc.id,doc);
      }
    }
    const caseResult={label,matchedScopedClients:candidates.size,writes:0};
    if(candidates.size===1){
      const client=[...candidates.values()][0];
      const policies=await items('polizas').where('clienteId','==',client.id).limit(41).get();
      assert.ok(policies.size<41,'CLIENT_POLICY_SCAN_BOUND');
      caseResult.linkedPolicies=policies.size;
      const current=policies.docs.filter(doc=>{
        const p=doc.data(),start=p.vigenciaInicio||p.vigenciaIni;
        return norm(p.pais)==='GT' && start && start<='2026-11-20' && p.vigenciaFin>'2026-11-20';
      });
      caseResult.currentTerms=current.length;caseResult.currentRelations=[];
      for(const doc of current){
        const counts={};
        for(const key of ['vehiculos','endosos','recibosEsperados','carteraPrimas']){
          const linked=await items(key).where('polizaId','==',doc.id).limit(121).get();
          assert.ok(linked.size<121,'POLICY_RELATION_BOUND');
          counts[key]=linked.size;
          if(key==='endosos')counts.markedIssuedSubstitutions=linked.docs.filter(item=>{
            const row=item.data();
            return /SUSTITUCION|SUSTITUCION_VEHICULAR/.test(norm([row.tipo,row.tipoEndoso,row.subtipo].join(' '))) &&
              /EMITID|APLICAD/.test(norm([row.estado,row.estadoEmision].join(' ')));
          }).length;
        }
        caseResult.currentRelations.push(counts);
      }
    }
    console.log('I66_OUTSTANDING_ISSUANCE_READBACK '+JSON.stringify(caseResult));
  }
}
read().catch(e=>{console.error(e.message); process.exitCode=1;});

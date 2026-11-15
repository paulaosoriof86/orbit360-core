'use strict';

// A statement credited by the insurer is valid evidence. A bank transfer is
// NOT an additional prerequisite. This owner prepares a payable, never a payment.
const crypto = require('node:crypto');
const SCHEMA = 'gravicentra-advisor-commission-payable-v1';
const text = value => String(value == null ? '' : value).trim();
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const fingerprint = value => hash(JSON.stringify(stable(value)));
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function id(value, label) {
  const v = text(value);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,255}$/.test(v)) fail('INVALID_ID', `${label} requerido o inválido.`);
  return v;
}
function date(value, label) {
  const v = text(value), parsed = new Date(v + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== v)
    fail('INVALID_DATE', `${label} requerido o inválido.`);
  return v;
}
function cents(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1e9 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001)
    fail('INVALID_AMOUNT', `${label} debe ser un importe positivo con máximo dos decimales.`);
  return Math.round(value * 100);
}
function share(participation, advisor) {
  const supplied = participation && participation.pct !== undefined;
  const pct = supplied ? participation.pct : advisor.shareCom;
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0 || pct > 100 || Math.abs(pct * 100 - Math.round(pct * 100)) > 0.00001)
    fail('PARTICIPATION_REQUIRED', 'Falta la participación explícita del asesor; no se aplica un porcentaje por defecto.');
  const authorityRef = text(supplied ? participation.authorityRef : advisor.commissionAuthorityRef);
  if (supplied && !authorityRef) fail('PARTICIPATION_AUTHORITY_REQUIRED', 'El porcentaje específico requiere su referencia de aprobación.');
  if (!supplied && advisor.comModo && advisor.comModo !== 'comision') fail('PARTICIPATION_MODE_UNSUPPORTED', 'Esta liquidación es participación sobre comisión ordinaria, no sobre prima ni importe fijo.');
  return { pct, authorityRef: authorityRef || 'canonical-advisor:' + advisor.id };
}
function documentedBasis(raw) {
  const fields = {};
  // Optional source metadata, never a substitute for the ordinary amount
  // credited by the insurer and never inferred from the current policy rate.
  if (Object.prototype.hasOwnProperty.call(raw, 'base')) fields.base = cents(raw.base, 'Prima neta documental') / 100;
  if (Object.prototype.hasOwnProperty.call(raw, 'pct')) {
    const pct = raw.pct;
    if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0 || pct > 100 || Math.abs(pct * 10000 - Math.round(pct * 10000)) > 0.00001)
      fail('INVALID_INSURER_RATE', 'El porcentaje documental de aseguradora debe ser positivo, hasta 100 y con máximo cuatro decimales.');
    fields.pct = pct;
  }
  return fields;
}
function normalizeLine(raw, context) {
  const { tenantId, advisor, policy, cutoff } = context;
  if (!policy || !policy.id) fail('POLICY_NOT_FOUND', 'La póliza exacta de la línea no está registrada.');
  if (text(policy.asesorId || policy.advisorId) !== text(advisor.id))
    fail('ADVISOR_POLICY_CONFLICT', `La póliza ${policy.numero || policy.id} no está asignada a ${advisor.nombre || advisor.id}.`);
  const country = text(policy.pais || policy.country).toUpperCase();
  if (!['GT', 'CO'].includes(country)) fail('POLICY_COUNTRY_REQUIRED', 'La póliza necesita país canónico.');
  if (!text(policy.clienteId)) fail('POLICY_CLIENT_REQUIRED', 'La póliza necesita cliente canónico.');
  const source = raw.source || {};
  const fileId = id(source.fileId, 'Archivo fuente'), lineId = text(source.lineId);
  if (!lineId || lineId.length > 300 || /[\r\n]/.test(lineId)) fail('SOURCE_LINE_REQUIRED', 'Se requiere hoja/renglón o referencia exacta de la planilla.');
  if (!/^[a-f0-9]{64}$/i.test(text(source.sha256))) fail('SOURCE_DIGEST_REQUIRED', 'La planilla necesita su digest SHA-256.');
  const reference = text(source.reference);
  if (!reference || reference.length > 1500) fail('SOURCE_REFERENCE_REQUIRED', 'Se requiere la referencia documental de la planilla.');
  const requirementRef=text(source.requirementRef);
  if(!requirementRef||requirementRef.length>180)fail('SOURCE_REQUIREMENT_REQUIRED','Se requiere el requerimiento o recibo acreditado para impedir duplicados entre archivos.');
  const accreditation = raw.accreditation || {};
  if (!['paid', 'accredited'].includes(accreditation.status))
    fail('COMMISSION_NOT_ACCREDITED', 'La línea debe acreditar o pagar comisión a A&S; una proyección o factura por cobrar no basta.');
  const accreditationDate = date(accreditation.date, 'Fecha de acreditación'), cutoffDate = date(cutoff, 'Corte');
  if (accreditationDate > cutoffDate) fail('ACCREDITATION_AFTER_CUTOFF', 'La acreditación es posterior al corte.');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(text(raw.collectionPeriod))) fail('COLLECTION_PERIOD_REQUIRED', 'Falta el periodo de recaudo subyacente; no se toma del mes de factura.');
  const currency = text(raw.moneda || raw.currency).toUpperCase();
  if (!['GTQ', 'COP', 'USD'].includes(currency)) fail('CURRENCY_REQUIRED', 'Moneda explícita requerida.');
  if (policy.moneda && text(policy.moneda).toUpperCase() !== currency) fail('POLICY_CURRENCY_CONFLICT', 'Moneda de comisión y póliza no coinciden; no se convierte automáticamente.');
  if (raw.commissionKind !== 'ordinary') fail('ORDINARY_COMMISSION_REQUIRED', 'Debe identificarse la base ordinaria aprobada, separada de IVA e incentivos extraordinarios.');
  const amountCents = cents(raw.ordinaryCommission, 'Comisión ordinaria acreditada');
  const basis = documentedBasis(raw);
  const participation = share(raw.participation, advisor);
  const advisorCents = Math.round(amountCents * Math.round(participation.pct * 100) / 10000);
  if (advisorCents <= 0) fail('EMPTY_PAYABLE', 'El importe resultante de la CxP es cero.');
  const sourceKey = `${tenantId}|${fileId}|${lineId}`;
  const economicKey=`${tenantId}|${policy.id}|${requirementRef.toUpperCase().replace(/\s+/g,'')}|${raw.collectionPeriod}|${currency}`;
  // The cutoff is descriptive, never part of deduplication: a different cutoff
  // cannot pay the same credited source line a second time.
  const payableKey = `${economicKey}|${advisor.id}`;
  const synthetic = context.synthetic === true ? 'b4003qa_' : '';
  const commissionId = text(raw.commissionId) || synthetic + 'comsrc_' + hash(economicKey).slice(0, 36);
  const payableId = synthetic + 'cxpase_' + hash(payableKey).slice(0, 36);
  // This command validates amounts and canonical relationships, not the remote
  // document bytes. A supplied hash/reference is a Direction-approved declaration.
  const sourceProvenance = {
    kind: context.sourceMode === 'canonical' && context.sourceProvenance?.kind !== 'DIRECTION_DECLARED_DOCUMENTED_IMPORT'
      ? 'CANONICAL_COMMISSION_RECORD' : 'DIRECTION_DECLARED_DOCUMENTED_IMPORT',
    documentAuthenticatedByServer: false
  };
  const row = {
    schemaVersion: SCHEMA, id: payableId, tenantId, tipo: 'egreso', clase: 'Comisiones asesores',
    categoria: 'Comisiones asesores', estado: 'pendiente', pagada: false,
    periodo: cutoffDate.slice(0, 7), dia: Number(cutoffDate.slice(8)), fechaCorte: cutoffDate,
    periodoRecaudo: raw.collectionPeriod, fechaAcreditacionComision: accreditationDate,
    asesorId: advisor.id, beneficiario: advisor.nombre || advisor.id,
    clienteId: policy.clienteId, polizaId: policy.id, polizaNumero: policy.numero || '',
    aseguradoraId: policy.aseguradoraId || '', reciboId: text(raw.reciboId),
    moneda: currency, pais: country, comisionId: commissionId,
    comisionOrdinariaAcreditada: amountCents / 100, pctAsesor: participation.pct,
    participationAuthorityRef: participation.authorityRef,
    valor: advisorCents / 100, pendiente: advisorCents / 100, pagado: 0,
    source: { fileId, lineId, sha256: source.sha256.toLowerCase(), reference, requirementRef },
    sourceKey, economicKey, payableKey, accreditationStatus: accreditation.status, sourceProvenance,
    concepto: `Comisión ${policy.numero || policy.id} · ${raw.collectionPeriod} · ${advisor.nombre || advisor.id}`,
    noBankMovement: true, serverOwned: true, ...basis
  };
  row.financialDigest = fingerprint({ economicKey, asesorId: row.asesorId, polizaId: row.polizaId,
    reciboId: row.reciboId, moneda: currency, ordinaryCents: amountCents, advisorCents,
    share: participation.pct, sourceDigest: row.source.sha256, accreditationDate,
    accreditationStatus: accreditation.status, collectionPeriod: raw.collectionPeriod,
    ...(Object.keys(basis).length ? { documentedCommissionBasis: basis } : {}) });
  if (context.synthetic) row.__syntheticQa = true;
  const commission = {
    id: commissionId, tenantId, schemaVersion: SCHEMA, pais: country, moneda: currency,
    clienteId: policy.clienteId, polizaId: policy.id, asesorId: advisor.id,
    aseguradoraId: policy.aseguradoraId || '', reciboId: text(raw.reciboId),
    periodo: raw.collectionPeriod, monto: amountCents / 100, estado: 'Devengada',
    montoAsesor: advisorCents / 100, pctAsesor: participation.pct,
    origen: 'planilla_comision_acreditada', source: row.source, sourceKey, economicKey, sourceProvenance,
    commissionKind: 'ordinary', commissionAccreditation: { status: accreditation.status, date: accreditationDate },
    participation, financialDigest: row.financialDigest, cxpAsesorId: payableId, serverOwned: true, ...basis,
    ...(context.synthetic ? { __syntheticQa: true } : {})
  };
  return { payable: row, commission, financialDigest: row.financialDigest };
}
function fromCanonicalCommission(commission) {
  if (!commission || ['liquidada','liquidado','pagada','pagado'].includes(text(commission.estado).toLowerCase()) || commission.pagada === true)
    fail('COMMISSION_ALREADY_SETTLED', 'La comisión ya figura liquidada; no se vuelve a generar una deuda.');
  return {
    commissionId: commission.id, polizaId: commission.polizaId, reciboId: commission.reciboId,
    source: commission.source, ordinaryCommission: commission.monto,
    commissionKind: commission.commissionKind,
    accreditation: commission.commissionAccreditation,
    collectionPeriod: commission.periodo, moneda: commission.moneda,
    participation: commission.participation || (commission.pctAsesor != null
      ? { pct: commission.pctAsesor, authorityRef: commission.participationAuthorityRef } : null),
    ...(Object.prototype.hasOwnProperty.call(commission, 'base') ? { base: commission.base } : {}),
    ...(Object.prototype.hasOwnProperty.call(commission, 'pct') ? { pct: commission.pct } : {})
  };
}
function compatiblePayable(existing, planned) {
  // A retained digest is not proof when a stored amount/beneficiary was edited
  // out of band. Only payment state/balances may legitimately evolve later.
  const immutable=['id','tenantId','asesorId','polizaId','clienteId','comisionId','moneda','pais','valor',
    'comisionOrdinariaAcreditada','pctAsesor','economicKey','payableKey','periodoRecaudo','base','pct'];
  return !!existing && existing.schemaVersion === SCHEMA && existing.financialDigest === planned.financialDigest &&
    immutable.every(key=>existing[key]===planned[key]);
}
module.exports = { SCHEMA, normalizeLine, fromCanonicalCommission, compatiblePayable, fingerprint, date, id };

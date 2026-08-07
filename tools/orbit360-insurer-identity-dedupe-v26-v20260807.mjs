#!/usr/bin/env node
'use strict';

const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
const text = value => String(value == null ? '' : value).trim();
const first = (row, fields) => {
  for (const field of fields) {
    const value = norm(row && row[field]);
    if (value) return { field, value };
  }
  return { field: '', value: '' };
};

export const INSURER_IDENTITY_CONTRACT_V26 = Object.freeze({
  sourceCodeUniqueness: 'not_assumed',
  legalIdentityFields: ['nit', 'identificacionFiscal', 'taxId'],
  sourceCodeFields: ['codigoIntermediario', 'codigo'],
  countryFields: ['pais', 'country'],
  entityTypeFields: ['tipoEntidad', 'tipoPersona', 'entityType', 'organizationType'],
  provenanceFields: ['sourceType', 'source', 'batchTemplate', 'importBatchId', 'batchId']
});

function countryOf(row) {
  for (const field of INSURER_IDENTITY_CONTRACT_V26.countryFields) {
    const value = text(row && row[field]).toUpperCase();
    if (value) return value;
  }
  return '';
}
function entityTypeOf(row) {
  for (const field of INSURER_IDENTITY_CONTRACT_V26.entityTypeFields) {
    const value = norm(row && row[field]);
    if (value) return value;
  }
  return 'unspecified';
}
function provenanceOf(row) {
  const migration = row && (row._migration || row.migration) || {};
  const candidates = [
    row && row.sourceType,
    row && row.source,
    row && row.batchTemplate,
    row && row.importBatchId,
    row && row.batchId,
    migration.sourceType,
    migration.source,
    migration.batchTemplate,
    migration.batchId
  ].map(norm).filter(Boolean);
  return candidates[0] || 'unspecified';
}

export function insurerIdentity(row, contract = INSURER_IDENTITY_CONTRACT_V26) {
  const legal = first(row, contract.legalIdentityFields || []);
  const sourceCode = first(row, contract.sourceCodeFields || []);
  const country = countryOf(row);
  const entityType = entityTypeOf(row);
  const provenance = provenanceOf(row);
  const legalComposite = legal.value ? [country || 'unknown', entityType, legal.field, legal.value].join('|') : '';
  const sourceComposite = sourceCode.value ? [provenance, country || 'unknown', entityType, sourceCode.field, sourceCode.value].join('|') : '';
  return { country, entityType, provenance, legalField: legal.field, legalValue: legal.value, legalComposite, sourceCodeField: sourceCode.field, sourceCodeValue: sourceCode.value, sourceComposite };
}

export function adjudicateInsurerIdentityRows(rows, contract = INSURER_IDENTITY_CONTRACT_V26) {
  const ordered = rows.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const identities = ordered.map(item => ({ item, identity: insurerIdentity(item.data || {}, contract) }));
  const legalCounts = new Map();
  const sourceGroups = new Map();
  for (const entry of identities) {
    if (entry.identity.legalComposite) legalCounts.set(entry.identity.legalComposite, (legalCounts.get(entry.identity.legalComposite) || 0) + 1);
    if (entry.identity.sourceCodeValue) {
      const key = entry.identity.sourceCodeValue;
      if (!sourceGroups.has(key)) sourceGroups.set(key, []);
      sourceGroups.get(key).push(entry);
    }
  }
  const seenLegal = new Set();
  const output = [];
  for (const entry of identities) {
    const { item, identity } = entry;
    const legalDuplicate = !!identity.legalComposite && (legalCounts.get(identity.legalComposite) || 0) > 1 && seenLegal.has(identity.legalComposite);
    if (identity.legalComposite) seenLegal.add(identity.legalComposite);
    const sourcePeers = identity.sourceCodeValue ? (sourceGroups.get(identity.sourceCodeValue) || []) : [];
    const sourceCollision = sourcePeers.length > 1;
    let ambiguousSourceCollision = false;
    let sourceContractConflict = false;
    if (sourceCollision) {
      const peerIdentityKeys = new Set(sourcePeers.map(x => x.identity.legalComposite || [x.identity.country, x.identity.entityType, x.identity.provenance].join('|')));
      ambiguousSourceCollision = peerIdentityKeys.size > 1 || sourcePeers.some(x => !x.identity.legalComposite);
      sourceContractConflict = contract.sourceCodeUniqueness === 'global' && ambiguousSourceCollision;
    }
    const excludedAsDuplicate = legalDuplicate;
    const requiresValidation = !excludedAsDuplicate && (ambiguousSourceCollision || sourceContractConflict);
    output.push({
      id: item.id,
      duplicate: excludedAsDuplicate,
      duplicateBasis: excludedAsDuplicate ? 'legal_identity_country_entity_type' : null,
      sourceCodeCollision: sourceCollision,
      sourceCodeCollisionAmbiguous: ambiguousSourceCollision,
      sourceCodeContractConflict: sourceContractConflict,
      requiresValidation,
      effective: !excludedAsDuplicate,
      identity: {
        hasLegalIdentity: !!identity.legalComposite,
        hasSourceCode: !!identity.sourceCodeValue,
        countryPresent: !!identity.country,
        entityTypePresent: identity.entityType !== 'unspecified',
        provenancePresent: identity.provenance !== 'unspecified'
      }
    });
  }
  return output;
}

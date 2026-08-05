#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const INIT = 'orbit360-platform/core/backend-lab-init.js';
const BRIDGE = 'orbit360-platform/core/backend-lab-advisor-write-bridge.js';
const CATALOG = 'orbit360-platform/core/backend-lab-advisor-catalog.js';

function patch(file, mutate) {
  const before = fs.readFileSync(file, 'utf8');
  const after = mutate(before);
  if (!after || after === before) return { file, changed: false };
  fs.writeFileSync(file, after, 'utf8');
  return { file, changed: true };
}

const results = [];
results.push(patch(INIT, source => {
  const line = "    loadScriptOnce('core/backend-lab-advisor-write-bridge.js?v=20260717-1', 'advisor-write-bridge');\n";
  if (!source.includes(line)) {
    if (source.includes('advisor-write-bridge')) throw new Error('VALIDATOR_STALE:ADVISOR_BRIDGE_LOAD_SHAPE_CHANGED');
    return source;
  }
  return source.replace(line, "    // El catálogo inicial ya no se superpone al Equipo operativo.\n");
}));

results.push(patch(BRIDGE, source => {
  const guard = "  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;";
  const replacement = "  var migrationMode = new URLSearchParams(window.location.search || '').get('orbitInitialAdvisorMigration') === '1';\n  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones' || !migrationMode) return;";
  if (source.includes(replacement)) return source;
  if (!source.includes(guard)) throw new Error('VALIDATOR_STALE:ADVISOR_WRITE_BRIDGE_GUARD_CHANGED');
  return source.replace(guard, replacement)
    .replace("if (!Array.isArray(config.advisors) || config.advisors.length !== 7) throw new Error('El catálogo debe contener siete asesores.');", "if (!Array.isArray(config.advisors) || config.advisors.length < 1) throw new Error('El catálogo inicial no contiene asesores.');");
}));

results.push(patch(CATALOG, source => {
  const guard = "  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;";
  const replacement = "  var migrationMode = new URLSearchParams(window.location.search || '').get('orbitInitialAdvisorMigration') === '1';\n  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones' || !migrationMode) return;";
  if (source.includes(replacement)) return source;
  if (!source.includes(guard)) throw new Error('VALIDATOR_STALE:ADVISOR_CATALOG_GUARD_CHANGED');
  return source.replace(guard, replacement)
    .replace("if (!Array.isArray(config.advisors) || config.advisors.length !== 7) throw new Error('CATALOGO_ASESORES_CONTEO');", "if (!Array.isArray(config.advisors) || config.advisors.length < 1) throw new Error('CATALOGO_ASESORES_VACIO');");
}));

console.log(JSON.stringify({
  schemaVersion: 'orbit360-dynamic-team-authority-sourcefix-v1',
  authoritativeStoreCollection: 'tenantId/{tenantId}/asesores',
  initialCatalogRuntimeOverlay: false,
  initialCatalogExplicitMigrationOnly: true,
  exactUserCountHardcodeRemoved: true,
  results,
  ok: true
}, null, 2));

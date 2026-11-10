'use strict';

// I6.6 · Contrato UI focal, sin crear pólizas, clientes o pagos.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const cliente360 = source('orbit360-platform/modules/cliente360.js');
const bridge = source('orbit360-platform/modules/policy-receipts-v1199-bridge.js');
const engine = source('orbit360-platform/core/policy-receipts-engine.js');

const ctas = cliente360.split(/\r?\n/).filter(line => line.includes('title="Crear póliza vinculada a este cliente"'));
assert.equal(ctas.length, 1, 'Una sola CTA por ficha Cliente360');
const renderCta = new Function('Orbit', 'cid', 'return `' + ctas[0].trim() + '`;');
const operativeHtml = renderCta({ policyReceipts: { canManagePolicies: () => true } }, 'cli_co_qa_001');
assert.match(operativeHtml, /\+ Crear póliza/);
assert.ok(operativeHtml.includes("Orbit.modules.cliente360.nuevaPoliza('cli_co_qa_001')"), 'Entrega exactamente el cliente de la ficha');
assert.equal((operativeHtml.match(/<button\b/g) || []).length, 1);
assert.equal(renderCta({ policyReceipts: { canManagePolicies: () => false } }, 'cli_co_qa_001'), '', 'Asesor sin permiso no recibe CTA');
assert.equal(renderCta({}, 'cli_co_qa_001'), '', 'Si el owner de permisos no está listo, falla cerrado');

assert.ok(bridge.includes('clientMod.nuevaPoliza=function(clientId)'), 'Reutiliza la ruta canónica ya existente');
assert.ok(bridge.includes('return openPolicyForm({clientId:c.id});'), 'Transfiere el clientId al formulario');
assert.ok(bridge.includes("A.canView('clientes', selectedClient, 'cliente360')"), 'Exige alcance autorizado del cliente');
assert.ok(bridge.includes('const country = existing && existing.pais || selectedClient.pais;'), 'País procede del cliente seleccionado');
assert.ok(bridge.includes('tenantId: existing && existing.tenantId || A.tenantId(), clienteId: c.id'), 'Vínculo físico cliente/tenant');
assert.ok(bridge.includes("location.hash = '#/cliente360?c=' + encodeURIComponent(result.policy.clienteId) + '&t=polizas';"), 'Vuelve a la ficha tras guardar');

assert.ok(engine.includes("const MANAGE_ROLES = new Set(['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin', 'Operativo'])"), 'Se conserva rol Operativo y no se promueve Asesor globalmente');
console.log('I6_6_CLIENTE360_POLICY_CTA=PASS');

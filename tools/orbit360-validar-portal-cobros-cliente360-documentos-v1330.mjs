#!/usr/bin/env node
/**
 * Orbit 360 A&S — validador estático plan-only Portal/Cobros/Cliente360 documentos v1330.
 * No usa red, no lee datos reales, no escribe remoto. Solo escanea código fuente local.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const files = {
  portal: path.join(ROOT, 'orbit360-platform/modules/portal.js'),
  cobros: path.join(ROOT, 'orbit360-platform/modules/cobros.js'),
  cliente360: path.join(ROOT, 'orbit360-platform/modules/cliente360.js')
};

const errors = [];
const warnings = [];
const ok = [];

function read(label) {
  const p = files[label];
  if (!fs.existsSync(p)) {
    errors.push(`Falta archivo ${p}`);
    return '';
  }
  return fs.readFileSync(p, 'utf8');
}
function has(txt, rx) { return rx.test(txt); }
function check(label, cond, message, severity = 'error') {
  if (cond) ok.push(`${label}: ${message}`);
  else (severity === 'warn' ? warnings : errors).push(`${label}: ${message}`);
}

const portal = read('portal');
const cobros = read('cobros');
const cliente360 = read('cliente360');

check('portal', has(portal, /function\s+reportarPago/), 'tiene flujo reportarPago');
check('portal', has(portal, /pendiente de revisi[oó]n\/conciliaci[oó]n|pendiente de validar|pendiente de validaci[oó]n/i), 'copy reportado mantiene estado pendiente');
check('portal', has(portal, /soporteNombre/), 'conserva nombre de soporte reportado', 'warn');
check('portal', has(portal, /S\(\)\.insert\('documentos'/), 'crea registro en documentos para subir documento general');
check('portal', !has(portal, /readAsDataURL|base64|fileBytes|bytes|downloadUrl|publicUrl/), 'no embebe payload/base64/URLs públicas en portal');
check('portal', has(portal, /archivoPendienteStorage|Storage pendiente|Storage\/backend conectado|Storage conectado/i), 'declara Storage pendiente/no conectado', 'warn');

check('cobros', has(cobros, /function\s+estadoValidacion/), 'tiene estado de validación visible');
check('cobros', has(cobros, /Reportado por cliente|En revisión|Validada \(por aplicar\)|Requiere validación/), 'diferencia reportado/validado/aplicado');
check('cobros', has(cobros, /function\s+validarReporte/), 'tiene flujo validarReporte');
check('cobros', has(cobros, /validadoReporte/), 'marca validadoReporte sin aplicar pago');
check('cobros', !has(cobros, /readAsDataURL\(fi\.files\[0\]\)|base64|fileBytes|downloadUrl|publicUrl/), 'no guarda payload/base64/URL pública en Cobros', 'warn');
check('cobros', has(cobros, /motivo|audit|auditoria|auditLog/i), 'acciones sensibles con motivo/auditoría', 'warn');

check('cliente360', has(cliente360, /cobBadge|estado de validaci[oó]n/i), 'Cliente360 diferencia estados de cobro');
check('cliente360', has(cliente360, /documentos|adjuntos|parchesPendientes/i), 'Cliente360 muestra documentos/adjuntos/parches visibles', 'warn');
check('cliente360', !has(cliente360, /base64|fileBytes|downloadUrl|publicUrl/), 'Cliente360 no embebe payload documental');

const result = {
  ok: errors.length === 0,
  status: errors.length ? 'bloqueado' : warnings.length ? 'requiere_revision' : 'ok',
  errors,
  warnings,
  passed: ok
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

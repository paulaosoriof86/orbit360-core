#!/usr/bin/env node
/**
 * Orbit 360 A&S — aplicar hotfix P0 Academia post v1330.
 *
 * Uso desde raíz del repo:
 *   node orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-ACADEMIA-POST-V1330.mjs
 *
 * Hace backup, toca solo data/academia-plus.js, valida sintaxis y genera reporte.
 * No commit, no push, no deploy, no backend protegido, no index.html.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const academiaPath = path.join(ROOT, 'orbit360-platform/data/academia-plus.js');
const backupRoot = path.join(ROOT, '_backups', `pre_hotfix_p0_academia_post_v1330_${stamp}`);
const reportRoot = path.join(ROOT, '_orbit360_reports');
const reportFile = path.join(reportRoot, `hotfix_p0_academia_post_v1330_${stamp}.md`);
const marker = 'ORBIT360 V1330 HOTFIX P0 ACADEMIA POST';

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }
function read(file) { if (!fs.existsSync(file)) fail('No existe ' + file); return fs.readFileSync(file, 'utf8'); }
function write(file, txt) { fs.writeFileSync(file, txt, 'utf8'); }
function backup(file) { fs.mkdirSync(backupRoot, { recursive: true }); fs.copyFileSync(file, path.join(backupRoot, path.basename(file))); }
function check(file) { const r = spawnSync('node', ['--check', file], { cwd: ROOT, encoding: 'utf8' }); return { file, code: r.status || 0, stderr: r.stderr || '' }; }
function branch() { const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }); return (r.stdout || '').trim(); }

const courseBlock = `
    /* ${marker} START */
    {
      id: 'cur_p_roles_permisos_auditoria_v1330', titulo: 'Roles, permisos y auditoría segura Orbit 360', cat: 'Producto', emoji: '🔐', color: C.graf,
      desc: 'Ruta profunda para administrar usuarios, permisos, acciones sensibles y bitácora sin exponer el tenant.', destinatarios: 'admin',
      recursos: [
        { nombre: 'Matriz roles/permisos v1330', tipo: 'guia' },
        { nombre: 'Contrato auditoría unificada v1330', tipo: 'guia' }
      ],
      lecciones: [
        L('Matriz de roles y alcance por módulo', 14, [
          S('👥', 'Roles base reutilizables', C.azul, 'Orbit 360 separa Dirección, AdminTenant, IT/Seguridad, Finanzas, Cobros, Operativo, Asesor, Marketing, AcademiaAdmin, ClientePortal y AuditorSoloLectura. Cada rol ve y ejecuta solo lo necesario para su operación. No se debe resolver un permiso con código duro del cliente.'),
          S('🧭', 'Permisos por módulo', C.verde, 'Los módulos se activan por tenant y los permisos se controlan por rol, módulo y acción. Un asesor ve su cartera; ClientePortal ve solo su portal; AuditorSoloLectura revisa sin ejecutar. El objetivo es que la plataforma sea administrable sin abrir riesgos.'),
          S('🚫', 'Último administrador protegido', C.red, 'Nunca se puede dejar un tenant sin administrador activo. Inactivar usuarios, cambiar roles o resetear permisos son acciones sensibles: requieren motivo, auditoría y, cuando aplica, confirmación reforzada.')
        ]),
        L('Acciones sensibles: motivo, confirmación y bloqueo', 13, [
          S('✍️', 'Motivo obligatorio', C.ocre, 'Crear/editar/inactivar usuarios, guardar módulos, cambiar plan, validar pagos, aplicar pagos, validar conciliaciones y cambiar visibilidad documental deben registrar motivo. Un motivo no autoriza por sí solo, pero deja trazabilidad para Dirección, Admin e IT.'),
          S('⚠️', 'Confirmación reforzada', C.red, 'Resetear configuración, restablecer permisos, anular conciliaciones, aplicar diffs, mostrar documentos sensibles al cliente o enviar mensajes masivos requieren confirmación reforzada. El sistema debe bloquear si la confirmación no coincide.'),
          S('🧱', 'Bloqueos sanos', C.graf, 'Un bloqueo no es error: protege el tenant. Ejemplos: falta país/moneda, moneda incoherente, último admin activo, integración sin proveedor, documento sin diff aprobado o soporte de pago no validado.')
        ]),
        L('Auditoría unificada y qué NO registrar', 15, [
          S('📜', 'Shape común de bitácora', C.teal, 'Toda acción sensible debe registrar tenantId, fecha, actor, rol, módulo, acción, categoría, severidad, motivo, entidad, before/after minimizados, resultado y bloqueos. La bitácora se consulta por rol: Dirección/Admin/IT tienen vista amplia; ClientePortal solo ve su historial propio simplificado.'),
          S('🔒', 'Datos prohibidos', C.red, 'La bitácora nunca debe guardar contraseñas, tokens, API keys, secretos, base64, bytes, documentos completos, payloads bancarios completos ni datos personales innecesarios. Las integraciones usan referencias conceptuales como credentialRef/backend_required hasta que exista canal seguro.'),
          S('👁', 'Historial cliente vs interno', C.azul, 'El cliente debe ver estados claros: recibido, en revisión, requiere aclaración, aplicado cuando corresponda. No debe ver motivos internos sensibles ni trazas técnicas. El equipo sí ve motivos, bloqueos y responsables según permiso.')
        ]),
        L('Casos prácticos de operación segura', 16, [
          S('💳', 'Cobros', C.verde, 'Validar un reporte de pago no aplica pago. Aplicar pago exige motivo, país/moneda válidos y autorización. Una factura queda como metadata-only hasta revisión; no concilia automáticamente.'),
          S('🏦', 'Conciliaciones M5', C.violeta, 'Validar una conciliación significa validada no aplicada. La bandeja M5 no toca cobros, no baja cartera, no crea finmovs y no suma monedas en crudo. Anular exige confirmación reforzada.'),
          S('🔌', 'Integraciones', C.ocre, 'Configurar una integración significa dejarla preparada. Activa solo cuando proveedor, credencial segura y backend estén conectados. No pegues secretos en el navegador ni en el store del prototipo.')
        ]),
        Q('Evaluación · Roles, permisos y auditoría v1330', [
          { p: '¿Qué ocurre si intentas inactivar el último administrador activo?', ops: ['Se permite si hay motivo', 'Debe bloquearse para proteger el tenant', 'Se convierte en asesor automáticamente'], ok: 1 },
          { p: '¿Qué significa una conciliación validada en M5?', ops: ['Pago aplicado', 'Cobro confirmado', 'Propuesta validada no aplicada'], ok: 2 },
          { p: '¿Dónde debe guardarse una API key real?', ops: ['En el frontend', 'En store pref como texto', 'En un canal/backend seguro; el prototipo solo usa credentialRef'], ok: 2 },
          { p: '¿Qué datos NO deben aparecer en auditLog?', ops: ['Motivo y acción', 'Tokens/base64/documentos completos', 'Módulo y resultado'], ok: 1 }
        ])
      ]
    },
    {
      id: 'cur_p_modificaciones_locales_post_v1330', titulo: 'Cambios locales post-Claude y continuidad del prototipo', cat: 'Producto', emoji: '🧩', color: C.violeta,
      desc: 'Ruta para que el equipo y Claude conserven los hotfixes hechos después de la candidata v1330.', destinatarios: 'admin',
      recursos: [{ nombre: 'Registro modificaciones locales post v1330', tipo: 'bitacora' }],
      lecciones: [
        L('Qué cambió después de Claude', 12, [
          S('🧾', 'Cobros y Conciliaciones', C.verde, 'Se prepararon hotfixes para quitar base64, exigir motivo, validar país/moneda, registrar auditoría y diferenciar validado no aplicado de pago aplicado. Estos patrones deben conservarse en cualquier candidata futura.'),
          S('📁', 'Portal Documentos', C.azul, 'El soporte de pago debe registrarse como documento metadata-only vinculado al cobro. Reportar soporte no aplica pago. El cliente ve historial claro y el equipo revisa internamente.'),
          S('⚙️', 'Config/Equipo', C.ocre, 'Integraciones preparadas usan credentialRef/backend_required. Crear/editar/inactivar usuarios, resetear permisos, cambiar plan y módulos requieren motivo, confirmación cuando aplica y auditoría.')
        ]),
        L('Cómo revisar una candidata futura', 11, [
          S('🔍', 'Auditoría por subítem', C.graf, 'No aceptar resúmenes. Comparar ZIP contra baseline, revisar archivos reales, buscar protegidos, datos reales, secretos, base64, localStorage operativo, copy técnico visible y omisión de Academia.'),
          S('🧪', 'Validaciones agrupadas', C.teal, 'Cuando sea indispensable, usar el runner agrupado para validar rama, protegidos, node --check, contrato backend LAB y auditor candidato. No pedir muchos comandos si uno basta.'),
          S('📌', 'Documentar todo', C.red, 'Cada hotfix local debe registrarse para que Claude lo replique después: archivo, motivo, cambio, impacto UX/backend/Academia, validaciones y pendientes derivados.')
        ]),
        Q('Evaluación · Continuidad post-Claude', [
          { p: '¿Una candidata futura puede reemplazar data/store.js?', ops: ['Sí, si Claude lo entrega', 'No, es backend protegido', 'Solo si cambia diseño'], ok: 1 },
          { p: '¿Qué debe hacerse con cada hotfix local?', ops: ['Nada', 'Documentarlo para Claude y Academia', 'Eliminarlo al recibir ZIP'], ok: 1 },
          { p: '¿Qué pasa con un soporte de pago del portal?', ops: ['Aplica el pago', 'Se registra como evidencia metadata-only para revisión', 'Crea finmov automático'], ok: 1 }
        ])
      ]
    }
    /* ${marker} END */`;

function patchAcademia() {
  let s = read(academiaPath);
  backup(academiaPath);
  if (!s.includes(marker + ' START')) {
    const needle = '\n  ];\n\n  // Versión de contenido:';
    const idx = s.indexOf(needle);
    if (idx < 0) fail('No se encontró cierre de array cursos.');
    s = s.slice(0, idx) + ',' + courseBlock + s.slice(idx);
  }
  s = s.replace(/var CONTENT_V = (\d+);/, (m, n) => 'var CONTENT_V = ' + Math.max(Number(n) + 1, 9) + ';');
  write(academiaPath, s);
}

const br = branch();
fs.mkdirSync(reportRoot, { recursive: true });
patchAcademia();
const result = check(academiaPath);
const report = ['# Hotfix P0 Academia post v1330', '', 'Fecha: ' + new Date().toISOString(), 'Rama detectada: ' + (br || 'S/D'), 'Backup: ' + backupRoot, '', '## Validaciones', '- orbit360-platform/data/academia-plus.js: ' + (result.code === 0 ? 'OK' : 'ERROR ' + result.code), '', '## Cambios', '- curso roles/permisos/auditoría segura', '- curso modificaciones locales post-Claude', '- CONTENT_V incrementado', '- progreso/certificado se conserva por lógica existente'].join('\n');
write(reportFile, report);
console.log(JSON.stringify({ ok: result.code === 0, branch: br, backupRoot: path.relative(ROOT, backupRoot), reportFile: path.relative(ROOT, reportFile), checks: [{ file: 'orbit360-platform/data/academia-plus.js', code: result.code }] }, null, 2));
if (result.code !== 0) process.exit(1);

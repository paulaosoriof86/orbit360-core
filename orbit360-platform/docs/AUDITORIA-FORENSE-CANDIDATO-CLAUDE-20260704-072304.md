# Auditoría forense candidato Claude — Orbit 360 A&S — 2026-07-04T072304

Fecha auditoría: 2026-07-04
Candidato recibido: `Prototype Development Request - 2026-07-04T072304.566.zip`
Baseline comparado: candidato anterior auditado `2026-07-03T202245.322` + paquete ampliado P0/P1/P2.
Alcance: auditoría local, sin empalme, sin deploy, sin merge, sin datos reales.

## Resultado ejecutivo

**Veredicto:** NO empalmar todavía como candidato aprobado.
**Estado recomendado:** `REQUIERE_REVISION_CLAUDE`.

El candidato contiene mejoras reales frente al anterior:

- versión/documentación alineada como v1.114;
- login sin credenciales demo precargadas;
- campos de país/moneda/primaNeta/primaTotal/gastos/IVA en pólizas;
- exclusión de hojas soporte por nombre;
- `docs-aseguradora` abre en modo documental;
- PWA con estados instalada/iOS/otros;
- 30 rutas y 30 módulos presentes;
- JS pasa `node --check`.

Sin embargo, siguen abiertos P0/P1 del importador. El código declara trazabilidad y país/moneda seguros, pero no preserva la traza hasta el registro final y sigue completando moneda desde país en flujos que deben requerir validación.

## Checks ejecutados

- Total archivos candidato: 96.
- Módulos JS: 30.
- Core JS: 20.
- Rutas NAV detectadas: 30.
- Rutas sin módulo: 0.
- Módulos extra no referenciados: 0.
- `node --check` en 53 JS: OK.
- `node --check data/store.js`: OK.
- `tools/orbit360-validate-marketing-integraciones.mjs`: OK.
- Smoke Chromium/Playwright no ejecutable en sandbox: `ERR_BLOCKED_BY_ADMINISTRATOR`.

## Diferencias contra candidato anterior

Nuevo archivo:

- `docs/AUDITORIA-CANDIDATO-CLAUDE-POST-FIX.md`

Archivos modificados:

- `CHANGELOG.md`
- `index.html`
- `core/auth.js`
- `core/correo.js`
- `core/importa.js`
- `core/integraciones-panel.js`
- `core/pwa.js`
- `core/theme.js`
- `modules/cliente360.js`
- `modules/portal.js`
- `docs/BITACORA-CAMBIOS.md`
- `docs/PENDIENTES-Y-MEJORAS.md`
- `docs/REPORTE-SMOKE.md`

## Hallazgos mejorados

1. Login sin `admin@demo.com` / `demo123` precargados.
2. 30 rutas y módulos completos.
3. Fechas fijas corregidas parcialmente en `cliente360` y `portal`.
4. `docs-aseguradora` documental.
5. PWA con 3 estados.
6. Versionado unificado como v1.114.

## P0/P1 aún abiertos

### P0-01 — Trazabilidad multihoja no preservada al registro final

El Excel agrega metadatos a cada fila como propiedades del array:

```js
row._origenHoja = sn;
row._paisHoja = paisHoja;
row._monedaHoja = monedaHoja;
row._periodoHoja = periodoHoja;
row._bloqueOrigen = sn;
row._numeroFila = ri + 2;
```

Pero al construir `rec`, solo se copian campos mapeados por índice:

```js
const rec = {};
Object.keys(idx).forEach(f => {
  const v = cells[idx[f]];
  if (v != null && v !== '') rec[f] = v;
});
```

Resultado: `_origenHoja/_paisHoja/_monedaHoja/_periodoHoja/_bloqueOrigen/_numeroFila` no llegan a `rec`, por lo que `finmovShape()` no los recibe y los registros finales pierden trazabilidad.

**Fix mínimo:** copiar metadatos de `cells` a `rec` en `applyImport`, `dryRun` y `conciliarRows`.

### P0-02 — País/moneda siguen autocompletándose

Persisten autocompletados:

```js
const cur = rec.moneda || monedaDe(pais) || rec._monedaHoja || '';
rec.moneda = normalizada || monedaDe(rec.pais);
const monedaHoja = detectaMoneda(sn) || monedaDe(paisHoja);
```

Si hay país pero no moneda explícita, el sistema completa moneda. Esto contradice la regla backend: país sin moneda debe `REQUIERE_VALIDACION`; puede sugerir moneda, pero no autorizar escritura automática.

**Fix mínimo:** separar `monedaSugerida` de `moneda`; si la moneda no viene explícita, marcar `requiereValidacion=true`.

### P0-03 — Planillas de comisión sin contrato completo

`planillas-comision` declara `coll: 'comisiones'`, pero no incluye campos `pais` ni `moneda`. Además, como tiene `conciliacion:true`, al confirmar entra por `applyConciliacion(kind)`, función que solo procesa `estados-cuenta` y `estados-banco`. Por tanto, el flujo principal no importa filas de comisión a `comisiones`.

**Fix mínimo:** agregar `pais/moneda`, exigir campos críticos o validación, y separar importación real de comisiones de propuesta de actualización de tarifas. No usar `conciliacion:true` si no hay implementación específica.

### P1-01 — Documentos bloquean sin scope, pero actualizan cliente directo con scope

Mejora: sin expediente abierto, `documentos` no crea clientes.

Riesgo: el contrato sigue siendo `coll: 'clientes', scopedUpdate: true`; con expediente abierto actualiza directamente el cliente. Para backend real conviene escribir a `documentos` o `parchesPendientes` y aplicar cambios solo con confirmación/diff.

### P1-02 — Fechas fijas aún presentes

Persisten fechas fijas operativas:

- `modules/siniestros.js`: `2026-06-24` en bitácora.
- `modules/portal.js`: `2026-06-26` como vencimiento de gestión.

### P1-03 — Textos técnicos visibles parciales

Siguen textos como `Pendiente de backend`, `backend del tenant`, `LAB`, `Simular` y `Diagnóstico de integraciones por tenant`. Deben quedar ocultos para UI cliente o condicionados por rol/entorno interno.

### P1-04 — Financiero histórico requiere bloqueo semántico adicional

El texto ya aclara que pagos de clientes no van en `finmovs`, pero el flujo técnico todavía permite cualquier fila `ingreso`. Falta bloqueo/advertencia si el concepto parece recibo, póliza, cuota, prima o pago de cliente.

## Riesgo de empalme

El ZIP incluye `data/store.js` demo y no incluye backend LAB ni tools nuevos de ChatGPT/Codex. Cualquier empalme debe preservar:

- `data/store.js` backend;
- `data/store-firestore-lab.local.js`;
- loader/init/guard backend;
- reglas Firestore;
- tools backend/preflight/plan/preview/diff/pipeline;
- tools de manifest y país/moneda.

No aplicar overlay completo.

## Decisión

No aceptar todavía el candidato como resuelto.
No empalmar todavía.
Actualizar pendientes Claude con estos P0/P1 o aplicar fix mínimo desde ChatGPT/Codex si se autoriza.

## Frase para instrucciones del proyecto

> Cuando una conversación de Orbit 360 A&S se vuelva demasiado larga, pierda rendimiento o ponga en riesgo el contexto, debes avisarme de inmediato y entregarme un prompt completo de continuidad para abrir una nueva conversación, incluyendo repo, rama, PR, baseline vivo, archivos modificados, pendientes, metodología, reglas, hallazgos recientes, plan de trabajo y la instrucción de leer primero `INSTRUCCIONES-MAESTRAS-CONTINUIDAD-ORBIT360-AYS-20260704.md`.

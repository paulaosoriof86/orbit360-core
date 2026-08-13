# REGISTRO P0 — WIRE DRY-RUN ANTES DE ESCRITURA

Fecha: 2026-07-09
Carril: A/B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: wire implementado; pendiente CI/smoke visible.

## Que parte del plan se avanzo

Conexion del drawer/importador al builder P0 de dry-run sanitizado.

El objetivo es que una carga desde el drawer no escriba directamente datos reales si no existe flujo completo:

```txt
fuente cargada
→ operaciones capturadas
→ dry-run sanitizado
→ revision humana
→ aprobacion dry-run
→ confirmacion escritura controlada
→ Orbit.store
→ auditoria
```

## Archivos agregados/modificados

```txt
orbit360-platform/core/importa-dryrun-p0-wire.js
orbit360-platform/modules/importar.js
tools/orbit360-test-importa-dryrun-p0-wire.mjs
.github/workflows/orbit360-p0-smoke.yml
```

## Reglas cubiertas

- Captura inserts/updates de importacion directa.
- No escribe importaciones directas sin dry-run aprobado.
- Construye reporte P0 con `Orbit.importaDryRunP0.buildDryRun` cuando esta disponible.
- Permite escritura controlada cuando el registro viene con `createdByImport`, `importBatchId` y `validationStatus='validado'`.
- No intercepta auditoria de importaciones.
- Mantiene pendiente por fuente separada.

## Alcance del wire

El wire captura operaciones originadas por importadores hacia colecciones como:

```txt
clientes
polizas
vehiculos
cobros
comisiones
facturas
conciliacionBanco
finmovs
parchesPendientes
actividades
```

Y las clasifica hacia fuentes P0 como:

```txt
clientes
polizas
vehiculos
estado_cuenta_aseguradora
planilla_comisiones
factura_comision
estado_cuenta_bancario
```

## Seguridad

- No toca backend protegido.
- No toca `store.js`.
- No toca adapter Firestore LAB.
- No toca reglas Firebase.
- No usa datos reales.
- No hace deploy.
- No requiere accion manual.

## Riesgo técnico abierto

El core legacy `core/importa.js` aun contiene funciones privadas de aplicacion directa. Este wire es una capa de seguridad runtime para capturar esas escrituras antes de que lleguen al store. Si el smoke falla, debe corregirse antes de cargar fuentes reales.

## Siguiente paso

1. Revisar CI/smoke visible.
2. Si pasa, ejecutar validacion visual del flujo Importar cuando sea indispensable.
3. Luego preparar dry-run real sanitizado con fuentes separadas.

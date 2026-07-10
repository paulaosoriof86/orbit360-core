# REGISTRO P0 — BUILDER DRY-RUN SANITIZADO POR FUENTE

Fecha: 2026-07-09
Carril: B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: builder aditivo implementado; pendiente CI/smoke visible.

## Que parte del plan se avanzo

P0.3 — Dry-run real sanitizado por fuente separada.

Se agrego un builder runtime para construir reportes de dry-run sin escribir datos reales y sin exponer datos sensibles en el reporte.

## Archivos agregados

```txt
orbit360-platform/core/importa-dryrun-p0.js
tools/orbit360-test-importa-dryrun-p0.mjs
```

## Que hace

- Recibe operaciones propuestas por fuente.
- Valida destinos permitidos por fuente.
- Bloquea destinos prohibidos.
- Detecta campos bloqueantes faltantes.
- Genera reporte sanitizado.
- Mantiene preview sin datos personales completos.
- No escribe en `Orbit.store`.
- Solo puede marcar `dry_run_aprobado` con frase `CONFIRMO DRY RUN`.

## Fuentes cubiertas

```txt
clientes
polizas
vehiculos
recibos_fuente_externa
estado_cuenta_aseguradora
planilla_comisiones
factura_comision
estado_cuenta_bancario
```

## Reglas clave

- Estado de cuenta bancario no puede crear `finmovs` en dry-run.
- Estados de cuenta de aseguradora no pueden crear `cobros`.
- Planillas/facturas de comision no pueden crear cartera de primas.
- Clientes no pueden crear polizas ni recibos.
- Polizas no pueden marcar cobros confirmados.
- Datos sensibles se enmascaran en el reporte.

## Seguridad

- No toca backend protegido.
- No toca `store.js`.
- No toca adapter Firestore LAB.
- No toca reglas Firebase.
- No usa datos reales.
- No hace deploy.
- No requiere accion manual en este paso.

## Siguiente paso

1. Cargar builder desde el hub Importar.
2. Agregar smoke al workflow P0.
3. Cuando smokes pasen, ejecutar dry-run real sanitizado por fuente separada con archivos reales, sin escritura.

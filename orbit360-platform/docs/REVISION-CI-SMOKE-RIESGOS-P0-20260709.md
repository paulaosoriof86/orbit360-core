# REVISION CI/SMOKE Y RIESGOS P0

Fecha: 2026-07-09
Carril: B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: revision documental y remota realizada; smokes siguen pendientes de resultado visible.

## Que parte del plan se avanzo

Se reviso el estado actual del PR y de CI/smoke antes de pasar a dry-run real sanitizado.

## Estado PR

- PR: #5.
- Estado: abierto.
- Draft: si.
- Mergeado: no.
- Rama head: `ays/backend-tenant-lab-v99-20260703`.
- Head SHA revisado: `db799e676975643053693156a82fbdd23bf78f67`.
- Base: `main`.
- Merge/deploy: no autorizado.

## CI / smoke

Resultado remoto revisado:

```txt
workflow_runs: []
combined statuses: []
```

Conclusion:

```txt
P0_IMPLEMENTADO_ADITIVO_PENDIENTE_SMOKE_VISIBLE
```

No se puede afirmar que los smokes pasaron hasta que exista resultado visible de Actions o validacion local.

## Archivos P0 cubiertos por workflow

El workflow P0 incluye validacion de sintaxis y ejecucion smoke para:

```txt
orbit360-platform/core/importa-polizas-p0.js
orbit360-platform/core/importa-cartera-p0.js
orbit360-platform/core/importa-comisiones-p0.js
orbit360-platform/core/importa-banco-comisiones-p0.js
orbit360-platform/core/importa-write-p0.js
orbit360-platform/core/importa-dryrun-p0.js
orbit360-platform/core/importa-dryrun-p0-wire.js
orbit360-platform/modules/importar-p0-dashboard.js
orbit360-platform/modules/importar-p0-confirmacion.js
tools/orbit360-p0-dryrun-manifest-20260709.mjs
tools/orbit360-test-importa-polizas-p0.mjs
tools/orbit360-test-importa-cartera-p0.mjs
tools/orbit360-test-importa-comisiones-p0.mjs
tools/orbit360-test-importa-banco-comisiones-p0.mjs
tools/orbit360-test-importa-write-p0.mjs
tools/orbit360-test-importa-dryrun-p0.mjs
tools/orbit360-test-importa-dryrun-p0-wire.mjs
tools/orbit360-test-importar-p0-dashboard.mjs
tools/orbit360-test-importar-p0-confirmacion.mjs
tools/orbit360-test-p0-dryrun-manifest.mjs
tools/orbit360-validar-backend-lab-contrato.mjs
```

## Protecciones revisadas

Este bloque no modifico:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
```

Solo agrega este documento de revision.

## Riesgos tecnicos restantes

| Riesgo | Estado | Mitigacion |
|---|---|---|
| CI/smoke sin resultado visible | Abierto | No avanzar a escritura real hasta ver resultado. |
| PR #5 es muy grande | Abierto | Revisar cambios protegidos del PR completo antes de merge/deploy. |
| Wires runtime dependen de carga en navegador | Abierto | Validacion visual P0 y smoke local si Actions no corre. |
| Drawer legacy todavia tiene applyImport interno | Mitigado por wire P0 | El wire captura escritura directa; debe validarse en navegador. |
| Datos reales aun no ejecutados | Correcto por seguridad | Dry-run real separado y sanitizado antes de escribir. |
| Escritura real | Bloqueada | Requiere dry-run aprobado + frase de escritura + usuario/motivo. |

## Decision actual

No se pide accion manual todavia.

No se autoriza:

```txt
merge
deploy
main
produccion
escritura real
carga real directa
```

## Siguiente paso recomendado

Preparar el primer dry-run real sanitizado de bajo riesgo cuando Paula autorice cargar una fuente, empezando por una fuente con reglas ya cerradas:

1. `clientes` si se quiere validar calidad/deduplicacion.
2. `polizas` si se quiere avanzar cartera/recibos esperados.
3. `estado_cuenta_aseguradora` si se quiere validar cartera.
4. `planilla_comisiones` si se quiere validar CxC comisiones.

Antes de eso, si Actions no corre, se debe validar local/visual solo cuando sea indispensable.

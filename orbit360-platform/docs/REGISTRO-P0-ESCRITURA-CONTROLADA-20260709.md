# REGISTRO P0 — CONTRATO DE ESCRITURA CONTROLADA

Fecha: 2026-07-09
Carril: B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: contrato aditivo implementado; pendiente validacion CI/smoke.

## Que parte del plan se avanzo

Contrato de escritura controlada posterior a dry-run aprobado.

Se agrego una capa P0 para ejecutar escritura solo cuando exista:

```txt
dry-run aprobado
confirmacion humana explicita
sin bloqueos de validacion
coleccion permitida
Orbit.store disponible
auditoria antes/despues
plan de rollback
```

## Archivos agregados

```txt
orbit360-platform/core/importa-write-p0.js
tools/orbit360-test-importa-write-p0.mjs
```

## Reglas cubiertas

- No escribe si el batch no esta en `dry_run_aprobado`.
- No escribe si hay bloqueos.
- No escribe si falta confirmacion humana.
- No escribe si falta motivo.
- No escribe si falta usuario confirmador.
- No escribe colecciones bloqueadas como `finmovs`, `cobros`, `cxc`, `cxp`, `usuarios`, `roles`, `permisos`, secretos o credenciales.
- Escribe solo en colecciones permitidas P0.
- Agrega `importBatchId`, `sourceType`, `sourceFileName`, `sourceHash`, `createdByImport` y `validationStatus`.
- Registra auditoria en `auditoriaImportaciones`.
- Devuelve plan de rollback.
- Rollback requiere frase separada: `CONFIRMO ROLLBACK`.

## Colecciones permitidas

- clientes/contactos/calidad/gestiones;
- polizas/bienes/recibos esperados/fuente externa/aseguradora;
- estados cuenta aseguradora/cartera primas/conciliaciones primas;
- planillas comisiones/comisiones devengadas/facturas comisiones/CxC comisiones/conciliaciones comisiones;
- movimientos banco/conciliacion bancaria/liquidaciones asesores/CxP asesores;
- auditoria importaciones.

## Colecciones bloqueadas

```txt
finmovs
cobros
cxc
cxp
usuarios
roles
permisos
secrets
credenciales
```

## Seguridad

- No toca backend protegido.
- No toca `store.js`.
- No toca adapter Firestore LAB.
- No toca reglas Firebase.
- No usa datos reales.
- No hace deploy.
- No requiere accion manual.

## Siguiente paso

1. Cargar este contrato desde el hub Importar si se requiere UI de confirmacion.
2. Validar CI/smoke.
3. Preparar flujo UI de aprobacion reforzada para escritura real.
4. Mantener bloqueado merge/deploy hasta smoke y validacion visual.

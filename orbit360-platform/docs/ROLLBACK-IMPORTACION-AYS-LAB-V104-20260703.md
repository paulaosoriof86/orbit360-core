# Rollback importación A&S LAB v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** utilidades creadas; por defecto operan en dry-run.

## 1. Objetivo

Antes de ejecutar la primera carga real en Firestore LAB, debe existir una forma controlada de auditar y revertir por lote. Cada carga genera un `batchId`; el rollback usa ese `batchId` para ubicar y eliminar documentos cargados en LAB si algo sale mal.

## 2. Archivos creados

```txt
tools/orbit360-listar-lotes-importacion-ays-v104.mjs
tools/orbit360-rollback-importacion-ays-lab-v104.mjs
```

## 3. Listar lotes locales

```txt
node tools/orbit360-listar-lotes-importacion-ays-v104.mjs _orbit360_exports
```

Este comando lista payloads locales generados por dry-run/carga:

```txt
payload-importacion-ays-lab-v104-<batchId>.json
```

No usa red, no usa Firebase y no escribe nada.

## 4. Rollback dry-run desde payload local

```txt
node tools/orbit360-rollback-importacion-ays-lab-v104.mjs --payload _orbit360_exports/payload-importacion-ays-lab-v104-<batchId>.json --tenant alianzas-soluciones
```

Este modo calcula candidatos a rollback desde el payload local. No borra nada.

## 5. Rollback real en Firestore LAB

Solo si Paula autoriza explícitamente rollback en LAB:

```txt
node tools/orbit360-rollback-importacion-ays-lab-v104.mjs --batch <batchId> --tenant alianzas-soluciones --project <PROJECT_ID_LAB> --write --confirm ROLLBACK_LAB_AYS
```

Requisitos:

- `GOOGLE_APPLICATION_CREDENTIALS` local configurado;
- `FIREBASE_PROJECT_ID` o `--project`;
- paquete `firebase-admin` disponible localmente;
- `batchId` confirmado;
- no producción.

## 6. Restricciones

- No producción.
- No `main`.
- No datos reales en repo.
- No credenciales en repo.
- No rollback sin `--write` y `--confirm ROLLBACK_LAB_AYS`.
- No tenant distinto a `alianzas-soluciones`.

## 7. Secuencia recomendada antes de primera escritura real

1. Preparar importación.
2. Validar archivos reales.
3. Ejecutar dry-run de carga.
4. Listar lote generado.
5. Ejecutar rollback dry-run desde payload.
6. Ejecutar carga LAB real solo con autorización.
7. Si algo falla, ejecutar rollback real por `batchId`.

## 8. Estado

El carril de migración real ya tiene validación, dry-run, carga LAB controlada, listado de lotes y rollback LAB por `batchId`. Falta ejecutar localmente con archivos reales de A&S.

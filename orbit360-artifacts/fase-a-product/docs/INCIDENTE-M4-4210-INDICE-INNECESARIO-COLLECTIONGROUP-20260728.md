# Incidente M4 4.2.10 — dependencia innecesaria de índice en revalidación read-only

Fecha: 2026-07-28  
Gate único: `block4-post-retirement-revalidation-readonly-v20260728`  
Run fallido: `30395156011`  
Job: `90396118824`  
Artifact: `8702484870`  
Digest artifact: `sha256:28a3cd6069eef40d09efbe59ed49f965e931cddb121ac0f740fe2853dd0bbd65`

## Primer check real fallido

La preparación contractual fue correcta:

```text
Preflight canónico: GO_GATE_CONTRACT 25/25
Activation mode: immutable_request_present
Contrato ejecutado: PASS 17/17
Autorización: una ejecución read-only
Escrituras antes del runtime: 0
```

El primer fallo ocurrió únicamente en el runner read-only al consultar los snapshots del retiro 4.2.9 mediante `collectionGroup('records')` con filtros simultáneos por `tenantId` y `gateId`.

Firestore devolvió `FAILED_PRECONDITION: The query requires an index`.

## Clasificación

`PIPELINE_MECHANISM_FAILURE`

No se clasifica como `DATA_CONTRACT_FAILURE`, porque no se alcanzó a comprobar un incumplimiento de los datos. Tampoco corresponde crear un índice: el gate solo necesita releer cuatro snapshots ya vinculados desde los cuatro eventos de auditoría del tenant.

## Causa raíz

El runner introdujo una dependencia de infraestructura no necesaria al intentar descubrir los snapshots mediante una consulta global de grupo de colecciones. El cierre 4.2.9 ya dejó cuatro eventos append-only dentro del tenant, y cada evento contiene el `snapshotRef` exacto. Esa relación es la ruta canónica más acotada para la revalidación.

## Corrección permitida

Corregir únicamente el mecanismo de lectura del runner:

1. leer `tenants/{tenant}/auditEvents` filtrando por el gate 4.2.9;
2. confirmar exactamente cuatro eventos;
3. validar que cada evento sea append-only y pertenezca al retiro 4.2.9;
4. resolver los cuatro `snapshotRef` exactos;
5. leer esos cuatro documentos directamente;
6. conservar 414/26 y target-only 0/0;
7. cero escrituras.

No crear índice, no cambiar datos, no cambiar Rules, no deploy, no tocar producción.

## Regla de repetición

Esta fue la primera falla de la etapa runtime de 4.2.10. Se permite una única corrección del mecanismo y una nueva ejecución del mismo gate. Si vuelve a fallar la misma etapa, se detienen los reintentos y se abre diagnóstico de causa raíz sin otro parche.

## Claude / Academia

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.

Academia: `ACADEMIA_ACTUALIZAR`: una dependencia de índice generada por la forma de consulta es un fallo del mecanismo/pipeline, no evidencia de que los datos estén mal. No se modifica el producto ni se crean índices cuando puede usarse una relación durable ya existente.

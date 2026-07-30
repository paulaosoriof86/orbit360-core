# Cierre M6 — recovery 6.1.8 y causa raíz de alias físico de consulta

Fecha: 2026-07-30  
Gate único: `block6-go-live-product-v20260730`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Resultado del recovery 6.1.8

Autorización: bloque único Firestore Rules read-only + Hosting + readiness acotado + smoke `20260730.3` + integridad + rollback automático; Storage diferido fail-closed.

```text
Request commit: 2dfc3e24976f0d13c2a386467406cf26910dcc0b
Run: 30543484354
Recovery job: 90873750736
Artifact: 8759724162
Digest: sha256:b9a452a975020b8a48dc8587716f1426b0e2e698e70156feb2add283497bd5a4
Resultado: ROLLED_BACK_SAFE
```

Pasaron correctamente antes del cierre:

- preflight canónico 6.1.8;
- request inmutable y binding exacto;
- identidad/configuración Web existente;
- snapshot before;
- shell productivo efímero;
- Firestore Rules read-only + Hosting;
- readiness acotado de Hosting;
- snapshot after;
- integridad before/after.

El smoke llegó a `runtime_contract`, por lo que Auth y bootstrap ya no eran la causa anterior. El runtime mostró:

```text
clientes visibles en Orbit.store: 0
aseguradoras visibles en Orbit.store: 0
baseline canónico: 414 / 26
network write candidates: 0
```

El `outcome` contractual del smoke fue `failure`. Por ello el workflow ejecutó rollback automático aunque la presentación del step bajo `continue-on-error` pudiera verse tolerada.

## Rollback e integridad

El rollback regresó a estado seguro:

```text
Firestore: deny-all
Hosting: shell neutro
Storage: diferido / fail-closed
producción funcional: NO LIVE
conteos before/after: estables
digests before/after: estables
Firestore data writes: 0
operational writes: 0
network write candidates: 0
```

## Clasificación

`DATA_CONTRACT_FAILURE`

Causa raíz:

`PRODUCT_QUERY_FIELD_ALIAS_MISMATCH`

## Causa raíz demostrada

El esquema de importación vigente usa el campo físico `pais` para clientes y aseguradoras. M4 migró el documento fuente preservando sus campos y añadió `id`, `tenantId` y `sourceTrace`; no renombró `pais` a `country`.

La política base de acceso, en cambio, genera una restricción lógica `country`. En Firestore una consulta sobre un campo inexistente no necesariamente produce error: puede responder correctamente con cero documentos. Por eso el transporte y el snapshot eran técnicamente válidos, pero el contrato de datos era incorrecto.

Secuencia:

1. membership válida con países GT/CO;
2. planner genera restricción lógica por país;
3. runtime enviaba `country` al query físico;
4. documentos canónicos almacenan `pais`;
5. Firestore devuelve snapshots vacíos;
6. store alcanzaba estado read-only con 0/0;
7. smoke compara contra 414/26 y bloquea el cierre;
8. rollback automático devuelve el entorno a fail-closed.

No se corrigió creando datos, reimportando, cambiando Rules ni ampliando permisos.

## Fix estructural

Owners modificados:

- `orbit360-platform/core/tenant-access-policy-product-p0.js`
  - alias productivo físico `country → pais`;
  - conserva la semántica lógica de la política;
  - no autoriza escritura.
- `orbit360-platform/core/product-app-runtime-p0.js`
  - espera que todas las colecciones activas completen snapshot antes de mostrar producto;
  - falla de forma acotada si existe snapshot error o timeout.
- `tools/orbit360-m6-product-browser-smoke-v20260730.mjs`
  - validator `20260730.4`;
  - conserva runtime antes de assertions;
  - exige alias físico `pais`;
  - exige planes sin `country` físico;
  - exige snapshots completos para `clientes` y `aseguradoras`;
  - sigue exigiendo 414/26, tres roles, write guard y cero network writes.

## Remediación estática 6.1.9

```text
Run causa raíz/fix: 30544361222 · PASS
Recovery productivo: SKIPPED
Run paquete completo 6.1.10: 30544970948 · PASS
Artifact estático: 8760294454
Digest: sha256:d7e9fe8cde18cbc372c32800836d2307025809f81944814a72f1cfaed1ee27fd
Recovery productivo 6.1.10: SKIPPED
```

El run `30544098438` fue un preflight estático disparado antes de congelar el router; falló sin capacidades y su recovery quedó `SKIPPED`. Se clasifica como ruido de orden del control plane, no como fallo de producto ni como intento productivo adicional.

## Paquete 6.1.10 preparado

El mismo workflow estable quedó configurado para un futuro request independiente:

`tools/orbit360-m6-recovery-6110-request-v20260730.json`

Ese request **no existe** al cierre de esta remediación.

Contrato previsto:

- colecciones: `clientes` + `aseguradoras`;
- campo lógico de país: `country`;
- campo físico canónico: `pais`;
- espera de snapshots completos: obligatoria;
- Firestore Rules: read-only;
- Hosting: un deploy;
- readiness: acotado;
- smoke: `20260730.4`;
- datos: cero escrituras;
- Storage: diferido fail-closed;
- Functions: no;
- main/merge: no;
- Pólizas: fuera de M6;
- rollback automático si el bloque no cierra.

## Impacto reusable / Academia

Patrón reusable:

> La política puede trabajar con nombres lógicos, pero el adaptador de consulta debe traducirlos al campo físico del contrato canónico. Esa traducción debe validarse contra el esquema de migración antes de ejecutar browser/runtime.

Una respuesta vacía de Firestore puede ser transporte válido y, simultáneamente, un `DATA_CONTRACT_FAILURE` si la consulta usa un alias físico equivocado.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`. La implementación de infraestructura, Rules, tenant real, secretos y evidencia interna sigue como `BACKEND_PROTEGIDO_NO_CLAUDE`.

## Estado

```text
M5: CERRADO
M6 6.1.8: ROLLED_BACK_SAFE
M6 causa raíz query alias: CERRADA
M6 6.1.9: PASS estático
M6 6.1.10: PREPARADO / INERTE
request 6.1.10: AUSENTE
producción funcional: NO LIVE
datos: intactos
Storage: diferido fail-closed
Pólizas: bloqueadas hasta cerrar M6
```

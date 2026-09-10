# Gravicentra Insurance — I4A Aseguradoras: causa reproducible de auditoría cliente y retorno causal I2/I3

Fecha: 2026-09-09  
Rama rectora: `recovery/fase-a-clean-20260831`  
Gate de descubrimiento: I4A  
Run autoritativo afectado: `34430190710`  
Artifact de evidencia: `10134326528`  
Artifact digest: `sha256:f21b61bfa460f7924104407f19bcadd0cc42a01dda88a6d745ff661be3c35e11`

## 1. Release preservada

El fallo fue observado sobre la release I3 certificada, sin modificar el artifact:

- source: `1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`;
- build: `gi-i3-1e6a6ca3d259-57f234755dc1`;
- I3: run `34423252469`;
- Preview: `https://ays-orbit-360-lab--gi-i3-34423252469-ybf4i1dw.web.app`.

El Control Plane Guard del trigger I4A fue run `34430190704`: SUCCESS y `PRODUCT_SOURCE_DRIFT=false`.

## 2. Evidencia del run 34430190710

El run cerró FAILURE de forma fail-closed. Public Preview, hidratación y runtime boundary pasaron. El raw authenticated harness y el discriminante específico de Aseguradoras no pasaron; el adjudicador mantuvo el gate cerrado.

El artifact sellado demostró que el discriminante específico sí atravesó el legal gate por UI ordinaria en los cinco roles y que la aceptación quedó únicamente en localStorage del browser efímero. Asesor pasó su restricción de credenciales. Los cuatro roles privilegiados fallaron después del legal gate:

- Dirección: timeout esperando resolución visual posterior a reveal;
- SuperAdmin: copy validator falló en portal índice 0;
- AdminTenant: timeout esperando resolución visual posterior a reveal;
- Operativo: copy validator falló en portal índice 0.

El copy validator esperaba lectura de clipboard 160 ms después del click pese a que el click ejecuta una callable de red antes de copiar. Ese umbral no es un SLA congelado y se clasifica como defecto del harness, no como evidencia suficiente de defecto funcional.

## 3. Defecto de producto reproducible separado

La revisión física de la cadena de ejecución encontró un defecto de side effect que sí exige source nuevo.

`orbit360-platform/core/backend-resource-contracts.js` ejecuta `audit()` después de `credential.reveal` y `credential.copy`. `audit()` intenta primero `Orbit.store.insert('auditLog', row)` y, si falla, intenta `Orbit.store.insert('actividades', ...)`.

`orbit360-platform/data/store-firestore-product-operational-p0.js` no autoriza `auditLog` en `SURFACE`, por lo que el primer insert falla cerrado. Sin embargo, `actividades` sí está mapeada a `cliente360` y el facade operacional puede enviar ese insert mediante `orbit360ProductOperationalCommand` para roles con permiso de creación.

Por tanto una acción de consulta de credencial puede abrir un camino de intento de escritura operacional desde el frontend, aunque el provider de credenciales ya tiene auditoría server-owned.

Esto contradice el boundary de I4A, donde `operationalDataWritesAuthorized=false` y los probes de Preview deben permanecer sin escrituras operativas.

## 4. Auditoría server-owned ya existente

`functions/product-insurer-credentials.js` ya es el owner de auditoría de credenciales:

- producción: `credential.reveal` / `credential.copy` auditan en `tenants/{tenant}/auditEvents`;
- Preview: el callable aislado `orbit360ProductInsurerCredentialCommandPreview` usa `cloudlog`, no Firestore;
- import está deshabilitado en Preview;
- la respuesta nunca debe persistir secretos en browser.

Por ello el fallback cliente hacia `auditLog/actividades` es duplicado e incompatible con la frontera read-only de Preview para credenciales server-owned.

## 5. Clasificación

Código causal: `I4A_CREDENTIAL_CLIENT_AUDIT_DURABLE_WRITE_PATH`.

Tipo: defecto real de source de producto descubierto en I4A.

Impacto limitado: contrato de auditoría de accesos seguros de Aseguradoras. No reabre lineage ni aceptación histórica de las capabilities no afectadas.

## 6. Corrección mínima requerida

El sucesor debe:

1. declarar explícitamente en el provider de credenciales que la auditoría es server-owned;
2. impedir que `backend-resource-contracts.js` persista un segundo audit cliente para acciones `credential.*` cuando el provider activo declare esa autoridad server-owned;
3. conservar el evento browser `orbit:secure-resource-audit` para observabilidad sin persistencia cliente;
4. conservar la auditoría backend de producción y el cloudlog de Preview;
5. añadir regresión I2 que falle si vuelve a aparecer el fallback durable cliente para credenciales server-owned;
6. corregir el harness I4A para medir writes reales y esperar el resultado de copy/reveal por estado observable, no por 160 ms fijos.

## 7. Retorno al plan

La causa reproducible exige cambio de product source. Conforme a `GRAVICENTRA_RECOVERY_MECHANISM_V3_20260909`, se autoriza y obliga el retorno causal:

`I4A -> I2 -> I3 -> nuevo artifact/digest -> nuevo Preview -> I4A`.

No se reabre I1, no se reconstruye el producto, no se modifica el artifact I3 anterior y no se promueve nada a producción. Las capabilities no afectadas preservan lineage/evidencia.

Las Fuentes Evergreen V3 no requieren reemplazo: este incidente es estado/evidencia operativa y la regla de recertificación ya está congelada. `projectSources.staticSourceUpdateRequired` debe permanecer `false` salvo que cambie el contrato estático.

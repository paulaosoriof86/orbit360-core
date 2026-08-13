# CIERRE DE CORTE M6 — FINAL CLOSURE 6.2.0 / REMEDIACIÓN ESTÁTICA 6.2.1

Fecha: 2026-07-30  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Resultado 6.2.0

M6 Final Closure 6.2.0 fue autorizado y ejecutado una sola vez mediante request inmutable.

- Run: `30557653576`
- Artifact recovery: `8765527693`
- Digest: `sha256:30dcccf1bb9f0aeda746314e2617199fbc1fc673e6a755e8a4dd9d603a2a4425`
- Resultado: `ROLLED_BACK_SAFE`
- Producción funcional final: NO LIVE / fail-closed
- Firestore data writes: 0
- Operational writes: 0
- Counts/digests: estables
- Storage: diferido fail-closed

PASS antes del fallo:

- preflight canónico;
- identidad/configuración read-only;
- snapshot before;
- Firestore Rules read-only + Hosting;
- Hosting readiness;
- blocking-gate readiness diferido;
- acuerdo legal aceptado/cerrado;
- runtime ready-read-only;
- 414 clientes / 26 aseguradoras;
- alias `country -> pais`;
- snapshots completos;
- write guard;
- Dirección desktop: Cliente 360 PASS + Aseguradoras 26 PASS + click semántico PASS;
- snapshot after;
- integridad before/after.

Fallo real del browser:

- etapa: `tabletOperativo`;
- Aseguradoras no llegó a renderizar tarjetas para el rol Operativo;
- el navegador terminó con exit 41;
- rollback automático ejecutado correctamente.

## 2. Clasificación y causa raíz

Clasificación:

- `FUNCTIONAL_DEFECT`
- `DATA_CONTRACT_FAILURE`

Código de causa raíz:

`PRODUCT_ACCESS_ENGINE_MEMBERSHIP_PROJECTION_NOT_CONSUMED`

El contrato canónico de membership define `aseguradoras` como módulo disponible para `Operativo` y `Asesor`. Sin embargo, la capa productiva de visibilidad seguía resolviendo parte del acceso mediante `Orbit.ROLES` legacy y mediante datos del asesor buscados en `Orbit.store`.

El runtime M6, por contrato correcto, contiene únicamente:

- `clientes`;
- `aseguradoras`.

Los 7 asesores permanecen como fuente y NO deben migrarse para satisfacer una prueba de visibilidad. La autorización/scopes ya existen en la membership autenticada.

Consecuencia: Dirección funcionaba, pero al cambiar a Operativo/Asesor la resolución legacy podía negar Aseguradoras aunque el contrato membership lo habilitara.

## 3. Corrección 6.2.1 — estática, sin producción

Se congeló M6 con `STOP_RETRY` y capacidades cero.

Implementación:

- `orbit360-platform/core/product-membership-access-bridge-p0.js`
- `tools/orbit360-m6-product-membership-access-bridge-test-v20260730.mjs`
- inyección product-only desde `tools/orbit360-m6-build-product-shell-v20260730.mjs`
- lifecycle/engine canónico 6.2.1 estático.

Principio:

`Autorización productiva = Auth + membership + rol activo + módulos/scopes efectivos`, no presencia de una colección de dominio auxiliar en el store.

El bridge:

- consume `Orbit.auth.productUser` autenticado;
- usa el contrato `membershipMultirolEffectiveP0`;
- calcula módulos efectivos para el rol activo;
- respeta `modulesRestricted`;
- no requiere colección `asesores`;
- no escribe store;
- no escribe membership;
- preserva comportamiento legacy fuera del runtime productivo.

## 4. Evidencia estática 6.2.1

Run: `30559288433`  
Artifact: `8766146164`  
Digest: `sha256:32eead35af8c039c45f2fb67c297238d38416462b8db9f5e7de11953bbefa0ee`

Resultado:

- preflight 6.2.1: PASS;
- recovery productivo: SKIPPED;
- sintaxis: PASS;
- builder injection: PASS;
- synthetic access test: PASS;
- `advisorStorePresent:false`;
- `advisorCollectionRequired:false`;
- Dirección → Aseguradoras: true;
- Operativo → Aseguradoras: true;
- Asesor → Aseguradoras: true;
- Operativo/Asesor → Cliente360: true;
- Operativo/Asesor → Finanzas: false;
- advisor migration required: false;
- futureModulesReuse: true;
- secrets/data/browser/deploy/production: false;
- no new recovery request: PASS.

## 5. Regla transversal

Esta corrección no pertenece únicamente a Aseguradoras. Pólizas, Vehículos, Cobros, Siniestros y módulos posteriores deben resolver permisos/scopes desde membership y contratos de acceso, nunca forzando la presencia o migración de una colección de dominio para determinar autorización.

Clasificación reusable:

- `REPLICABLE_CLAUDE_ACUMULADO`
- `ACADEMIA_ACTUALIZAR`
- infraestructura real / datos A&S: `BACKEND_PROTEGIDO_NO_CLAUDE` / `TENANT_AYS_ONLY` según corresponda.

## 6. Estado del corte

- M6 todavía NO cerrado.
- `STOP_RETRY` continúa activo.
- Producción permanece fail-closed.
- Datos intactos.
- No existe ni se prepara un nuevo recovery productivo en este corte.
- No se solicita nueva autorización.
- La siguiente reapertura de riesgo solo puede ocurrir después de incorporar esta corrección al paquete final y volver a demostrar estáticamente el contrato completo, sin reconstruir la infraestructura transversal.

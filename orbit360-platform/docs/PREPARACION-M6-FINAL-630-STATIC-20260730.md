# M6 FINAL 6.3.0 — PAQUETE MACRO PREPARADO Y VALIDADO ESTÁTICAMENTE

Fecha: 2026-07-30  
Gate: `block6-go-live-product-v20260730`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado

`PREPARED_INERT / GO_GATE_CONTRACT`

Run estático: `30561129717`  
Artifact: `8766905573`  
Digest: `sha256:181a5e0acf6aefe4092249de23efb64b2ac2b2e04a002a5c34f21a19a0346b77`

Recovery productivo: `SKIPPED`.

No se leyeron secrets, no se abrió browser productivo, no hubo Firestore read/write, no se aplicaron Rules, no hubo Hosting deploy y producción no fue tocada.

## Qué integra el paquete 6.3.0

- causa raíz 6.2.0 cerrada: `PRODUCT_ACCESS_ENGINE_MEMBERSHIP_PROJECTION_NOT_CONSUMED`;
- `product-membership-access-bridge-p0.js` inyectado por el builder del shell productivo;
- autorización desacoplada de la presencia de la colección `asesores`;
- asesores permanecen fuente; no se migran para reparar permisos;
- manifiesto productivo M6 sigue siendo exactamente `clientes + aseguradoras`;
- smoke `6.2.0 / 20260730.7` preservado como componente ya validado;
- blocking-gate readiness reusable preservado;
- prueba sintética del gate diferido a 520 ms PASS;
- alias `country → pais` preservado;
- barrera de todas las colecciones activas preservada;
- Hosting readiness, integridad before/after y rollback permanecen como owners comunes;
- Storage continúa diferido fail-closed.

## Evidencia 19/19

El preflight 6.3.0 confirmó:

- `ROOT_CAUSE_CLOSED`: PASS;
- `ROLLBACK_SAFE`: PASS;
- `CANONICAL_DATA_CONTRACT`: PASS;
- `MEMBERSHIP_ACCESS_BRIDGE`: PASS;
- `BUILDER_INJECTS_ACCESS`: PASS;
- `SYNTHETIC_ACCESS`: PASS;
- `BLOCKING_GATE_SYNTHETIC`: PASS;
- `SMOKE_UNCHANGED_VALIDATOR`: PASS;
- `QUERY_ALIAS`: PASS;
- `ALL_COLLECTION_BARRIER`: PASS;
- `WORKFLOW_630_PREPARED`: PASS;
- `SEPARATED_STAGES`: PASS;
- `STORAGE_DEFERRED`: PASS;
- `OLD_REQUEST_PRESERVED`: PASS;
- `NO_NEW_RECOVERY_REQUEST`: PASS.

Prueba Access sintética, sin store de asesores:

```text
Dirección → Aseguradoras true / Cliente360 true / Finanzas true
Operativo → Aseguradoras true / Cliente360 true / Finanzas false
Asesor → Aseguradoras true / Cliente360 true / Finanzas false
advisorStorePresent: false
advisorCollectionRequired: false
advisorMigrationRequired: false
```

## Estado de riesgo

El paquete productivo futuro está preparado pero no activado.

Request futuro reservado y AUSENTE:

`tools/orbit360-m6-final-closure-630-request-v20260730.json`

La autorización anterior 6.2.0 fue consumida por el run `30557653576` y no se reutiliza.

## Próxima reapertura única de riesgo

Solo una autorización macro nueva puede habilitar 6.3.0. Antes de crear el request se debe:

1. verificar PR #5 draft/open;
2. verificar rama obligatoria y HEAD vivo;
3. confirmar router 6.3.0 estático y request ausente;
4. cambiar router al lifecycle/engine 6.3.0 recovery, sin disparar workflow;
5. ligar el request inmutable al SHA exacto del router;
6. crear exactamente un request;
7. seguir un único run hasta artifact contractual.

Si 6.3.0 PASS: cerrar M6 e ingresar inmediatamente a Pólizas.  
Si 6.3.0 falla: rollback automático y `STOP_RETRY`; no crear 6.3.1 ni otro request sin nueva causa raíz.

## Reuso transversal

El patrón Access por membership debe viajar a Pólizas, Vehículos, Cobros, Siniestros, Comisiones y Documentos. Cada módulo siguiente agrega únicamente contrato de fuente/esquema/reglas de dominio; no reconstruye Auth, scopes, readiness, browser harness, integridad, Hosting ni rollback.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`; infraestructura productiva permanece `BACKEND_PROTEGIDO_NO_CLAUDE`.

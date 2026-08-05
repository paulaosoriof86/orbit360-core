# ESTADO ACTIVO — MICROBLOQUE 2.3

Fecha local: 2026-08-04 23:08 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `GO_LAB_CANDIDATE_VISIBLE`  
Estado: `READY_AWAITING_NEW_EXPLICIT_LAB_DEPLOY_AUTHORIZATION`

## Entradas cerradas

```text
PASS_PLAN_PERSISTED
PASS_CANONICAL_BASELINE
PASS_ISOLATED_ROUTE_HARNESS
PASS_CANONICAL_PREFLIGHT_COMPOSITION
```

Evidencia vigente:

```text
runtime funcional: 30962756387 · 18/18 PASS
rutas aisladas sintéticas: 30971707956 · 8/8 PASS
composición canónica: 30977179448 · 31/31 PASS
inner preflight: 32/32 PASS
```

## Estado del control plane

```text
validatorLifecycleRevision: phase-capability-contract-v1
visualHarnessRevision: isolated-context-direct-url-v6
workflow runtime: existente y preparado
request runtime v3: ausente
runtime activo: no
```

El request anterior permanece consumido e inmutable. La nueva ejecución deberá crearse en:

```text
.github/orbit360-requests/block12-go-lab-candidate-visible-v3.json
```

Ese archivo no existe todavía y no debe materializarse sin autorización explícita nueva.

## Objetivo único

Entregar una URL Hosting LAB retenida de la misma RC, con:

1. preflight contractual antes de secretos;
2. cuatro Functions LAB allowlisted;
3. un solo Hosting preview LAB;
4. snapshot A&S before;
5. ocho rutas mediante un contexto aislado y URL directa por ruta;
6. snapshot A&S after;
7. before/after idénticos y cero escrituras;
8. evidencia construida desde outputs observados;
9. retención de la URL cuando producto e integridad pasen;
10. cero repetición de los 18 escenarios funcionales.

## Functions allowlisted

```text
orbit360OpsLeadsCommandLabV20260804
orbit360GetAdvisorOpsInboxLabV20260804
orbit360CobrosReconciliationCommandLabV20260804
orbit360RecurringInsuranceImportLabV20260804
```

## Rutas

```text
cliente360
aseguradoras
polizas
cobros
conciliaciones
ops
leads
importar
```

## Restricciones

- cero escrituras reales;
- cero usuarios o memberships sintéticos;
- no Rules;
- no reimportación;
- no producción;
- no `main`;
- no merge;
- no workflow visual nuevo;
- no navegación hash acumulativa;
- no repetición de la batería funcional 18/18;
- no modificación del request consumido anterior.

## Regla de decisión

Retirar la candidata únicamente si se demuestra:

- `SECURITY_FAILURE`;
- `FUNCTIONAL_DEFECT` real;
- integridad before/after distinta;
- cross-tenant;
- escritura no autorizada.

Un fallo exclusivo del capturador no elimina Functions ni Hosting cuando producto e integridad hayan pasado; se conserva la URL y se clasifica el instrumento.

## Siguiente acción exacta

Recibir autorización explícita nueva para una sola ejecución del Microbloque 2.3. La autorización debe cubrir el request v3, preflight, cuatro Functions, Hosting preview, ocho rutas aisladas y snapshots read-only; no cubre Rules, reimportación, producción, main o merge.

# CIERRE MICROBLOQUE 1.0 — PLAN Y LEDGER RC A&S CANÓNICA

Fecha: 2026-08-04  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Resultado

```text
PASS_PLAN_PERSISTED
```

## Baseline congelado

```text
sourceBaseline: 548cffa50cddfd93ad2118f5a06e9bb420699bde
planCommit: 79ebbd0c5edeb9bed09f733d54eb8c14393d56ba
ledgerInitialCommit: f55529562d58ad615fb3b91b88571b8591be15b9
ledgerActivationCommit: 01418b92c369bc22241941c600ddd6bfb998b923
```

Los commits documentales no sustituyen ni reconstruyen el baseline funcional. La candidata continúa siendo una sola y avanza únicamente por gates cerrados.

## Persistencia anti-pérdida

La continuidad queda anclada simultáneamente en:

1. `docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
2. `runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json`;
3. título y cuerpo vivo del PR #5;
4. este cierre verificable.

Toda conversación futura debe leer esas cuatro fuentes antes de actuar.

## Hechos preservados

- runtime funcional: 18 PASS / 0 FAIL;
- fallo visual vigente: `PIPELINE_MECHANISM_FAILURE`;
- mecanismo prohibido bajo `STOP_RETRY`: navegación por hash acumulativa;
- mecanismo único reemplazante: contexto aislado + URL directa por ruta;
- pagos reportados preservados: 365;
- cobros confirmados materializados en el corte source-only: 5;
- producción, main, merge, Firebase, secrets y escrituras reales: no ejecutados.

## Carriles

### A — frontend/UX/Academia

- plan acumulativo preserva la mejor versión aprobada por módulo;
- no se abre otra candidata visual;
- Academia queda obligada a reflejar la diferencia entre producto y validador.

### B — backend/seguridad

- backend protegido no fue modificado;
- no se desplegaron Functions ni Rules;
- se fijó el contrato de un owner y un gate por cierre.

### C — datos A&S

- cero escrituras;
- cero reimportación;
- conteos pendientes de reconciliación focalizada, no de reconstrucción.

## Siguiente acción exacta

Iniciar Microbloque 1.1 y producir un único informe sanitizado que determine:

1. owners activos;
2. scripts cargados realmente por `index.html`;
3. bridges activos, duplicados u obsoletos;
4. mejor versión aceptada de cada módulo;
5. reconciliación de conteos;
6. baseline canónico final.

Gate siguiente:

```text
PASS_CANONICAL_BASELINE
```

Restricciones: sin Firebase, secretos, deploy, producción, main, merge, reimportación ni escrituras reales.
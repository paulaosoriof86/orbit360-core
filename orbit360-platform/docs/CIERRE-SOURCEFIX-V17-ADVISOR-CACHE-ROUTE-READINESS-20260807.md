# Cierre source-only v17 — advisor cache + route readiness

Fecha: 2026-08-07  
Base autorizada: `ad6f2e16305c7f519dcd213e26997695637621b8`  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`

## Origen

Runtime v16 pasó Auth, membresía, tenant, `HYDRATION_CONTRACT_MOUNTED`, `INICIO_REQUIRED_HYDRATION` e `INICIO_READY`, pero se detuvo en `DIRECCION_ROUTE_CLIENTE360_TIMEOUT`. El watchdog registró 90 s sin progreso y ejecutó STOP/rollback correctamente.

## Causas raíz

1. `FUNCTIONAL_DEFECT_READ_ONLY_ADVISOR_PROJECTION_REBUILD_AMPLIFICATION`: Cliente 360 consulta responsable por fila y la proyección fallback de asesores reconstruía relaciones canónicas en cada consulta.
2. `PIPELINE_MECHANISM_FAILURE_GENERIC_ROUTE_READINESS_OBSCURED_RENDER_STALL`: la matriz usaba readiness genérico y no separaba hidratación requerida de render por ruta.

## Rootfix source-only

- caché/index read-only de asesores;
- invalidación por `asesores`, `clientes`, `polizas`, `cobros`, `recibosEsperados`, `carteraPrimas` y cambio observable de membresía;
- `OrbitHydrationContractDiagnostics` queda como autoridad required/optional;
- módulos protegidos por el mismo contrato de readiness;
- matriz exige `*_REQUIRED_HYDRATION_PASS` antes de `*_RENDER_READY_PASS`;
- sealer registra `browserExecuted` y estado de Hosting/rollback de forma consistente;
- evidencia histórica v16 corregida sin reabrir su request;
- relay v16 retirado; relay v17 registrado fail-closed.

## Evidencia

Run source-only principal: `31193903611`  
Revalidación con relay v17: `31194105249`

Fixture equivalente a volumen v16:
- 430 consultas de asesor → 1 build de proyección;
- una invalidación de colección → build total 2;
- cambio de membresía → una reconstrucción adicional;
- cero escrituras.

Suites rectoras: request/lifecycle, capture watchdog, Windows signal, signal-safe, cross-runner, preflight portable y transport base-SHA: PASS.

Evidencia sanitizada: `runtime-gate-crm-v20260716/v17-advisor-cache-route-readiness-rootfix-source-sanitized-v20260807.json`.

## Seguridad

Durante este cierre source-only: secretos 0; Firebase 0; Hosting 0; navegador 0; deploy 0; Firestore/Auth/operational writes 0; Functions/Rules/reimportación/producción/main/merge 0.

## Estado

Rootfix source-only: PASS.  
Runtime v17: no ejecutado todavía.  
`PASS_VISUAL_POST_AUTH`: NO hasta completar la matriz runtime de Dirección, Operativo y Asesor.

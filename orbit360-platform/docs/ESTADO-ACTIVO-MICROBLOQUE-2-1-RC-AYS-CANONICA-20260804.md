# ESTADO ACTIVO — MICROBLOQUE 2.1

Fecha: 2026-08-04  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `GO_LAB_CANDIDATE_VISIBLE`  
Estado: `READY_AWAITING_EXPLICIT_LAB_DEPLOY_AUTHORIZATION`

## Entradas cerradas

```text
PASS_PLAN_PERSISTED
PASS_CANONICAL_BASELINE
PASS_ISOLATED_ROUTE_HARNESS
```

Evidencia del arnés:

```text
run: 30971707956
rutas: 8/8
mecanismo: ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE
Firebase/secrets/escrituras/deploy: no
```

## Objetivo único

Entregar una URL Hosting LAB retenida de la misma candidata, con cuatro Functions LAB allowlisted, ocho rutas aisladas y snapshots before/after idénticos.

## Ejecución exacta autorizable como un solo bloque

1. preflight contractual antes de secretos;
2. desplegar solo las cuatro Functions LAB allowlisted;
3. desplegar un único Hosting preview LAB;
4. snapshot A&S before;
5. abrir Cliente 360, Aseguradoras, Pólizas, Cobros, Conciliaciones, Ops, Leads e Importar con contexto aislado y URL directa;
6. snapshot A&S after;
7. exigir cero escrituras e integridad idéntica;
8. retener URL si producto e integridad pasan;
9. no repetir los 18 escenarios funcionales;
10. no retirar la candidata por un fallo exclusivo del capturador.

## Prohibiciones

- Rules;
- reimportación;
- escrituras reales;
- producción;
- main;
- merge;
- otra candidata;
- otro workflow visual;
- navegación por hash acumulativa.

## Siguiente acción exacta

Recibir autorización explícita para este único despliegue LAB read-only y ejecutar el Microbloque 2.1 completo sin microautorizaciones intermedias.

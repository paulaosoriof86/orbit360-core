# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence` en el live-state;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R1-OBSERVABILIDAD-ROOTCAUSE-PRODUCT-RUNTIME-COLLECTIONS-20260814.md`;
6. fuentes históricas solo para reglas no sustituidas por evidencia posterior.

No usar este README, CHANGELOG, PENDIENTES o memoria de otra conversación como sustituto del live-state.

## Estado vivo · R1 cerrado · 2026-08-14

```text
stateVersion: 20260814.r1-rootcause.1
fase: PRE_GOLIVE_R2_ROOTFIX
RC: RC-AYS-LAB-CANONICA-01
candidata funcional canónica preservada: 4ede3e785cb2cc889a7c11c2d9e2030c7af20b64
PR #5: draft/open
main/merge: no
HostDime blocker actual: no
paquete durable definitivo: todavía no
producción tocada por R1: no
```

Última evidencia relevante:

```text
workflow: Orbit360 Fase A Product Local Synthetic 20260814
run: 31820056535
job: 94830881175
resultado: FAIL seguro fuera de producción, causa diagnosticada
bootstrap: environment -> authentication -> membership -> planning -> attaching -> blocked
error interno: snapshots_no_adjuntos
clasificación: DATA_CONTRACT_FAILURE / PRODUCT_RUNTIME_COLLECTION_POLICY_MISMATCH
writes: 0
deploy: 0
```

## Causa raíz R1

El materializador productivo solicita actualmente:

`clientes, aseguradoras, gestiones, notificaciones`

pero el contrato required/optional ya aprobado para las rutas críticas exige como unión required:

`clientes, polizas, cobros, aseguradoras, vehiculos, recibosEsperados, carteraPrimas`

Legacy/opcionales no bloqueantes:

`asesores, metas, negocios, gestiones, comisiones, cancelaciones`

`notificaciones` no tiene política de colección productiva y provoca un hard-error de attach. Además el store P0 no distingue required/optional y hoy puede considerar ready una hidratación parcial.

## Siguiente acción exacta — R2

Corregir únicamente la capa productiva de catálogo/hidratación read-only para reutilizar el contrato required/optional existente:

- quitar `notificaciones` como hard dependency;
- incluir todas las required canónicas;
- optional/legacy no bloquea readiness;
- `asesores` continúa optional/proyectable;
- readiness requiere todas las required adjuntas y sin error;
- conservar tenant scope, read-only, fail-closed y cero fallback;
- validar source-only;
- ejecutar UNA sola vez el mismo synthetic local.

No HostDime, deploy, producción, reimportación, Auth/membership, Rules/Functions ni nuevo workflow/request en R2.

## Porcentajes vigentes

```text
readiness funcional de candidata: 100%
avance por iteraciones hacia producción: 25% (R1 1/4)
gates finales cerrados: 0% (0/3)
R2 PASS -> 50% iteraciones / 33% gates
R3 PASS -> 75% iteraciones / 67% gates
R4 PASS -> 100% / 100%
```

Los porcentajes de gates solo suben al cerrar resultados, no por actividad o diagnóstico.

## Ruta de salida vigente

```text
R1 observabilidad + synthetic: CERRADO
→ R2 único rootfix required/optional: SIGUIENTE
→ R3 paquete durable + manifest + hashes
→ R4 HostDime + app.aysseguros.com + smoke E2E productivo
→ R5 habilitación operativa + delta controlado
→ R6 módulos postproducción incrementales
→ R7 gate de reutilización para siguiente tenant
```

## Reglas anti-bucle

- una sola frontera larga por iteración;
- checkpoint durable antes de runtime/browser/deploy;
- al terminar la frontera: detener, leer, clasificar y sincronizar;
- si una familia falla dos veces: `STOP_RETRY`;
- no buscar paquetes antiguos: el durable se construye desde el source certificado;
- HostDime no vuelve a ser diagnóstico antes de R4;
- no reabrir módulos cerrados sin evidencia nueva reproducible;
- producción no se usa para depurar validators;
- cada cambio de estado sincroniza `live-state` + PR #5 + README + checkpoint y, cuando corresponda, bitácora/Plan/E2E.

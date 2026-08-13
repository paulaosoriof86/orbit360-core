# CIERRE — ROOTFIX CONTROL-PLANE RUTA CRÍTICA SOURCE-ONLY

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
HEAD de cierre fuente: `1f7b86b60edb8e3c61da55fa5073214f7d52cdbd`

## Estado

`GO_CRITICAL_ROUTE_CONTROL_PLANE_SOURCE`

## Clasificación de causa raíz

`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`.

No se corrigió producto para satisfacer validadores antiguos.

### Causa raíz compuesta cerrada

1. Pólizas 7.0.1 conservaba un engine de diagnóstico de proyección/país perteneciente a una fase anterior aunque el lifecycle actual declaraba `POLICIES_STATIC_QUALIFICATION` y Pólizas ya tenía `WRITE_PASS`.
2. Vehículos 8.0.1 comprobaba compatibilidad UI mediante una coincidencia literal antigua, aunque el owner productivo ya consume `vehiculos` por `polizaId` mediante índice y usa placa/marca/línea.
3. Dos workflows históricos de Vehículos seguían disparándose automáticamente y podían volver a leer fuentes privadas después del `WRITE_PASS` ya cerrado.
4. Recibos/cartera conservaba un workflow 9.0.0 obsoleto y el contrato 9.1.0 interpretaba la mera existencia del request inmutable como autorización activa, aunque ese request ya había sido consumido en el `WRITE_PASS` documentado.
5. El primer intento del nuevo gate acumulativo exigió el estado genérico `GO_GATE_CONTRACT` a Block1 v33, aunque su estado source canónico es `PASS_GATE_CONTRACT_SOURCE_V33`. El mismo gate se corrigió en una sola capa y se reejecutó una vez.

## Implementación

- Pólizas: workflow prewrite histórico retirado del `push`; engine convertido a verificador `POLICIES_WRITE_CLOSED_REUSABLE`.
- Vehículos: source-readcheck y canonical-dryrun históricos retirados del `push`; engine closure-aware con validación semántica de la UI y estado `VEHICLES_WRITE_CLOSED_REUSABLE`.
- Recibos/cartera: workflow 9.0.0 retirado; engine/test/workflow 9.1.0 reconocen request como `HISTORICAL_CONSUMED_EVIDENCE` y cierre `RECEIPTS_PORTFOLIO_WRITE_CLOSED_REUSABLE`.
- Se añadió un solo workflow acumulativo source-only: `.github/workflows/orbit360-control-plane-route-critical-source-v20260810.yml`.

## Evidencia

Primer run acumulativo: `31403250958`.

- sintaxis: PASS;
- Block1 v33 engine: 18/18 PASS;
- STOP del workflow por aserción de estado source genérica;
- clasificación: `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`;
- secrets/runtime/writes/deploy/producción: 0.

Corrección focal: aceptar `PASS_GATE_CONTRACT_SOURCE_V33` + `DATA_CONTRACT_EXTERNAL_AUDIT_SOURCE_VALID`.

Segundo run del mismo gate: `31403410005`.

- Block1 v33 source-only: PASS;
- Pólizas 7.0.1 closed reusable: PASS;
- Vehículos 8.0.1 closed reusable: PASS;
- Recibos/cartera 9.1.0 closed reusable: PASS;
- evidencia acumulativa: PASS;
- status observable: `orbit360/control-plane-route-critical-source = success`;
- artifact: `9068589195`;
- artifact digest: `sha256:52896dc18bfc3fe326a73d5b12f7b134379fe83899b79711f4a8b6c988f5fc71`.

Capacidades usadas en el cierre:

```text
secretAccess: false
firestoreRead: false
operationalWrites: 0
runtimeExecuted: false
browserExecuted: false
deployExecuted: false
productionTouched: false
```

## Conteos preservados por los cierres de dominio

```text
Pólizas WRITE_PASS: 1373
Vehículos WRITE_PASS: 1032
RecibosEsperados WRITE_PASS 9.1.0: 1293
CarteraPrimas WRITE_PASS 9.1.0: 673
```

No se reimportaron datos y no se modificaron módulos funcionales.

## Carriles

- A · frontend/UX: congelado; ninguna corrección funcional para satisfacer gates.
- B · backend/control-plane: `CERRADO_REUTILIZABLE` para la ruta source Block1 v33 → Pólizas → Vehículos → Recibos.
- C · datos/migración: sin escrituras; permanece pendiente exclusivamente la procedencia autoritativa de los 2 clientes post-cierre de Block1.

## Siguiente acción exacta

No volver a ejecutar los workflows históricos retirados ni repetir baseline/demo/retained26.

La siguiente evidencia materialmente distinta es el runtime read-only v33 contra auditoría externa autoritativa para los 2 fingerprints pendientes, utilizando el contrato ya preparado:

- fresh authorization/request exclusivo antes de secretos;
- máximo 1 lectura locator Firestore;
- máximo 1 consulta Logging combinada, hasta 2 páginas;
- 0 writes;
- 0 Auth writes;
- 0 Hosting/browser/deploy;
- no persistir document IDs, resourceName, principalEmail, IP ni logs crudos.

Si la auditoría externa no existe, no está retenida o no permite atribución autoritativa, cerrar como pérdida estructural de trazabilidad y pasar a adjudicación humana controlada; no inferir legitimidad.

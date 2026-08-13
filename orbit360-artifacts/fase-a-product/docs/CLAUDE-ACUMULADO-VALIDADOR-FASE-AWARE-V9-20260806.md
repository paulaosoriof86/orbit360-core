# Claude acumulado — validador fase-aware v9 — 2026-08-06

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
```

## Patrón reusable

Los validadores de control-plane no deben fijar una única fotografía de lifecycle cuando el mismo gate admite transiciones autorizadas.

Contrato reusable:

```text
phase = STOP_RETRY
  requestReusable = false
  runtime = false
  secrets = false
  deploy = false

phase = AUTHORIZED_FRESH_REQUEST_ONLY
  requestReusable = false
  freshExclusiveRequestRequired = true
  runtime = true
  deploy limitado por contrato
  producción = false
  writes = false
```

## Antipatrón retirado

```text
assert overlay.stopRetryActive === true
```

sin verificar primero la fase vigente.

Ese antipatrón produjo un falso STOP después de una autorización válida.

## Implementación reusable

- detectar fase explícita;
- validar capacidades exactas por fase;
- mantener no reutilización de requests anteriores;
- validar límites de producción/escrituras en todas las fases;
- ejecutar fixtures positivos y negativos;
- no acceder a secretos durante source-only;
- registrar runId, jobId y checkpoint.

## Exclusiones

No enviar a Claude:

- secretos o credenciales;
- datos reales A&S;
- adaptadores backend protegidos;
- Firebase/Auth/Rules;
- payloads privados.

## Evidencia Orbit 360

```text
runtime v9: STOP antes de GO_GATE_CONTRACT
sourcefix: 17/17 PASS
run source-only: 31133118442
relay safety SKIP: 31133118404
riesgo ejecutado: 0
```

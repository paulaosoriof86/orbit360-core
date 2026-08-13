# Acumulado Claude — Request inmutable y cierre no disparador

Fecha: 2026-08-05  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Separar físicamente:

```text
.github/requests/<authorization>.json       # input inmutable que dispara
runtime/ledgers/<consumption>.json          # estado de consumo, no dispara
runtime/evidence/<decision>.json            # resultado, no dispara
```

Nunca actualizar el request para marcarlo consumido cuando ese path forma parte de `on.push.paths`.

## Requisitos

- nonce único;
- commit padre sellado;
- máximo de ejecuciones validado contra ledger;
- request append-only;
- consumo y cierre fuera del trigger path;
- STOP_RETRY bloqueado por ledger, no por mutación del request;
- evidencia basada en outputs observados.

## Exclusiones

No contiene datos tenant, secretos, Firebase, identidades ni backend protegido.

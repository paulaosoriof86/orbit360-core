# Orbit 360 A&S — cierre v25 diagnóstico diferencial de universo

Fecha: 2026-08-07  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `block1-client360-insurers-lab-v20260717`  
Owner de producto preservado: `1.0.41`  
Base autorizada: `4d8c3f77588853a0abed512c0f19e7efb266d56a`

## Resultado ejecutivo

v25 cerró sin modificar producto ni datos. Source run `31222721451` pasó 20/20 fixtures y `PASS_V25_SOURCE_PREFLIGHT`. Diagnostic run `31222886355` obtuvo `GO_V25_DIAGNOSTIC_READONLY` antes de secretos, ejecutó exactamente tres lecturas Firestore y cero writes/Auth reads/Hosting/browser.

La lectura LAB observó:
- raw: 430 clientes / 30 aseguradoras / 7 asesores;
- baselineTagged: 414 clientes / 26 aseguradoras;
- nonBaseline: 16 clientes / 4 aseguradoras;
- clasificador runtime genérico: 430 clientes / 25 aseguradoras efectivos;
- exclusiones runtime: 0 clientes / 5 aseguradoras; una de las cinco era baseline.

## Adjudicación final por dominio

### Clientes — `REQUIERE_VALIDACION`

Los 414 miembros del batch controlado `ays_clients_insurers_20260714` sí están demostrados. Los 16 registros adicionales son no-baseline y actualmente efectivos, pero no contienen batch alterno, batchId, source marker, timestamp útil ni audit actor/reason que permita demostrar que sean altas legítimas posteriores o contaminación previa. No se borran, excluyen ni se usa un corte numérico para volver a 414.

Tratamiento: obtener procedencia objetiva de esos 16 mediante evidencia ya existente o una autorización futura específicamente diseñada; sin data write y sin actualizar todavía el contrato de clientes.

### Aseguradoras — `VALIDATOR_STALE`

El clasificador runtime v25 marcó una de las 26 aseguradoras baseline como `duplicate_strong_key` porque trata `codigo` como una clave universalmente única. La reconciliación controlada del 13-jul ya documentaba explícitamente que dos aseguradoras distintas comparten un mismo código fuente y ambas debían conservarse como `REQUIERE_VALIDACION`, no fusionarse. Por tanto, esa exclusión es un falso positivo del validador, no una instrucción de borrar/fusionar datos.

La fuente controlada mantiene 13 GT + 13 CO = 26 aseguradoras canónicas. Las cuatro entidades no-baseline observadas están fuera del conjunto baseline y el runtime las excluyó por su estado; al retirar únicamente el falso positivo de deduplicación, el conteo efectivo contractual de Aseguradoras vuelve a 26.

Tratamiento: conservar contrato 26 y corregir en una autorización futura la regla de deduplicación para que `codigo` compartido no implique duplicado automático; exigir identidad compuesta/procedencia y mantener `REQUIERE_VALIDACION` ante colisión conocida.

### Asesores — `PASS_DATA_CONTRACT`

7/7, solo control de invariancia. Sin acción.

## Clasificación terminal v25

El diagnóstico runtime emitió inicialmente `DATA_CONTRACT_FAILURE` porque no disponía de la excepción de fuente para el código compartido. La adjudicación source-only posterior, sin nueva lectura LAB, corrige la causa de Aseguradoras a `VALIDATOR_STALE` y deja Clientes en `REQUIERE_VALIDACION`.

Decisión final global: `REQUIERE_VALIDACION`.

Causa raíz compuesta:
`VALIDATOR_STALE_IN_INSURER_DEDUPE_PLUS_UNRESOLVED_CLIENT_PROVENANCE`.

## Seguridad y límites respetados

- lecturas LAB: exactamente 3, en una sola adjudicación;
- lecturas LAB adicionales postdiagnóstico: 0;
- Firestore writes: 0;
- Auth reads/writes: 0;
- operational writes: 0;
- Hosting/browser: 0;
- Functions/Rules deploy: 0;
- reimportación: 0;
- producción/main/merge: 0;
- request v25 consumido/frozen; replay=false.

## Carriles

A — UX/frontend: congelado; no hay nuevo defecto funcional demostrado.  
B — control-plane: se identificó una regla stale de deduplicación de Aseguradoras; owner 1.0.41, matriz, observer y handoff v24 permanecen congelados.  
C — datos/migración: 414 baseline de Clientes están demostrados; 16 no-baseline quedan pendientes de procedencia. Aseguradoras conserva baseline 26; no se autoriza reparación de datos.

## Claude / Academia

`REPLICABLE_CLAUDE_ACUMULADO`: una clave de fuente no es automáticamente un identificador único; deduplicación debe respetar excepciones de procedencia y fail-closed.  
`ACADEMIA_ACTUALIZAR`: un diagnóstico puede producir una clasificación inicial que luego debe adjudicarse contra la fuente rectora antes de tocar datos.

## Siguiente acción exacta

Requiere autorización fresca. No repetir la lectura v25. Preparar source-only dos deltas coordinados: (1) corregir el validador de deduplicación de Aseguradoras para respetar la colisión conocida de código sin hardcodear entidades A&S, mediante identidad compuesta/procedencia; (2) construir un resolver de procedencia para los 16 fingerprints de Clientes usando exclusivamente evidencia existente y, solo si sigue faltando señal, diseñar una lectura focal futura. No modificar datos ni contrato 414/26 todavía. Solo después de cerrar ambos puntos se autoriza un nuevo universe gate y luego la matriz visual.

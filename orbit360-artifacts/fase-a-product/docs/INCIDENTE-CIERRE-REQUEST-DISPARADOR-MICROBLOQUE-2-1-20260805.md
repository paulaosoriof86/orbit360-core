# Incidente metodológico — consumo del request disparador

Fecha operativa: 2026-08-04 22:24 GT  
RC: `RC-AYS-LAB-CANONICA-01`

## Qué ocurrió

Después de declarar `STOP_RETRY`, se actualizó el archivo de request para cambiar su estado a consumido. Ese mismo path era el trigger `push.paths` del workflow visual, por lo que la actualización creó automáticamente el run `30975037529`.

Esto fue un error metodológico del procedimiento de cierre.

## Seguridad y alcance real

El archivo ya no contenía una autorización activa. El workflow falló en:

```text
Verificar request único y baseline congelado
```

Los pasos siguientes quedaron omitidos:

```text
preflight canónico
resolución de secretos
instalación Firebase
snapshot before
Functions deploy
Hosting deploy
navegador
snapshot after
```

Resultado:

```text
run: 30975037529
job: 92207191317
clasificación: ADMINISTRATIVE_TRIGGER_REJECTED_BEFORE_PREFLIGHT
Functions: 0/4
URL LAB: no
Firestore writes: 0
Auth writes: 0
producción/main/merge: no
```

No cuenta como una tercera ejecución autorizada ni como un tercer intento runtime, porque el request fue rechazado antes del preflight. Sí cuenta como un disparo administrativo innecesario y debe quedar documentado.

## Causa raíz

Clasificación:

```text
PIPELINE_MECHANISM_FAILURE
```

Owner:

```text
procedimiento de cierre del request
```

La autorización y su consumo usaban el mismo archivo físico que dispara el workflow. El mecanismo no separaba:

- entrada inmutable de autorización;
- ledger de consumo;
- evidencia de cierre.

## Regla corregida

A partir de este incidente:

1. el request disparador no se vuelve a modificar;
2. el consumo se registra solo en ledger y evidencia no disparadora;
3. el workflow debe tratar el request como input inmutable;
4. un estado final se publica en un path distinto;
5. `STOP_RETRY` permanece activo;
6. no se emite otro run ni otro parche en esta familia.

## Impacto

```text
producto: intacto
datos: intactos
secretos: no accedidos
Functions: no desplegadas
Hosting: no desplegado
candidata nueva: no
```

Este incidente se añade al futuro rediseño source-only del control plane, pero no habilita ni justifica otra ejecución LAB.

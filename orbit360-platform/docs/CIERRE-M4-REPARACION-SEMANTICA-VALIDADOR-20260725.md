# Cierre M4 · Reparación semántica del validador 4.2.5

Fecha: 2026-07-25  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Gate: `block4-client-country-business-validation-semantic-repair-static-v20260725`

## Resultado

La reparación semántica quedó cerrada con resultado satisfactorio en la primera ejecución autorizada.

```text
Package commit: 010faf81ac399d375afa3428cb9616dca3a8324f
Request commit: 4b1797ce1c3034c4b85c1a4e6b11b1822cda6f0e
Run: 30163968404
Job: 89693747592
Artifact: 8621014966
Digest: sha256:603f3e22a026a7af2bf0350d3871aa8e66db7ff6d85b17ca6729f9ceea43884a
```

## Gates

```text
Preflight canónico: GO_GATE_CONTRACT 26/26
Contrato de fixtures: PASS 19/19
Fixtures positivos: 5
Fixtures negativos: 14
Literal source inspection: false
```

Todas las etapas terminaron en `success`: solicitud inmutable, preflight semántico, resumen de fixtures, artefacto sanitizado y estado observable.

## Causa raíz resuelta

El validador anterior rechazaba implementaciones correctas porque buscaba tokens literales en el código fuente. La versión 4.2.5 valida contratos ejecutables, estructuras y fixtures positivos/negativos.

La composición verificada es:

```text
414 clientes
26 aseguradoras
61 clientes sin moneda
61 países no canónicos
2 clientes solo-destino
2 aseguradoras solo-destino
4 registros solo-destino diferidos
```

## Propuesta preservada

```text
Registros: 61
País: GT
Moneda: GTQ
Cambios de país propuestos: 61
Cambios de moneda propuestos: 61
Altas: 0
Bajas: 0
Write authorized: false
```

El gate deja `approvalReadyForCorrectionDryRun=true`, pero mantiene `approvalReadyForM4Write=false`.

## Seguridad

```text
Secret access: false
Firestore read: false
Runtime/browser: false
Client writes: 0
Insurer writes: 0
Rules/deploy/production: false
PII/secretos en evidencia: false
```

## Autorización

La autorización de ejecución estática quedó consumida. No existe autorización para:

- leer nuevamente Firestore;
- ejecutar el dry-run de corrección;
- escribir `GT/GTQ`;
- migrar datos;
- desplegar;
- avanzar a Pólizas.

## Claude y Academia

Clasificación Claude: `REPLICABLE_CLAUDE_ACUMULADO`.  
Clasificación Academia: `ACADEMIA_ACTUALIZAR`.

Patrón reusable:

> Los validadores deben comprobar contratos, estructuras y comportamiento observable mediante fixtures; no deben depender de tokens literales presentes en el código fuente.

## Siguiente acción exacta

Solicitar una autorización nueva e independiente para un único dry-run read-only de la propuesta `61 × GT/GTQ`, con diff, trazabilidad, plan de auditoría y rollback; todavía sin escritura.

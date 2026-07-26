# Cierre M4 4.2.9 — Retiro atómico real de cuatro registros obsoletos

Fecha: 2026-07-26  
Gate: `block4-target-only-retirement-write-v20260726`  
Contrato: `4.2.9`

## Resultado

La única operación atómica autorizada terminó en `success`.

```text
Package: 6f2608599f9b07f491e2d23053d28dfa2da17353
Request: 15f7fbeb83e4dd8d715d15e9e663279536bc7779
Run: 30217615128
Job: 89834431261
Artifact: 8636260429
```

## Evidencia contractual

```text
Preflight canónico: GO_GATE_CONTRACT 24/24
Activation mode: immutable_request_present
Contrato de fixtures: PASS 55/55
Fixtures positivos: 4
Fixtures negativos: 51
Inspección literal: false
```

## Operación aplicada

```text
Origen antes y después: 414 clientes / 26 aseguradoras
Overlay antes: 2 clientes / 2 aseguradoras
Overlay después: 0 clientes / 0 aseguradoras
Snapshots reales: 4
Eventos append-only reales: 4
Retiros: 2 clientes + 2 aseguradoras
Total de escrituras operativas: 12
```

La selección fue determinística y los cuatro registros conservaron la clasificación `obsolete`: solo-destino, marcador técnico, sin coincidencia por ID y sin huella equivalente en el origen.

## Reversibilidad

```text
Rollback exacto disponible: sí
Snapshots: 4
Rutas de restauración: 4
Orden: inverso a la selección determinística
Rollback ejecutado: no
```

## Seguridad y límites

```text
Actualizaciones de clientes: 0
Actualizaciones de aseguradoras: 0
Cambios GT/GTQ: 0
Fusiones: 0
Configuración o memberships: 0
Rules/deploy/producción/main/merge: no
PII o secretos en evidencia: no
```

## Estado

El retiro real de los cuatro registros obsoletos queda cerrado. La siguiente acción no es escribir los 61 cambios `GT/GTQ`: primero debe ejecutarse una revalidación durable read-only que confirme `414 clientes / 26 aseguradoras / target-only 0`.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: `ACADEMIA_ACTUALIZAR`.

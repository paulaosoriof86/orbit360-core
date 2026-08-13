# Cierre definitivo M4 — destino canónico verificado

Fecha: 2026-07-28  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado final

`M4_CLOSED_SUCCESS_CANONICAL_TARGET_VERIFIED`

M4 se cierra únicamente después de distinguir y comprobar de forma independiente fuente saneada y destino canónico persistido.

## Incidente metodológico resuelto

Clasificación histórica: `VALIDATOR_STALE` + `DATA_CONTRACT_FAILURE`, con un `PIPELINE_MECHANISM_FAILURE` de preflight durante 4.3.1.

El cierre previo confundió fuente limpia con migración completada. La recuperación conservó las 61 correcciones GT/GTQ y no reimportó Clientes/Aseguradoras.

## 4.3.0 — dry-run final canónico

```text
Run: 30401002929
Job: 90415507507
Artifact: 8704692107
Digest: sha256:cf55e4d3b7d2145c2563e37582d426a974e5b0a735ec45dfa01f73e2ffe56d44
Preflight: 24/24
Contrato: 21/21
Writes: 0
```

Diff aprobado: 1 configuración, 414 clientes y 26 aseguradoras a crear; membership 1 omitida; 0 validaciones; 0 target-only.

## 4.3.1 — escritura canónica durable

Primer intento: run `30404130402`, detenido en preflight por validador obsoleto `M4_REOPENED`; secretos y escrituras no se ejecutaron. El fallo se clasificó `VALIDATOR_STALE` / `PIPELINE_MECHANISM_FAILURE` y se corrigió únicamente el predicado del validador.

Retry reparado:

```text
Run: 30404333112
Job: 90426249280
Artifact: 8705949576
Digest: sha256:84b2834fd5c6a1032ea92a7b5ae632addc128549e46b3e1e4ee9c3b03be6d45b
Preflight: 25/25
Contrato: 30/30
```

Resultado:

```text
config writes: 1
client writes: 414
insurer writes: 26
membership writes: 0
target creates: 441
snapshots: 441
audits append-only: 442
importBatch writes: 2
total operational writes: 1326
rollback executed: false
```

Los digests de fuente y membership permanecieron iguales y el digest del destino coincidió con el esperado.

## 4.3.2 — revalidación durable read-only

```text
Run: 30405006131
Job: 90428375820
Artifact: 8706182146
Digest: sha256:5bf47059d99caa1759e7c4fed92e7604a0dccad5966de52d1fcde0ee537766d1
Preflight: 25/25
Contrato: 28/28
Writes: 0
```

Estado leído desde backend:

```text
origen clientes: 414
origen aseguradoras: 26
destino configuración: 1
destino memberships: 1
destino clientes: 414
destino aseguradoras: 26
snapshots: 441
auditorías por registro: 441
auditoría resumen: 1
batch: completed
```

Además:

- source digests = esperados;
- membership digest = esperado;
- target digest = esperado;
- IDs destino = fuente;
- tenant scope válido;
- país/moneda consistente;
- auditoría append-only válida;
- cero escrituras en revalidación.

## Criterios de salida M4

Todos satisfechos: dry-run, diff explícito, write durable, idempotencia, auditoría append-only, rollback disponible, 414/26 en fuente y destino, configuración canónica presente, membership preservada, 0 moneda faltante, 0 target-only, sin secretos ni mezcla de fuentes.

## M5

M5 vuelve a estar habilitado solo para reparar y ejecutar el readiness estático. El readiness anterior continúa invalidado aunque su evidencia técnica de 40/40 activos y paridad LAB 22/22 se conserva.

El readiness corregido debe exigir simultáneamente:

```text
source clients = 414
source insurers = 26
canonical config = 1
canonical memberships = 1
canonical clients = 414
canonical insurers = 26
advisors = 7
missing currency = 0
target-only clients/insurers = 0
M4 final read-only revalidation = PASS
```

Solo después de ese readiness se puede habilitar runtime smoke/navegador.

## Alcance intacto

No se tocaron Pólizas, Vehículos, Recibos/cartera, Cobros, Comisiones, financiero histórico, Rules, Hosting, Functions, producción, `main` ni merge.

Pólizas continúa `FUENTE_REAL_REQUERIDA`: cuando llegue su bloque se solicitará a Paula el listado actual y vigente; producción histórica no es fuente válida.

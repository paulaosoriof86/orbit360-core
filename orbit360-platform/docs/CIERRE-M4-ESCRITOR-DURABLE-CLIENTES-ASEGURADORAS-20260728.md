# Cierre M4 — Escritor durable e importadores

Fecha: 2026-07-28  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado

`M4_CLOSED_SUCCESS`

El Bloque 4 se cierra después de completar el último ajuste pendiente de calidad de Clientes: 61 correcciones `pais=GT` / `moneda=GTQ` autorizadas expresamente por Paula y aplicadas mediante el gate 4.2.11.

## Evidencia 4.2.11

```text
Request commit: 79341d6bb39688ac3abe232f69cd408eac9c6aa0
Run: 30397573914
Job: 90404247375
Artifact: 8703407181
Digest: sha256:9e711101c7afeffd5a4e3052f1de8fe0f4e0533a561537e6d49e984d5f39ea9d
Preflight: GO_GATE_CONTRACT 27/27
Contrato: PASS 43/43
Runtime: SUCCESS
```

## Resultado

```text
Clientes antes/después: 414 / 414
Aseguradoras antes/después: 26 / 26
Clientes target-only: 0
Aseguradoras target-only: 0
Selección corregida: 61
País corregido: GT
Moneda corregida: GTQ
Moneda faltante restante: 0
Snapshots durables: 61
Eventos append-only: 61
Updates de cliente: 61
Total escrituras operativas: 183
Digest de los otros 353 clientes: idéntico antes/después
```

No hubo escrituras en Aseguradoras, overlay, configuración o memberships. No hubo deletes, merges, importaciones adicionales, Rules, Hosting, Functions, producción, main ni merge.

## Rollback e idempotencia

El writer durable ya tenía controles estructurales aprobados para rollback e idempotencia. La ejecución 4.2.11 dejó 61 snapshots exactos y verificó su readback. No se ejecutó rollback real porque la verificación post-write fue íntegramente verde; ejecutar un rollback sin fallo habría revertido un cambio correcto. La solicitud one-shot quedó consumida y los artefactos de idempotencia impiden reutilizar la operación.

## Criterios de salida del Plan Maestro

```text
DRY-RUN: PASS
DIFF: APROBADO
ESCRITURA REMOTA: CONFIRMADA
AUDITORÍA: APPEND-ONLY / VERIFICADA
ROLLBACK: DURABLE Y PROBADO CONTRACTUALMENTE; NO EJECUTADO POR NO SER NECESARIO
REINTENTO: IDEMPOTENTE
CLIENTES: 414
ASEGURADORAS: 26
SIN SECRETOS: PASS
SIN MEZCLA DE FUENTES: PASS
```

## Fuentes que siguen bloqueadas

M4 no autoriza importar Pólizas, Vehículos, Recibos/cartera, Cobros, Comisiones ni Financiero histórico.

Cuando corresponda Pólizas, se debe pedir a Paula el listado/base **actual y vigente de Pólizas**. `Listado producción 2025-2026` no se acepta como sustituto. La misma regla de fuente real específica se aplica a cada bloque posterior.

## Siguiente bloque

**M5 — release candidate y visualización A&S.**

La siguiente acción es preparar una única candidata de visualización sobre el estado ya cerrado, sin iniciar Pólizas y sin reabrir M1–M4. La revisión visual debe validar el producto como A&S y detectar solo regresiones o pendientes visibles reales.

## Claude y Academia

Claude: backend protegido, no enviar implementación ni datos reales.  
Academia: actualizar con autorización independiente de escritura, selección determinística, snapshot/rollback, auditoría append-only y diferencia entre prueba de rollback y rollback realmente ejecutado.

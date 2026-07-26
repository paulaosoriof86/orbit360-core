# Incidente metodológico M4 4.2.9 — deriva semántica del digest entre gates

Fecha: 2026-07-26  
Módulo: M4 · retiro de registros target-only  
Clasificación: `PIPELINE_MECHANISM_FAILURE`

## Hallazgo

El dry-run 4.2.8-r1 publicó el digest de selección:

```text
ae809fe3efca7655c62eece69e5ee3ebb05e9b191edf4aeb58d4d0017322305a
```

La operación 4.2.9 publicó:

```text
d80ecbaf96a9863a2f69c874b490a938de93759a10b133a3ae05e7a26da5b8c4
```

La diferencia no representa una selección distinta. Los dos gates construyeron el hash superior con nombres de propiedad diferentes:

```text
dry-run:  { collection, id, snapshotHash }
write:    { collection, id, beforeHash }
```

Aunque `snapshotHash` y `beforeHash` representan el mismo concepto —el hash del estado previo del registro—, cambiar el nombre de la clave modifica el JSON y, por tanto, el SHA-256 resultante.

## Evidencia de que no cambió la selección

La operación real verificó antes y dentro de la transacción:

- origen inmutable: 414 clientes y 26 aseguradoras;
- overlay completo: exactamente 2 clientes y 2 aseguradoras;
- selección: exactamente los cuatro documentos del overlay;
- clasificación de los cuatro: `obsolete`;
- marcador técnico presente en los cuatro;
- ausencia de coincidencia por ID en origen;
- ausencia de huella equivalente en origen;
- cada documento objetivo seguía existiendo y su hash individual no había cambiado;
- resultado posterior: overlay 0/0;
- cuatro snapshots y cuatro eventos append-only verificados;
- cuatro documentos objetivo confirmados como eliminados;
- origen 414/26 confirmado sin cambios.

Por tanto, el cierre 4.2.9 permanece válido y no corresponde rollback.

## Causa raíz

No existía un esquema canónico y versionado compartido para el material que alimenta el digest entre el gate de planificación y el gate de aplicación. Cada runtime nombró de forma distinta el mismo campo semántico.

## Acción preventiva

Antes de reutilizar digests como binding entre gates futuros deberá existir un contrato común, por ejemplo:

```text
orbit360-record-before-digest-v1
{ collection, id, beforeHash }
```

El productor y el consumidor deberán:

1. usar exactamente las mismas claves y normalización;
2. declarar la versión del esquema del digest;
3. validar fixtures cruzados productor-consumidor;
4. rechazar únicamente diferencias calculadas bajo el mismo esquema;
5. conservar verificaciones independientes de conteos, clasificación, hashes individuales y readback.

## Impacto

```text
Datos operativos afectados indebidamente: 0
Rollback requerido: no
Nueva escritura requerida: no
Cierre 4.2.9 reabierto: no
Siguiente gate modificado: no
```

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: `ACADEMIA_ACTUALIZAR` — diferencia entre identidad semántica del dato y representación usada para calcular un digest.

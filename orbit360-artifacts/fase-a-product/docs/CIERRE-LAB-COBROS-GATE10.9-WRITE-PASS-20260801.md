# CIERRE LAB — COBROS / CONCILIACIÓN — GATE 10.9 WRITE_PASS

**Fecha:** 2026-08-01  
**Proyecto:** Orbit 360 — Alianzas y Soluciones  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate:** `block10.9-cobros-controlled-write-lab-v20260801`  
**Contrato:** `10.9.0`  
**Entorno:** LAB  
**Producción / deploy / main / merge:** no ejecutados

## 1. Resultado ejecutivo

El mismo gate 10.9 autorizado por Dirección cerró con:

```text
WRITE_PASS
```

La ejecución final aplicó y verificó los cinco casos aprobados:

```text
casos directos: 4
caso histórico reforzado: 1
grupos atómicos completados: 5
grupos verificados: 5
cobros creados: 5
recibos actualizados: 4
recibo histórico creado: 1
pólizas modificadas: 0
finmovs creados: 0
rollback requerido: no
```

Estado final comprobado en LAB:

```text
polizas: 1373
recibosEsperados: 1294
cobros: 5
finmovs: 0
```

No hubo navegador, deploy, Functions, Rules, Storage ni producción.

## 2. Evidencia final

```text
HEAD ejecutado: 935f8e722ee96aee9b40a69cc4c8dfbfe023d236
run: 30712176452
job: 91401430928
artifact: 8822218777
artifact digest: sha256:47a46367d90654a71d5bb8f4fe42c309803d167c69d2daafbbec44328f2b9f3f
status: WRITE_PASS
classification: GO_LAB_COBROS_CONTROLLED_WRITE
```

Controles comprobados:

- snapshot previo;
- idempotencia;
- atomicidad por caso;
- rollback global ante cualquier fallo;
- verificación posterior a la escritura;
- caso histórico separado y reforzado;
- ninguna reactivación de póliza;
- ningún `finmov` creado;
- evidencia sanitizada sin PII, números de póliza, importes ni secretos.

## 3. Incidencias, clasificación y causa raíz

### Intento 1

```text
run: 30711389436
artifact: 8821984014
clasificación: DATA_CONTRACT_FAILURE_CANONICALIZATION
primer check fallido: PRIVATE_PACKAGE_LOGICAL_SHA
Firestore leído: no
escrituras: 0
```

Causa: diferencia de canonicalización numérica entre productor y consumidor del paquete privado.

Corrección: digest lógico canónico calculado con serialización estable de Node, sin cambiar datos operativos.

### Intento 2

```text
run: 30711578397
artifact: 8822041409
clasificación: DATA_CONTRACT_FAILURE
primer check fallido: RECEIPT_SNAPSHOT_MISMATCH
caso: tercera tarjeta directa
```

Los primeros dos grupos se escribieron transitoriamente y el gate ejecutó rollback global. El baseline quedó restaurado exactamente:

```text
polizas: 1373
recibosEsperados: 1293
cobros: 0
finmovs: 0
```

Causa raíz demostrada mediante diagnóstico read-only: los casos 3 y 4 esperaban `endoso: null`, mientras los recibos canónicos almacenaban `endoso` como cadena vacía.

### Diagnóstico y reparación

```text
diagnóstico read-only exitoso: run 30711814124
artifact: 8822109811
campos divergentes: endoso
casos: 3 y 4
valores publicados: no
Firestore writes: 0
```

El paquete privado fue reparado conservando el valor canónico real, el mismo Drive ID y cero escrituras en Firestore.

Hashes finales:

```text
physical sha256: beebdac90668291686f55610bdc2d8853ae5f2de4ae17b73732bb03812218911
logical sha256: fccae1f73d254a0fca8e1a0208a92f4a9a601bc83c8f8e26cb027be165f354bb
```

### Revalidación read-only previa a reabrir escritura

```text
run: 30712109933
artifact: 8822198624
artifact digest: sha256:ff866d8ecf4777bbac51d5862d86a42c0457e31fd1e0352059d57ec13138824d
blockingCases: 0
allFiveCasesMatch: true
Firestore writes: 0
```

Solo después de demostrar la causa raíz, corregir el paquete y obtener cero bloqueos se reabrió el mismo gate una única vez.

## 4. Carriles

### Carril A — frontend, UX y Academia

No se modificó frontend ni UX para satisfacer el gate. Se preservan como patrones reutilizables los estados honestos de cobro, conciliación, histórico y rollback.

### Carril B — backend, seguridad y `Orbit.store`

Se mantuvo el writer específico de Cobros; el writer genérico continúa bloqueando esta colección. El lifecycle quedó cerrado y toda nueva ejecución del request está prohibida.

### Carril C — datos reales A&S

Se escribieron exclusivamente los cinco casos autorizados. No se tocaron pólizas, producción, cartera general ni `finmovs`. Las fuentes privadas permanecen fuera del repositorio.

## 5. Archivos y capas modificadas

- paquete privado de control en Drive, mismo ID;
- contrato canónico del gate 10.9;
- lifecycle versionado;
- request final del mismo gate;
- diagnóstico read-only y reparador privado;
- documentación de cierre, Claude y Academia.

No se modificaron módulos operativos, Auth, Rules, Functions, producción ni datos fuera de los cinco casos.

## 6. Estado final del gate

```text
GATE 10.9: CLOSED_WRITE_PASS
REQUEST: SELLADO POR LIFECYCLE
REPLAY: PROHIBIDO
DATOS LAB: 5 COBROS VERIFICADOS
ROLLBACK FINAL: NO REQUERIDO
POLIZAS MODIFICADAS: 0
FINMOVS: 0
DEPLOY: 0
PRODUCCION: INTACTA
```

## 7. Impacto Claude / prototipo reusable

- Patrón reusable detectado: estados honestos de conciliación, caso histórico separado y no reactivación automática de póliza.
- Debe compartirse con Claude: sí, acumulado y sin backend protegido.
- Módulos impactados: Cobros, Recibos, Cliente 360, Historial y Academia.
- No compartir: hashes, writer, secretos, package privado, IDs reales, datos reales o implementación Firestore.

## 8. Impacto Academia

Actualizar la formación para explicar:

- pago reportado no equivale a cobro confirmado;
- cobro confirmado no crea automáticamente un movimiento financiero;
- recibo histórico puede registrarse sin reactivar la póliza;
- snapshot, idempotencia, atomicidad, verificación y rollback;
- diferencia entre defecto funcional, contrato de datos y validador obsoleto;
- por qué no se reimportan datos para corregir un snapshot.

## 9. Siguiente acción exacta

```text
cerrar documentación y ledger del gate 10.9
→ ejecutar una verificación read-only post-cierre de relaciones de los cinco cobros
→ mantener bloqueadas nuevas escrituras del request 10.9
→ continuar el siguiente cierre de Cobros/Conciliación definido por el plan, usando únicamente fuentes vigentes cuando sean necesarias
```

No corresponde solicitar otra autorización para repetir el gate 10.9 ni reusar archivos desactualizados.

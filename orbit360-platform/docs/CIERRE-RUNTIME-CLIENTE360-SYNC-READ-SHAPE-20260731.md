# Cierre runtime — Cliente 360 sync-read shape · 2026-07-31

## Bloque
Recibos/Cartera 9.1.0 · Cliente 360 integración visual.

## Autorización
`AUTORIZO HOSTING LAB FIX CLIENTE360 SYNC READ SHAPE 20260731`

## Causa raíz cerrada
`CLIENT360_ASYNC_CANONICAL_PROJECTION_RACES_SYNCHRONOUS_DETAIL_RENDER`

Clasificación: `FUNCTIONAL_DEFECT`.

El read-model de Cliente 360 obtenía el cliente crudo y podía renderizar antes de que la proyección canónica asíncrona normalizara arrays opcionales. El fix `b164b3590a41d6ff5ff12766ab1885e50ac24f78` proyecta el cliente sincrónicamente en la frontera de `q.clienteResumen` antes de construir/cachear `r.cli`.

## Evidencia rojo → verde previa
- rojo: run `30660079725` — contrato `synchronousClientShape` falla; deploy 0; writes 0.
- verde: run `30660261652` — gate/contrato PASS; artifact `8804859413`; digest `sha256:36e014c8651956bff6104bd1c3fc5fd04cf97a00cd9dbc6b3f6112939c85ad7f`.

## Runtime autorizado final
- trigger SHA: `952f67d891f30d123357625923e3dc16f31af081`
- run: `30660989314`
- artifact: `8805163420`
- digest: `sha256:b9c6c679a400346808cf9ad2344db9e30643d53b8bbe9d8bcae89e331137287b`
- status final: `HOSTING_LAB_CLIENT360_SYNC_READ_SHAPE_VISUAL_PASS`
- `ok: true`

### Pipeline
- lineage exacto: PASS
- gate canónico 9.1.0: PASS
- static 39/39 + synchronous shape: PASS
- Hosting LAB: 1/1 PASS
- paridad remota: 6/6 PASS
- hidratación exacta: PASS
- visual LAB multirol: PASS

### Conteos preservados
- clientes: 430
- aseguradoras: 30
- asesores: 7
- pólizas: 1373
- vehículos: 1032
- recibosEsperados: 1293
- carteraPrimas: 673
- cobros: 0
- finmovs: 0

### Visual multirol
- Dirección 1440×1000: 430 filas visibles; copy técnico=false
- Operativo 900×1100: 390 filas visibles; copy técnico=false
- Asesor 390×844: 390 filas visibles; copy técnico=false
- legal: aceptado una vez; remaining=0

### Seguridad/alcance
- Rules deploy: 0
- Functions deploy: 0
- Storage deploy: 0
- Firestore data writes: 0
- operational writes: 0
- producción: false
- contiene PII/secrets: false

## STOP_RETRY
Se activó durante los fallos previos. No hubo retry ciego: se diagnosticó integridad, owner lifecycle, optional shape y finalmente la carrera sync/async; cada reapertura de Hosting ocurrió únicamente después de causa raíz + prueba estática/sintética nueva.

## Estado
`RUNTIME_AUTOMATED_PASS`.

Recibos/Cartera queda listo para **una única revisión visual humana**. Cobros permanece bloqueado hasta cerrar esa revisión, conforme al Plan Maestro.

## Siguiente acción exacta
Abrir el LAB vigente y revisar una sola vez Cliente 360 → Póliza full-page → Vehículo full-page → Recibos/Cartera en Dirección/Operativo/Asesor. Si la revisión humana no detecta defecto bloqueante, cerrar Recibos/Cartera y avanzar a Cobros/conciliación sin reabrir Clientes ni reimportar datos.

# ESTADO ACTIVO — BLOQUE 4.0 · REPLAY COMPLETO READ-ONLY DE COBROS

Fecha local: 2026-08-05 06:49 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `PASS_COBROS_FULL_REPLAY`  
Estado: `ACTIVE_READ_ONLY`

## Punto de partida cerrado

Bloque 3.0 Ops/Leads durable quedó cerrado mediante evidencia funcional reutilizada y despliegue actual verificado. No se requiere otro runtime, deploy o visual para iniciar Cobros.

La revisión manual de la candidata continúa disponible en paralelo:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

## Universo vigente

```text
pagos reportados: 365
conciliaciones propuestas por secuencia de cartera: 128
pagos válidos posteriores al corte: 2
pendientes de overlay adicional: 235
cobros ya materializados: 5
HOLD conocidos: 44
```

Los 235 no son un resultado final. Deben cruzarse con las planillas vigentes y reportes directos, preservando los 128 + 2 ya explicados y los 5 cobros existentes, sin duplicidad.

## Alcance

1. Recuperar únicamente fuentes privadas vigentes ya disponibles.
2. Aplicar el replay inferencial completo sobre el mismo contrato.
3. Cruzar cartera, planillas y reportes directos por póliza, vigencia, moneda, cuota y evidencia.
4. Clasificar cada pago como confirmado, inferido, pendiente o HOLD.
5. Mantener trazabilidad y razón de cada decisión.
6. Emitir evidencia sanitizada y conteo final.

## Restricciones

```text
Firestore writes: 0
Auth writes: 0
aplicación de cobros: 0
modificación de recibos: 0
reimportación: 0
deploy Functions: 0
deploy Hosting: 0
Rules: no
producción/main/merge: no
```

No utilizar estados bancarios aislados para crear cobros. No convertir ausencia en conciliación. No escribir desde histórico financiero. No duplicar los cinco cobros existentes.

## Owners

```text
replay completo: tools/orbit360-cobros-full-replay-v20260804.mjs
inferencia secuencial: tools/orbit360-cobros-inferencia-secuencial-v20260804.mjs
contrato: tools/orbit360-cobros-full-materialization-contract-v20260804.json
evidencia previa: runtime-gate-crm-v20260716/cobros-full-replay-*.json
```

## Criterio de salida

```text
PASS_COBROS_FULL_REPLAY
365 pagos explicados sin doble conteo
5 cobros existentes preservados
HOLD explícitos
cero escrituras
ledger sanitizado
```

## Siguiente acción exacta

Auditar el replay y las fuentes vigentes ya montadas, ejecutar únicamente validación source/read-only y cerrar el conteo final. Solo después se prepara el Bloque 4.1 de materialización durable, que sí requerirá una autorización separada de escritura.

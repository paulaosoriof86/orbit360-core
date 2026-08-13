# Auditoría semántica — candidata Claude v1.257

Fecha: 2026-07-17  
Proyecto: Orbit 360 A&S  
Bloque: 0 — baseline canónico y sincronización Claude  
Candidata: `Prototype Development Request - 2026-07-17T013205.678.zip`  
SHA-256: `8a9c7f7f7111bc0e1a0d2f41a49e4bd7d869fedf774fc0117707990ed786d1ea`

## Resultado

La candidata es incremental y técnicamente limpia, pero no está lista para empalme.

```txt
archivos: 113
idénticos frente a v1.256: 103
modificados: 8
agregados: 2
retirados: 0
JavaScript: 59
node --check: 0 errores
referencias locales faltantes: 0
```

Permanecen byte-idénticos `data/store.js`, `core/auth.js`, `core/importa.js`, `core/router.js`, `core/legal.js` y `core/pwa.js`.

## P0-S1 — Equivalencia semántica de `Orbit.access`

Aunque v1.257 expone los nombres solicitados, no conserva toda la conducta del contrato vivo:

- `can()` no preserva restricciones, permisos extra ni matriz por rol/módulo/acción;
- `canView()`/`filter()` no derivan asesor mediante `clienteId` o `polizaId`;
- `prepareManual()` no prepara tenant, país, moneda, trazabilidad y calidad estructurada;
- `deriveClientState()` no conserva `activo_en_mora` ni `reactivable`;
- `actorUser()` pierde identidad de Auth;
- `scopedStore()` y `withScope()` cambian la semántica existente.

La prueba incluida verifica principalmente existencia de funciones, no equivalencia conductual.

## P0-S2 — Proyección incompleta en Pólizas y Cobros

Cliente 360 y Calidad ya proyectan correctamente. Sin embargo:

- `modules/polizas.js` sigue buscando con `cli.nombre` crudo;
- `modules/cobros.js` sigue usando datos crudos en `rows()`, `matchTxt()`, detalle, lotes, recordatorios y automatizaciones;
- `K.clienteCell()` solo corrige la celda visible, no los consumidores restantes.

La proyección debe usarse mediante un helper único que devuelva una copia sin escribir ni reimportar.

## P0-S3 — Cotizador habilita Comparativo implícitamente

v1.257 calcula Comparativo como habilitado cuando el estado es `Habilitado para Cotizador`. La regla correcta es separación explícita por consumidor:

| Estado | Cotizador | Comparativo |
|---|---:|---:|
| Habilitado para Cotizador | sí | no |
| Habilitado para Comparativo | no | sí |

Los estados previos, incluido `Validado`, no consumen operativamente.

## Decisión

```txt
sintaxis/referencias: VERDE
copy/Academia/documentación: VERDE
contrato de acceso: PENDIENTE SEMÁNTICO
proyección Cliente 360/Calidad: VERDE
proyección Pólizas/Cobros: PENDIENTE
habilitación por consumidor: PENDIENTE
empalme selectivo: BLOQUEADO
```

Se emitió un último paquete de corrección semántica limitado a P0-S1, P0-S2 y P0-S3. No se reabre el paquete general ni se solicita evidencia responsive antes del gate LAB.
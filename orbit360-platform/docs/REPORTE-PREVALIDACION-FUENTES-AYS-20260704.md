# Reporte de prevalidación estructural de fuentes A&S — 2026-07-04

**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy, sin main  
**Estado:** avance backend seguro; no se cargó Firestore, no se modificó `Orbit.store`, no se subieron datos reales.

## Restricciones aplicadas

- Solo se generaron manifests estructurales.
- No se incluyeron filas reales, contactos, conceptos, pagadores, beneficiarios, importes, saldos ni payload operativo.
- No se creó ni modificó ningún cliente, póliza, cobro, cartera, comisión ni `finmov`.
- No se escribió en Firestore ni se ejecutó deploy.
- Los manifests declaran `write_enabled: false` y `contains_real_payload: false`.

## Archivos estructurados

| Fuente | Manifest estructural local | Tipo de fuente | País/moneda | Destino permitido | Resultado dry-run |
|---|---|---|---|---|---|
| Directorio Aseguradoras Guatemala 2026.xlsx | `MANIFEST-DIRECTORIO-ASEGURADORAS-GT-20260704.structural.json` | `aseguradoras` | GT/GTQ | `aseguradoras` | LISTO_DRYRUN |
| Directorio - Aseguradoras Colombia 2024.xlsx | `MANIFEST-DIRECTORIO-ASEGURADORAS-CO-20260704.structural.json` | `aseguradoras` | CO/COP | `aseguradoras` | LISTO_DRYRUN |
| Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx | `MANIFEST-MOVIMIENTOS-FINANCIEROS-GT-CO-20260704.structural.json` | `financiero_historico` | MIXTO/MIXTO, validado por hoja | `finmovs` | REQUIERE_VALIDACION no bloqueante |

> Nota de seguridad: los JSON de manifest se generaron como artefactos estructurales de trabajo, sin filas reales. No se suben payloads ni Excels al repo. Si Paula autoriza conservar manifests estructurales en GitHub, se pueden agregar en `orbit360-platform/docs/migracion/manifests/`.

## Resultado por fuente

### 1. Directorio Aseguradoras Guatemala

- Hojas estructurales incluidas: 16.
- Hojas excluidas: 2.
- Tipo: `aseguradoras`.
- País/moneda declarados: `GT/GTQ`.
- Destino permitido: `aseguradoras`.
- Resultado dry-run estructural v2: `listo_dryrun`.
- Bloqueo: ninguno.
- Advertencias: ninguna.

Validación aplicada:

- No escribe clientes, pólizas, cobros, cartera ni `finmovs`.
- El directorio queda como catálogo/directorio por país.
- Cualquier acceso, contraseña, link privado o secreto debe quedar fuera del frontend y pasar por backend seguro/secret manager en fases posteriores.

### 2. Directorio Aseguradoras Colombia

- Hojas estructurales incluidas: 17.
- Hojas excluidas: 0.
- Tipo: `aseguradoras`.
- País/moneda declarados: `CO/COP`.
- Destino permitido: `aseguradoras`.
- Resultado dry-run estructural v2: `listo_dryrun`.
- Bloqueo: ninguno.
- Advertencias: ninguna.

Validación aplicada:

- No mezcla con Guatemala.
- No escribe clientes, pólizas, cobros, cartera ni `finmovs`.
- Debe mantenerse como directorio/catálogo de aseguradoras del tenant A&S Colombia.

### 3. Movimientos ingresos/egresos A&S GT/CO

- Hojas mensuales financieras incluidas: 38.
- Hojas excluidas por no pertenecer a `financiero_historico`: 6.
- Tipo: `financiero_historico`.
- País/moneda: `MIXTO/MIXTO` a nivel libro, validado por hoja (`GT/GTQ` o `CO/COP`).
- Destino permitido: `finmovs`.
- Resultado dry-run estructural v2: `requiere_validacion`.
- Bloqueo: ninguno.
- Advertencias esperadas: país/moneda mixtos a nivel libro.

Validación aplicada:

- No inferir clientes, pólizas ni cobros desde financiero histórico.
- No escribir cartera desde movimientos financieros.
- No duplicar recaudos/cobros en `finmovs`.
- Hojas de dashboard, análisis, presupuesto, salario y producción se excluyen de esta fuente.
- La hoja `Listado producción 2025-2026` se detectó dentro del archivo, pero se excluye del manifest financiero. Debe tratarse en manifest separado tipo `polizas`, no como financiero histórico.

## Ajuste técnico identificado

El dry-run anterior no cubría todos los tipos del contrato canónico, especialmente `aseguradoras` y `estado_cuenta_bancario`. Para no bloquear los directorios, se preparó `tools/orbit360-dryrun-fuente-separada-ays-v2.mjs` y se ajustó `tools/orbit360-prevalidar-fuente-ays.mjs` para usar el dry-run v2 si existe.

## Bloqueos antes de carga LAB

1. Confirmar que los directorios de aseguradoras se cargarán primero como catálogo/directorio, no como contactos operativos con credenciales visibles.
2. Mantener excluidas las hojas de presupuesto/dashboard/análisis/salarios del archivo financiero.
3. Crear manifest separado para `Listado producción 2025-2026` como fuente `polizas`, antes de cualquier intento de cargar pólizas/cartera.
4. Definir fase de preview normalizado antes de `writeToStore`.
5. Mantener `write_enabled=false` hasta autorización explícita de Paula para LAB.

## Decisión

Se puede continuar hacia el siguiente bloque backend: parser/preview estructural por fuente para `aseguradoras` y `financiero_historico`, manteniendo carga LAB deshabilitada hasta autorización.

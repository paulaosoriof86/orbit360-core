# Normalización producción/pólizas A&S GT/CO desde ChatGPT

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** normalización privada local realizada; datos reales NO subidos al repo; escritura Firestore NO realizada.

## Archivo fuente procesado

- `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx`
- Hoja: `Listado producción 2025-2026`

## Alcance de esta normalización

Se continuó desde el punto pendiente del documento de movimientos/producción: transformar el listado de producción en estructuras Orbit para migración real A&S.

Colecciones preparadas en payload privado local:

```txt
clientes[]
polizas[]
aseguradoras_referenciadas[]
asesores_referenciados[]
cobros[]
cobros_candidatos_requieren_validacion[]
duplicados_poliza_para_validar[]
```

## Resultado ejecutivo sin datos reales

- Filas no vacías detectadas en la hoja: 446.
- Registros útiles de producción/póliza tras excluir títulos, encabezados, subtotales y totales: 404.
- Pólizas canónicas deduplicadas por número + país/moneda: 352.
- Ocurrencias duplicadas separadas para validación histórica/renovación: 52.
- Clientes deduplicados por nombre normalizado: 216.
- Aseguradoras referenciadas: 28.
- Asesores/vendedores referenciados: 13.
- Cobros definitivos generados: 0.
- Candidatos de cobro para revisión: 231.

## Distribución de pólizas canónicas por estado

Fecha de corte usada: `2026-07-03`.

- Vigente: 183.
- Por renovar: 50.
- Vencida: 115.
- Pendiente validar vigencia: 4.

## Distribución por moneda / país

- GTQ / GT: 307 pólizas canónicas.
- COP / CO: 41 pólizas canónicas.
- S/D / país no confiable: 4 pólizas canónicas.

## Reglas aplicadas

### Deduplicación

- Cliente: nombre normalizado; la hoja no contiene documento de identificación.
- Aseguradora: nombre + país/moneda detectada.
- Asesor: vendedor normalizado.
- Póliza: número normalizado + país/moneda detectada.
- Si una póliza aparece varias veces, queda como canónica la ocurrencia con `vigencia_fin` más reciente; las anteriores se separan como duplicados para validar si son historial, renovación o repetición.

### Clasificación de estado

- `Vencida`: fecha fin de vigencia anterior a `2026-07-03`.
- `Por renovar`: fecha fin de vigencia entre `2026-07-03` y 60 días posteriores.
- `Vigente`: fecha fin posterior a 60 días.
- `Pendiente validar vigencia`: no se pudo leer rango de vigencia.

### Cobros / cartera

No se generaron `cobros[]` definitivos porque la hoja no contiene forma de pago, cuota, estado de cobro ni confirmación de saldo pendiente.

Para no contaminar cartera, se dejó una colección privada separada de `cobros_candidatos_requieren_validacion` para pólizas vigentes/por renovar con prima total y moneda reconocida.

Regla protegida:

```txt
Cartera = solo cobros pendientes de pólizas vigentes o por renovar del año actual.
```

Por tanto, estos candidatos NO deben cargarse como cartera hasta validar estado real de cobro.

## Archivos privados locales generados

No subir al repo:

```txt
/mnt/data/orbit360_produccion_polizas_AYS_GT_CO_normalizado_privado_20260703.json
/mnt/data/orbit360_resumen_produccion_polizas_AYS_GT_CO_20260703.csv
/mnt/data/orbit360_reporte_normalizacion_produccion_polizas_AYS_GT_CO_20260703.md
```

## Hallazgos / pendientes

1. Validar grupos de pólizas repetidas por número + país/moneda antes de carga LAB.
2. Validar pólizas repetidas donde cambia el asegurado normalizado.
3. Resolver registros `S/D` sin país/moneda confiable.
4. Complementar con forma de pago, cuotas y estado de cobro antes de generar cartera real.
5. Cruzar aseguradoras referenciadas contra el directorio GT/CO previamente normalizado.
6. Cruzar clientes contra documentos/expedientes si luego se cargan DPI/NIT/cédula.
7. Mantener carga Firestore en modo NO autorizado hasta que Paula revise reporte y autorice LAB explícitamente.

## Estado

- Normalización privada local: realizada.
- Datos reales en repo: no.
- Escritura Firestore: no.
- Prototipo/seed: no tocado.
- Pendiente operativo: revisión del reporte privado y cruce con directorio aseguradoras/clientes antes de primer dry-run LAB.

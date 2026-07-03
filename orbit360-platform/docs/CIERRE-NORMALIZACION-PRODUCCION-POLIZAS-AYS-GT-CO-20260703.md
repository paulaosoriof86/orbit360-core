# Cierre normalización producción/pólizas A&S GT/CO

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Fuente:** `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx`  
**Hoja:** `Listado producción 2025-2026`  
**Estado:** cierre documental de normalización privada; sin datos reales en repo; sin escritura Firestore.

## 1. Conteos finales

| Métrica | Resultado |
|---|---:|
| Filas no vacías detectadas en la hoja | 446 |
| Registros útiles de producción/póliza | 404 |
| Registros descartados/no importables | 42 |
| Pólizas finales canónicas deduplicadas | 352 |
| Ocurrencias duplicadas separadas para revisión | 52 |
| Clientes únicos deduplicados | 216 |
| Aseguradoras referenciadas | 28 |
| Asesores/vendedores referenciados | 13 |
| Cobros definitivos generados | 0 |
| Candidatos de cobro para validación | 231 |

## 2. Registros descartados y motivo

Se descartaron 42 filas no importables porque no representan una póliza/producción válida para migración CRM.

Motivos agrupados:

- Títulos o separadores de sección.
- Encabezados repetidos dentro de la hoja.
- Subtotales o totales por bloque.
- Filas de apoyo visual/estructura sin número de póliza útil.
- Filas sin datos mínimos para crear entidad Orbit.

Regla aplicada: una fila solo entra como producción/póliza si tiene señales mínimas de registro operativo, especialmente número de póliza o datos equivalentes de póliza/asegurado/aseguradora/vigencia. Totales y subtotales no se importan como datos transaccionales.

## 3. Deduplicación aplicada

- **Clientes:** por nombre normalizado, porque la hoja no contiene documento de identificación confiable.
- **Pólizas:** por número de póliza normalizado + país/moneda detectada.
- **Aseguradoras:** por nombre normalizado + país/moneda detectada.
- **Asesores/vendedores:** por nombre normalizado.

Cuando una póliza aparece repetida, se conserva como canónica la ocurrencia con vigencia fin más reciente. Las ocurrencias anteriores no se borran del análisis; quedan separadas en duplicados para validar si son historial, renovación, repetición contable o corrección manual.

## 4. Clasificación de estados de póliza

Fecha de corte: `2026-07-03`.

| Estado | Cantidad | Regla |
|---|---:|---|
| Vigente | 183 | Vigencia fin posterior a 60 días desde la fecha de corte. |
| Por renovar | 50 | Vigencia fin entre la fecha de corte y los siguientes 60 días. |
| Vencida | 115 | Vigencia fin anterior a la fecha de corte. |
| Cancelada | 0 | La hoja no trae estado explícito de cancelación confiable. No se infiere cancelación solo por fecha vencida. |
| Sin dato / pendiente validar vigencia | 4 | No se pudo leer o normalizar vigencia de forma segura. |

Regla protegida: no convertir vencimiento en cancelación. `Vencida` y `Cancelada` son estados distintos; cancelada requiere dato explícito del sistema, póliza, aseguradora o registro operativo.

## 5. Cartera vs histórico

### Queda como cartera real

Nada queda como cartera real todavía.

Motivo: la hoja de producción no contiene forma de pago, cuotas, saldo pendiente, recibos pendientes ni estado real de cobro. Por seguridad, no se generaron `cobros[]` definitivos.

### Queda como candidato a cartera

Se separaron 231 candidatos de cobro para validación posterior. Son pólizas vigentes o por renovar con prima y moneda reconocida, pero todavía no deben cargarse como cartera.

### Queda como histórico / analítica

- Las 115 pólizas vencidas quedan como histórico y analítica, no como cartera.
- Las 52 ocurrencias duplicadas quedan como histórico/validación de renovación hasta confirmar si representan renovaciones, versiones previas o duplicados reales.
- Las 4 pólizas sin vigencia quedan bloqueadas para revisión antes de carga.

Regla de negocio: cartera = cobros pendientes de pólizas vigentes o por renovar del año actual, con evidencia real de pendiente. Producción no equivale automáticamente a cartera.

## 6. Moneda, país e inconsistencias detectadas

Distribución de pólizas finales:

| Moneda | País inferido | Pólizas |
|---|---|---:|
| GTQ | GT | 307 |
| COP | CO | 41 |
| S/D | S/D | 4 |

Hallazgos:

- La hoja mezcla producción GT y CO en el mismo libro/hoja, separada por secciones de moneda.
- No se detectó autorización para sumar GTQ y COP en totales brutos; deben mantenerse aislados por país/moneda.
- Hay 4 pólizas con moneda `S/D` y país no confiable; no deben cargarse sin resolución.
- Hay aseguradoras con nombre vacío o no confiable en algunos registros; deben validarse antes de carga LAB.
- Hay asesores/vendedores vacíos en algunos registros; deben asignarse o quedar como pendiente controlado.

## 7. Campos faltantes para carga segura a LAB

Para una carga segura a Firestore LAB se requiere complementar o validar:

1. Documento/NIT/DPI/cédula del cliente, si está disponible.
2. País confiable en registros `S/D`.
3. Aseguradora normalizada contra directorio GT/CO.
4. Asesor/vendedor definitivo cuando el campo está vacío o ambiguo.
5. Estado explícito de póliza si existe: emitida, vigente, cancelada, anulada, vencida, renovada.
6. Forma de pago.
7. Cuotas/recibos generados.
8. Estado de cobro: pendiente, pagado, vencido, anulado, no facturado.
9. Saldo pendiente real.
10. Fechas de emisión, inicio y fin de vigencia validadas.
11. Ramo/producto normalizado.
12. Validación de duplicados donde cambia asegurado, aseguradora o vigencia.

## 8. Payload/reporte privado generado para Paula

Archivos generados fuera del repositorio:

```txt
/mnt/data/orbit360_produccion_polizas_AYS_GT_CO_normalizado_privado_20260703.json
/mnt/data/orbit360_resumen_produccion_polizas_AYS_GT_CO_20260703.csv
/mnt/data/orbit360_reporte_normalizacion_produccion_polizas_AYS_GT_CO_20260703.md
```

Regla: estos archivos no deben subirse al repo porque contienen o derivan de datos reales de clientes, pólizas, producción e importes.

## 9. Documentación subida al repo

Se documentó solo conteo, lógica, hallazgos y pendientes, sin payload real:

```txt
orbit360-platform/docs/NORMALIZACION-PRODUCCION-POLIZAS-AYS-GT-CO-CHATGPT-20260703.md
orbit360-platform/docs/NORMALIZACION-MOVIMIENTOS-PRODUCCION-AYS-GT-CO-CHATGPT-20260703.md
orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260703-PRODUCCION-POLIZAS.md
orbit360-platform/docs/CIERRE-NORMALIZACION-PRODUCCION-POLIZAS-AYS-GT-CO-20260703.md
```

## 10. Pendientes para backend / migración A&S

1. Cruzar aseguradoras referenciadas contra directorio GT/CO normalizado.
2. Resolver 4 registros `S/D`.
3. Revisar 52 ocurrencias duplicadas.
4. Revisar grupos donde la misma póliza aparece con asegurado distinto.
5. Completar forma de pago y estado de cobro antes de crear cartera.
6. Ejecutar auditoría de calidad de relaciones con el payload privado antes de cualquier escritura LAB.
7. Mantener escritura Firestore LAB bloqueada hasta autorización explícita.

## 11. Pendientes para prototipo base / Claude

Aplicar al importador manual/inteligente de producción y pólizas:

1. Leer hojas multi-sección con encabezados repetidos.
2. Detectar y excluir títulos, separadores, subtotales y totales.
3. Separar secciones por moneda/país sin sumar GTQ/COP en crudo.
4. Mostrar prevalidación antes de importar: registros útiles, descartados, duplicados, moneda S/D, país S/D, aseguradora vacía, asesor vacío y pólizas sin vigencia.
5. Diferenciar producción, póliza, cobro y cartera.
6. Bloquear creación de cartera si no hay forma de pago, saldo pendiente o estado real de cobro.
7. Mantener duplicados como revisión, no sobrescribir silenciosamente.
8. Usar estado `Cancelada` solo si existe dato explícito; no inferirlo por vencimiento.

## 12. Restricciones cumplidas

- No deploy.
- No merge.
- No actualización de `main`.
- No escritura Firestore.
- No carga a producción.
- No datos reales en repo.
- No payload privado en GitHub.
- No secretos.
- No modificación de `data/store.js` ni backend LAB protegido.

## Estado final del bloque

**Bloque de normalización producción/pólizas: CERRADO DOCUMENTALMENTE.**

Queda pendiente la fase de cruce y auditoría de calidad antes de cualquier dry-run/carga LAB.

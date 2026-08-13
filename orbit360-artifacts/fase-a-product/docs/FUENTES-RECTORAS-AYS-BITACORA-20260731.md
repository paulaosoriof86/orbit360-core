# Fuentes rectoras A&S — bitácora de recepción 2026-07-31

Estado: `OPEN_PENDING_MORE_FILES`  
Lote activo: `AYS-SOURCES-20260731-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Payload real en repo: **NO**.

## Motivo

Se corrige una falla metodológica: no es válido reconstruir el corte vigente buscando archivos históricos disponibles en Drive. A partir de este punto cada archivo real recibido se registra por nombre lógico, nombre exacto de carga, SHA-256, tamaño, dominio, estructura y estado de inspección. Una fuente no registrada en el manifiesto vigente no puede incorporarse a una migración, enriquecimiento o dry-run operativo.

## Regla de control transversal

1. El manifiesto de fuentes es obligatorio por corte.
2. Mientras el estado sea `OPEN_PENDING_MORE_FILES`, quedan bloqueadas las escrituras y enriquecimientos de datos.
3. Un archivo anterior con el mismo nombre no sustituye al archivo recibido en el corte: el SHA-256 decide identidad.
4. Las fuentes antiguas de Drive pueden servir solo como trazabilidad o comparación cuando el manifiesto lo autorice explícitamente; no son fuente vigente por disponibilidad.
5. Los archivos reales no se versionan en GitHub; en repo solo se conserva metadata sanitizada.
6. Cada fuente se asigna a un dominio independiente: Pólizas, Vehículos, Recibos, Cartera, Cobros/Recaudos, Comisiones, etc. No se permite inferir cobros desde cartera ni finmovs desde recaudos.
7. Un archivo con estructura técnicamente imperfecta no se descarta si sus datos son recuperables. Se registra la condición y se usa un lector compatible y controlado.
8. Antes de cerrar el lote se debe confirmar con el usuario que no faltan archivos del corte.

## Lote 01 recibido en esta conversación — 20 archivos

### Pólizas / renovaciones
- `Listado de Emitido 2017 a 30 jul.xls` — SHA-256 `eb429cf0933b9e9eb0d38bbb9e802eec6b4b6830f8d8c5fdb351e748653ebc8f` — Pólizas.
- `Total emitido 2017 a julio 30 2026.xls` — SHA-256 `44daced27cff2e81b3a6509a31773dbe1e5eb0ed0986a835cb531b86eaaa061f` — Pólizas.
- `Renovaciones 2024 a 2026.xlsx` — SHA-256 `52dad63af551e940901c4e5b51b2d1aa6fd4989e4d9060a936b1897d0e208afb` — 248 filas no vacías incluyendo encabezado; 33 columnas efectivas.

### Vehículos
- `Reporte de vehículos 2017 a 2026.xlsx` — SHA-256 `c28c81e61978231f67247ddad2fcb535059f89ab4ad22ea6852e5fb489a6c022` — 1,059 filas no vacías incluyendo encabezado; 30 columnas efectivas.

### Recibos / cobranza transversal
- `Todos los recibos a partir de 2025.xlsx` — SHA-256 `72375b292c0b4b4ea5e9093be54d7cb294b5a4d31a0ce4093e7bd8b14003cb37` — 2,099 filas; 16 columnas.
- `Reporte-2026-07-30-183043.xlsx` — SHA-256 `14c48ecad2a01128b7c0a35fa20dbca82ff7a8a49a479537350cf4dfdea753b1` — 2,105 filas recuperables; 16 columnas. El XML de estilos es inválido, pero los datos internos sí son legibles.
- `Recibos por fecha límite.xlsx` — SHA-256 `6e64e6ee82aba95fd99b01ea21c0c203fdfe0accc27f654fccaf543cc17aa896` — 1,699 filas; 51 columnas.
- `CobranzaCendoso (23).xlsx` — SHA-256 `739587b38bdb83e68a4a9946d113f3fd742858b29ceac383db4bf3400fa8adaf` — 1,705 filas recuperables; 51 columnas; estilos inválidos pero datos legibles.
- `CobranzaCendoso (22).xlsx` — SHA-256 `a2e42d9c630508b0b7da99fd572912437e358fcbd7c9f1be69a78890e65add80` — 2,164 filas recuperables; 51 columnas; estilos inválidos pero datos legibles.
- `Cobranza Efectuada desde 2024.xlsx` — SHA-256 `727665170572143979b5f274190e200da397e7b32965d1809b1b9be6a8495302` — 2,158 filas; 51 columnas.
- `Cobranza vencida.xlsx` — SHA-256 `80a81979cd9c6253a398d5099eeb788197688fbea27d61be5c32e767d7314029` — 326 filas; 51 columnas.

Los archivos de 51 columnas contienen campos útiles que el contrato canónico anterior no estaba preservando íntegramente, entre ellos prima neta, expedición, financiamiento, IVA, comisiones, prima total, bien asegurado y tipo de emisión. Esto se registra como evidencia para el futuro ajuste del contrato, pero **no autoriza todavía escritura ni reimportación**.

### Cartera por aseguradora
- `Cartera Pendiente La Ceiba.pdf` — SHA-256 `389a0be4afb0f483946bc7ee98715f93cd85757a1973e7bb11f54fd057c50008` — corte visible 31/07/2026; detalle de pendientes por póliza y antigüedad.
- `Reporte de Primas pendientes Aseguradora General.xls` — SHA-256 `1c7c5b01dfb1ce4af4d4f88ee4a0c4b1c7a19e7aecedb1716a1106f5b25b46ab` — perfil de contenido pendiente.
- `Balance de cuentas Universales.pdf` — SHA-256 `92379f984781c3312fc5c7d3a88a6c09becac7b71c3cd0c534f53d5b1005196b` — antigüedad con detalle de recibos al 27/07/2026.
- `Estado de Cartera GyT.xlsx` — SHA-256 `d6348e3d63c8a1dd96af5b07940f9d1fd66aba0cb0d1768d20bbdb901aabce79` — estructura de póliza/producto/certificado/estado/vencimiento/pago.
- `Proyectado Mapfre.xls` — SHA-256 `1e2dba4c7a19284a221a6090f030def53728e8b057e037b76caa8d6ffa9cd6d3` — exportación HTML con extensión XLS; perfil pendiente.
- `Cartera pendiente Aseguradora Guatemalteca .PDF` — SHA-256 `aba093aa526f956a151ae8e73b39024250b85b4bc73847bf5135e8a6b188ee45` — corte 28/07/2026; primas por cobrar por antigüedad con detalle de póliza/factura/vencimiento.
- `Balance El Roble.xls` — SHA-256 `bcf6ccf35728d262e7efd1bd06142ea50028c804995a6a92cea77282a326b3a3` — archivo DIF con extensión XLS; perfil pendiente.

### Cobros / recaudos por aseguradora
- `Reporte de Ingresos Aseguradora General.xls` — SHA-256 `61574cc18b9200af438a49985e58deea635243f8808eac97470789df0db5b5ed`.
- `Cobros Mapfre.xls` — SHA-256 `d19559b7d5ad80930ad10f88d30ae7e0015b1647a5c0840867cf76e32c617ad8` — exportación HTML con extensión XLS.

## Evidencia de PDFs inspeccionados

La Ceiba muestra en su reporte del 31/07/2026 póliza, asegurado, vigencias, endoso, factura, fecha de pago, saldo y buckets de antigüedad. Universales entrega antigüedad de saldos con recibo/número de pago, fecha y buckets. Aseguradora Guatemalteca entrega primas por cobrar con póliza, factura, vencimiento, cobrador y antigüedad. Estas fuentes pertenecen a Cartera/Recibos; no deben convertirse automáticamente en Cobros aplicados.

## Estado operativo

```text
MANIFEST: OPEN_PENDING_MORE_FILES
FILES_REGISTERED: 20
DATA_WRITES: 0
ENRICHMENT_WRITES: 0
POLICIES_REIMPORT: NO
VEHICLES_REIMPORT: NO
COBROS: BLOQUEADO
OLD_DRIVE_SOURCE_FALLBACK: PROHIBIDO
NEXT: incorporar los siguientes archivos que comparta el usuario al mismo corte y cerrar el manifiesto solo cuando el usuario confirme que el conjunto está completo.
```

## Impacto Claude / Academia

- `REPLICABLE_CLAUDE_ACUMULADO`: el contrato frontend debe conservar detalle completo de Póliza, Vehículo y Recibos, navegación full-page y responsive; nunca simplificarlo en empalmes futuros.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: hashes, manifiesto real, reglas de fuente y writers.
- `SECRETO_DATO_REAL`: contenido de los archivos; no se envía a Claude.
- `ACADEMIA_ACTUALIZAR`: enseñar manifiesto por corte, precedencia de fuentes y diferencia entre datos de cartera y cobro aplicado.

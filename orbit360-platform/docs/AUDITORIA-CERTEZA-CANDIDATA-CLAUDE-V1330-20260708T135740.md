# Auditoría de certeza — candidata Claude v1330 `2026-07-08T135740.684`

Fecha: 2026-07-08  
Archivo auditado: `Prototype Development Request - 2026-07-08T135740.684.zip`  
SHA256: `97e968810029181dc10747a13d7c4f343f058b6ed9b4400af6d11f68dee6836c`  
Comparada contra: `Prototype Development Request - 2026-07-06T182633.902.zip`  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 1. Corrección metodológica

La auditoría debe concluir con certeza frente a lo solicitado a Claude. No basta decir “parcial” sin separar:

1. Qué pidió el paquete.
2. Qué archivo cambió Claude.
3. Qué evidencia exacta existe en el código.
4. Qué subrequisito queda sin cumplir.
5. Si el pendiente corresponde a Claude/prototipo o a ChatGPT/Codex/backend.

Esta relectura corrige la auditoría anterior con matriz de cumplimiento por subítem.

## 2. Validación base

```txt
ZIP actual SHA256: 97e968810029181dc10747a13d7c4f343f058b6ed9b4400af6d11f68dee6836c
ZIP previo SHA256: 8c2af05e685601f5990e7555002a8bd8632b5becad1acf0dcb9210f8d2602c7c
Archivos totales ZIP actual: 98
Archivos totales ZIP previo: 98
Archivos modificados contra previo: 9
JS/MJS con node --check: 56
Errores de sintaxis: 0
```

Archivos modificados:

```txt
index.html
data/academia-plus.js
docs/BITACORA-CAMBIOS.md
modules/cliente360.js
modules/cobros.js
modules/conciliaciones.js
modules/configuracion.js
modules/portal.js
styles/infra.css
```

## 3. Matriz de cumplimiento exacta

### Ítem 1 — Portal Cliente: pago reportado + soporte visible

**Estado de certeza:** `CUMPLE UX PRINCIPAL / NO CIERRA CONTRATO DOCUMENTAL COMPLETO`

| Subrequisito pedido | Estado | Evidencia |
|---|---|---|
| Mostrar estado reportado/en revisión | Cumple | `modules/portal.js:101` agrega badges `Reportado · en revisión`, `En validación`, `Reporte no aceptado`. |
| Mostrar soporte visible | Cumple | `modules/portal.js:304` muestra `Soporte adjunto` con `soporteNombre`. |
| Permitir seguimiento / volver a reportar si rechazo | Cumple | `modules/portal.js:305` muestra motivo rechazo y permite reportar de nuevo; `modules/portal.js:307` vuelve a habilitar reportar si `reporteRechazado`. |
| No decir pago aplicado/cobro confirmado al reportar soporte | Cumple | No hay `Pago aplicado` ni `Cobro confirmado` en flujo `reportarPago`; el copy dice pendiente de revisión/conciliación. |
| Registrar historial básico | Cumple | `modules/portal.js:174` agrega `historial` con acción `reportado_cliente`. |
| Documento/adjunto metadata-only para el soporte de pago | No cumple completo | `modules/portal.js:174` solo guarda `soporteNombre` en `cobros`; no crea `documentos`/`adjuntos` para ese soporte. |
| Documento general metadata-only desde Portal | Cumple | `modules/portal.js:204` inserta en `documentos` con `metaOnly:true`, `estado:'en_revision'`, `tamano`, sin base64. |
| Fecha dinámica para gestión | No cumple | `modules/portal.js:176` mantiene `vence:'2026-06-26'`, fecha fija. |

**Conclusión exacta:** Claude cerró el frente visual principal de Portal para pago reportado y soporte visible. No cerró el subcontrato de adjunto/documento metadata-only vinculado al soporte de pago ni la fecha dinámica de gestión.

### Ítem 2 — Cobros: revisión documental, motivo y auditoría

**Estado de certeza:** `PARCIAL / NO CERRADO`

| Subrequisito pedido | Estado | Evidencia |
|---|---|---|
| Panel de revisión de soporte | Cumple | `modules/cobros.js:225-237` crea modal `Validar pago reportado`. |
| Mostrar soporte reportado | Cumple | `modules/cobros.js:228` muestra soporte si existe. |
| Marcar en revisión | Cumple | `modules/cobros.js:231` botón `Marcar en revisión`; `modules/cobros.js:244` actualiza `enRevision:true`. |
| Rechazar con motivo obligatorio | Cumple | `modules/cobros.js:246-249` pide motivo y si falta bloquea. |
| Rechazar conserva trazabilidad | Cumple | `modules/cobros.js:248-249` no borra soporte y conserva historial. |
| Validar reporte no aplica pago | Cumple | `modules/cobros.js:254` solo marca `validadoReporte:true`; no pone `estado:'Pagado'`. |
| Validar con motivo obligatorio | No cumple | `modules/cobros.js:253` dice `Nota de validación (opcional)`. |
| Aplicar pago con motivo | No cumple | `modules/cobros.js:260-318` confirma cobro sin campo/prompt de motivo. |
| Aplicar pago valida país/moneda GTQ/COP | No cumple | En `aplicarPago` no hay guard de país/moneda antes de `estado:'Pagado'`. |
| Soporte/factura metadata-only sin base64 | No cumple | `modules/cobros.js:286-297` usa `FileReader` y `readAsDataURL`; aunque `factData` no se persiste, genera base64 en memoria. |
| Copy honesto de factura/conciliación | No cumple completo | `modules/cobros.js:279` dice que al cargar factura el recibo pasa a `Conciliado`, sin gate adicional de conciliación. |
| Automatización honesta | Requiere ajuste | `modules/cobros.js:313` dispara `pago_aplicado` al confirmar; debe estar condicionado al flujo autorizado real. |

**Conclusión exacta:** Cobros avanzó en revisión/rechazo/trazabilidad y validación no aplicada. No cerró motivo obligatorio en validar/aplicar, país/moneda, factura metadata-only ni copy de conciliación. Debe corregirse antes de aceptar como cierre.

### Ítem 3 — Cliente360 Documentos

**Estado de certeza:** `MAYORMENTE CUMPLIDO COMO UX BASE / PENDIENTES P1-P0 DOCUMENTALES`

| Subrequisito pedido | Estado | Evidencia |
|---|---|---|
| Agregar pestaña Documentos | Cumple | `modules/cliente360.js:32` incluye `documentos`; `modules/cliente360.js:148` agrega tab visual `Documentos`. |
| Mostrar soportes de pago en revisión | Cumple | `modules/cliente360.js:602-611` lista cobros reportados/rechazados/validados con soporte. |
| Mostrar parches/diffs pendientes | Cumple | `modules/cliente360.js:604-614` lee `parchesPendientes` y muestra diff actual → propuesto. |
| Mostrar documentos del expediente | Cumple | `modules/cliente360.js:606-620` lista `documentos` del expediente. |
| Copy de evidencia/propuesta, no confirma pagos | Cumple | `modules/cliente360.js:617` aclara que soportes/documentos no modifican expediente ni confirman pagos. |
| Acciones por rol claras por fila | No cumple completo | Hay `ROLE()` global en el módulo, pero en `tabDocumentos` no hay acciones por rol para aprobar/rechazar/visibilidad. |
| Campos completos por fila: relación, visibilidad, responsable, acción permitida | No cumple completo | Las filas muestran nombre/fecha/estado básico, pero no la matriz completa solicitada. |

**Conclusión exacta:** Cliente360 Documentos sí está implementado y es aceptable como base UX. No está completo al nivel de matriz de acciones/visibilidad por rol.

### Ítem 4 — Metadata-only / Documentos + Storage futuro

**Estado de certeza:** `PARCIAL`

| Subrequisito pedido | Estado | Evidencia |
|---|---|---|
| Documento general del Portal metadata-only | Cumple | `modules/portal.js:203-204`: comentario metadata-only e inserción sin archivo/base64/URL. |
| Copy documento no reemplaza datos | Cumple | `modules/portal.js:200` y Academia `data/academia-plus.js:774`. |
| Soporte de pago como documento/adjunto metadata-only | No cumple | `modules/portal.js:174` guarda solo `soporteNombre` en cobro. |
| Factura como metadata-only | No cumple | `modules/cobros.js:286-297` crea base64 en memoria. |
| Storage pendiente / referencia futura uniforme | No cumple completo | No hay `storageEstado`/`storageRef` estándar para soportes/facturas. |

**Conclusión exacta:** Claude cumplió metadata-only para subida general de documentos del Portal, pero no para soporte de pago ni factura. Ítem 4 no puede darse por cerrado completo.

### Ítem 5 — M5 Conciliaciones

**Estado de certeza:** `PARCIAL`

| Subrequisito pedido | Estado | Evidencia |
|---|---|---|
| Bandeja separada que no aplica pagos | Cumple | `modules/conciliaciones.js:57-58` dice que no aplica pagos ni modifica cobros; `modules/conciliaciones.js:110` comenta que solo muta propuesta. |
| Estados/tabla/KPIs | Cumple | `modules/conciliaciones.js:52-63` renderiza tabla/KPIs/chips. |
| Rechazar/bloquear/anular con motivo | Cumple | `modules/conciliaciones.js:99-105` exige motivo para `rechazar`, `bloquear`, `anular`. |
| Validar con motivo | No cumple | `modules/conciliaciones.js:100` solo exige motivo para rechazar/bloquear/anular; validar queda sin motivo. |
| Anular con confirmación reforzada | No cumple | No hay confirmación literal tipo `ANULAR` ni confirmación reforzada en `accion()`. |
| País/moneda bloquean validación | No cumple | Se muestran país/moneda y bloqueos si existen, pero `accion('validar')` no valida GT→GTQ / CO→COP ni falta país/moneda. |
| Validada no aplicada visible | Cumple parcialmente | Copy general dice que no aplica pagos; estado `VALIDADA` aún no se renombra a `VALIDADA_NO_APLICADA`. |

**Conclusión exacta:** M5 sí cumple la separación visual y la no aplicación de pagos; no cumple los gates completos de validar/anular/país-moneda.

### Ítem 6 — Equipo / Config gates

**Estado de certeza:** `PARCIAL / NO CERRADO`

| Subrequisito pedido | Estado | Evidencia |
|---|---|---|
| Configuración: cambio de rol con motivo | Cumple | `modules/configuracion.js:335-354` agrega motivo, historialRol y no dejar sin admin al cambiar rol en esa vista. |
| Configuración: no dejar tenant sin admin en cambio de rol | Cumple en ese flujo | `modules/configuracion.js:343-346`. |
| Integraciones pendientes de conexión | Cumple visual parcial | `modules/configuracion.js:476-488` calcula estado pendiente/no conectado. |
| Equipo: crear/editar/inactivar usuario con motivo | No cumple | `modules/equipo.js:153-202` guarda usuario sin motivo ni historial. |
| Equipo: bloquear último admin al inactivar | No cumple | `modules/equipo.js:200-202` actualiza/inserta sin guard de último admin. |
| Reset permisos con motivo/confirmación | No cumple | `modules/equipo.js:212` resetea permisos sin motivo ni confirmación reforzada. |
| Cambiar plan/módulos activos con motivo | No cumple | `modules/configuracion.js:301-304` toggles sin motivo; plan custom tampoco registra motivo. |
| Reset configuración con motivo/bitácora | No cumple completo | `modules/configuracion.js:289` pide confirmación simple pero no motivo/bitácora. |
| No guardar key/token en frontend/store | No cumple | `modules/configuracion.js:505`, `522`, `531`, `536` capturan `API key / Token` y hacen `Orbit.store.setPref('integ_'+nombre,data)`. |

**Conclusión exacta:** Configuración tiene un avance real en cambio de rol y estados de integración. Equipo y secretos quedan pendientes críticos. Ítem 6 no está cerrado.

### Ítem 7 — Academia profunda

**Estado de certeza:** `CUMPLE BASE DEL PAQUETE / NO CIERRA CERTIFICADOS-PROGRESO-MANUALES COMPLETOS`

| Subrequisito pedido | Estado | Evidencia |
|---|---|---|
| Ruta Cliente Portal | Cumple | `data/academia-plus.js:764-779`. |
| Ruta Cobros/Finanzas | Cumple | `data/academia-plus.js:783-801`. |
| Ruta Asesor/Cliente360 Documentos | Cumple | `data/academia-plus.js:805-817`. |
| Ruta Dirección/Admin/IT | Cumple | `data/academia-plus.js:821-838`. |
| Casos y quizzes de decisión | Cumple | Hay `Q('Evaluación...')` en las rutas anteriores. |
| Estados honestos / no aplicar pagos / no mezclar moneda | Cumple | `data/academia-plus.js:769-794` y `827-832`. |
| Certificados/progreso reales | No verificable como implementado nuevo por esta candidata | El paquete pedía certificados/progreso; no hay cambio específico en engine de progreso/certificados. |
| Manuales impactados listados/actualizados | Parcial | Se actualiza `docs/BITACORA-CAMBIOS.md`, pero no hay actualización equivalente de manuales vivos por módulo. |
| Addenda posteriores mientras Claude trabajaba | No aplica a esta candidata, queda pendiente ChatGPT/Codex | Matriz roles/permisos y auditoría unificada se documentaron después o en paralelo; no podían estar totalmente absorbidas si Claude ya cerró. |

**Conclusión exacta:** Academia sí cumplió la base solicitada para los 7 frentes originales, con rutas y quizzes útiles. Quedan pendientes de madurez: progreso/certificados, manuales y anexar bloques backend posteriores.

## 4. Seguridad y protegidos

### Backend protegido

El ZIP trae archivos protegidos porque es ZIP completo. No significa necesariamente que Claude intentó reescribir backend, pero para empalme sí aplica exclusión.

### `index.html`

Claude modificó `index.html` solo para cache-bust de versiones:

```txt
styles/tokens.css?v1331
styles/base.css?v1331
styles/infra.css?v1336
data/academia-plus.js?v1337
modules/cliente360.js?v1334
modules/cobros.js?v1332
modules/conciliaciones.js?v1332
modules/configuracion.js?v1336
modules/portal.js?v1337
```

Como `index.html` está protegido por riesgo de mojibake/backend LAB, no se debe empalmar directo; se replica por patch controlado si se toma la candidata.

## 5. Veredicto corregido

```txt
La candidata NO cierra con certeza los 7 ítems al 100%.
La candidata SÍ cierra o avanza con certeza varios frentes UX importantes.
La candidata debe ser aceptada como última base incremental de frontend, pero con hotfix P0 antes de empalme completo.
```

### Estado por ítem

| Ítem | Estado de certeza |
|---|---|
| 1 Portal pago reportado + soporte visible | Cumple UX principal; pendiente adjunto metadata-only de soporte y fecha dinámica |
| 2 Cobros revisión/motivo/auditoría | Parcial; no cerrado |
| 3 Cliente360 Documentos | Mayormente cumplido como base UX |
| 4 Metadata-only / documentos | Parcial; documento general sí, soporte/factura no |
| 5 Conciliaciones M5 | Parcial; separación/no aplicación sí, gates no completos |
| 6 Equipo/Config gates | Parcial; Config rol sí, Equipo/secretos/plan/módulos no |
| 7 Academia profunda | Cumple base del paquete; falta progreso/certificados/manuales y anexos posteriores |

## 6. Qué quedó para Claude vs ChatGPT/Codex

### Quedó para Claude/prototipo si hubiera capacidad

- Botones/acciones por rol en Cliente360 Documentos.
- Copy visual `VALIDADA · no aplicada` en M5.
- Pantallas de bitácora/historial más completas.
- Academia con progreso/certificados/manuales visibles.

### Queda para ChatGPT/Codex ahora que Claude no tiene capacidad

- Hotfix Portal: soporte de pago como documento/adjunto metadata-only; fecha dinámica.
- Hotfix Cobros: quitar base64/FileReader, motivo obligatorio, país/moneda, copy de factura/conciliación.
- Hotfix M5: motivo al validar, confirmación al anular, guard país/moneda.
- Hotfix Config/Equipo: motivo/bitácora/último admin/reset, no guardar key/token en store.
- Empalme selectivo sin tocar backend protegido ni index directo.

## 7. Decisión operativa corregida

```txt
Aceptar candidata como última versión incremental de UX.
No aceptar cierre total de todos los ítems.
No copiar ZIP completo.
Ejecutar hotfix P0 y empalme selectivo corregido.
Después de hotfix, declarar baseline frontend v1330 corregido.
```

## 8. Estado

Reauditoría con certeza completada y documentada.
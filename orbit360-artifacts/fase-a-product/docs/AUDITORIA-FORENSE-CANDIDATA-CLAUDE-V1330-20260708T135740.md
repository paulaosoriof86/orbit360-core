# Auditoría forense — candidata Claude v1330 `2026-07-08T135740.684`

Fecha de auditoría: 2026-07-08  
Archivo auditado: `Prototype Development Request - 2026-07-08T135740.684.zip`  
SHA256 ZIP: `97e968810029181dc10747a13d7c4f343f058b6ed9b4400af6d11f68dee6836c`  
Proyecto: Orbit 360 A&S  
Rama backend activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 1. Resultado ejecutivo

La candidata **sí avanza de forma visible** sobre el paquete Claude v1330, especialmente en:

- Portal Cliente: estados más honestos para pago reportado y soporte visible por nombre.
- Cobros: rechazo con motivo y conservación de trazabilidad.
- Cliente360: nueva pestaña `Documentos` con soportes, documentos y parches/diffs.
- Documentos generales desde Portal: registro metadata-only para documentos subidos por cliente.
- Conciliaciones: bandeja separada que no aplica pagos y agrega motivo/trazabilidad para rechazar/bloquear/anular.
- Academia: nuevas rutas y contenidos relacionados con Portal, Cobros, Cliente360, documentos, M5 y administración.
- Configuración: estados de integración pendientes de conexión y algunos gates de rol.

Pero la auditoría **no permite declarar cerrados los 7 ítems al 100%** bajo el contrato backend/prototipo ya documentado. El estado correcto es:

```txt
Aceptación parcial con pendientes P0/P1.
No empalmar de forma automática todos los archivos.
Empalme seguro solo con exclusiones, correcciones y sin tocar protegidos.
```

## 2. Inventario y sintaxis

ZIP extraído correctamente.

```txt
Archivos totales: 98
JS/MJS revisados con node --check: 56
Errores de sintaxis: 0
```

Comparación contra candidata anterior `Prototype Development Request - 2026-07-06T182633.902.zip`:

```txt
Archivos agregados: 0
Archivos eliminados: 0
Archivos modificados: 9
```

Archivos modificados respecto a la candidata previa:

```txt
data/academia-plus.js
docs/BITACORA-CAMBIOS.md
index.html
modules/cliente360.js
modules/cobros.js
modules/conciliaciones.js
modules/configuracion.js
modules/portal.js
styles/infra.css
```

## 3. Archivos protegidos presentes en el ZIP

La candidata incluye archivos protegidos porque es un ZIP completo del prototipo:

```txt
orbit360-platform/data/store.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
orbit360-platform/index.html
orbit360-platform/tools/orbit360-validate-marketing-integraciones.mjs
```

Regla de empalme:

```txt
No se deben reemplazar desde este ZIP.
```

`index.html` trae cambios de cache-bust/login, pero por regla del proyecto y riesgo de mojibake/backend LAB, **no debe empalmarse directo**. Si se requiere el cache-bust, debe hacerse con script/patch controlado y validación local.

## 4. Auditoría por ítem del paquete v1330

### Ítem 1 — Portal Cliente: pago reportado con soporte visible

Estado: `PARCIALMENTE CUMPLIDO`

Qué hizo:

- Cambió badge simple `Reportado` por estados más claros:
  - `Reportado · en revisión`.
  - `En validación`.
  - `Reporte no aceptado`.
- Permite volver a reportar cuando el reporte fue rechazado.
- El detalle del recibo muestra `Soporte adjunto` por nombre.
- El copy evita decir que el pago está aplicado.
- Agrega historial básico al cobro al reportar pago.

Pendiente:

- El soporte de pago sigue quedando como `soporteNombre` en el cobro; no crea registro metadata-only en `documentos` ni `adjuntos` vinculado al cobro.
- La gestión generada usa fecha fija `2026-06-26`, no dinámica.
- No existe estado canonical completo `recibido_pendiente_validacion` / `validado_no_aplicado` en Portal.
- No hay visibilidad por rol del adjunto desde Portal.

Conclusión:

```txt
Mejora aceptable de UX/copy, pero no cierra el contrato documental completo.
```

### Ítem 2 — Cobros: revisar/validar/rechazar con motivo y trazabilidad

Estado: `PARCIALMENTE CUMPLIDO CON HALLAZGO P0`

Qué hizo:

- Agrega estado `Reporte rechazado`.
- `rechazar` ahora pide motivo obligatorio.
- El rechazo conserva `reportado`, `soporteNombre` y nota; ya no borra trazabilidad.
- Agrega `historial` para en revisión, rechazar y validar.
- `validarReporte` no aplica pago directamente.

Pendiente / riesgo:

- `validar reporte` deja el motivo como opcional, aunque el contrato pedía motivo obligatorio.
- `aplicarPago` no pide motivo.
- `aplicarPago` no valida país/moneda antes de confirmar pago.
- `aplicarPago` usa `FileReader.readAsDataURL` para factura, lo que genera base64 aunque luego no se use. Esto viola el contrato metadata-only/no base64.
- El copy `Al cargar la factura, el recibo pasa a Conciliado` es demasiado fuerte frente al contrato M5/conciliación.
- Al confirmar pago dispara automatización `pago_aplicado`; debe quedar condicionado a aplicación autorizada real.

Conclusión:

```txt
Rechazo y trazabilidad mejoraron; aplicación de pago/factura requiere hotfix antes de considerar el ítem cerrado.
```

### Ítem 3 — Cliente360 Documentos visibles

Estado: `MAYORMENTE CUMPLIDO`

Qué hizo:

- Agrega `documentos` a las pestañas de Cliente360.
- Agrega bloque de soportes de pago en revisión/rechazados/validados.
- Agrega bloque de `parchesPendientes` con diff actual → propuesto.
- Agrega bloque de documentos del expediente.
- El encabezado aclara que soportes y documentos son evidencia/propuesta y no confirman pagos.

Pendiente:

- No hay acciones por rol dentro de la pestaña.
- No hay separación completa `expediente aprobado` vs `documentos en revisión` por estado canónico.
- Los soportes de pago se leen desde cobros, no desde `adjuntos`/`documentos` metadata-only.

Conclusión:

```txt
Es el ítem más sólido de la candidata. Aceptable como base UX, con pendientes P1/P0 conectados al modelo documental.
```

### Ítem 4 — Metadata-only / Documentos + Storage futuro

Estado: `PARCIALMENTE CUMPLIDO CON HALLAZGO P0`

Qué hizo:

- Portal `subirDoc` inserta en `documentos` con:
  - `metaOnly: true`.
  - `estado: en_revision`.
  - `tamano`.
  - sin base64 ni URL.
- El copy indica que el archivo no reemplaza datos por sí solo.

Pendiente / riesgo:

- Pago reportado con soporte no crea `documentos`/`adjuntos`; queda solo como `soporteNombre`.
- Cobros factura usa `readAsDataURL`, generando base64.
- No hay `storageEstado=pendiente_storage` o `storageRef` placeholder uniforme.
- No hay `parchesPendientes` generados desde documento en Portal; solo se muestran si ya existen.

Conclusión:

```txt
Metadata-only está bien para documento general del Portal, pero no para soportes de pago/facturas. No cerrar ítem 4 todavía.
```

### Ítem 5 — M5 Conciliaciones

Estado: `PARCIALMENTE CUMPLIDO`

Qué hizo:

- Módulo `conciliaciones.js` mantiene bandeja separada.
- Copy indica que no aplica pagos ni modifica cobros.
- KPIs y tabla muestran propuestas, validadas, bloqueadas/rechazadas y en revisión.
- Rechazar/bloquear/anular piden motivo y agregan historial.
- Detalle muestra trazabilidad y bloqueos.

Pendiente:

- `validar` no exige motivo.
- `anular` no pide confirmación reforzada; solo motivo.
- No se bloquea validar si falta país/moneda o existe incoherencia GT/GTQ, CO/COP.
- El estado `VALIDADA` debería reforzarse como `VALIDADA_NO_APLICADA` o texto equivalente.

Conclusión:

```txt
Buena base de UI, pero incompleta frente al contrato M5. Requiere hotfix.
```

### Ítem 6 — Config gates / Equipo gates

Estado: `PARCIALMENTE CUMPLIDO CON HALLAZGOS P0/P1`

Qué hizo:

- Configuración agrega lógica para cambio de rol con motivo y bloqueo de último admin en una sección interna.
- Integraciones muestran estado `Pendiente de conexión`.
- Copy intenta evitar prometer conexión real.

Pendiente / riesgo:

- Equipo `editarUsuario` guarda usuario/roles/inactivo sin motivo y sin bloqueo de último admin en ese flujo.
- Reset de permisos en Equipo no pide confirmación reforzada ni motivo.
- Cambiar plan y guardar módulos activos no pide motivo.
- Reset de configuración pide confirmación, pero no motivo ni bitácora.
- Config integración guarda `key`/token en `Orbit.store.pref('integ_*')`, lo cual contradice la regla de no guardar secretos en frontend/store.
- UI muestra `API key / Token` y `credenciales`, aceptable solo en pantalla interna con cuidado, pero debe migrar a `credentialRef/backend_required` conceptual.

Conclusión:

```txt
No cerrar ítem 6. Hay mejora parcial, pero faltan gates principales y hay riesgo de credenciales en store.
```

### Ítem 7 — Academia profunda

Estado: `MAYORMENTE CUMPLIDO COMO BASE, PENDIENTE DE SINCRONIZAR LO ÚLTIMO`

Qué hizo:

- `data/academia-plus.js` agrega rutas relacionadas con:
  - Portal Cliente.
  - Cobros/Finanzas.
  - Cliente360/Documentos.
  - Dirección/Admin.
  - Configuración/roles/integraciones.
- Agrega quizzes/casos prácticos.
- Refuerza estados honestos e integraciones pendientes.

Pendiente:

- No incorpora los addenda posteriores a la entrega de Claude:
  - matriz roles/permisos/acciones sensibles v1330;
  - auditoría unificada v1330;
  - runner/recepción candidata;
  - patrones futuros tenants más recientes.
- Falta verificar progreso/certificados reales por rol en UI final.

Conclusión:

```txt
Academia avanzó bastante y sí cubre el paquete original, pero debe actualizarse con los bloques backend posteriores que se documentaron mientras Claude trabajaba.
```

## 5. Hallazgos transversales

### 5.1 Sintaxis

Todos los JS/MJS del ZIP pasan `node --check`.

### 5.2 Datos reales / secretos

No se detectaron datos reales evidentes en el prototipo operativo. Sí existen documentos internos/legacy con ejemplos técnicos y un standalone comprimido en `docs/legacy/Orbit360-demo-standalone-NO-USAR.html`; no debe exponerse a UI cliente ni empalmarse como fuente activa.

### 5.3 LocalStorage

Hay usos de `localStorage` en core/auth/config/theme/store, propios del prototipo histórico. Dado que `data/store.js`, `auth.js`, `config.js` e `index.html` son protegidos o sensibles, no se deben empalmar desde Claude. Los módulos operativos nuevos no deben añadir localStorage directo.

### 5.4 Términos técnicos visibles

Se detectan términos como `backend`, `LAB`, `demo`, `API key`, `credenciales` en módulos internos de Configuración, Automatizaciones, Academia y core. Algunos son internos/admin, pero deben neutralizarse para UI cliente y revisarse si quedan visibles a roles no técnicos.

### 5.5 Archivos protegidos

El ZIP contiene protegidos, pero no significa que Claude intentara corregir backend; es un ZIP completo. En empalme, se deben excluir.

## 6. Veredicto por archivo modificado

| Archivo | Veredicto | Motivo |
|---|---|---|
| `modules/portal.js` | Aceptar parcial | Mejora Portal, pero falta documento/adjunto metadata-only al reportar pago y fecha dinámica. |
| `modules/cobros.js` | No empalmar sin hotfix | Mejora rechazo, pero mantiene base64 y aplicación de pago sin motivo/país-moneda. |
| `modules/cliente360.js` | Aceptar como base UX | Agrega pestaña Documentos; faltan acciones/estados por rol. |
| `modules/conciliaciones.js` | Aceptar parcial con hotfix | No aplica pagos; faltan motivo en validar, confirmación anular y guard país/moneda. |
| `modules/configuracion.js` | No empalmar sin hotfix | Gates parciales; riesgo por credenciales/tokens en store. |
| `data/academia-plus.js` | Aceptar parcial | Buena base; actualizar con roles/auditoría unificada posteriores. |
| `styles/infra.css` | Aceptar si se valida login | Cambios de login/scroll/logo; requiere cache-bust controlado. |
| `index.html` | No empalmar directo | Protegido por riesgo backend LAB/mojibake; cache-bust solo por patch controlado. |
| `docs/BITACORA-CAMBIOS.md` | No sobrescribir | Usar como evidencia; documentación viva del PR ya avanzó por otro lado. |

## 7. Decisión de empalme

```txt
Estado de candidata: ACEPTADA PARCIALMENTE.
Cierre de frontend paquete v1330: NO TOTAL.
Empalme automático completo: NO AUTORIZADO.
Empalme seguro: solo después de hotfixes P0 o integración selectiva con exclusiones.
```

## 8. Pendientes P0 post-auditoría

1. Portal: crear documento/adjunto metadata-only al reportar pago con soporte.
2. Portal: reemplazar fecha fija `2026-06-26` por fecha dinámica/derivada.
3. Cobros: eliminar `readAsDataURL` y cualquier base64 de factura.
4. Cobros: motivo obligatorio para validar reporte.
5. Cobros: motivo + país/moneda para aplicar pago autorizado.
6. Cobros: ajustar copy de factura/conciliación para no decir conciliado si solo hay soporte.
7. Conciliaciones: motivo obligatorio para validar.
8. Conciliaciones: confirmación reforzada para anular.
9. Conciliaciones: bloqueo país/moneda en validar.
10. Config/Equipo: gates reales en Equipo al crear/editar/inactivar usuario.
11. Config: no guardar API key/token en store; usar referencia conceptual.
12. Academia: agregar roles/permisos y auditoría unificada posteriores a la candidata.

## 9. Pendientes P1

- Cliente360: acciones por rol dentro de Documentos.
- Cliente360: separar expediente aprobado vs documentos en revisión por estado canónico.
- Documentos: crear `adjuntos` vinculados a cobros/documentos.
- Bitácora unificada visible por rol.
- Cache-bust login por patch controlado si se decide tomar estilos.

## 10. Recomendación operativa

Siguiente paso recomendado:

```txt
No empalmar todo el ZIP.
Hacer hotfix controlado sobre los P0 detectados y luego aceptar la candidata como baseline frontend corregida.
```

Mientras tanto, la candidata debe considerarse la versión incremental más reciente para UX, pero no como cierre completo ni como fuente directa para backend protegido.

## 11. ¿Aplica a Claude/prototipo?

Sí.

Patrones que Claude/prototipo debe conservar o corregir:

- Soporte recibido no es pago aplicado.
- Documento recibido no modifica datos.
- Validar reporte/conciliación no aplica pago.
- Rechazar conserva trazabilidad.
- Factura/soporte debe ser metadata-only, sin base64.
- Acciones sensibles requieren motivo.
- Destructivas requieren confirmación reforzada.
- Credenciales no viven en frontend/store.
- Cliente360 Documentos es una base válida, pero falta acciones por rol.
- Academia debe integrar roles/permisos y auditoría unificada.

## 12. Estado

Auditoría forense completada. Pendiente hotfix/empalme selectivo seguro.
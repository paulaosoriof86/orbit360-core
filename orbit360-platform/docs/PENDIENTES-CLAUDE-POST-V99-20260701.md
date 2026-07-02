# PENDIENTES CLAUDE POST V99 / V1.73 - Orbit 360

Fecha actualización: 2026-07-02
Estado: documento vivo para Claude tras empalme visual v1.73, Backend LAB Fase 8 completada y Fase 9 pausada.

## Regla de separación

- Claude: prototipo, UX, módulos, configuración, pantallas, autoadministración, corrección visual, flujos clickeables, textos, encoding y experiencia comercial.
- ChatGPT/Codex: backend, Firestore, Auth, Orbit.store, scripts LAB, validación técnica, PR, smoke contractual y documentación técnica.

Claude no debe tocar `data/store-firestore-lab.local.js`, Auth/Firebase LAB, reglas Firestore ni configuración local. Si necesita datos, debe usar `Orbit.store`.

## Metodología ágil adoptada desde v1.73

1. No más bloques largos pegados directo en PowerShell salvo emergencia.
2. ChatGPT/Codex hará directo en GitHub lo que sea documentación, auditoría, PR, preparación de scripts y seguimiento.
3. Si algo requiere equipo local, se usará `.ps1` descargable o comando corto.
4. Cada gate debe tener estado claro: PREPARADO / EJECUTADO / FALLIDO / COMPLETADO.
5. No repetir gates ya completados.
6. Si Claude entrega ZIP nuevo, se trata como mini-release: auditar, aplicar solo si es seguro, preservar backend, documentar y smoke.
7. Los scripts deben detenerse al primer error y no documentar éxito si fallan.

## Gates técnicos cerrados o pausados

- Instalación base visual v1.73: COMPLETADO.
- Saneamiento funcional v1.73B: COMPLETADO.
- Fix API LAB v1.73: COMPLETADO.
- Smoke runtime Fase 7D: COMPLETADO.
- Contrato `Orbit.store` expandido: COMPLETADO.
- Backend LAB detectado `firestore-lab`: COMPLETADO.
- Tenant `alianzas-soluciones`: COMPLETADO.
- Sin errores JS globales en smoke: COMPLETADO.
- Fase 8 - Firestore LAB real por colecciones v1.73: COMPLETADO.
- Fase 9 - Auth/Firebase LAB: PAUSADO por configuración local y riesgo visual; no corresponde a Claude.

## P0 Claude - Regresión de encoding/mojibake

### Síntoma

Después del empalme v1.73 se evidenció regresión de encoding en UI. En el HEAD limpio `41ad868` los textos estaban correctos; en la rama posterior aparecieron textos como:

- `IngresÃ¡` en lugar de `Ingresá`.
- `sesiÃ³n` en lugar de `sesión`.
- `paÃ­ses` en lugar de `países`.
- `GestiÃ³n` en lugar de `Gestión`.
- `PÃ³lizas` en lugar de `Pólizas`.
- símbolos dañados como `Â·`, `â€”`, `â†’`, `ðŸ`.

### Esperado

Todos los HTML/JS/CSS y datos demo visibles deben mantenerse en UTF-8 correcto. Claude debe validar visualmente login, topbar, sidebar, modales y módulos.

### Criterio de aceptación

Deben verse correctamente: `Ingresá`, `Iniciar sesión`, `contraseña`, `administración`, `¿Problemas al ingresar? → Limpiar sesión`, `Gestión`, `Pólizas`, `países`, `Operación` e iconografía limpia.

## P0 Claude - Badges técnicos visibles

En modo cliente/comercial/white-label no deben verse badges como `BETA`, `NÚCLEO`, `PROX`, `ROAD` ni notas técnicas. Pueden existir solo en modo interno/demo controlado por configuración.

## P0 Claude - Flujo Portal / Gestiones / Siniestros inconsistente

### Reporte de prueba

Paula probó el Portal cliente:

1. Solicitó una gestión desde Portal.
2. Esa gestión apareció en Ops.
3. Reportó un siniestro de prueba.
4. El siniestro apareció en Ops y en Historial.
5. No apareció en el módulo Siniestros.
6. No apareció en la ficha de siniestros del cliente.

### Dónde debe estar una Gestión

Una gestión debe ser una actividad/solicitud operativa transversal. Debe quedar trazable en:

- Portal cliente, como origen.
- Ops, como bandeja de seguimiento.
- Historial, como línea de tiempo.
- Cliente 360, como actividad del expediente.
- Siniestros, si la gestión corresponde a reporte de siniestro/reclamo.

### Esperado para reporte de siniestro desde Portal

Cuando un cliente reporta un siniestro desde Portal debe:

- Crear un registro canónico de siniestro/reclamo.
- Aparecer en módulo Siniestros.
- Aparecer en Cliente 360, sección Siniestros.
- Aparecer en Historial del cliente.
- Crear o enlazar una gestión en Ops.
- Compartir identificadores: `clienteId`, `polizaId` si aplica, `reclamoId/siniestroId`, estado, fecha, responsable, prioridad y origen `portal`.

### Archivos/módulos a revisar por Claude

- `modules/portal.js`.
- `modules/siniestros.js`.
- `modules/cliente360.js`.
- `modules/ops.js`.
- `modules/historial.js`.
- `core/queries.js` si hay helpers.

### Criterio de aceptación

Caso mínimo:

1. Reportar siniestro desde Portal cliente demo.
2. Confirmar que aparece en Ops.
3. Confirmar que aparece en Historial.
4. Confirmar que aparece en módulo Siniestros.
5. Confirmar que aparece en ficha Cliente 360 > Siniestros.
6. Cambiar estado en Siniestros y verificar reflejo en Ops/Historial.
7. Cerrar gestión en Ops sin borrar el siniestro.

## P1 Claude - Inicio y tablero vivos

Inicio no debe quedar amarrado a junio 2026. Debe leer fecha viva, metas actuales y permitir detalle clickeable en KPIs, tablón, prioridades y avance por asesor.

## P1 Claude - Configuración autoadministrable

Configuración debe permitir administrar sin tocar código: marca, logo, paleta, países, monedas, impuestos, aseguradoras, usuarios, roles, módulos visibles, glosario, tarifas, comisiones, metas, presupuesto, plantillas, automatizaciones, integraciones y portal cliente.

## P1 Claude - Finanzas desde datos vivos

Finanzas debe leer desde `finmovs` y colecciones relacionadas. No debe depender de arreglos locales duros. Debe incluir selector país/moneda, CxC, CxP, conciliación, movimientos, comisiones, presupuestos, metas, liquidaciones, periodos y semáforos.

## P1 Claude - Plantillas, Reportes y Automatizaciones

Plantillas: crear, editar, eliminar, duplicar, usar, seleccionar cliente/canal e historial, sin `alert/prompt/confirm` nativo.

Reportes: crear, editar, borrar, duplicar, programar, exportar y abrir detalle.

Automatizaciones: flujos configurables, sin referencias externas a CXOrbia, Orbia, TyA, shopper u otros proyectos.

## P1 Claude - Aseguradoras

Ficha editable por aseguradora con logo, contactos, accesos, Drive/documentos, cuentas, productos, ramos, clausulados, plantillas, tarifarios, facturación, comisiones, vínculo a cotizador/comparativo y estado activa/inactiva.

## P1 Claude - Marketing

Calendario real editable, importación Excel, piezas por canal, estado, responsable, aprobación, programación e integraciones futuras sin notas técnicas visibles.

## P1 Claude - Fechas vivas

Revisar fechas o ciclos hardcodeados en `core/ciclo.js`, `modules/portal.js`, `modules/siniestros.js`, `modules/cliente360.js` y cualquier módulo amarrado a un periodo fijo.

## P1 Claude - Modales Orbit

Sustituir `alert()`, `confirm()` y `prompt()` por patrones Orbit: `drawer-back`, `Orbit.ui.confirm`, banners y modales consistentes.

## Criterios de entrega para Claude

Claude debe entregar ZIP mini-release con cambios mínimos, sin tocar backend/Auth/Firestore, sin romper `Orbit.store`, sin `localStorage` directo en módulos, sin notas técnicas visibles, sin mojibake, sin referencias a proyectos ajenos, con validación visual real y bitácoras actualizadas.

## Prioridad sugerida

1. Encoding/mojibake.
2. Ocultar badges técnicos en modo cliente.
3. Portal -> Siniestros -> Cliente 360 -> Historial -> Ops.
4. Configuración autoadministrable.
5. Finanzas desde `finmovs`.
6. Plantillas/Reportes/Automatizaciones clickeables.
7. Aseguradoras y Marketing con profundidad comercial.

## Estado

ABIERTO - paquete curado para Claude/prototipo UX y módulos.
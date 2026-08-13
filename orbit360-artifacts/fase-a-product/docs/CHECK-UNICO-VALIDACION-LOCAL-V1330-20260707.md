# Check único de validación local — Orbit 360 A&S v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Concentrar en un solo bloque de validación local los módulos modificados recientemente, sin deploy, sin producción, sin tocar `main` y sin cargar datos reales.

Este check permite convertir cambios funcionales ya aplicados en cambios confiables antes de continuar con migración real o nuevos hotfixes.

## Alcance del check

Validar únicamente:

- sintaxis JS de módulos tocados;
- contrato backend LAB;
- ausencia de cambios en archivos protegidos;
- smoke visual mínimo en LAB/local;
- textos honestos de operación;
- no exposición de secretos ni datos reales.

## Archivos funcionales modificados que deben validarse

- `orbit360-platform/modules/cobros.js`
- `orbit360-platform/modules/aseguradoras.js`
- `orbit360-platform/modules/siniestros.js`
- `orbit360-platform/modules/cancelaciones.js`

## Archivos pendientes que NO se deben marcar como cerrados

- `orbit360-platform/modules/equipo.js`
- `orbit360-platform/modules/configuracion.js`

Ambos tienen gates preparados/documentados, pero no cerrados funcionalmente por bloqueo/riesgo de reemplazo desde conector.

## Archivos protegidos que no deben aparecer modificados por este check

- `orbit360-platform/data/store.js`
- `orbit360-platform/data/store-firestore-lab.local.js`
- `orbit360-platform/core/backend-lab-loader.js`
- `orbit360-platform/core/backend-lab-init.js`
- `orbit360-platform/core/backend-lab-security-guard.js`
- `orbit360-platform/core/auth.js`
- `orbit360-platform/core/importa.js`
- `firestore.rules`
- `tools/orbit360-*`
- `index.html`

## Comandos mínimos sugeridos

Ejecutar desde la raíz del repo local en la rama correcta.

```bash
node --check orbit360-platform/modules/cobros.js
node --check orbit360-platform/modules/aseguradoras.js
node --check orbit360-platform/modules/siniestros.js
node --check orbit360-platform/modules/cancelaciones.js
node --check orbit360-platform/modules/importar.js
node --check orbit360-platform/core/importa.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

## Validación de rama y PR

Confirmar:

- rama local: `ays/backend-tenant-lab-v99-20260703`;
- PR #5 sigue draft/open;
- no merge;
- no deploy;
- no producción.

## Smoke visual mínimo

Abrir LAB/local y revisar:

### Cobros

- Botón: `Preparar lote`.
- Drawer: `Preparación de cobro por lote`.
- Acción: `Preparar recordatorios`.
- Actividad: `Recordatorio de cobro preparado`.
- Toast: envío real requiere canal conectado.

No debe decir:

- recordatorios enviados;
- WhatsApp/correo enviados;
- notificación real confirmada.

### Aseguradoras

- Desactivar vinculación pide confirmación.
- Borrar aseguradora con vínculos queda bloqueado.
- Ofrece desactivar en vez de borrar.
- Borrar sin vínculos pide motivo.
- Portales no guardan contraseña real.

### Siniestros

- Cambiar a `Aprobado`, `Pagado` o `Rechazado` pide motivo.
- Guarda bitácora.
- Si no hay monto aprobado, queda alerta de monto pendiente.
- Gestiones se cierran solo para Pagado/Rechazado.

### Cancelaciones

- `Recuperada` y `No recuperable` requieren motivo/nota.
- Guardar varias veces no duplica oportunidades.
- Guardar varias veces no duplica gestiones.
- Mensaje dice reemisión preparada, no reactivación automática.

### Importador

- Hub abre tarjetas.
- Calendario marketing queda como fuente de bajo riesgo.
- Directorio aseguradoras queda como catálogo.
- Banco no aplica cobros.
- Documentos no modifican clientes directamente.
- Financiero histórico no crea cartera ni producción.

## Criterios de aprobación

El check pasa si:

- todos los `node --check` terminan OK;
- el validador backend LAB termina OK o solo con warnings conocidos;
- no aparecen protegidos modificados;
- los textos visibles son honestos;
- no hay datos reales hardcodeados;
- no hay secretos;
- no se ejecutó deploy;
- no se hizo merge.

## Criterios de bloqueo

Bloquear continuidad funcional si:

- falla sintaxis JS;
- aparece protegido modificado sin autorización;
- aparece `index.html` modificado por error;
- Cobros afirma envío real;
- Aseguradoras permite borrar con vínculos;
- Siniestros finaliza sin motivo;
- Cancelaciones duplica oportunidades/gestiones;
- importador escribe fuera de su fuente;
- se detectan secretos o datos reales en código.

## Resultado esperado

Al finalizar debe quedar un reporte simple:

- checks OK/fallidos;
- módulo afectado;
- evidencia breve;
- decisión: continuar / corregir / bloquear.

## Siguiente decisión después del check

Si pasa:

1. continuar con smoke M2 calendario;
2. continuar con smoke M3 directorios aseguradoras;
3. preparar financiero histórico.

Si falla:

1. corregir solo el módulo fallido;
2. repetir check;
3. no avanzar migración real hasta estabilizar.

## Estado

Documento creado.
No se tocó código funcional.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.

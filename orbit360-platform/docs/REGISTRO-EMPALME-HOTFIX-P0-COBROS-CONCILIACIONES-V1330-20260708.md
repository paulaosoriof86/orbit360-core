# Registro — empalme/hotfix P0 Cobros + Conciliaciones v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Después de la reauditoría con certeza de la candidata Claude `2026-07-08T135740.684`, el siguiente bloque de empalme seguro debe atacar primero los riesgos P0 más sensibles:

```txt
Cobros
Conciliaciones M5
```

## Bloque trabajado

Se preparó y validó localmente, en entorno aislado, un hotfix de empalme para:

### Cobros

- Tomar como base la mejora de Claude en revisión/rechazo/trazabilidad.
- Mantener rechazo con motivo obligatorio.
- Hacer motivo obligatorio para validar reporte.
- Mantener `validadoReporte` como validado no aplicado.
- Eliminar `FileReader.readAsDataURL` y cualquier generación de base64 en factura.
- Registrar factura como metadata-only.
- Aplicar pago solo con motivo obligatorio.
- Bloquear aplicación si falta país/moneda o si GT no es GTQ / CO no es COP.
- Registrar auditoría en `auditoria` sin secretos ni payloads.
- Ajustar copy para que factura no signifique conciliación automática.

### Conciliaciones

- Motivo obligatorio también al validar.
- Confirmación reforzada al anular mediante texto `ANULAR`.
- Bloqueo país/moneda al validar.
- Estado visual `VALIDADA · no aplicada`.
- Mantener separación estricta: validar conciliación no aplica pago ni modifica cobros.
- Registrar auditoría en `auditoria`.

## Validación local aislada ejecutada

Se probó el script de hotfix contra copia local de módulos de la candidata previa y pasó:

```txt
node --check APLICAR-HOTFIX-P0-COBROS-CONCILIACIONES-V1330.mjs: OK
node APLICAR-HOTFIX-P0-COBROS-CONCILIACIONES-V1330.mjs: OK
node --check orbit360-platform/modules/cobros.js: OK
node --check orbit360-platform/modules/conciliaciones.js: OK
búsqueda readAsDataURL/base64/factData en cobros.js: sin hallazgos
```

## Estado de empalme

```txt
Código de hotfix preparado y validado en sandbox.
Pendiente aplicar en worktree/repo real o convertir a commit directo de módulos.
No se empalmó ZIP completo.
No se tocó backend protegido.
```

## Restricciones cumplidas

- No merge.
- No deploy.
- No main.
- No producción.
- No datos reales.
- No secretos.
- No Firestore writes.
- No backend protegido.
- No `index.html`.

## ¿Aplica a Claude/prototipo?

Sí.

Instrucción futura para Claude:

- Conservar Cobros con motivo obligatorio para validar/aplicar.
- Conservar factura como metadata-only.
- Conservar bloqueos país/moneda.
- Conservar M5 `VALIDADA · no aplicada`.
- Conservar confirmación reforzada al anular.
- Conservar auditoría visible por rol.

## Pendientes derivados

- Aplicar hotfix sobre el worktree real.
- Ejecutar runner agrupado cuando sea indispensable.
- Documentar cierre con commit SHA del empalme real.
- Continuar Portal metadata-only/fecha dinámica después de cerrar Cobros/M5.
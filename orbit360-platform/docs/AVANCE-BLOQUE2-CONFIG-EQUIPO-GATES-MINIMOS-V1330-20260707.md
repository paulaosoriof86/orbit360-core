# Avance Bloque 2 — Configuración + Equipo gates mínimos v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo del bloque

Cerrar gates mínimos en:

- Configuración interna: plan, módulos activos, reset.
- Equipo: usuarios, roles, permisos, inactivación.

## Estado actual remoto leído

### Configuración

Archivo:

```txt
orbit360-platform/modules/configuracion.js
```

Hallazgos:

- El cambio de plan del cliente se ejecuta directo con `T().setDeep('plan', pl.value)`.
- Guardar módulos activos se ejecuta directo, aunque conserva `configuracion`.
- Reset tiene confirmación simple, pero no motivo/auditoría.
- Existe una cadena visible residual duplicada en la fila de editar plan: `itar</button></td>`.
- Integraciones ya usan lenguaje más honesto: estado pendiente de conexión.

### Equipo

Archivo:

```txt
orbit360-platform/modules/equipo.js
```

Hallazgos:

- El copy de usuario ya fue corregido: usuario creado en equipo, invitación/Auth pendiente.
- Crear/editar usuario todavía guarda directo.
- Cambios de roles/módulos visibles no piden motivo.
- Matriz de permisos guarda directo al marcar/desmarcar.
- Reset de permisos no pide confirmación fuerte ni motivo.
- No existe bloqueo explícito para evitar dejar el tenant sin Dirección/Admin activo.

## Parche local preparado — Configuración

Se preparó localmente un patch de `configuracion.js` sobre copia exacta del blob remoto `27238a03a73f96c9f70a5f0a000425335723d8e8`.

Validación local:

```txt
node --check configuracion_hotfix_gates.js: OK
```

Cambios preparados:

1. Agregar helper local `adminLog(...)` para registrar actividad administrativa visible.
2. Agregar `resetConfig()` con:
   - confirmación fuerte;
   - motivo obligatorio;
   - actividad administrativa;
   - luego reset/reload.
3. Cambiar `cf-reset` para llamar `Orbit.modules.configuracion.resetConfig()`.
4. Cambiar cambio de plan a gate administrativo:
   - confirmación;
   - motivo obligatorio;
   - reversión del select si se cancela;
   - actividad `Plan de tenant actualizado`.
5. Cambiar guardado de módulos activos a gate administrativo:
   - conserva `configuracion` siempre;
   - conserva `equipo` si ya estaba activo;
   - confirmación;
   - motivo obligatorio;
   - actividad `Módulos activos actualizados`.
6. Corregir texto residual duplicado en fila de editar plan.

No se aplicó funcionalmente porque el archivo completo supera el umbral seguro para reemplazo manual desde conector sin validación local remota completa. El patch queda preparado y validado localmente, pero no cerrado.

## Parche requerido — Equipo

Debe aplicarse en una siguiente ventana de implementación segura:

### Crear/editar usuario

Antes de guardar:

- detectar si cambian roles;
- detectar si cambia `modulosOverride`;
- detectar si se inactiva usuario;
- pedir confirmación;
- pedir motivo si hay cambio sensible;
- registrar actividad/auditoría.

### No dejar tenant sin admin

Antes de inactivar o degradar a un usuario Dirección/Admin:

- contar usuarios activos con rol Dirección/Admin;
- si quedaría cero, bloquear la acción;
- mostrar aviso claro.

### Matriz de permisos

Al cambiar permisos:

- pedir confirmación;
- pedir motivo para Configuración/Finanzas/Comisiones o roles Dirección/Admin;
- registrar actividad/auditoría;
- revertir checkbox si se cancela.

### Reset de permisos

Debe ser Gate 3:

- confirmación fuerte;
- motivo obligatorio;
- actividad/auditoría;
- no permitir dejar roles críticos sin acceso a Configuración/Equipo.

## Estado del bloque

- Cobros lote: cerrado funcionalmente en GitHub, pendiente validación local/smoke.
- Configuración: patch local preparado y `node --check` OK, no aplicado funcionalmente.
- Equipo: especificación de patch lista, no aplicado funcionalmente.

## Criterio para cerrar Bloque 2

No cerrar hasta tener:

```txt
modules/configuracion.js actualizado y verificado
modules/equipo.js actualizado y verificado
node --check de ambos OK
validador backend LAB si está disponible
backend protegido intacto
documentación hotfix final
```

## Impacto Claude/prototipo

Claude debe conservar estos patrones cuando entre:

- cambio de plan = acción administrativa con confirmación/motivo;
- módulos activos = acción administrativa, no preferencia simple;
- reset = acción crítica;
- crear usuario no equivale a invitación enviada;
- permisos/roles deben mostrar advertencia y resumen before/after.

## Impacto Academia

Academia debe incluir ruta Admin:

- cómo crear usuario;
- diferencia entre usuario en equipo y usuario autenticado;
- cómo asignar roles;
- riesgos de quitar permisos;
- qué módulos no deben apagarse;
- cómo documentar motivo de cambios administrativos.

## Estado

Documento de avance creado.
No se tocó código funcional en este bloque.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.

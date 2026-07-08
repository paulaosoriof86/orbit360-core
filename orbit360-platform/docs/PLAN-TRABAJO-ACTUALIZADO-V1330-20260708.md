# PLAN DE TRABAJO ACTUALIZADO V1330 — 2026-07-08

## Estado PR

PR #5 sigue abierto, en draft, sin merge y sin deploy.

Rama activa:

```txt
ays/backend-tenant-lab-v99-20260703
```

Head remoto despues de documentacion celular:

```txt
693085583f1220273a3a7fdd0be46337395acfe9
```

Nota: el worktree local reportado por Paula estaba en HEAD `36d3afad316e3ecc4bf4ca46aa5227d87e3bd0d3`, por lo que al volver al computador se debe sincronizar o confirmar diferencia antes de aplicar nuevos patches.

## Restricciones vigentes

No tocar backend protegido:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
orbit360-platform/index.html
```

No merge, no deploy, no main, no secretos, no datos reales.

## Documentos agregados durante avance celular

1. `orbit360-platform/docs/AVANCE-CELULAR-EQUIPO-CONFIG-V1330-20260708.md`
2. `orbit360-platform/docs/AUDITORIA-CELULAR-MODULOS-VISIBLES-V1330-20260708.md`
3. `orbit360-platform/docs/REGISTRO-ACCIONES-CELULAR-V1330-20260708.md`
4. `orbit360-platform/docs/PLAN-TRABAJO-ACTUALIZADO-V1330-20260708.md`

## Bloqueador actual real

El bloqueo principal no son Portal, Correo, Notificaciones, Automatizaciones, Plantillas, Marketing ni Conciliaciones.

El bloqueo real es:

1. Equipo gates.
2. Configuracion gates.

Motivo:

- Son modulos administrativos base.
- Cambian usuarios, roles, permisos, tenant, plan, modulos activos e integraciones.
- Deben pedir motivo, confirmacion y dejar trazabilidad.
- El patch v1 fallo sin cambios por patron demasiado exacto.
- Se requiere patch v2 tolerante y validacion local.

## Orden de ejecucion recomendado

### Bloque 1 — Sincronizar worktree local

Objetivo: evitar aplicar patches sobre HEAD antiguo.

Acciones:

1. Confirmar rama local.
2. Confirmar HEAD local.
3. Confirmar que remoto esta en `693085583f1220273a3a7fdd0be46337395acfe9` o superior.
4. Confirmar protegidos limpios.
5. Traer documentos nuevos si hace falta.

Resultado esperado:

- Worktree local seguro para patch.
- No tocar main.
- No pisar backend protegido.

### Bloque 2 — Patch Equipo/Config gates v2

Archivos permitidos:

```txt
orbit360-platform/modules/equipo.js
orbit360-platform/modules/configuracion.js
orbit360-platform/docs/CIERRE-EQUIPO-CONFIG-GATES-V1330-20260707.md
```

Validaciones obligatorias:

```txt
node --check orbit360-platform/modules/equipo.js
node --check orbit360-platform/modules/configuracion.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

Debe confirmar:

- Protegidos limpios.
- Equipo no permite dejar sin admin activo.
- Configuracion no permite reset/cambio plan/modulos sin motivo.
- Copy tecnico neutralizado.

### Bloque 3 — Smoke M2 Marketing

Objetivo: validar que Marketing funciona sin simular publicacion real.

Puntos:

- Calendario abre.
- Crear contenido.
- Generar mes con IA o fallback.
- Programar queda como preparado si no hay Metricool/Make.
- Crear pieza queda como solicitud preparada si no hay Canva conectado.
- No debe afirmar publicacion real.

No bloqueantes antes de smoke:

- Gate menor para eliminar contenido.
- Refuerzo de estado Publicado/Medido.

### Bloque 4 — Smoke M3 Aseguradoras

Objetivo: validar ficha/cuentas/accesos/documentos sin secretos reales.

Puntos:

- No exponer credenciales.
- Accesos a plataformas como referencia o pendiente de canal seguro.
- Baja/desactivacion segura ya trabajada debe validarse.
- Pais/moneda no debe mezclarse.

### Bloque 5 — Smoke M4 Finanzas historico

Objetivo: validar historico financiero separado de cobros/cartera.

Puntos:

- `finmovs` no escribe cartera.
- Produccion/comisiones no salen de historico financiero.
- Pais/moneda preservados.
- No sumar monedas en crudo.

### Bloque 6 — M5 Conciliacion sensible

No iniciar antes de M2/M3/M4.

Precondiciones:

- Conciliaciones ya esta aislado y no toca cobros.
- Falta gate/motivo/bitacora para validar/rechazar/bloquear/anular.
- Validar propuesta no equivale a aplicar pago.
- Si falta pais/moneda o hay bloqueos, no debe permitir validar.

## Pendientes por tipo

### Criticos ahora

- Equipo gates.
- Configuracion gates.
- Sincronizar HEAD local vs PR remoto.

### Importantes pero no bloquean M2/M3/M4

- Portal copy tecnico.
- Correo copy tecnico y verificacion de `Orbit.correo.enviar`.
- Automatizaciones: API keys/webhook no deben tratarse como secretos productivos en frontend.
- Plantillas: gate menor para eliminar/editar.
- Marketing: gate menor para publicar/medir/eliminar.

### Bloquean M5

- Conciliaciones: motivo/bitacora para cambios de estado.
- Validacion de pais/moneda/bloqueos antes de `VALIDADA`.

### Claude despues

Claude debe retomar solo cuando se necesite:

- UX visual.
- Copy limpio.
- Academia interactiva.
- Consistencia de portal, marketing, notificaciones y manuales.

No se necesita Claude para Equipo/Config gates, backend protegido, validadores ni smokes tecnicos.

## Academia

Actualizar Academia con rutas/microlecciones:

### Direccion/Admin

- Gestion segura de usuarios.
- Roles, permisos y ultimo administrador activo.
- Cambio de plan/modulos por tenant.
- Accion administrativa con motivo y trazabilidad.

### Marketing

- Idea vs programado interno vs publicado real vs medido.
- Canva/Metricool/Make preparado no equivale a publicado.

### Finanzas

- Historico financiero no es cartera.
- Conciliacion valida propuesta, no aplica pago.
- Pais/moneda obligatorios.
- No mezclar fuentes.

### Cliente/Operativo

- Reportar pago no equivale a pago conciliado.
- Documento registrado no equivale a archivo almacenado definitivamente.

## Decision operativa

Desde celular se avanzo correctamente con documentacion y auditoria.

El siguiente paso que requiere computador es aplicar y validar codigo localmente.

No se debe volver a auditar todo; la siguiente accion local debe ser directa:

```txt
sincronizar/confirmar HEAD -> patch Equipo/Config v2 -> node checks -> contrato backend -> smokes M2/M3/M4
```

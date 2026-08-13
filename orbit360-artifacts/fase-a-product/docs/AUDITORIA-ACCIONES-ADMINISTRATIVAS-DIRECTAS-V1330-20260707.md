# Auditoría — Acciones administrativas directas seguras v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Revisar qué módulos requieren acciones administrativas directas dentro de Orbit 360 para resolver casos operativos sin depender de correcciones externas, manteniendo plataforma administrable pero con:

- límites por tenant/proyecto;
- permisos por rol;
- confirmaciones/gates antes de mutar datos sensibles;
- trazabilidad en bitácora/auditoría;
- lenguaje honesto sobre acciones preparadas vs ejecutadas.

## Regla base

```txt
La plataforma debe permitir resolver operación diaria desde UI.
Pero toda acción administrativa sensible debe pasar por gate + permiso + bitácora.
```

## Niveles propuestos

### Nivel A — Acción operativa segura

Acciones de bajo riesgo que pueden ejecutarse directo si quedan en actividad/bitácora:

- agregar nota;
- registrar seguimiento;
- preparar correo;
- vincular expediente;
- marcar en revisión;
- crear solicitud operativa;
- preparar recordatorio.

### Nivel B — Acción administrativa controlada

Acciones que mutan estado operativo o crean registros derivados. Requieren confirmación, motivo y auditoría:

- validar/rechazar propuesta;
- confirmar cobro;
- conciliar factura;
- cambiar estado de siniestro;
- crear negocio de recuperación;
- crear usuario/equipo;
- editar aseguradora/contactos/cuentas;
- activar/desactivar módulos.

### Nivel C — Acción crítica / provisioning

Acciones que deben estar limitadas a Dirección/Admin interno o backend:

- cambiar plan del cliente;
- apagar módulos críticos;
- borrar aseguradora;
- borrar/configurar usuarios y roles;
- configurar integraciones/API/OAuth;
- aplicar pagos desde conciliación;
- cargar datos reales masivos;
- migrar cartera productiva;
- mutar backend/tenant/rules.

## Hallazgos por módulo

### 1. Cobros

Estado: requiere hotfix funcional pendiente.

Lo correcto ya existe:

- Distingue `Reportado por cliente`, `Validada (por aplicar)`, `Pagado (por conciliar)`, `Conciliado`, `Requiere validación`, `Bloqueado`.
- Validar reporte no aplica pago.
- Confirmar cobro y conciliar factura son acciones separadas.

Pendiente:

- `lote()` todavía usa lenguaje de envío real para WhatsApp/correo y debe pasar a `Preparar lote`.
- Ya existe documento de parche local listo:

```txt
orbit360-platform/docs/PARCHE-LOCAL-LISTO-COBROS-LOTE-HONESTIDAD-V1330-20260707.md
```

Prioridad: P1.

### 2. Conciliaciones

Estado: correctamente limitado.

Hallazgo:

- Lee propuestas de `conciliaciones`.
- Cambia solo estado de la propuesta.
- Declara explícitamente que no toca cobros ni aplica pagos.

Requisito futuro:

- Cuando exista backend real, `VALIDADA` debe crear tarea/cola de aplicación posterior, no aplicar pago automáticamente.

Prioridad: mantener patrón.

### 3. Siniestros

Estado: administrable, pero requiere gate adicional.

Acciones actuales:

- Crear reclamo.
- Cambiar estado del reclamo.
- Agregar bitácora.
- Actualizar gestiones asociadas cuando cambia a `Pagado` o `Rechazado`.
- Preparar correo a aseguradora desde compositor.

Riesgo:

- Cambiar estado a `Pagado`, `Aprobado` o `Rechazado` es una mutación sensible.
- Actualmente registra bitácora, pero debe pedir motivo/confirmación explícita para estados finales.
- `Pagado` sin monto aprobado debe conservar alerta de monto pendiente.

Hotfix recomendado:

- Gate para estado final: `Aprobado`, `Pagado`, `Rechazado`.
- Exigir motivo breve.
- Insertar actividad con `adminAction`, usuario, estado anterior, estado nuevo, timestamp.

Prioridad: P1/P2 según uso.

### 4. Cancelaciones

Estado: administrable, pero requiere gate anti-duplicados.

Acciones actuales:

- Guardar acción de recuperación.
- Insertar actividad.
- Crear negocio de recuperación si no está recuperada/no recuperable.
- Crear gestión de reemisión si se marca `Recuperada`.

Riesgo:

- Guardar varias veces una misma cancelación podría crear negocios/gestiones duplicadas si no hay marca de control.
- Debe existir confirmación antes de crear derivado operativo.

Hotfix recomendado:

- Guardar `recuperacionGestionId` o `recuperacionNegocioId` para no duplicar.
- Gate: “Crear oportunidad/gestión de recuperación” con confirmación.
- Registrar actividad/auditoría con estado anterior y nuevo.

Prioridad: P1 si se usará en operación real; P2 en prototipo.

### 5. Aseguradoras

Estado: administrable, con riesgo en edición/borrado.

Lo correcto ya existe:

- Las credenciales no se guardan como contraseña visible; se usa `credentialRef/backend_required`.
- Borrar aseguradora tiene confirmación.

Riesgo:

- Editar contactos, cuentas, documentos, comisiones y portales afecta cotizador, comparativo, emisión y operación.
- Borrar aseguradora no debería permitirse si tiene pólizas vinculadas; debería desactivar/vincular=false como opción segura.

Hotfix recomendado:

- Gate para borrar: bloquear si existen pólizas o reclamos asociados.
- Preferir `vinculada=false` sobre remove.
- Insertar auditoría de cambios de comisiones/cuentas/portales.

Prioridad: P1.

### 6. Equipo / Usuarios / Permisos

Estado: administrable, requiere auditoría fuerte.

Lo correcto ya existe:

- Crear usuario no afirma credenciales enviadas; queda pendiente Auth backend.
- Permite multirol y módulos visibles.

Riesgo:

- Cambiar roles, módulos visibles, metas, comisiones o permisos afecta seguridad comercial y operativa.
- Permisos se actualizan directo.

Hotfix recomendado:

- Gate de Dirección/Admin para editar roles/permisos.
- Actividad/auditoría por usuario: antes/después.
- No permitir que un usuario se quite a sí mismo `configuracion`/admin si es único admin.

Prioridad: P0/P1 antes de operación real.

### 7. Configuración interna / Tenant / Planes / Módulos

Estado: administrable, requiere control de acceso real.

Lo correcto ya existe:

- UI la identifica como `Configuración interna · Orbit`.
- Mantiene `configuracion` al guardar módulos activos.
- Reset tiene confirmación.

Riesgo:

- Cambiar plan, módulos activos o add-ons desde UI puede afectar todo el tenant.
- El texto dice que no es visible para cliente, pero debe existir enforcement por rol/tenant, no solo texto.

Hotfix recomendado:

- Gate `Orbit.adminAction` para cambios internos.
- Confirmación con motivo para plan/módulos/reset.
- Auditoría de tenant: campo, valor anterior, valor nuevo, usuario, timestamp.

Prioridad: P0 antes de habilitar usuarios reales.

### 8. Importación / Migración

Estado: requiere dependencia con core/importa y backend.

Hallazgo en hub:

- Presenta grupos de importación y abre `Orbit.importa.open(...)`.
- El hub no aplica datos por sí mismo.

Riesgo:

- La frase “alimenta a todos los módulos” debe sostenerse con dry-run, diff y confirmación.
- La importación real debe mantener trazabilidad fuente/hoja/fila/país/moneda.

Requisito:

- Acciones administrativas directas para aprobar/rechazar importaciones por fuente, pero nunca mezclar fuentes.
- No crear clientes/pólizas desde documentos soporte sin confirmación y diff.
- Estado `REQUIERE_VALIDACION` si falta país/moneda.

Prioridad: P0 para migración real; no resolver solo con frontend.

### 9. Portal del Cliente

Estado: mayormente alineado.

Lo correcto ya existe:

- Reportar pago queda pendiente de revisión/conciliación.
- Subir documento queda registrado para revisión, Storage pendiente.
- Solicitudes indican canal conectado pendiente.

Pendiente menor:

- El chat puede responder “lo registro para tu asesor” aunque no siempre crea una gestión real.

Hotfix recomendado:

- Cambiar copy a “puedo dejarlo como solicitud si completas el formulario” o crear solicitud real con gate.

Prioridad: P2.

### 10. Pólizas / Cliente360

Estado: operativamente bien encaminado, pero creación/estado requiere gates.

Lo correcto ya existe:

- Pólizas separan vigente/por renovar vs histórico.
- Desglose muestra prima neta, gastos, impuestos, total y origen.
- Cliente360 prepara correos/comparativos sin afirmar envío real.

Riesgo:

- Nueva póliza, endoso, cancelación o generación de recibos debe requerir validación de país/moneda/estado.
- Falta confirmar que toda creación desde documentos tenga diff antes de escritura.

Prioridad: P1 para operación/migración.

### 11. Marketing / Reportes / Automatizaciones

Estado: honestidad mejorada, requiere gates de ejecución real.

Regla:

- Preparar publicación/reporte/automatización no equivale a ejecutar.
- Proveedor conectado requerido para envío/publicación.

Requisito:

- Gate para `programar`, `publicar`, `enviar reporte`, `disparar webhook`, `activar automatización`.
- Auditoría de proveedor/canal/estado: preparado, encolado, enviado por proveedor, fallo.

Prioridad: P1/P2.

### 12. Academia

Estado: debe recibir impacto de todos estos patrones.

Requisito:

- Rutas por rol deben enseñar qué acciones son solo preparación y cuáles mutan datos.
- Evaluaciones deben cubrir estados críticos: reportado, validado, confirmado, conciliado, preparado, enviado, publicado, conectado.
- Certificados deben reflejar que el usuario entiende gates y trazabilidad antes de operar datos reales.

Prioridad: P1 documental/prototipo.

## Patrón requerido: `Orbit.adminAction`

Se recomienda crear una capa reutilizable de acción administrativa:

```txt
Orbit.adminAction({
  id,
  modulo,
  accion,
  nivel,
  entidadTipo,
  entidadId,
  descripcion,
  before,
  after,
  requiereMotivo,
  requiereConfirmacion,
  rolesPermitidos,
  tenantScope,
  run
})
```

Debe hacer:

1. Validar tenant actual.
2. Validar rol/permisos.
3. Mostrar confirmación si aplica.
4. Solicitar motivo si aplica.
5. Ejecutar `run`.
6. Insertar auditoría/actividad con before/after.
7. Mostrar resultado honesto.
8. No permitir acciones críticas si falta backend/Auth/tenant real.

## Qué puede resolverse localmente sin Codex

- Documentación de matriz y criterios.
- Ajustes pequeños de copy si se tiene archivo exacto.
- Hotfixes de módulos medianos cuando el archivo local coincida con remoto y pase `node --check`.
- Pendientes Claude/Academia.

## Qué sí amerita Codex

Codex es necesario si se implementa `Orbit.adminAction` como patrón transversal porque toca varias capas y módulos:

- core nuevo o compartido;
- configuración de permisos;
- auditoría común;
- Equipo;
- Configuración;
- Cobros;
- Siniestros;
- Cancelaciones;
- Aseguradoras;
- Importación;
- posibles validadores.

## Prompt Codex recomendado si se decide implementar ahora

```txt
ORBIT 360 A&S — ADMIN ACTIONS SEGURAS V1330

Repo: paulaosoriof86/orbit360-core
Carpeta: orbit360-platform/
Rama obligatoria: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
No merge, no deploy, no main, no producción, no datos reales, no secretos.

Antes de tocar archivos:
1. Confirmar rama y head remoto.
2. Leer docs maestros disponibles en repo y docs recientes de v1330.
3. Leer:
   - orbit360-platform/docs/AUDITORIA-ACCIONES-ADMINISTRATIVAS-DIRECTAS-V1330-20260707.md
   - orbit360-platform/docs/ERRATA-PENDIENTE-COBROS-LOTE-HONESTIDAD-V1330-20260707.md
   - orbit360-platform/docs/PARCHE-LOCAL-LISTO-COBROS-LOTE-HONESTIDAD-V1330-20260707.md

Restricciones:
- No tocar store.js, store-firestore-lab.local.js, auth.js, core/importa.js, backend-lab-*, firestore.rules ni tools/orbit360-* salvo lectura.
- No reemplazar index.html.
- No implementar backend real ni OAuth.
- No afirmar proveedor conectado.

Objetivo mínimo:
1. Aplicar hotfix funcional en orbit360-platform/modules/cobros.js para lote:
   - Notificar por lote -> Preparar lote.
   - Enviar recordatorios -> Preparar recordatorios.
   - Recordatorio enviado -> Recordatorio preparado.
   - Quitar WhatsApp + correo como entrega real.
   - Toast honesto: preparados; envío real requiere canal conectado.
   - Conservar sintaxis y funcionamiento.

Objetivo de patrón si cabe sin riesgo:
2. Agregar helper frontend no protegido, por ejemplo core/admin-actions.js o core/audit-actions.js, solo si index ya lo carga o si puede integrarse sin tocar index.
3. Si no se puede integrar sin index, NO tocar index; dejar doc/pending.
4. Documentar diseño de Orbit.adminAction para próxima fase.

Validaciones:
- node --check orbit360-platform/modules/cobros.js
- Si se toca otro JS: node --check de cada archivo.
- node tools/orbit360-validar-backend-lab-contrato.mjs

Documentación:
- Crear/actualizar docs/HOTFIX-COBROS-LOTE-HONESTIDAD-V1330-20260707.md
- Crear/actualizar docs/PENDIENTE-ADMIN-ACTIONS-TRANSVERSAL-V1330-20260707.md si no se implementa helper.

Final esperado:
- Rama, commits, archivos cambiados.
- Validaciones.
- PR open/draft/no merge/no deploy/main.
- Confirmar backend protegido intacto.
```

## Estado final de esta auditoría

- No se tocó código funcional en este documento.
- No se usó Codex.
- No se tocó backend protegido.
- No se tocó `index.html`.
- No merge.
- No deploy.
- No datos reales.

Pendientes críticos:

1. Aplicar hotfix funcional de `cobros.lote()`.
2. Diseñar/implementar patrón transversal `Orbit.adminAction` o documentarlo como fase obligatoria pre-operación real.
3. Agregar gates en Equipo/Configuración interna antes de usuarios reales.
4. Agregar protección anti-duplicados en Cancelaciones.
5. Agregar confirmación/motivo en estados finales de Siniestros.
6. Agregar gate de borrar/desactivar en Aseguradoras.

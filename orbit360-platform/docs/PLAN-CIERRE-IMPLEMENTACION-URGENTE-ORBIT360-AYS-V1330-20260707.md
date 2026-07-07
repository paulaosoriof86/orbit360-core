# Plan de cierre — Implementación urgente Orbit 360 A&S v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Convertir el trabajo documentado de las últimas sesiones en una ruta de cierre implementable, priorizada y medible.

Paula necesita avanzar hacia uso operativo/migración real sin seguir acumulando deuda ni abrir riesgos de inestabilidad.

## Estado real al corte

### Ya documentado y protegido

- Baseline de rama/PR y backend protegido.
- Reglas de honestidad operativa: preparar vs enviar, reportar vs aplicar, validar vs conciliar.
- Matriz de acciones administrativas directas.
- Matriz RBAC/Gates para Configuración, Equipo y Aseguradoras.
- Matriz Gates para Siniestros, Cancelaciones, Cobros y Conciliaciones.
- Incidente PowerShell documentado: no asumir hotfix funcional si no se verifica en GitHub.
- Pendientes Claude/Academia asociados a patrones reutilizables.

### Aún no cerrado funcionalmente

- Hotfix de `cobros.lote()`.
- Gates reales en módulos administrativos.
- Anti-duplicados de Cancelaciones.
- Motivo obligatorio en Siniestros para estados finales.
- Borrado seguro de Aseguradoras.
- Centro/auditoría administrativa.
- Migración real por fuentes separadas.

## Principio de recorte

Para avanzar, no se debe intentar terminar todo el SaaS completo en un solo ciclo.

La ruta urgente se divide en:

```txt
Mínimo Operativo Seguro
Migración Real Controlada
Comercializable Robusto
```

## Fase 1 — Mínimo Operativo Seguro

Propósito: que la plataforma no se contradiga ni permita acciones peligrosas desde UI.

### 1. Cobros lote

Estado: pendiente funcional.

Cambios:

- `Notificar por lote` -> `Preparar lote`.
- `Enviar recordatorios` -> `Preparar recordatorios`.
- Registrar `Recordatorio preparado`.
- No afirmar WhatsApp/correo real enviado.
- No bajar pendientes por entrega no confirmada.

Criterio de cierre:

- código aplicado en `modules/cobros.js`;
- `node --check` OK;
- documento hotfix;
- verificación remota.

Riesgo si no se hace: usuarios creerán que cobros fueron notificados realmente.

### 2. Equipo / Roles / Permisos

Estado: documentado, no implementado.

Cambios mínimos:

- confirmar antes de crear usuario;
- copy honesto: Auth/invitación pendiente;
- confirmar y auditar cambios de roles;
- no dejar tenant sin admin;
- registrar before/after de permisos críticos si es viable.

Criterio de cierre:

- cambios en `modules/equipo.js`;
- `node --check` OK;
- no afirmar credenciales activas;
- doc hotfix.

Riesgo si no se hace: administración de usuarios insegura.

### 3. Configuración interna

Estado: documentado, no implementado.

Cambios mínimos:

- gate para cambiar plan;
- gate para módulos activos;
- gate para reset;
- impedir apagar `configuracion`;
- distinguir add-on preparado/configurado/conectado/activo.

Criterio de cierre:

- cambios en `modules/configuracion.js`;
- `node --check` OK;
- no simular integración activa;
- doc hotfix.

Riesgo si no se hace: tenant puede quedar mal configurado o sin recuperación.

### 4. Aseguradoras

Estado: documentado, no implementado.

Cambios mínimos:

- bloquear borrado si tiene pólizas/reclamos/cobros/comisiones/docs vinculados;
- sugerir desactivar vinculación;
- mantener `credentialRef/backend_required`;
- gate para editar cuentas/comisiones/portales.

Criterio de cierre:

- cambios en `modules/aseguradoras.js`;
- `node --check` OK;
- borrado seguro validado;
- doc hotfix.

Riesgo si no se hace: pérdida de trazabilidad y configuración sensible.

### 5. Siniestros

Estado: documentado, no implementado.

Cambios mínimos:

- motivo obligatorio para `Aprobado`, `Pagado`, `Rechazado`;
- bitácora con estado anterior/nuevo;
- mantener alerta si falta monto aprobado;
- no cerrar gestiones sin traza.

Criterio de cierre:

- cambios en `modules/siniestros.js`;
- `node --check` OK;
- doc hotfix.

Riesgo si no se hace: cierre de reclamos sin justificación.

### 6. Cancelaciones

Estado: documentado, no implementado.

Cambios mínimos:

- evitar duplicar negocio/gestión de recuperación;
- guardar referencia o detectar existente;
- motivo para `No recuperable` y `Recuperada`;
- no reactivar póliza automáticamente.

Criterio de cierre:

- cambios en `modules/cancelaciones.js`;
- `node --check` OK;
- doc hotfix.

Riesgo si no se hace: duplicación de oportunidades y gestiones.

## Fase 2 — Migración Real Controlada

Propósito: cargar datos reales A&S sin contaminar cartera, producción ni financiero.

### 1. Fuentes separadas

Debe mantener separadas:

- clientes;
- aseguradoras;
- pólizas;
- vehículos;
- cobros realizados;
- planilla aseguradora;
- planilla comisiones;
- estado de cuenta bancario;
- financiero histórico;
- siniestros;
- documentos soporte;
- configuración/catálogo.

Criterio de cierre:

- cada fuente con parser/dry-run independiente;
- no inferir clientes/pólizas desde financiero histórico;
- no aplicar cobros desde banco sin conciliación.

### 2. Dry-run + diff + confirmación

Todo importador real debe mostrar:

- archivo;
- hoja;
- fila;
- bloque;
- país;
- moneda;
- entidad destino;
- crear/actualizar/omitir;
- motivo de bloqueo.

Criterio de cierre:

- ninguna escritura sin confirmación;
- estado `REQUIERE_VALIDACION` si falta país/moneda/estado.

### 3. Conciliación junio/julio

Debe contemplar:

- planillas de comisión junio/julio pueden tener pagos aplicados que no aparecen en financiero histórico;
- estados de cuenta de clientes pueden mostrar pagos pendientes y no realizados;
- planillas muestran pagos aplicados del mes anterior;
- banco propone, no aplica.

Criterio de cierre:

- conciliación banco/planilla/cliente diferenciada;
- propuestas con score y fuente;
- aplicación final con gate.

## Fase 3 — Comercializable Robusto

Propósito: dejar base SaaS vendible y replicable a otros intermediarios.

### Pendientes

- Centro de acciones administrativas.
- Bitácora de auditoría por tenant.
- Academia profunda por rol conectada a gates.
- Integraciones reales con proveedor confirmado.
- Reportes de adopción, operación y auditoría.
- Pruebas visuales/smoke por módulo.

## Estimación por bloques

### Ruta mínima urgente

```txt
Bloque 1: Cobros lote + verificación
Bloque 2: Configuración + Equipo gates mínimos
Bloque 3: Aseguradoras borrar/desactivar + credenciales
Bloque 4: Siniestros estados finales + Cancelaciones anti-duplicado
Bloque 5: Validación general + documentación de cierre
```

Cantidad: 5 bloques técnicos.

### Ruta migración real

```txt
Bloque 6: parser/fuentes separadas
Bloque 7: dry-run/diff/confirmación
Bloque 8: conciliación banco/planillas/clientes
Bloque 9: carga controlada inicial
Bloque 10: smoke migración + ajustes
```

Cantidad: 5 bloques técnicos adicionales.

### Ruta comercializable

```txt
Bloque 11: centro admin/auditoría
Bloque 12: academia por rol
Bloque 13: integraciones reales/canales
Bloque 14: reportes/adopción
Bloque 15: smoke visual/QA comercializable
```

Cantidad: 5 bloques adicionales.

## Recorte recomendado por urgencia

Para no seguir extendiendo, el corte mínimo debe ser:

```txt
1. Cobros lote.
2. Configuración/Equipo.
3. Aseguradoras.
4. Siniestros/Cancelaciones.
5. Importador dry-run/fuentes separadas.
```

Con esos 5 bloques, la plataforma queda mucho más segura para avanzar a migración real controlada.

## Qué NO hacer ahora

- No rediseñar UI general.
- No tocar `index.html` salvo estrictamente necesario y con método seguro.
- No intentar PowerShell largo pegado en consola.
- No cargar datos reales sin dry-run y diff.
- No activar integraciones reales sin proveedor/canal conectado.
- No hacer merge/deploy.

## Dependencias técnicas reales

Sin Codex y sin PowerShell largo, se puede seguir documentando y auditando, pero implementar código funcional será más lento.

Opciones viables:

1. Esperar créditos Codex y ejecutar bloque único de implementación.
2. Usar un entorno local controlado con archivos `.ps1` descargables, no bloques pegados.
3. Aplicar cambios pequeños desde GitHub solo si el archivo completo puede reemplazarse sin truncamiento y con `node --check` verificable.

## Criterios de cierre de cada bloque técnico

No cerrar ningún bloque funcional sin:

- commit funcional;
- `node --check` del archivo modificado;
- validador backend LAB si está disponible;
- doc hotfix;
- PR open/draft/no merge/no deploy;
- backend protegido intacto;
- impacto Claude/prototipo;
- impacto Academia.

## Estado

Documento de plan urgente creado.
No se tocó código funcional.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.

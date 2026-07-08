# Contrato — auditoría unificada de acciones sensibles v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Definir un contrato único de bitácora/auditoría para acciones sensibles en Orbit 360, reutilizable para A&S y futuros tenants.

Este contrato consolida patrones ya documentados en Equipo/Config, M5 Conciliaciones, Documentos, Portal/Cobros/Cliente360 y matriz de roles/permisos.

## Principios

1. Toda acción sensible debe dejar trazabilidad.
2. Motivo obligatorio no reemplaza autorización; complementa auditoría.
3. Validar no equivale a aplicar si el flujo lo separa.
4. Rechazar no debe borrar evidencia ni nota original.
5. Anular/bloquear/reset/aplicar cambios sensibles exige confirmación reforzada.
6. La auditoría debe ser por tenant.
7. No almacenar secretos, tokens, payloads, base64 ni archivos.
8. La bitácora debe poder mostrarse de forma filtrada por rol.

## Colecciones lógicas

### `auditLog`

Colección canonical futura recomendada.

Uso:

- acciones sensibles;
- cambios de roles/permisos;
- cobros;
- M5;
- documentos;
- integraciones;
- Academia;
- importadores;
- seguridad.

### `auditoria`

Alias compatible ya usado en prototipo. Puede mapearse a `auditLog` en backend real.

## Shape mínimo

```txt
id
tenantId
fecha
actor
actorId
actorNombre
actorRol
modulo
submodulo
accion
categoria
severidad
motivo
confirmacion
entidadTipo
entidadId
entidadLabel
pais
moneda
before
after
resultado
bloqueos[]
fuente
trazabilidad
correlationId
sessionId opcional
ipHash opcional futuro
userAgentHash opcional futuro
aplicaClaude
patronClaude
```

## Categorías

```txt
seguridad
roles_permisos
configuracion
integracion
documento
cobro
conciliacion
finanzas
cliente360
poliza
portal
academia
importacion
notificacion
automatizacion
```

## Severidad

```txt
info
warning
critical
blocked
```

Criterios:

- `info`: lectura administrativa o acción normal trazable.
- `warning`: acción sensible con motivo.
- `critical`: acción destructiva o de alto impacto.
- `blocked`: acción impedida por guard.

## Acciones mínimas auditables

### Equipo/Config

```txt
usuario_creado
usuario_editado
usuario_inactivado
usuario_inactivacion_bloqueada_ultimo_admin
rol_cambiado
permisos_cambiados
permisos_reseteados
plan_cambiado
modulos_activos_cambiados
configuracion_reseteada
integracion_configurada
integracion_activacion_bloqueada
```

### Cobros

```txt
pago_reportado_recibido
pago_reportado_en_revision
pago_reportado_rechazado
pago_reportado_validado_no_aplicado
pago_aplicacion_bloqueada
pago_aplicado_autorizado
cobro_anulado
cobro_bloqueado
recordatorio_preparado
```

### M5 Conciliaciones

```txt
conciliacion_validada_no_aplicada
conciliacion_rechazada
conciliacion_bloqueada
conciliacion_anulada
conciliacion_validacion_bloqueada
conciliacion_aplicacion_autorizada_futura
```

### Documentos

```txt
documento_recibido
documento_en_revision
documento_aprobado_expediente
documento_rechazado
documento_bloqueado
documento_archivado
documento_visible_cliente
adjunto_vinculado
adjunto_desvinculado
diff_propuesto
diff_aprobado
diff_rechazado
diff_aplicado
```

### Cliente360 / pólizas

```txt
cliente_editado_sensible
cliente_diff_aplicado
asesor_cambiado
poliza_estado_cambiado
poliza_activacion_bloqueada
expediente_documento_vinculado
```

### Finanzas

```txt
finmov_creado_manual
finmov_editado
finmov_anulado
periodo_cerrado
periodo_reabierto
exportacion_financiera
```

### Academia

```txt
ruta_creada
ruta_editada
ruta_archivada
leccion_editada
leccion_archivada
certificado_emitido_manual
progreso_ajustado
```

### Integraciones / Automatizaciones / Notificaciones

```txt
canal_preparado
canal_activacion_bloqueada
canal_activado
prueba_canal_preparada
envio_masivo_preparado
envio_masivo_bloqueado
automatizacion_creada
automatizacion_pausada
notificacion_preparada
```

## Reglas de before/after

`before` y `after` deben ser minimizados:

Permitido:

```txt
estado
rol
permisos
monto
moneda
pais
modulo
visibilidad
referencia
fecha
```

No permitido:

```txt
contraseñas
tokens
credenciales
archivos
base64
bytes
documentos completos
payloads bancarios completos
PII innecesaria
```

## Bloqueos auditables

Todo guard que bloquee debe registrar `resultado=bloqueado` y `bloqueos[]`:

```txt
ultimo_admin_activo
pais_moneda_faltante
moneda_incoherente
rol_no_autorizado
integracion_sin_proveedor
storage_no_conectado
soporte_rechazado
conciliacion_no_aplicada
falta_diff_aprobado
documento_bloqueado
datos_reales_no_autorizados
```

## Visibilidad por rol

- Dirección/Admin/IT: auditoría completa según tenant.
- AuditorSoloLectura: lectura sin acciones.
- Finanzas/Cobros: auditoría de cobros/M5/finanzas autorizada.
- Operativo/Asesor: auditoría de gestiones/cartera asignada.
- ClientePortal: solo historial visible de sus solicitudes/documentos/pagos, sin detalles internos sensibles.

## Integración con Academia

Cada patrón auditable debe alimentar Academia:

- qué acción requiere motivo;
- qué acción requiere confirmación;
- qué significa bloqueado;
- cómo leer bitácora;
- qué evidencia queda.

## Instrucción para Claude/prototipo

Claude debe reflejar:

- bitácora/historial visible en módulos críticos;
- modales de motivo;
- confirmaciones reforzadas;
- estados bloqueados con explicación;
- historial del cliente en portal sin detalles internos sensibles;
- Academia con lecciones de auditoría.

## Estado

Contrato creado. Pendiente implementación backend real cuando Auth/roles/auditLog final esté aprobado.
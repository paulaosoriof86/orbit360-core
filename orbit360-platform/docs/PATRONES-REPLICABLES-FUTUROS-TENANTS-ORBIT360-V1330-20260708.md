# Patrones replicables para futuros tenants — Orbit 360 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Separar lo aprendido en A&S que sí debe convertirse en base comercializable para otros clientes/tenants.

No contiene datos reales ni lógica exclusiva de A&S.

## 1. Configuración por tenant

Todo nuevo cliente debe entrar por configuración, no fork:

```txt
tenantId
nombre comercial
logo white-label
paleta
país default
moneda default
países adicionales
aseguradoras
usuarios
roles
módulos activos
glosario
planes/tarifas
integraciones preparadas
automatizaciones
Academia por rol
```

## 2. Backend adapter estable

El frontend debe conservar `Orbit.store` como API única.

Ventaja para futuro cliente:

- se puede cambiar motor backend sin reescribir módulos;
- Firestore LAB/real puede convivir con store local/prototipo;
- se conserva aislamiento tenant;
- se reducen empalmes inseguros.

## 3. Gates administrativos

Reusable en cualquier tenant:

- motivo obligatorio;
- confirmación reforzada para reset/anulación;
- auditoría;
- no dejar tenant sin administrador activo;
- bitácora visible para Dirección/Admin/IT.

## 4. Estados honestos

Reusable en cualquier producto comercializable:

```txt
pendiente_configuracion
pendiente_conexion
referencia_preparada
recibido
en_revision
requiere_validacion
validado_no_aplicado
aplicado_autorizado
bloqueado
anulado
```

Prohibido simular:

```txt
integración activa
Storage activo
pago aplicado
conciliación aplicada
notificación enviada
```

si solo está preparado o pendiente.

## 5. Migración por fuente separada

Reusable:

```txt
clientes
aseguradoras
polizas
vehiculos
cobros_realizados
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
financiero_historico
siniestros
documentos_soporte
configuracion_catalogo
```

Cada fuente debe tener:

```txt
origen
archivo
hoja
fila/bloque
periodo
país
moneda
estado de validación
readiness
propuestas
bloqueos
```

## 6. Documentos metadata-only

Reusable:

- documento no escribe entidad maestra;
- soporte no aplica pago;
- documento genera diff/parche;
- adjunto tiene visibilidad por rol/relación;
- Storage futuro se referencia, no se simula;
- no base64/bytes/URLs públicas.

## 7. Cobros y conciliación

Reusable:

- pago reportado;
- reporte validado no aplicado;
- pago aplicado autorizado;
- conciliación propuesta;
- conciliación validada;
- conciliación aplicada.

Cada transición sensible exige motivo y auditoría.

## 8. Academia por rol

Reusable:

Cada tenant debe activar Academia según módulos contratados:

```txt
Cliente Portal
Asesor
Operativo
Cobros/Finanzas
Dirección/Admin
IT/Seguridad
```

Cada ruta debe tener lecciones, casos, evaluación y certificado/progreso.

## 9. Integraciones

Reusable:

- configurada != activa;
- canal preparado != enviado;
- credencial real vive fuera del frontend;
- usar `credentialRef` conceptual;
- copy honesto.

## 10. Auditoría de candidatas

Reusable para cualquier cliente:

- no empalmar ZIP sin auditoría;
- revisar protegidos;
- validar JS;
- revisar copy técnico;
- revisar datos reales;
- revisar Academia;
- documentar hallazgos.

## 11. Resultado comercializable

Estos patrones reducen tiempo de implementación porque el próximo cliente no parte de cero:

- solo cambia configuración tenant;
- se reutilizan gates;
- se reutilizan estados honestos;
- se reutiliza migración por fuentes;
- se reutiliza modelo documental;
- se reutiliza Academia por rol;
- se reutiliza auditoría de candidata.
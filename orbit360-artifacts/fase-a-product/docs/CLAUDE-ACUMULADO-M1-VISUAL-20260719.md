# Acumulado Claude · M1 visual · 2026-07-19

## REPLICABLE_CLAUDE_INMEDIATO

1. Normalizar tipos de cliente a `Persona/Empresa` antes de KPIs y filtros.
2. Normalizar país a `GT/CO` desde valores explícitos; no depender de pólizas para filtrar clientes.
3. Convertir fechas válidas y mostrar `Fecha no disponible` cuando la fuente no sea interpretable.
4. La ausencia de relaciones debe verse como pendiente o sin datos, nunca como estado favorable.
5. El selector de rol y la búsqueda deben ser visibles para una persona en escritorio, tableta y móvil.
6. Deduplicar repintados por firma de ruta, versión y conteos.
7. Un importador sin archivo o propuesta vuelve a la vista anterior y no afirma éxito.
8. El validador prueba filtros Colombia/Empresa, copy visible y estados vacíos honestos.
9. La evidencia sanitizada usa cadena vacía para errores ausentes, evitando falsos rojos del publicador.

## REPLICABLE_CLAUDE_ACUMULADO

- Jerarquía tipográfica en directorios y fichas.
- Encabezados visibles en tablas de contactos.
- Enlaces semánticos para teléfono, correo, WhatsApp y sitio web.
- Acción para copiar instrucciones de pago completas, condicionada a permisos y proveedor autorizado.
- Indicadores separados para relación comercial, calidad del dato y disponibilidad operativa.

## ACADEMIA_ACTUALIZAR

- Ausencia de datos no equivale a cliente al día.
- País y tipo canónicos.
- Rol activo visible.
- Importación como propuesta y diferencia.
- `FUNCTIONAL_DEFECT` frente a `VALIDATOR_STALE`.

## TENANT_AYS_ONLY

- Branding e iconos PWA A&S.
- Nuevos datos SIGA del 9 al 19 de julio.
- Configuración particular del directorio A&S.

## BACKEND_PROTEGIDO_NO_CLAUDE

- Proveedores de recursos protegidos.
- Store, Auth, adaptadores Firestore, reglas y pipelines.

## TEMPORAL_RETIRO

La proyección in-place `20260719.2-temporal` se retira cuando los módulos consuman directamente `Orbit.clientProjection`.

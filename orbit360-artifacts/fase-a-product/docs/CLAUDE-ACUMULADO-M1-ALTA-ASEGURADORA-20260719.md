# Claude acumulado · Alta segura de aseguradoras · 2026-07-19

## REPLICABLE_CLAUDE_INMEDIATO

- El botón visible y el adaptador deben compartir selector real y contrato estable.
- Abrir el formulario de alta no escribe en el store.
- Cancelar, cerrar o hacer clic fuera conserva el conteo anterior.
- La creación exige nombre, país y motivo antes de insertar.
- La identidad se valida por país + nombre canónico para impedir duplicados.
- La actividad y auditoría se crean después de la confirmación, nunca al abrir.

## Causa raíz reusable

El módulo propietario usaba `#asg-new`, mientras el bridge buscaba `[data-new-asg]`. Como el selector no coincidía, permanecía activo el handler legado que insertaba inmediatamente `Nueva aseguradora`. El mismo desfase existía entre `#asg-imp` y `[data-import-asg]`.

## Implementación reusable

- Capturar `#asg-new, [data-new-asg]` y `#asg-imp, [data-import-asg]`.
- Clonar el botón para retirar listeners legados antes de conectar el flujo seguro.
- Exponer marcadores `safeCreateBeforeInsert` y `cancelWritesStore:false`.
- Validar este contrato en el owner gate.

## No enviar a Claude

- IDs, huellas, conteos o auditoría del tenant A&S.
- Scripts de limpieza Firestore LAB.
- Credenciales, rutas internas o rollback de datos.

Clasificación de lo anterior: `BACKEND_PROTEGIDO_NO_CLAUDE` y `TENANT_AYS_ONLY`.

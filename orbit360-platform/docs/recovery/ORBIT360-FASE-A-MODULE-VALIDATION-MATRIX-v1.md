# Orbit 360 Fase A — Matriz Canónica de Validación Módulo por Módulo v1

**Estado:** plantilla de evidencia; no sustituye `orbit360-recovery-state-v1.json`.  
**Plan:** Recovery Master Plan v1.1.

## Regla

Cada capability Fase A debe tener lineage aprobado y alcanzar dos estados: `LATEST_APPROVED_VERSION_PREVIEW_PASS` y `LATEST_APPROVED_VERSION_LIVE_PASS`. El módulo no se cierra por presencia de archivo ni por smoke global.

| Capability / superficie | Lineage | Source/blob SHA | Owner final | Roles | Read/Write | Build esperado | Preview individual | Live individual | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| LOGIN_AND_ACCESS | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| INICIO_PRIMARY_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| CLIENTE360_PRIMARY_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| ASEGURADORAS_PRIMARY_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| ASEGURADORAS_OPERATIONAL_DIRECTORY | PENDING | PENDING | PENDING | Operativo/Admin/AdminTenant/SuperAdmin/Dirección | PENDING | PENDING | PENDING | PENDING | PENDING |
| OPS_PRIMARY_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| LEADS_PRIMARY_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| POLIZAS_PRIMARY_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| VEHICULOS_PRIMARY_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| RECIBOS_CARTERA_PRIMARY_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| COBROS_PRIMARY_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| ROLE_SCOPE_RUNTIME | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| CROSS_MODULE_RELATIONSHIPS | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| SINGLE_PRODUCT_ENTRYPOINT | TO_RECONSTITUTE | PENDING | PENDING | N/A | N/A | PENDING | PENDING | PENDING | PENDING |
| STARTUP_PERFORMANCE | TO_RECONSTITUTE | PENDING | PENDING | ALL | N/A | PENDING | PENDING | PENDING | PENDING |

## Test individual obligatorio

Para cada fila:
1. ruta/carga;
2. build/version exacta;
3. última UI aprobada;
4. datos sin `undefined/NaN`;
5. acción principal;
6. persistencia/recarga si aplica;
7. permisos por rol;
8. relaciones/dependencias;
9. 404/page/console errors;
10. responsive aplicable.

## Prueba live previa a datos

Después de promover el mismo artifact a producción, repetir el test individual sobre producción. Ningún refresh de datos agosto puede iniciar mientras exista una fila Fase A sin `LATEST_APPROVED_VERSION_LIVE_PASS`.

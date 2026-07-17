# Sincronización acumulada Claude — Orbit 360

Fecha de apertura: 2026-07-17  
Última actualización: 2026-07-17 — candidata v1.257  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Documento rector: `PLAN-MAESTRO-EJECUCION-PRODUCTIVA-ANTI-DESVIACION-SINCRONIZACION-CLAUDE-ORBIT360-AYS-20260716.md`

## Regla

Ningún fix, mejora de UX, responsive, permisos, multirol, importación, calidad, estados honestos o Academia que sea reusable puede quedar únicamente en la plataforma local/LAB.

Estados permitidos:

```txt
PENDIENTE_CLAUDE
ENVIADO_CLAUDE
INCORPORADO_CANDIDATA
INCORPORADO_CANDIDATA_PARCIAL
VALIDADO_EMPALME
NO_APLICA_BACKEND_PROTEGIDO
TENANT_AYS_CONFIG
TEMPORAL_NO_REPLICAR
```

## Candidata vigente en auditoría

```txt
Prototype Development Request - 2026-07-17T013205.678.zip
SHA-256: 8a9c7f7f7111bc0e1a0d2f41a49e4bd7d869fedf774fc0117707990ed786d1ea
Versión funcional: v1.257
```

La candidata pasa sintaxis y referencias, pero todavía no es empalmable por tres pendientes semánticos documentados en:

```txt
orbit360-platform/docs/AUDITORIA-SEMANTICA-CANDIDATA-CLAUDE-V1257-20260717.md
```

## Matriz acumulada

| ID | Bloque | Módulo/patrón | Cambio reusable | Estado Claude | Evidencia / acción siguiente |
|---|---|---|---|---|---|
| CL-001 | 0 | Navegación móvil | Cerrar sidebar/overlay desde el router propietario | `INCORPORADO_CANDIDATA` | v1.254 preservado; validar al empalmar |
| CL-002 | 0 | Legal | Gate idempotente por scope | `INCORPORADO_CANDIDATA` | v1.254 preservado; validar al empalmar |
| CL-003 | 0 | Multirol/permisos | Roles asignados, identidad, base + extras - restringidos | `INCORPORADO_CANDIDATA_PARCIAL` | P0-S1: restricciones/extras/matriz no conservados completamente |
| CL-004 | 0 | Scope | Fail-closed por registro, país, rol activo y módulo | `INCORPORADO_CANDIDATA_PARCIAL` | P0-S1: falta asesor derivado por cliente/póliza y compatibilidad semántica |
| CL-005 | 0 | Cliente 360 | Deep-links, mutaciones y proyección canónica | `INCORPORADO_CANDIDATA_PARCIAL` | Cliente 360/Calidad verdes; Pólizas/Cobros pendientes P0-S2 |
| CL-006 | 0 | Aseguradoras | Ficha, plataformas, bancos, conocimiento y gates | `INCORPORADO_CANDIDATA_PARCIAL` | P0-S3: Cotizador aún habilita Comparativo implícitamente |
| CL-007 | 0 | Credenciales | `credentialRef`, proveedor, auditoría y ventana temporal | `INCORPORADO_CANDIDATA` | Backend real excluido |
| CL-008 | 0 | Comparativo | Plantilla base por tenant y override por aseguradora | `INCORPORADO_CANDIDATA` | Validar impresión individual/conjunta en gate |
| CL-009 | 0 | Comisiones | Scope en mutaciones y detalles | `INCORPORADO_CANDIDATA` | Validar Asesor/Operativo en gate |
| CL-010 | 0 | Equipo/permisos | Roles, default/activo, extras, restringidos, scopes, países y motivo | `INCORPORADO_CANDIDATA_PARCIAL` | Persistencia presente; conducta final depende de P0-S1 |
| CL-011 | 0 | Copy técnico | Eliminar `sin hardcode` de Finanzas | `INCORPORADO_CANDIDATA` | Conservado |
| CL-012 | 0 | Copy técnico | Sustituir `Pendiente de backend` | `INCORPORADO_CANDIDATA` | v1.256 |
| CL-013 | 0 | Copy técnico | Sustituir `simulación LAB` y toast | `INCORPORADO_CANDIDATA` | v1.256 |
| CL-014 | 0 | Documentación | Unificar README/CHANGELOG/manifiesto | `INCORPORADO_CANDIDATA` | v1.257 coherente |
| CL-015 | 0 | Evidencia responsive | Dirección desktop, Operativo tablet y Asesor móvil | `PENDIENTE_CLAUDE` | Se cierra después del empalme con gate LAB/visual; no inventar evidencia |
| CL-016 | 0 | Proyección cliente | Alias importador → vista canónica sin escritura | `INCORPORADO_CANDIDATA_PARCIAL` | Cliente 360/Calidad sí; Pólizas/Cobros pendiente P0-S2 |
| CL-017 | 0 | Aseguradoras/conocimiento | Mapeado/persistido/validado/habilitado separados | `INCORPORADO_CANDIDATA_PARCIAL` | Estados previos bloqueados; falta separación Cotizador/Comparativo P0-S3 |
| CL-018 | 0 | Bootstrap/PWA | PWA solo instalación/cache | `INCORPORADO_CANDIDATA` | v1.256/v1.257 preservado |
| CL-019 | 0 | Importación por tenant | Perfil → dry-run → bloqueos → confirmación → reporte → rollback | `INCORPORADO_CANDIDATA_PARCIAL` | UX reusable; backend/payload excluidos |
| CL-020 | 0 | Academia | Multirol, scopes, credenciales, Aseguradoras y Comparativo | `INCORPORADO_CANDIDATA` | Contenido v1.256 preservado; validar navegación/progreso después |

## Corrección vigente para Claude

La única instrucción pendiente antes del empalme es el paquete:

```txt
PAQUETE-CORRECCION-SEMANTICA-FINAL-CLAUDE-V1257-ORBIT360-20260717.zip
```

Alcance exclusivo:

```txt
P0-S1 equivalencia semántica de Orbit.access
P0-S2 proyección en consumidores de Pólizas/Cobros
P0-S3 habilitación separada Cotizador/Comparativo
```

No se enviará otro paquete acumulado general antes del gate visual, salvo omisión bloqueante comprobada.

## Exclusiones permanentes

No se envían a Claude:

```txt
Firebase/Auth/Firestore/Storage reales
reglas de seguridad
secretos y credenciales
payload y datos A&S
414 clientes / 26 aseguradoras como datos
service accounts
rutas/configuración privada
backend protegido
manifiestos con PII
```

## Gate antes de empalmar

La siguiente candidata debe demostrar conducta, no solo existencia de funciones:

1. permisos extra/restricciones/matriz;
2. scope de registros relacionados;
3. estados completos de cliente;
4. alta manual con tenant/país/moneda/trazabilidad/calidad;
5. compatibilidad de `scopedStore`/`withScope`;
6. búsqueda real con aliases en Pólizas/Cobros;
7. Cotizador y Comparativo habilitados por separado;
8. preservación de CL-001–CL-020 y archivos protegidos.

Después de pasar esta puerta se ejecuta el empalme selectivo y el gate LAB del Bloque 1.
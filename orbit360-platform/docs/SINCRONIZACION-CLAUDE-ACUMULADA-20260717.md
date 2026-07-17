# Sincronización acumulada Claude — Orbit 360

Fecha de apertura: 2026-07-17  
Última actualización: 2026-07-17 — empalme selectivo v1.258 y arquitectura del Bloque 0  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Documento rector: `PLAN-MAESTRO-EJECUCION-PRODUCTIVA-ANTI-DESVIACION-SINCRONIZACION-CLAUDE-ORBIT360-AYS-20260716.md`

## Regla

Ningún fix, mejora de UX, responsive, permisos, multirol, importación, calidad, estados honestos, arquitectura reusable o Academia puede quedar únicamente en la plataforma local/LAB.

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

## Candidata auditada más reciente

```txt
Prototype Development Request (9).zip
SHA-256: 78967f1e8736dc713691b43b4eeb1a3a18abc198c0d1cf7ba0c87d577de70387
Versión funcional: v1.258
```

La candidata aportó fixes reutilizables, pero no se reemplazó literalmente porque todavía presentaba diferencias semánticas de permisos, país y pruebas. Se ejecutó un empalme selectivo con owners y validadores.

Documentación:

```txt
orbit360-platform/docs/EMPALME-SELECTIVO-CANDIDATA-CLAUDE-V1258-20260717.md
orbit360-platform/docs/MATRIZ-PROPIETARIOS-BRIDGES-RETIRO-BLOQUE0-20260717.md
orbit360-platform/docs/CIERRE-PARCIAL-ARQUITECTURA-BLOQUE0-ANTES-ASEGURADORAS-20260717.md
```

## Matriz acumulada

| ID | Bloque | Módulo/patrón | Cambio reusable | Estado Claude | Evidencia / acción siguiente |
|---|---|---|---|---|---|
| CL-001 | 0 | Navegación móvil | Cerrar sidebar/overlay desde el router propietario | `VALIDADO_EMPALME` | Integrado en `core/router.js`; pendiente gate visual |
| CL-002 | 0 | Legal | Gate idempotente por scope | `VALIDADO_EMPALME` | Integrado en `core/legal.js`; pendiente gate visual |
| CL-003 | 0 | Multirol/permisos | Roles asignados, identidad, base + extras - restringidos | `VALIDADO_EMPALME` | Contrato owner en `core/access-scope.js`; selector temporal documentado |
| CL-004 | 0 | Scope | Fail-closed por registro, país, rol activo y módulo | `VALIDADO_EMPALME` | Asesor derivado por cliente/póliza y país integrados |
| CL-005 | 0 | Cliente 360 | Deep-links, mutaciones y proyección canónica | `INCORPORADO_CANDIDATA_PARCIAL` | Helper owner integrado; retiro progresivo de proyección en memoria pendiente |
| CL-006 | 0 | Aseguradoras | Ficha, plataformas, bancos, conocimiento y gates | `INCORPORADO_CANDIDATA_PARCIAL` | Owner conserva operación; proyección temporal aún pendiente de integrar |
| CL-007 | 0 | Credenciales | `credentialRef`, proveedor, auditoría y ventana temporal | `INCORPORADO_CANDIDATA` | Backend real excluido |
| CL-008 | 0 | Comparativo | Plantilla base por tenant y override por aseguradora | `INCORPORADO_CANDIDATA` | Se valida después del slice actual |
| CL-009 | 0 | Comisiones | Scope en mutaciones y detalles | `INCORPORADO_CANDIDATA` | Se valida en su bloque operativo |
| CL-010 | 0 | Equipo/permisos | Roles, default/activo, extras, restringidos, scopes, países y motivo | `VALIDADO_EMPALME` | Conducta base consolidada; persistencia productiva pertenece a bloques posteriores |
| CL-011 | 0 | Copy técnico | Eliminar `sin hardcode` de Finanzas | `INCORPORADO_CANDIDATA` | Conservado |
| CL-012 | 0 | Copy técnico | Sustituir `Pendiente de backend` | `INCORPORADO_CANDIDATA` | Conservado |
| CL-013 | 0 | Copy técnico | Sustituir `simulación LAB` y toast | `INCORPORADO_CANDIDATA` | Conservado |
| CL-014 | 0 | Documentación | Unificar README/CHANGELOG/manifiesto | `INCORPORADO_CANDIDATA` | Baseline final del slice pendiente después de gate estático |
| CL-015 | 1 | Evidencia responsive | Dirección escritorio, Operativo tableta y Asesor móvil | `PENDIENTE_CLAUDE` | Se cierra con gate LAB y revisión visual; no inventar evidencia |
| CL-016 | 0 | Proyección cliente | Alias importador → vista canónica sin escritura | `INCORPORADO_CANDIDATA_PARCIAL` | Helper puro integrado; puente `applyAll()` aún temporal |
| CL-017 | 0 | Aseguradoras/conocimiento | Mapeado/persistido/validado/habilitado separados | `INCORPORADO_CANDIDATA_PARCIAL` | Integrar matriz default-deny en owner y retirar proyección temporal |
| CL-018 | 0 | Bootstrap/PWA | PWA solo instalación/cache/branding | `VALIDADO_EMPALME` | PWA limpia; runtime movido fuera de PWA |
| CL-019 | 0 | Importación por tenant | Perfil → dry-run → bloqueos → confirmación → reporte → rollback | `INCORPORADO_CANDIDATA_PARCIAL` | Importadores iniciales retirados del arranque; ejecución bajo demanda |
| CL-020 | 0 | Academia | Multirol, scopes, credenciales, Aseguradoras y Comparativo | `INCORPORADO_CANDIDATA` | Debe sumar owners/bridges/bootstrap y gates honestos |
| CL-021 | 0 | Arquitectura | PWA no puede actuar como bootstrap operativo | `PENDIENTE_CLAUDE` | Replicar propietario limpio en próximas candidatas |
| CL-022 | 0 | Arquitectura | Router como único owner de menú móvil y rutas | `PENDIENTE_CLAUDE` | No agregar listeners globales paralelos |
| CL-023 | 0 | Arquitectura | Legal idempotente dentro de `core/legal.js` | `PENDIENTE_CLAUDE` | No volver a parchear desde PWA/runtime |
| CL-024 | 0 | Arquitectura | Índice declarativo tenant → configuración separada | `PENDIENTE_CLAUDE` | Core reusable sin hardcode de A&S |
| CL-025 | 0 | Arquitectura | Importadores iniciales solo bajo demanda | `PENDIENTE_CLAUDE` | Nunca cargar desde PWA o bootstrap general |
| CL-026 | 0 | Arquitectura | Pruebas bloquean bridges retirados y owners duplicados | `PENDIENTE_CLAUDE` | Reutilizar gate estático equivalente en futuras candidatas |

## Paquete Claude vigente

El paquete acumulado que recoge los hotfixes v1.258 sigue siendo:

```txt
PAQUETE-SINCRONIZACION-CLAUDE-HOTFIX-V1258-ORBIT360-20260717.zip
SHA-256: fcb88f2f2fe23f63b1dcd9f9e64ca4613144f9cedb3067bf12c74ee1b2f1756f
```

No bloquea el plan ni solicita una candidata general antes del gate visual. Los IDs CL-021 a CL-026 deben agregarse a la próxima intervención de Claude junto con los hallazgos visuales reales.

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

La configuración `data/tenant-alianzas-soluciones-insurers-p10.js` se clasifica `TENANT_AYS_CONFIG`: puede servir como contrato de configuración, pero sus valores no se trasladan al core ni a otros tenants.

## Gate arquitectónico antes del Bloque 1

El validador vigente es:

```txt
tools/orbit360-block0-architecture-gate-v20260717.js
```

Debe demostrar:

1. PWA sin runtime operativo;
2. Router sin loaders retirados;
3. Legal idempotente en owner;
4. acceso/scope con superficie completa;
5. configuración tenant sin secretos;
6. owners cargados una sola vez;
7. Aseguradoras con estados completos y default-deny;
8. proyección de Aseguradoras retirada del bootstrap.

Estado actual:

```txt
NO_GO_CONTROLADO
Pendiente único: integrar modules/aseguradoras-frontend-projection-v20260716.js
sobre modules/aseguradoras.js y retirar el bridge del bootstrap.
```

Después del GO estático se actualiza el manifiesto baseline y se ejecuta el gate LAB del Bloque 1.

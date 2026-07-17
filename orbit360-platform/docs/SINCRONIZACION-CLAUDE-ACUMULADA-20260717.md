# Sincronización acumulada Claude — Orbit 360

Fecha de apertura: 2026-07-17  
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
VALIDADO_EMPAlME
NO_APLICA_BACKEND_PROTEGIDO
TENANT_AYS_CONFIG
TEMPORAL_NO_REPLICAR
```

## Candidata recibida

```txt
Prototype Development Request - 2026-07-17T001643.602.zip
SHA-256: abb6bbe417e5d9a2172adfe1b4852045dd3579abf49a495ec4ef82ad81da34d4
Versión funcional por CHANGELOG: v1.255
```

## Matriz acumulada

| ID | Bloque | Módulo/patrón | Cambio reusable | Estado Claude | Evidencia / acción siguiente |
|---|---|---|---|---|---|
| CL-001 | 0 | Navegación móvil | Cerrar sidebar/overlay en toda navegación real desde el router propietario | `INCORPORADO_CANDIDATA` | v1.254 `core/router.js`; validar al empalmar y retirar overlay PWA |
| CL-002 | 0 | Legal | Gate idempotente por scope; un solo modal aunque Auth notifique varias veces | `INCORPORADO_CANDIDATA` | v1.254 `core/legal.js`; validar al empalmar y retirar overlay PWA |
| CL-003 | 0 | Multirol | Mostrar solo roles asignados; preservar identidad del asesor; base + extras - restringidos | `INCORPORADO_CANDIDATA_PARCIAL` | `core/config.js`, `modules/equipo.js`, `core/access-scope.js`; falta equivalencia con runtime LAB |
| CL-004 | 0 | Scope | Fail-closed, gate por registro, país, rol activo y módulo | `INCORPORADO_CANDIDATA_PARCIAL` | v1.251; consolidar con `Orbit.access` de la rama |
| CL-005 | 0 | Cliente 360 | Deep-links y mutaciones sujetos a scope; asesor completa faltantes, no cambios críticos | `INCORPORADO_CANDIDATA_PARCIAL` | candidata contiene gates; falta proyección de campos de los 414 clientes |
| CL-006 | 0 | Aseguradoras | Ficha, plataformas, bancos, credenciales por referencia, lectura por rol | `INCORPORADO_CANDIDATA_PARCIAL` | candidata contiene owner; falta proyección de 26 entidades y conocimiento A&S |
| CL-007 | 0 | Credenciales | Resolver `credentialRef` por proveedor; no revelar referencia como secreto; auditoría y ventana temporal | `INCORPORADO_CANDIDATA` | `core/credential-vault.js`; backend real queda excluido |
| CL-008 | 0 | Comparativo | Plantilla base por tenant y override por aseguradora | `INCORPORADO_CANDIDATA` | v1.253; validar impresión individual y conjunta |
| CL-009 | 0 | Comisiones | Scope también en mutaciones directas y detalles | `INCORPORADO_CANDIDATA` | v1.252; validar con rol Asesor/Operativo |
| CL-010 | 0 | Equipo/permisos | Persistir roles, default/activo, extras, restringidos, scopes, países y motivo | `INCORPORADO_CANDIDATA` | v1.249-v1.251; conectar a membership productiva después |
| CL-011 | 0 | Copy técnico | Eliminar `sin hardcode` de Finanzas | `INCORPORADO_CANDIDATA` | v1.255 |
| CL-012 | 0 | Copy técnico | Sustituir `Pendiente de backend` por estado no técnico | `PENDIENTE_CLAUDE` | Configuración/Integraciones |
| CL-013 | 0 | Copy técnico | Sustituir `simulación LAB` y toast asociado por copy no técnico | `PENDIENTE_CLAUDE` | `core/integraciones.js` / mock no debe mostrarse al cliente |
| CL-014 | 0 | Documentación | Unificar README v1.251 con CHANGELOG v1.255 | `PENDIENTE_CLAUDE` | corregir próxima candidata/paquete |
| CL-015 | 0 | Evidencia responsive | Dirección desktop, Operativo tablet y Asesor móvil en viewports exactos | `PENDIENTE_CLAUDE` | evidencia de 2026-07-14 no cierra los 15 escenarios |
| CL-016 | 0 | Proyección cliente | Alias importador → contrato visual canónico, sin escritura ni reimportación | `PENDIENTE_CLAUDE` | patrón reusable; no compartir datos reales |
| CL-017 | 0 | Aseguradoras/conocimiento | Estados mapeado/persistido/validado/habilitado distintos | `PENDIENTE_CLAUDE` | trasladar UX, no datos/resúmenes A&S |
| CL-018 | 0 | Bootstrap | PWA no debe cargar lógica operativa, contratos o importadores | `PENDIENTE_CLAUDE` | trasladar al bootstrap propietario; PWA solo instalación/cache |
| CL-019 | 0 | Importación por tenant | Perfil autorizado → dry-run → bloqueos → confirmación → reporte → rollback | `INCORPORADO_CANDIDATA_PARCIAL` | patrón UX reusable; excluir loader LAB y payload |
| CL-020 | 0 | Academia | Multirol, scopes, países, credenciales seguras, plantilla Comparativo y gates | `PENDIENTE_CLAUDE` | actualizar rutas por rol tras cerrar empalme |

## Exclusiones permanentes

No se envían a Claude:

```txt
Firebase/Auth/Firestore/Storage reales
reglas de seguridad
secretos
credenciales
payload A&S
414 clientes / 26 aseguradoras como datos
código de service account
rutas o configuración privada
backend protegido
manifiestos con PII
```

## Gate antes de aceptar otra candidata

La siguiente candidata debe demostrar:

1. conserva CL-001 a CL-011;
2. resuelve CL-012 a CL-015;
3. incorpora patrones CL-016 a CL-020 sin datos reales ni backend protegido;
4. no reintroduce copys técnicos;
5. no vuelve a cargar contratos operativos desde PWA;
6. no reemplaza la API `Orbit.store`;
7. mantiene Academia alineada con el producto.

## Siguiente actualización del ledger

Después de consolidar `Orbit.access` + `Orbit.accessScope`, integrar `core/legal.js`/`core/router.js` y ejecutar el gate LAB, cambiar los estados a `VALIDADO_EMPAlME` o documentar el primer fallo real.

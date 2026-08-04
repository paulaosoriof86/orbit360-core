# Cierre forense RC1.2 — candidata acumulativa y membership técnica única

Fecha operativa: 2026-08-03 / evidencia UTC 2026-08-04  
Producto: Gravicentra Insurance / Orbit 360 A&S  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open, sin merge

## 1. Decisión ejecutiva

```text
AUDITORÍA ESTÁTICA DE MÓDULOS: PASS
CANDIDATA ACUMULATIVA EN CÓDIGO DE MÓDULOS: SÍ
BACKEND COMPLETO DE LOS 31 MÓDULOS: NO DEMOSTRADO
LOGIN NORMAL: NO_GO
RC1.2 DESPLEGADA: NO
PRODUCCIÓN MODIFICADA: NO
```

La candidata `b699ba329960cd830121b57452ce558399aa84fb` desciende de la baseline sellada `27cb7dfcda8568280ebef15993a953364304f29b` y conserva byte a byte todos los archivos de módulos de la baseline y de la rama viva. No existe una versión posterior de módulo en la rama viva que la candidata esté omitiendo.

La salida a producción se detuvo antes del snapshot y del deploy porque el tenant solo contiene una membership, y esa membership corresponde a la identidad técnica que RC1.2 debe excluir. No existen memberships normales elegibles de Dirección, Operativo ni Asesor que puedan normalizarse dentro del alcance autorizado.

## 2. Evidencia contractual

### Gate 7.13

```text
gateId: block7.13-rc12-membership-rootcause-cumulative-closure-v20260803
contractVersion: 7.13.0
resultado: GO_GATE_CONTRACT
checks: 17/17
```

### Gate Auth rootfixed

```text
resultado: PASS
checks: 16/16
source root separado del output path: sí
output absoluto observable: sí
```

### Auditoría forense de módulos

```text
decision: GO_STATIC_CUMULATIVE_MODULE_PARITY_WITH_MATURITY_GAPS
rutas auditadas: 31
scripts de módulos cargados: 47
archivos de módulos: 62
módulos activos: 31
módulos con fallo estático: 0
módulos integrados directamente a Orbit.store: 30
módulos con brechas de madurez: 22
backend explícitamente completo: 0
```

`backend explícitamente completo: 0` no significa que no exista backend. Significa que la evidencia disponible no permite declarar que un módulo está completamente cerrado en todos sus componentes: persistencia durable, permisos, escritores, integraciones, migración real, runtime, visualización y rollback.

## 3. Resultado de memberships

```text
total memberships: 1
perfil canónico de esa membership: Dirección
roles normalizados: AdminTenant + Asesor + Operativo + SuperAdmin
estado: active
proveedor Auth: password
usuario Auth correspondiente: existente
identidad técnica excluida: sí
memberships normales elegibles Dirección: 0
memberships normales elegibles Operativo: 0
memberships normales elegibles Asesor: 0
```

La membership existente no puede transformarse en una identidad normal cambiando `status`, `roles`, `defaultRole`, `activeRole` o `tenantId`, porque el defecto no está en esos campos. El vínculo corresponde a la identidad técnica histórica. Corregirlo exigiría crear memberships nuevas para usuarios Auth normales existentes o, si no existen, activar/crear identidades normales. Ambas operaciones estaban expresamente prohibidas por la autorización consumida.

## 4. Integridad del macrobloque

```text
Firestore reads: memberships únicamente
Auth reads: metadatos únicamente
Firestore writes: 0
Auth writes: 0
usuarios creados: 0
usuarios modificados: 0
contraseñas leídas: 0
contraseñas modificadas: 0
snapshot operativo: no ejecutado
Hosting deploy: no ejecutado
rollback membership: no requerido
rollback Hosting: no requerido
reimportación: no
Rules: no
Functions: no
main: no
merge: no
```

## 5. Estado módulo por módulo

| Módulo | Estado confirmado | Backend/madurez vigente | Cierre pendiente principal |
|---|---|---|---|
| Inicio | Activo y acumulativo | Dashboard compartido sobre store | Smoke normal después de onboarding |
| Cronograma | Trabajado | Backend parcial | Persistencia/gate del flujo completo |
| Ops | Trabajado y preparado para relaciones vacías honestas | Runtime trabajado | Smoke por rol no ejecutado por bloqueo de login |
| Leads | Trabajado y preparado para relaciones vacías honestas | Runtime trabajado | Smoke por rol no ejecutado |
| Aseguradoras | Datos reales migrados, módulo acumulativo | Read-only real | Smoke y revisión visual final |
| Cotizador | Prototipo avanzado | Backend productivo incompleto | Tarifas/configuración/integraciones productivas |
| Comparativo | Prototipo avanzado | Backend productivo incompleto | Integraciones y evolución v110 |
| Cliente 360 | Datos reales migrados, módulo acumulativo | Read-only real | Smoke sin demo y revisión visual final |
| Pólizas | Datos reales migrados, módulo acumulativo | Read-only real | Aprobación visual y gate runtime específico |
| Cobros | Datos reales migrados y escritores controlados disponibles | Parcialmente durable | Aprobación visual y verificación integral de mutaciones |
| Conciliaciones | Lógica trabajada | Backend parcial | Contrato de conciliación y gate productivo |
| Renovaciones | Lógica trabajada | Backend parcial | Flujo durable y gate |
| Cancelaciones | Frontend trabajado | Backend parcial | Persistencia y aprobación runtime |
| Siniestros | Frontend trabajado | Migración real pendiente | Importación fuente separada y backend durable |
| Historial | Frontend trabajado | Backend parcial | Consolidación de trazabilidad durable |
| Comisiones | Datos controlados cargados | Parcial; holds vigentes | Resolver holds y validar liquidaciones/planillas |
| Importar | Arquitectura avanzada | Generalización productiva pendiente | Importador multi-fuente completo con diff/rollback |
| Calidad | Trabajado sobre store | Funcionalidad compartida | Smoke normal y criterios de calidad definitivos |
| Plantillas | Frontend trabajado | Backend parcial | Persistencia y retiro de marcadores demo |
| Reportes | Frontend/exportación trabajados | Backend parcial | Fuentes canónicas y exportación productiva |
| IA | Frontend trabajado | IA productiva no conectada | Servicio real, permisos y estados honestos |
| Academia | Contenido profundo trabajado | Progreso durable parcial | Persistencia por usuario/rol y gate |
| Insights | Trabajado sobre store | Lecturas compartidas | Validación de indicadores reales |
| Correo | Frontend trabajado | Integración productiva no conectada | Proveedor real, colas, auditoría y estados |
| Automatizaciones | Frontend trabajado | Ejecución backend incompleta | Motor durable, permisos y auditoría |
| Notificaciones | Frontend trabajado | WhatsApp/backend no conectado | Integración real y consentimiento |
| Marketing | Frontend trabajado | Backend productivo incompleto | Calendario, campañas y métricas durables |
| Portal | Frontend trabajado | Auth externo/backend incompleto | Identidades externas, scopes y documentos |
| Finanzas | Frontend profundo trabajado | Migración real pendiente | Fuentes financieras separadas y conciliación |
| Equipo | Multirol/scopes trabajados | Escritor administrativo parcial | Onboarding normal, auditoría y confirmación reforzada |
| Configuración | Frontend trabajado | Persistencia parcial | Eliminar persistencia directa y consolidar backend tenant |

## 6. Qué garantiza la auditoría

Sí garantiza:

- la candidata contiene la misma versión de cada archivo de módulo que la baseline sellada;
- la candidata también coincide con la mejor versión existente en la rama viva;
- no hay pérdida silenciosa de un módulo posterior;
- los 31 módulos activos compilan y están registrados;
- RC1.2 solo cambia owners de Auth/Guard/Loader/Store y no sustituye módulos.

No garantiza todavía:

- que todos los módulos tengan backend completo;
- que todos hayan sido aprobados visualmente;
- que las integraciones externas estén conectadas;
- que los módulos no focales hayan superado smoke productivo;
- que exista onboarding normal para los usuarios del tenant.

## 7. Causa raíz consolidada

```text
DATA_CONTRACT_FAILURE
```

Owner:

```text
tenants/{tenantId}/members/{uid}
+
Firebase Auth de usuarios normales existentes
```

La regresión histórica de identidad técnica en Auth/Store/Guard está corregida y protegida por gate. El bloqueo actual es que el tenant nunca consolidó memberships normales productivas: conserva únicamente la membership técnica usada durante LAB.

## 8. Siguiente frontera exacta

Antes de desplegar RC1.2 se requiere un onboarding controlado de identidades normales:

1. censo sanitizado read-only de usuarios Firebase Auth existentes;
2. selección inequívoca de usuarios normales para Dirección, Operativo y Asesor;
3. creación idempotente de exactamente tres memberships si los usuarios ya existen;
4. si falta alguno, detener antes de crear usuario y reportar el perfil faltante;
5. snapshot, auditoría y rollback de memberships;
6. Gate 7.13, RC1.2, Hosting y smoke de tres perfiles;
7. mantener deploy solo con PASS.

Esta frontera requiere autorización nueva porque la autorización consumida prohibía crear memberships nuevas.

## 9. Cloud / Claude / Academia

```text
REPLICABLE_CLAUDE_ACUMULADO:
- matriz forense de paridad por módulo;
- separación presencia / backend / evidencia / madurez;
- patrón SOURCE_ROOT vs OUTPUT_PATH;
- gate que impide promover una candidata no acumulativa.

BACKEND_PROTEGIDO_NO_CLAUDE:
- creación y rollback de memberships;
- Firebase Auth;
- secretos, UID y datos reales.

ACADEMIA_ACTUALIZAR:
- diferencia entre candidata acumulativa y módulo completo;
- diferencia entre defecto funcional, contrato de datos y validador obsoleto;
- onboarding multirol y gates de producción.

SECRETO_DATO_REAL:
- identidad de usuarios y memberships A&S.
```

No se ha enviado ningún paquete externo a Cloud/Claude. La documentación reusable quedó preparada sin secretos ni datos personales.

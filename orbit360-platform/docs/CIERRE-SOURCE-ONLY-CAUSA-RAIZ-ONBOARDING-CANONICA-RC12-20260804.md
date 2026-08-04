# Cierre source-only — causa raíz de acceso, candidata canónica y estado CRM

Fecha: 2026-08-04  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
HEAD verificado al iniciar: `7317ecdfd570ecd6b34b2bca1525fdefcd900d0e`

## 1. Decisión

```text
SOURCE_ONLY_ROOTFIX_COMPLETE_WITH_PROTECTED_EXECUTOR_PENDING
```

Este bloque no ejecuta deploy, reintento runtime, reimportación, escritura Auth/Firestore, Rules, Functions, producción, main ni merge.

No abre otra auditoría general. Consolida la evidencia viva y corrige únicamente las capas demostradas como responsables.

## 2. Causa raíz confirmada

### Producto

`Equipo` guarda una persona/asesor y su configuración operativa, pero no implementa el ciclo protegido que crea o vincula:

```text
Firebase Auth
+ tenant membership
+ roles/defaultRole/activeRole
+ advisorId
+ países
+ dataScopes
+ invitación segura
```

Clasificación:

```text
FUNCTIONAL_DEFECT
DATA_CONTRACT_FAILURE
```

No existe evidencia de que la usuaria hubiera configurado incorrectamente los siete registros. El contrato de UI permitió interpretar “usuario creado” como “acceso habilitado”, aunque el código dejaba `accessProvisioned=false` y `invitacionEstado=pendiente_habilitacion`.

### Validador

El smoke recuperaba el estado como `observed.store`, pero luego evaluaba una variable externa inexistente llamada `store`.

Clasificación:

```text
VALIDATOR_STALE
PIPELINE_MECHANISM_FAILURE
```

El owner fue corregido para usar `observed.store`, registrar etapa, clasificación y stack sanitizado, y evitar que un `ReferenceError` interno vuelva a etiquetarse automáticamente como defecto funcional.

## 3. Retiro del roster nominal

El roster fijo de tres personas queda retirado como solución de producto.

```text
TEMPORAL_RETIRO
TENANT_AYS_ONLY
REPLAY_PROHIBIDO
```

Se conserva únicamente como evidencia histórica. Queda prohibido resolver perfiles por nombre, correo fijo, digest fijo o cantidad fija de usuarios.

Contrato de retiro:

`tools/orbit360-rc12-nominal-roster-retirement-v20260804.json`

## 4. Onboarding genérico source-only implementado

Se agregó un contrato reusable sin nombres, correos ni roles A&S hardcodeados:

`tools/orbit360-user-onboarding-contract-v20260804.mjs`

Incluye:

- estados `pending`, `provisioning`, `invited`, `active`, `blocked`, `error`;
- normalización de correo;
- roles, país y scopes desde el registro configurado;
- membership canónica;
- `requestId` e idempotency key determinísticos;
- invitación mediante establecimiento seguro de contraseña;
- ausencia explícita de contraseñas temporales;
- clasificación legacy: `link`, `create_access`, `update_membership`, `skip`, `requires_validation`.

También se agregó el reconciliador legacy genérico read-only:

`tools/orbit360-reconciliar-user-onboarding-legacy-dryrun-v20260804.mjs`

El reconciliador:

- recorre todos los asesores, no tres nombres;
- cruza correo normalizado y UID cuando existe;
- compara Auth y membership;
- produce evidencia solo con hashes;
- no crea usuarios;
- no actualiza memberships;
- no envía invitaciones;
- no escribe datos.

El ejecutor Admin SDK que realiza el alta real sigue pendiente porque el freeze vigente prohíbe cambios en `functions/`. No se simuló desde el navegador ni se sustituyó por otro script nominal.

## 5. Candidata canónica acumulativa

Se mantiene una sola composición lógica:

```text
producto RC1.2: b699ba329960cd830121b57452ce558399aa84fb
candidata runtime Gate 7.11: 267f7231b46d65b80c167f54567a67503b6a6793
datos: snapshot canónico inmutable Gate 7.11 + escrituras controladas cerradas posteriores
rama viva: HEAD incremental de ays/backend-tenant-lab-v99-20260703
```

El manifiesto source-only vigente es:

`orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest-v2-source-only.json`

No reemplaza el histórico v1; lo corrige contractualmente al retirar el roster nominal y separar claramente producto, datos, acceso y madurez modular.

## 6. Datos reales preservados

```text
clientes: 430
aseguradoras: 30
pólizas: 1,373
vehículos: 1,032
recibos esperados: 1,294
cartera: 673
cobros conciliados/materializados: 5
asesores: 7
planillas de comisiones: 5
comisiones devengadas: 5
conciliaciones de comisión: 5
```

No se perdió ni corresponde reimportar el CRM de cobranza:

```text
filas CRM de cobranza: 2,157
pagos reportados en julio: 68
```

La diferencia entre 2,157/68 y cinco cobros no es pérdida de datos. Es diferencia de estado probatorio:

```text
pago reportado por CRM
≠ pago confirmado por aseguradora
≠ evidencia bancaria
≠ comisión reconocida
≠ cobro conciliado
```

Los estados de cartera, reportes de aseguradora y planillas fueron registrados y usados como evidencia multifuente. Solo cinco casos cerraron con contraparte one-to-one y autorización de escritura. Los demás conservan estado de propuesta o HOLD por identidad, monto, fecha, moneda, cuota, endoso, vigencia o falta de contraparte.

## 7. Ops/Leads — por qué estaban en visualización

Ops y Leads no fueron incluidos porque se declararan backend completo.

Fueron incluidos porque:

- son módulos activos;
- leen mediante `Orbit.store`;
- Gate 7.11 verificó sus rutas, menú y permisos en una sesión multirol read-only;
- las relaciones vacías honestas estaban permitidas;
- la restricción de Ops para Asesor fue comprobada.

Estado correcto:

```text
shared Orbit.store: sí
runtime read-only: PASS
multirol/scopes: PASS
datos operativos completos: no demostrado
writer/backend de dominio completo: no
aprobación humana visual: pendiente
```

## 8. Matriz actual de 31 módulos

| Módulo | Store/backend observable | Datos/runtime vigente | Estado real | Pendiente concreto |
|---|---|---|---|---|
| Inicio | Orbit.store | dashboard compartido | trabajado | smoke integral posterior |
| Cronograma | Orbit.store | frontend | backend parcial | contrato y runtime de dominio |
| Ops | Orbit.store | Gate 7.11 PASS read-only | relaciones vacías permitidas | writer/ciclo durable y aprobación visual |
| Leads | Orbit.store | Gate 7.11 PASS read-only | relaciones vacías permitidas | writer/cadencias durable y aprobación visual |
| Aseguradoras | Orbit.store | 30 reales; Gate 7.11 | datos reales read-only | revisión visual final/ficha y backend de edición |
| Cotizador | Orbit.store | prototipo avanzado | backend incompleto | integración productiva parametrizada |
| Comparativo | Orbit.store | v110 como fuente avanzada | backend incompleto | integración productiva parametrizada |
| Cliente 360 | Orbit.store | 430 reales; Gate 7.11 | read-only runtime PASS | revisión visual de candidata actual |
| Pólizas | Orbit.store | 1,373 reales; Gate 7.11 | read-only runtime PASS | revisión visual y writer productivo |
| Cobros | Orbit.store | 5 escrituras controladas | datos parciales conciliados | visualizar; ampliar conciliación desde fuentes vigentes |
| Conciliaciones | Orbit.store | motor multievidencia estático | backend parcial | runtime y writer controlado por casos |
| Renovaciones | Orbit.store | lógica trabajada | backend parcial | contrato, datos y runtime |
| Cancelaciones | Orbit.store | frontend trabajado | backend parcial | contrato, datos y runtime |
| Siniestros | Orbit.store | frontend | migración pendiente | fuentes, backend y runtime |
| Historial | Orbit.store | frontend | backend parcial | eventos durables y runtime |
| Comisiones | Orbit.store | 5 registradas; 3 liquidaciones HOLD | carga parcial controlada | aliases vendedor y visualización |
| Importar | servicio core | arquitectura por fuentes | generalización productiva pendiente | ejecutores protegidos por dominio |
| Calidad | Orbit.store | store compartido | trabajado | smoke integral posterior |
| Plantillas | Orbit.store | frontend | backend parcial | persistencia e integraciones reales |
| Reportes | Orbit.store | export frontend | backend parcial | consultas/export durable |
| IA | Orbit.store | interfaz | proveedor no conectado | backend seguro multi-proveedor |
| Academia | Orbit.store | contenido profundo | durable parcial | progreso/evaluaciones/certificados backend |
| Insights | Orbit.store | store compartido | trabajado | smoke y métricas canónicas |
| Correo | Orbit.store | interfaz | integración no conectada | OAuth/backend y trazabilidad |
| Automatizaciones | Orbit.store | frontend | ejecutor incompleto | backend/eventos reales |
| Notificaciones | Orbit.store | frontend | WhatsApp/backend no conectado | proveedor y auditoría |
| Marketing | Orbit.store | frontend trabajado | backend productivo incompleto | persistencia e integraciones |
| Portal | Orbit.store | frontend | auth externo/backend incompleto | identidad cliente, adjuntos y gestiones |
| Finanzas | Orbit.store | frontend profundo | migración real pendiente | fuentes vigentes y backend por dominio |
| Equipo | Orbit.store | multirol/configuración parcial | onboarding defectuoso identificado | ejecutor protegido + integración UI |
| Configuración | Orbit.store/parcial | frontend | persistencia parcial | eliminar persistencia directa y conectar backend |

Lectura correcta:

```text
31 módulos presentes y trabajados
30 integrados al store compartido
0 módulos demostrados como backend completo por la auditoría estática
22 módulos con brechas de madurez
```

## 9. Evidencia visual recuperada

El artefacto aprobado del Gate 7.11 fue recuperado sin repetir el gate:

```text
13 capturas sanitizadas
Dirección desktop: 5
Operativo tablet: 4
Asesor móvil: 4
```

Incluye Cliente 360, Aseguradoras, Pólizas, Ops y Leads según rol.

Esto permite iniciar revisión humana ahora, sin deploy, reimportación ni nuevo runtime.

## 10. Pruebas source-only

```text
node --check smoke corregido: PASS
node --check contrato onboarding: PASS
node --check reconciliador legacy: PASS
fixtures del contrato onboarding: PASS
JSON contratos/manifiesto: válidos
```

No se ejecutaron credenciales, Firebase Admin, navegador ni producción.

## 11. Carriles

### Carril A — frontend/UX/Academia

- evidencia visual Gate 7.11 recuperada;
- Ops/Leads reclasificados honestamente;
- impacto Academia: onboarding, diferencia asesor/Auth/membership y estados de conciliación.

### Carril B — backend/seguridad

- smoke corregido en su owner;
- roster nominal retirado;
- contrato onboarding genérico y reconciliador dry-run preparados;
- ejecutor protegido no simulado por existir freeze de Functions.

### Carril C — datos A&S

- conteos canónicos preservados;
- no reimportación;
- 2,157 filas CRM y evidencia multifuente reconocidas;
- cinco cobros materializados no se presentan como totalidad de pagos reportados.

## 12. Siguiente acción exacta

Sin pedir otra autorización de deploy ni repetir gates:

```text
1. entregar y revisar las 13 capturas ya existentes;
2. registrar hallazgos visuales por módulo, sin corregir por inferencia;
3. mantener source freeze de producción;
4. cuando se levante expresamente solo el freeze de source en Functions, implementar un único ejecutor genérico protegido;
5. ejecutar el dry-run legacy genérico de los siete registros;
6. construir un gate end-to-end con usuario de prueba reversible;
7. preparar una sola decisión de publicación, no microautorizaciones.
```

Producción, deploy, Rules, Functions, reimportación, main y merge permanecen intactos.

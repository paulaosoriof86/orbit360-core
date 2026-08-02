# SINCRONIZACIÓN CLOUD / CLAUDE / ACADEMIA — LEDGER ACUMULADO

Fecha de corte: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `LEDGER_ACTUALIZADO / NO_ENVIO / NO_DEPLOY / NO_DATOS_REALES`

## 1. Propósito y autoridad

Este documento hereda íntegramente `SINCRONIZACION-CLAUDE-ACUMULADA-20260731.md` y sus IDs `CL-001` a `CL-060`. No borra ni reemplaza esa evidencia. Agrega los patrones y decisiones producidos entre el 31 de julio y el 2 de agosto de 2026 y fija una frontera explícita entre:

1. producto acumulativo que debe salir a producción;
2. capacidades que dependen de Hosting, Cloud o servicios conectados;
3. patrones reutilizables que pueden enviarse a Claude u otro generador;
4. contenido que debe actualizarse en Academia;
5. backend, secretos y datos reales que nunca deben salir en ese paquete.

La prioridad operativa vigente es cerrar una sola candidata acumulativa de `CRM + Ops + Leads` y sus dependencias compartidas. Este ledger no bloquea ese cierre; evita que el conocimiento generado se pierda o se envíe sin clasificación.

## 2. Aclaración de canales

### 2.1 Hosting / Cloud de ejecución

Es el entorno donde se publica o ejecuta la aplicación. Un deploy a Hosting, Functions, Rules, Storage o producción requiere autorización explícita y evidencia previa. Al corte de este documento no se ha ejecutado ningún deploy nuevo asociado al Gate 7.11.

### 2.2 Claude / generación externa

Es el canal para producir candidatas reutilizables de arquitectura, UX, copy, documentación o Academia. No equivale a desplegar la aplicación. Claude recibe solamente un delta sanitizado y nunca obtiene acceso a datos reales, secretos, adaptadores protegidos ni contratos de ejecución internos.

### 2.3 Academia dentro del producto

Academia es un módulo incluido en la candidata acumulativa. Su bootstrap no puede romper el shell, el router, la autenticación ni `Orbit.store`. Sin embargo, completar o regenerar todo su contenido pedagógico no es requisito bloqueante para el release crítico actual de CRM, Ops y Leads. Las lecciones pendientes se documentan aquí y se actualizan mediante el paquete Cloud cuando corresponda.

## 3. Estado verificable del envío

| Canal | Estado al 2026-08-02 | Evidencia / consecuencia |
|---|---|---|
| Hosting LAB posterior al root fix de Academia | `NO_EJECUTADO` | El flujo anterior sirvió el checkout local; `deploy=false` |
| Producción | `NO_EJECUTADO` | Sin autorización productiva consumida |
| Functions / Rules / Storage | `NO_EJECUTADO` | Fuera del alcance del Gate 7.11 |
| Paquete Claude / Cloud reutilizable | `NO_ENVIADO` | Este ledger prepara el próximo delta; no simula envío |
| Datos reales A&S | `NO_ENVIADOS` | Prohibidos en el paquete reutilizable |
| Secretos / credenciales | `NO_ENVIADOS` | Prohibidos en el paquete reutilizable |

No debe volver a usarse una dependencia “pendiente de Cloud” como bloqueo de runtime si esa dependencia todavía no ha sido desplegada y no afecta el shell compartido. En ese caso se clasifica como pendiente documentado, no como defecto del producto publicado.

## 4. Nuevos patrones reutilizables acumulados

| ID | Dominio | Patrón reusable | Clasificación | Estado |
|---|---|---|---|---|
| CL-061 | Gates | Una candidata acumulativa única no obliga a que todos los módulos tengan el mismo peso de bloqueo. El gate debe separar `releaseCriticalBlockingScope` de módulos presentes/no bloqueantes. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-062 | Gates | Academia puede estar presente y con integridad estática obligatoria sin ser prerrequisito runtime de CRM/Ops/Leads. Solo bloquea si rompe bootstrap, shell, router, auth, roles o store compartidos. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-063 | Metodología | Una autorización runtime de un solo uso no debe utilizarse para descubrir dependencias verificables estáticamente. El runtime confirma una candidata preparada; no sustituye el diagnóstico. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-064 | Root cause | Validador que comprueba que un archivo existe, pero no que esté conectado al bootstrap real, tiene cobertura incompleta. Debe validar owner, orden, carga única y disponibilidad runtime. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-065 | Bootstrap | Owners de contenido se cargan una sola vez, en orden determinista, con guard de duplicado y sin listeners que reescriban contenido al cambiar de sesión. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-066 | CRM/Ops/Leads | Ops y Leads comparten el mismo ciclo comercial: Ops es tablero operativo interno; Leads es la proyección comercial. No crear colecciones, cachés ni estados paralelos. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-067 | Roles | Dirección y Operativo validan Ops; Asesor valida Leads y debe recibir restricción honesta al intentar acceder a Ops. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-068 | Visual | La aprobación humana debe ser acumulativa: Clientes aprobado permanece como baseline y se revisan Pólizas, Vehículos, Recibos, Cartera, Cobros, Ops y Leads en el mismo descendiente auditado. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-069 | Cloud | `Cloud pendiente`, `Cloud enviado` y `Cloud desplegado` son estados distintos y obligatorios. La UI y la documentación no pueden presentarlos como equivalentes. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-070 | Control | El paquete externo se produce como delta sanitizado, con inventario de fuentes, archivos permitidos, archivos excluidos, expected diff y gate de retorno. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-071 | Gate 7.11 | El mismo Gate 7.11 incorpora un companion runtime de Ops/Leads; no se crea otro gate de cierre ni otra candidata. | `BACKEND_PROTEGIDO_NO_CLAUDE` para workflow; semántica `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO_SOURCE_ONLY` |
| CL-072 | Academia | Enseñar la diferencia entre `FUNCTIONAL_DEFECT`, `VALIDATOR_STALE`, `PIPELINE_MECHANISM_FAILURE` y pendiente no bloqueante de contenido. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |
| CL-073 | Academia | Incorporar rutas por rol de CRM/Ops/Leads, alcance propio/equipo/todos y restricción de Ops para Asesor. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |
| CL-074 | Academia | Explicar que el paquete Claude no recibe datos A&S, backend protegido, secrets, credenciales ni writers/deploys. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |
| CL-075 | Retiro | El focused runtime de Academia deja de ser prerrequisito del release crítico actual. Su evidencia histórica se conserva; no se borra ni se reutiliza como autorización. | `TEMPORAL_RETIRO` | `RETIRADO_DEL_CAMINO_CRITICO` |

## 5. Inventario del próximo paquete sanitizado

### 5.1 Incluir

- este ledger y el ledger 20260731;
- semántica de candidata acumulativa única con scopes de bloqueo separados;
- patrón owner/bootstrap idempotente de Academia, sin rutas, secretos ni datos reales;
- matriz de roles y comportamiento esperado de CRM/Ops/Leads;
- patrones visuales responsive desktop/tablet/mobile;
- estados honestos: vacío, pendiente, requiere validación, restringido, no enviado, no conectado;
- contratos UX de Póliza, Vehículo, Recibos, Cartera y Cobros heredados;
- requerimientos de Academia CL-072 a CL-074;
- expected diff y lista de owners que no pueden ser reemplazados.

### 5.2 Excluir siempre

Clasificación `BACKEND_PROTEGIDO_NO_CLAUDE` o `SECRETO_DATO_REAL`:

- `data/store.js`, adaptadores `store-firestore-*` y cualquier writer;
- `core/backend-lab-*`, `core/auth.js`, service accounts y web configs privadas;
- `firestore.rules`, Storage Rules, Functions y workflows de deploy;
- requests/lifecycles consumidos y referencias de autorización;
- datos de clientes, pólizas, vehículos, recibos, cartera, cobros, comisiones o documentos reales;
- contactos, cuentas, portales y credenciales reales de aseguradoras;
- identificadores personales, tokens, correos, teléfonos y rutas privadas;
- payloads, snapshots o artifacts que contengan valores de negocio.

### 5.3 Tenant A&S solamente

Clasificación `TENANT_AYS_ONLY`; documentar como necesidad configurable, no replicar valores:

- marca, países, impuestos, monedas y glosario A&S;
- membresías, roles activos/default y scopes específicos;
- directorio real de aseguradoras, contactos y recursos;
- conteos operativos y estado de calidad de la migración;
- usuarios, asignaciones de asesores y reglas temporales de vendedor;
- tarifas, planes, comisiones, integraciones y referencias de credenciales.

## 6. Pendientes de Academia que deben viajar en el paquete

1. Candidata acumulativa versus frontera de bloqueo del release.
2. Diagnóstico de causa raíz antes del retry.
3. Diferencia entre producto defectuoso, validador obsoleto y pipeline defectuoso.
4. CRM/Ops/Leads como ciclo compartido y responsabilidades por rol.
5. Restricción honesta de Ops para Asesor.
6. Importadores por fuente con dry-run, diff, confirmación, auditoría y rollback.
7. Calidad de datos y `REQUIERE_VALIDACION`.
8. Pólizas, Vehículos, Recibos, Cartera y Cobros como contratos distintos.
9. Cloud/Claude: qué se envía, qué se excluye y cómo se audita la candidata de retorno.
10. Gate de producción: evidencia técnica no sustituye aprobación humana.

Estos contenidos pueden quedar pendientes para generación/actualización Cloud sin bloquear el Gate 7.11, siempre que el módulo Academia no produzca error global ni degrade los owners compartidos.

## 7. Gate de despacho Cloud

El paquete se considera listo para envío solo cuando:

- el Gate 7.11 release-critical obtenga PASS estático y runtime read-only;
- exista una única candidata acumulativa para revisión humana;
- el expected diff del paquete esté sellado;
- el paquete no incluya archivos protegidos, secrets o datos reales;
- cada ítem esté clasificado como `REPLICABLE_CLAUDE_INMEDIATO`, `REPLICABLE_CLAUDE_ACUMULADO`, `ACADEMIA_ACTUALIZAR`, `TENANT_AYS_ONLY`, `BACKEND_PROTEGIDO_NO_CLAUDE`, `SECRETO_DATO_REAL` o `TEMPORAL_RETIRO`;
- se defina el gate de retorno que auditará la candidata por delta.

El envío Cloud no es requisito previo para visualizar ni aprobar CRM/Ops/Leads. Después del PASS y la revisión humana puede ejecutarse en paralelo con la preparación de go-live, sin tocar la candidata aceptada hasta que el delta de retorno sea auditado.

## 8. Gate de retorno de candidata externa

Toda respuesta de Claude u otro generador se trata como propuesta no confiable hasta verificar:

```text
BASELINE_HEAD_EXACTO
EXPECTED_DIFF_ONLY
NO_PROTECTED_FILES
NO_REAL_DATA
NO_SECRETS
NO_OWNER_REPLACEMENT
NO_PARALLEL_STORE
NO_ROUTER_REGRESSION
NO_ROLE_SCOPE_EXPANSION
NO_ACADEMIA_PROGRESS_RESET
NO_TECHNICAL_COPY
NO_RESPONSIVE_REGRESSION
NO_POLICY_VEHICLE_MODAL_REGRESSION
CRM_OPS_LEADS_SHARED_CYCLE_PRESERVED
```

El empalme es selectivo. Nunca se reemplaza la candidata acumulativa completa por el resultado externo.

## 9. Siguiente acción exacta

1. cerrar estáticamente la revisión 7.11.1 del alcance release-critical;
2. ejecutar una sola vez el runtime read-only acumulativo de CRM/Ops/Leads cuando exista autorización de riesgo válida;
3. entregar una única visualización acumulativa para aprobación humana;
4. preparar un único macro de go-live con backup, rollback, deploy y smoke, sujeto a autorización productiva explícita;
5. despachar el paquete Cloud sanitizado cuando cumpla el gate de la sección 7, sin convertirlo en bloqueo artificial del release.

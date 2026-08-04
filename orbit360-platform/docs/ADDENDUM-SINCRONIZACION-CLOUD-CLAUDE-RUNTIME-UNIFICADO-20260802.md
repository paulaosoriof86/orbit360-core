# ADDENDUM — SINCRONIZACIÓN CLOUD / CLAUDE / RUNTIME UNIFICADO

Fecha: 2026-08-03  
Documento padre: `SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`  
Estado: `ACUMULADO / NO_ENVIADO / NO_DEPLOY`

Este addendum no sustituye el ledger acumulado. Agrega los patrones derivados del cierre del paquete runtime crítico CRM/Ops/Leads, del shell móvil compartido y del predeploy de Gravicentra Insurance RC1.

## Ítems acumulados

| ID | Dominio | Patrón reusable | Clasificación | Estado |
|---|---|---|---|---|
| CL-076 | Runtime | Los módulos acumulativos relacionados deben validarse dentro de una sola sesión de navegador, con la misma identidad, el mismo checkout, un solo legal y un solo write guard. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-077 | Validadores | Una aserción estática debe distinguir la definición de una función de su invocación. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-078 | Evidencia | La revisión acumulativa debe generar una matriz fija rol × viewport × ruta y declarar el número esperado de capturas sanitizadas. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-079 | Seguridad | El readiness del paquete runtime se valida con templates inertes y cero capacidades de riesgo. | mecanismo `BACKEND_PROTEGIDO_NO_CLAUDE`; semántica `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO_SOURCE_ONLY` |
| CL-080 | Academia | Enseñar que un módulo presente puede ser no bloqueante si no rompe owners compartidos, seguridad, datos o escrituras. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |
| CL-081 | Pipeline | Toda ruta temporal calculada por un workflow debe exportarse antes de invocar el helper que la consume. | `REPLICABLE_CLAUDE_ACUMULADO` | `PENDIENTE_ENVIO` |
| CL-082 | Validadores | El readiness debe comprobar la unión productor–consumidor y no solo la existencia aislada de archivos. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO_SOURCE_ONLY` |
| CL-083 | Causa raíz | La evidencia del helper prevalece para distinguir identidad válida de un fallo posterior del pipeline. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |
| CL-084 | Seguridad | Un bridge no debe almacenar metadata, wrappers ni estados auxiliares dentro de owners publicados como `Object.freeze`. Debe utilizar un registro externo, por ejemplo `WeakMap`. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO` |
| CL-085 | Seguridad | Un owner inmutable que ya implementa su propia barrera read-only debe declararse `self_guarded_readonly`; cualquier owner inmutable no reconocido debe quedar en estado bloqueante `immutable_unwrapped`. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO` |
| CL-086 | Validadores | El gate debe verificar el registro externo de guards en runtime: cero `immutable_unwrapped` y modo esperado por owner protegido. | mecanismo `BACKEND_PROTEGIDO_NO_CLAUDE`; criterio `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO` |
| CL-087 | Evidencia | La cardinalidad de capturas debe derivarse de la matriz ejecutable, no mantenerse como número manual separado. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO` |
| CL-088 | Diagnóstico | Todo `pageerror` debe registrar etapa, rol, ruta, etiqueta y stack sanitizado para ubicar el owner real sin repetir el runtime. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO` |
| CL-089 | Academia | Incluir la diferencia entre defecto funcional, `SECURITY_FAILURE`, `VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE`, usando el caso de un bridge que intenta mutar un owner congelado. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |
| CL-090 | Validadores | Un sello de manifest es un consumidor contractual. Cada cambio autorizado de producto debe actualizar conjuntamente el manifest canónico y todos los sellos que lo comparan. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO` |
| CL-091 | Causa raíz | Un fallo `CUMULATIVE_VISUAL_DRIFT` no prueba drift de datos si el expected seal pertenece a una candidata anterior. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |
| CL-092 | Evidencia | Todo validador que puede cerrar con código distinto de cero debe escribir y publicar evidencia sanitizada antes de terminar. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO` |
| CL-093 | Gates | Ante `STOP_RETRY`, el cierre debe incluir causa raíz, owner, solución, evidencia y frontera siguiente. | `ACADEMIA_ACTUALIZAR` y `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO_EN_LIFECYCLE` |
| CL-094 | Shell responsive | Cuando el chrome móvil pasa de una a varias filas, la altura debe existir como un único token consumido por topbar, shell, sidebar y overlay. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-095 | Arquitectura | Un defecto visual repetido en varios módulos debe corregirse en el owner compartido y no mediante parches dentro de cada módulo o tenant. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-096 | Multi-tenant | Los fixes del primer tenant solo son aceptables para el core cuando son tenant-neutral, configurables y heredables por módulos y tenants futuros. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-097 | Academia | Enseñar a diferenciar defecto funcional compartido de defecto de módulo, validador obsoleto, falla de datos y falla de seguridad. | `ACADEMIA_ACTUALIZAR` | `DOCUMENTADO / PENDIENTE_ENVIO` |
| CL-098 | Gates | Un gate cerrado y su siguiente predeploy son contratos distintos; una autorización runtime consumida no debe seguir siendo la fuente activa del predeploy. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-099 | Registro | El entrypoint, lifecycle, engine, request, workflow, manifest y documentación deben promoverse juntos al cambiar de frontera. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-100 | Academia | Diferenciar evidencia PASS, registro activo, autorización consumida y nueva autorización de frontera. | `ACADEMIA_ACTUALIZAR` | `DOCUMENTADO / PENDIENTE_ENVIO` |
| CL-101 | Release | Una candidata sellada debe tener un contrato propio con commit, baseline y delta permitido; no depender de sellos históricos implícitos. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-102 | Seguridad | El contrato estático debe probar capacidades futuras sin leer secretos ni datos. | mecanismo `BACKEND_PROTEGIDO_NO_CLAUDE`; criterio `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO` |
| CL-103 | Multi-tenant | El predeploy reutilizable valida configuración y contratos, no hardcodes del primer tenant. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-104 | Evidencia | Un `NO_GO` de mecanismo no invalida la candidata ni los conteos previamente sellados si el STOP ocurre antes de capacidades. | `ACADEMIA_ACTUALIZAR` | `DOCUMENTADO / PENDIENTE_ENVIO` |
| CL-105 | Continuidad | Tras un root fix de validador, la frontera debe ser una sola ejecución nueva; no repetir gates cerrados. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-106 | APIs | Los métodos REST con resource name jerárquico deben construir el nombre completo (`projects/{project}/sites/{site}`), no inferir que todos los recursos usan la ruta corta. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-107 | Diagnóstico | Si `projects.sites.get` falla pero `sites.releases.list`, el sitio público y las anclas de rollback responden, clasificar primero el endpoint del probe antes de declarar `ENVIRONMENT_FAILURE`. | `ACADEMIA_ACTUALIZAR` | `DOCUMENTADO / PENDIENTE_ENVIO` |
| CL-108 | Gates | Un falso `GO_LIMITED_SCOPE` causado por el validador no obliga a repetir lecturas de producto ya completas; se corrige el owner y se preserva la evidencia obtenida. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-109 | Release | El paso a deploy debe basarse en candidata completa, datos completos, sitio alcanzable, releases observables y rollback exacto; la versión pública puede diferir precisamente porque el deploy aún no ocurrió. | `REPLICABLE_CLAUDE_ACUMULADO` | `DOCUMENTADO / PENDIENTE_ENVIO` |

## Evidencia vigente

```text
Gate 7.11 acumulativo:
run 30816576914
artifact 8857032288
status GATE711_RELEASE_CRITICAL_RUNTIME_PASS

RC1:
release commit 27cb7dfcda8568280ebef15993a953364304f29b
fix shell móvil 12a52de72f541cf39aae3556fd52a2d444d57b17

predeploy read-only:
run 30870375543
artifact 8877668933
sha256:f1a4d93b803c28b004612788631395e34b571064329a8428a6e24f595901274d
formal decision GO_LIMITED_SCOPE
candidateComplete true
dataComplete true
publicReachable true
exactRollbackAnchorAvailable true

root fix endpoint Hosting:
commit 534cd25038b15cd9cc73875183c9aa66f8a5a4d5
static run 30870532357
artifact 8877714836
sha256:5b9e038cc7faaacd0e95a128ce63e2a81bef37b779c12cd4430305d34793ff13
status PASS
```

## Exclusiones obligatorias del paquete externo

No se envían:

- service accounts, custom tokens o configuración Firebase local;
- UID, correos, membresías, documentos o datos reales;
- nombres de secrets;
- lifecycle o requests con autorización activa;
- workflows operativos o capaces de ejecutar deploy;
- backend protegido, writers o adaptadores Firestore;
- IDs de proyecto, nombres de releases o evidencia no sanitizada.

## Estado Cloud

```text
paquete enviado: no
Hosting desplegado: no
Functions/Rules/Storage desplegados: no
producción: no
datos reales enviados: no
secretos enviados: no
```

CL-076 a CL-109 viajarán en el próximo delta sanitizado. El envío Cloud/Claude no bloquea el deploy de A&S, pero su estado debe permanecer visible hasta existir evidencia real de recepción e incorporación en el prototipo comercializable.

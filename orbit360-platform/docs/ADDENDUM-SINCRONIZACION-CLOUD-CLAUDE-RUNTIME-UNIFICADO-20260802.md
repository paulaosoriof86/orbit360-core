# ADDENDUM — SINCRONIZACIÓN CLOUD / CLAUDE / RUNTIME UNIFICADO

Fecha: 2026-08-03  
Documento padre: `SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`  
Estado: `ACUMULADO / NO_ENVIADO / NO_DEPLOY`

Este addendum no sustituye el ledger acumulado. Agrega los patrones derivados del cierre del paquete runtime crítico CRM/Ops/Leads.

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
| CL-090 | Validadores | Un sello de manifest es un consumidor contractual. Cada cambio autorizado de producto debe actualizar conjuntamente el manifest canónico y todos los sellos que lo comparan; actualizar solo el contrato principal deja validadores obsoletos. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO` |
| CL-091 | Causa raíz | Un fallo `CUMULATIVE_VISUAL_DRIFT` no prueba drift de datos si el expected seal pertenece a una candidata anterior. Antes de tocar datos debe compararse la revisión, fuente y digest del sello con la candidata autorizada. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |
| CL-092 | Evidencia | Todo validador que puede cerrar con código distinto de cero debe escribir y publicar evidencia sanitizada antes de terminar; el artefacto no puede depender únicamente de una copia posterior al PASS. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO` |
| CL-093 | Gates | Ante `STOP_RETRY`, el cierre debe incluir causa raíz, owner, solución, evidencia y frontera siguiente. Informar solo la etapa fallida no cumple el contrato de causa raíz. | `ACADEMIA_ACTUALIZAR` y `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO_EN_LIFECYCLE` |

## Evidencia vigente

```text
root fix seguridad:
run 30775623141
artifact 8841926663
sha256:ce683b51b0b0ff05bf11b5028d04e6ef8727cfc23c2ba797a8e9718e837d3904
productHead 267f7231b46d65b80c167f54567a67503b6a6793

manifest post-rootfix:
run 30775729377
artifact 8841965500
sha256:1c2ae7576d058f6d7c72aae95e8c5122efde217293d2c2f04d7e2167bbe09aa4

paquete sellado:
commit ef0664335bd3085dc7b21b4988f408fed1ac4145

readiness estable post-rootfix:
run 30776380035
artifact 8842172646
sha256:5b8fd7acfcafabf25538f34288a241472065855dacf69c18b8bb4748a30147cb
49/49 PASS

runtime detenido en snapshot inicial:
run 30814564387
job 91689019904
artifact 8856180726
sha256:c3384a1375eb8b311c6c47055020f2ca4d9666f8be87a554439c8f2fe9533d1f
classification VALIDATOR_STALE
rootCause VISUAL_SEAL_PRE_ROOTFIX

correctivo de sello y observabilidad:
run 30814915626
job 91690157955
artifact 8856299679
sha256:3bbeb8af22f0b2ca1d8630735b4169f267249cf92d8b2d3a989308d754751641
commit a9549f3487522a3e450742de2649b5ad41f3b1e9
PASS
```

Cierres preservados:

```text
release-critical static: 38/38
runtime package readiness: 38/38
runtime chain: 56/56
router compatibility: 12/12
```

## Exclusiones obligatorias del paquete externo

No se envían:

- service accounts, custom tokens o configuración Firebase local;
- UID, correos, membresías, documentos o datos reales;
- nombres de secrets;
- lifecycle o request con autorización activa;
- workflows operativos o capaces de ejecutar deploy;
- backend protegido, writers o adaptadores Firestore;
- rutas internas, IDs de proyecto o evidencia no sanitizada.

El delta externo describirá CL-084 a CL-093 como arquitectura y criterio reusable. No incluirá código operativo, owners A&S ni identificadores sensibles del runtime.

## Estado Cloud

```text
paquete enviado: no
Hosting desplegado: no
Functions/Rules/Storage desplegados: no
producción: no
datos reales enviados: no
secretos enviados: no
```

CL-076 a CL-093 viajarán en el próximo delta sanitizado junto con CL-001 a CL-075. El envío Cloud/Claude no bloquea la ejecución ni la visualización del release crítico CRM/Ops/Leads.

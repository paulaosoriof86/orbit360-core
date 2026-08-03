# ADDENDUM — SINCRONIZACIÓN CLOUD / CLAUDE / RUNTIME UNIFICADO

Fecha: 2026-08-02  
Documento padre: `SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md`  
Estado: `ACUMULADO / NO_ENVIADO / NO_DEPLOY`

Este addendum no sustituye el ledger acumulado. Agrega los patrones derivados del cierre del paquete runtime crítico CRM/Ops/Leads.

## Nuevos ítems

| ID | Dominio | Patrón reusable | Clasificación | Estado |
|---|---|---|---|---|
| CL-076 | Runtime | Los módulos acumulativos relacionados deben validarse dentro de una sola sesión de navegador, con la misma identidad, el mismo checkout, un solo legal y un solo write guard. Dividirlos en sesiones independientes aumenta estados intermedios y fragmenta la evidencia. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-077 | Validadores | Una aserción estática debe distinguir la definición de una función de su invocación. Contar cadenas literales completas puede producir falsos duplicados y clasificaciones defectuosas. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-078 | Evidencia | La revisión acumulativa debe generar una matriz fija rol × viewport × ruta y declarar el número esperado de capturas sanitizadas antes de ejecutar. | `REPLICABLE_CLAUDE_INMEDIATO` | `PENDIENTE_ENVIO` |
| CL-079 | Seguridad | El readiness del paquete runtime se valida con templates inertes: autorización desactivada, cero credenciales, cero Firestore, cero navegador, cero deploy y cero producción. | `BACKEND_PROTEGIDO_NO_CLAUDE` para el mecanismo; semántica `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO_SOURCE_ONLY` |
| CL-080 | Academia | Enseñar que una candidata acumulativa puede contener módulos no bloqueantes; el gate de release debe bloquear únicamente por regresión compartida o incumplimiento del alcance crítico. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |
| CL-081 | Pipeline | Toda ruta temporal calculada por un workflow debe exportarse antes de invocar el helper que la consume. Una variable local de shell no satisface un contrato basado en `process.env`. | `REPLICABLE_CLAUDE_ACUMULADO` | `PENDIENTE_ENVIO` |
| CL-082 | Validadores | El readiness debe comprobar la unión entre productor y consumidor, no solo que ambos archivos existan. Para identidad efímera debe validar exportación previa y confirmaciones `explicitTokenPathHonored` / `explicitConfigPathHonored`. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO_SOURCE_ONLY` |
| CL-083 | Causa raíz | Una identidad puede estar correctamente creada aunque el step falle después por una comprobación de ruta. La evidencia del helper prevalece para clasificar `PIPELINE_MECHANISM_FAILURE` y evitar corregir Auth, membresías o datos sin causa. | `ACADEMIA_ACTUALIZAR` | `PENDIENTE_ENVIO` |

## Evidencia de incorporación

```text
release-critical static:
run 30771933766 · 38/38 PASS

runtime package readiness inicial:
run 30772261072 · 38/38 PASS
artifact 8840893567
sha256:279ca4a885e9c35c7e263f958da7d43cfed8ef590ff40a8630fc280a8cc1cbab

compatibilidad lifecycle-router:
run 30772843811 · 12/12 PASS
artifact 8841072752
sha256:770f3127b280fbf6b95725df38b1bf65c7c444825fa631dc00d0b3e9dd454537

readiness con contrato de rutas efímeras:
run 30774296503 · 38/38 PASS
artifact 8841489287
sha256:ec4a75a9ec951306279c31b5d09d1545b11dae76b578c0dcd3d69bd11c26cc03
```

## Exclusiones obligatorias del paquete externo

No se envían:

- service accounts;
- custom tokens;
- configuración Firebase local generada;
- UID, correos o membresías reales;
- nombres de secrets;
- lifecycle o request con autorización activa;
- workflows capaces de ejecutar deploy;
- backend protegido o writers.

La versión sanitizada de CL-081 a CL-083 debe describir el patrón general de contrato entre variables de entorno, helpers y validadores, sin rutas, identidades o credenciales reales.

## Estado Cloud

```text
paquete enviado: no
Hosting desplegado: no
Functions/Rules/Storage desplegados: no
producción: no
datos reales enviados: no
secretos enviados: no
```

CL-076 a CL-083 deberán viajar en el próximo delta sanitizado junto con CL-001 a CL-075. No deben convertirse en un prerrequisito para ejecutar ni visualizar el release crítico CRM/Ops/Leads.

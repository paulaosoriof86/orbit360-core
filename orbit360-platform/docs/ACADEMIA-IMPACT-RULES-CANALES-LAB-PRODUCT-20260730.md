# ACADEMIA — RULES GLOBALES VS CANALES DE HOSTING

Fecha operativa: 2026-07-30

## Lección transversal

Un canal preview de Firebase Hosting puede tener archivos web distintos, pero no tiene un Firestore independiente. Las Firestore Rules pertenecen al proyecto/base de datos y afectan a todos los canales de Hosting que consumen ese mismo proyecto.

Por eso un despliegue correcto de frontend LAB puede perder acceso a datos si posteriormente el mismo proyecto recibe Rules diseñadas para otra ruta de datos.

## Patrón aprendido

Antes de validar visualmente un módulo debe comprobarse la compatibilidad completa:

`Hosting publicado → entrypoint runtime → Auth → membership → ruta Firestore real → Rules vigentes → Orbit.store/read-model → UI`

Paridad de archivos Hosting no demuestra por sí sola que Firestore sea legible. Tampoco una URL de Hosting correcta demuestra que el runtime haya entrado en el modo backend esperado: los validadores deben usar el **entrypoint contractual completo**, incluidos parámetros de activación cuando el owner los exige.

## Diferencia de clasificación

- archivos correctos + login correcto + listeners adjuntos + `permission-denied` → `SECURITY_FAILURE`;
- validador que entra por una URL distinta del contrato runtime o exige campos que el gate no emite → `VALIDATOR_STALE`;
- listener no adjunto por un defecto del lifecycle del owner → `FUNCTIONAL_DEFECT`;
- guard/workflow que bloquea por evidencia runtime, cola/disparo o herramienta incompatible → `PIPELINE_MECHANISM_FAILURE`;
- datos inexistentes en destino correcto → `DATA_CONTRACT_FAILURE`.

## Caso reusable: lifecycle idempotente

Un owner que separa `wrap` y `attach` debe aceptar que `attach` ocurra después de que el wrapper ya haya sido instalado. “Ya está envuelto” no es un error; es un estado válido del lifecycle.

Patrón correcto:

```text
si ya está envuelto → éxito idempotente
si el owner todavía no existe → esperar/fallar cerrado
si existe y no está envuelto → envolver una vez
luego adjuntar listeners/snapshots
```

Este contrato debe probarse con una secuencia sintética que reproduzca el orden real de Auth/bootstrap, no únicamente buscando strings en el archivo.

## STOP_RETRY y diagnóstico

Si una misma prueba visual termina dos veces en la misma etapa, no corresponde aumentar timeout ni volver a ejecutar. Se debe congelar el cierre y capturar estado observable:

- conteos por colección;
- estado del store owner;
- listeners adjuntos;
- errores de snapshots;
- estado del read-model suplementario;
- modo/tenant/runtime efectivo.

En Recibos/Cartera este diagnóstico permitió separar tres causas distintas que producían el mismo síntoma visual “0 datos”:

1. Rules globales incompatibles → `SECURITY_FAILURE`;
2. entrypoint incorrecto del validador → `VALIDATOR_STALE`;
3. proyección cargada pero sin attach por wrapper no idempotente → `FUNCTIONAL_DEFECT`.

## Hidratación PASS no equivale a visual multirol PASS

Después de publicar el lifecycle corregido, el browser confirmó exactamente 430 clientes, 30 aseguradoras, 7 asesores, 1,373 pólizas, 1,032 vehículos, 1,293 recibos esperados y 673 registros de cartera, con la proyección `ready:true` y ambos snapshots adjuntos.

Eso cierra la cadena de datos y read-model, pero no permite declarar por inferencia que cada transición de rol haya renderizado correctamente la vista lista. Una prueba multirol debe distinguir:

```text
rol efectivo
→ permiso cliente360
→ hash/ruta efectiva
→ renderer despachado
→ excepción de render (si existe)
→ DOM esperado/estado visible
```

Si falla el último selector DOM, no se debe volver a tocar datos, Rules ni Hosting. Primero se determina si el renderer falló realmente (`FUNCTIONAL_DEFECT`) o si el selector/condición de espera quedó desalineado con el lifecycle (`VALIDATOR_STALE`).

## Pipeline de diagnóstico también tiene lifecycle

Un diagnóstico read-only puede fallar antes de ejecutar navegador por un problema de disparo/cola/workflow. Ese caso es `PIPELINE_MECHANISM_FAILURE` y no debe contaminar el estado del producto. Después de dos fallos del mismo mecanismo, se aplica STOP_RETRY y se reutiliza un runner probado o se corrige el mecanismo de forma aislada antes de seguir.

## Regla de mínimo privilegio

Una compatibilidad temporal nunca debe abrir una ruta legacy completa. Debe limitar simultáneamente identidad/tenant, colecciones y operaciones; debe conservar deny-all para recursos sensibles y tener retiro planificado.

Para este caso, la compatibilidad probada permite únicamente lectura del usuario técnico LAB A&S sobre ocho colecciones operativas y mantiene bloqueadas escrituras, otras memberships y recursos sensibles.

## Reuso

Clasificación:

- concepto de canales Hosting vs Rules globales: `REPLICABLE_CLAUDE_ACUMULADO`;
- entrypoint contractual de validadores: `REPLICABLE_CLAUDE_ACUMULADO`;
- lifecycle idempotente de wrappers/adapters: `REPLICABLE_CLAUDE_ACUMULADO`;
- pruebas sintéticas de orden Auth/bootstrap: `REPLICABLE_CLAUDE_ACUMULADO`;
- separación hidratación vs validación visual multirol: `REPLICABLE_CLAUDE_ACUMULADO`;
- STOP_RETRY aplicado al pipeline diagnóstico: `REPLICABLE_CLAUDE_ACUMULADO`;
- pruebas de mínimo privilegio en emulador: `REPLICABLE_CLAUDE_ACUMULADO`;
- identidad técnica, rutas reales, reglas concretas y proyecto A&S: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- puente de compatibilidad legacy: `TEMPORAL_RETIRO`.

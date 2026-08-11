# Academia Orbit 360 — Validadores late-ready y causa raíz — 2026-08-11

## Objetivo
Enseñar por qué un timeout del validador no equivale automáticamente a un defecto funcional y cómo Orbit 360 debe distinguir un producto realmente incorrecto de una observación tardía del harness.

## Caso Block 1
En el runtime `31517840174`, el rootfix Firebase default-app-ready fue satisfactorio para los tres perfiles. Dirección completó la matriz. Operativo mostró un caso en el que Cliente360 ya tenía ruta, parámetro y DOM correctos cuando se tomó el estado posterior al timeout. Asesor llegó a Auth pero el validador de Router terminó por timeout sin registrar el estado posterior.

## Conceptos
### 1. Timeout
Significa que una condición no fue observada dentro de una ventana. No demuestra por sí solo que el producto esté roto.

### 2. Late-ready canónico
Si inmediatamente después del timeout el owner canónico muestra el estado correcto, el validador debe recuperar el resultado como PASS tardío y registrar que ocurrió fuera de la ventana original.

### 3. VALIDATOR_STALE
Aplica cuando la regla, el momento o el mecanismo de observación del validador ya no representa correctamente el estado real del producto.

### 4. FUNCTIONAL_DEFECT
Solo debe declararse cuando el snapshot post-timeout demuestra un incumplimiento real del owner funcional: por ejemplo, Router ausente, ruta incorrecta, hidratación no lista, loading persistente, parámetro de cliente equivocado o DOM obligatorio ausente.

### 5. PIPELINE_MECHANISM_FAILURE
Aplica cuando la infraestructura de prueba no recoge la evidencia necesaria para distinguir correctamente entre un estado tardío válido y un defecto real.

## Patrón reusable
`esperar -> timeout -> snapshot canónico -> revalidar -> recuperar late-ready o fallar por owner específico`

Nunca:
`esperar -> timeout -> FUNCTIONAL_DEFECT automático`

## Aplicación por rol
- Dirección: la matriz debe validar Inicio, Cliente360 y Aseguradoras con owners reales.
- Operativo: una ficha tardía pero canónicamente completa no debe crear un bloqueo artificial.
- Asesor móvil: Router/Inicio deben quedar listos antes de evaluar burger/menú. Ante timeout se captura primero Router, ruta, hidratación, loading, Auth, membership y host.

## Cliente360
Una navegación de ficha se considera canónica solo cuando la ruta es `cliente360`, el parámetro corresponde al cliente esperado y el DOM necesario está presente. Si esas condiciones aparecen justo después del timeout, se registra recuperación tardía. Un parámetro incorrecto sigue bloqueándose.

## Seguridad y gates
El diagnóstico del validador no autoriza:
- writes,
- reimportaciones,
- cambios de membresía,
- cambios en pólizas/cobros,
- deploy productivo.

Antes de cualquier runtime siguen siendo obligatorios el gate canónico y la autorización one-shot correspondiente.

## Diferencia metodológica clave
La causa raíz debe explicar por qué ocurrió el bloqueo y quién es el owner real. Corregir solo el mensaje del error o ampliar arbitrariamente el timeout no es causa raíz. El control correcto conserva el fail-closed pero evita falsos fallos.

## Clasificación de reutilización
- `ACADEMIA_ACTUALIZAR`: incorporar este patrón a formación de gates, seguridad y diagnóstico.
- `REPLICABLE_CLAUDE_ACUMULADO`: usar el patrón de snapshot post-timeout + recuperación canónica + fallo owner-specific en validadores reutilizables.

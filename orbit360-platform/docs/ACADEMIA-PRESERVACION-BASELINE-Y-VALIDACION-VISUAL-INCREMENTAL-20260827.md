# Academia — Preservación de baseline y validación visual incremental

Fecha: 2026-08-27

## Objetivo

Enseñar a cada rol a distinguir entre un módulo ya trabajado que no se está visualizando correctamente y un módulo realmente no construido.

## Principio

En Orbit 360 un problema de visualización no equivale a pérdida de funcionalidad. Antes de modificar producto se compara contra la baseline certificada y se identifica la primera capa divergente.

### Secuencia correcta

1. Baseline certificada preservada.
2. Owner/contrato vigente preservado.
3. Identidad, rol, scope y país coherentes.
4. Store/hidratación/readiness coherentes.
5. Render y wiring coherentes.
6. Validación visual diferencial.
7. Solo entonces, si existe contradicción reproducible, corregir la capa causal.

### Secuencia incorrecta

`No lo veo → reimportar → reescribir módulo → crear otro owner → ampliar timeout → repetir gate`.

Ese patrón produce regresiones y desincronización.

## Estados que deben distinguirse

- `PASS_PRESERVED_SOURCE`: el producto aprobado sigue presente en source/baseline.
- `LIVE_VISUAL_PENDING`: todavía no se ha comprobado la sesión humana actual.
- `PASS_PRESERVED`: source y visualización actual coinciden.
- `VALIDATOR_STALE`: la prueba no verifica el comportamiento real exigido.
- `FUNCTIONAL_DEFECT`: el comportamiento contemporáneo contradice el contrato funcional.
- `DATA_CONTRACT_FAILURE`: los datos/relaciones contemporáneos contradicen su contrato.
- `ENVIRONMENT_FAILURE`: autenticación, proveedor, hosting o entorno impide demostrar el comportamiento.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo permite drift, replay, ownership ambiguo o evidencia no causal.

## Roles

### Dirección

Debe comprender que “ver todo” depende de rol activo + scope + país + owner, pero un filtro o gate no puede ocultar silenciosamente una cartera que el contrato le permite ver.

### Operativo

Debe validar que las superficies operativas conservan las mismas funciones aprobadas y que las diferencias de scope son honestas, no pérdida de datos.

### Asesor

Debe ver únicamente clientes y relaciones dentro de su alcance. Una relación vacía legítima debe mostrarse como vacía; no debe sustituirse por datos ajenos para hacer pasar una prueba.

## Regla de validación

No basta comprobar que existe una tabla, una tarjeta o una fila. El gate debe validar contenido útil contra el universo esperado por rol/scope. Una fila de estado vacío no es evidencia de que la cartera se esté mostrando.

## Aseguradoras

El owner final `20260723.2` prevalece sobre bridges legacy. Usuario y cuenta bancaria son datos operativos según permisos; contraseña es secreto. El guard específico impide perder esa semántica.

## Cliente 360

El caso post-go-live demuestra por qué una prueba superficial es peligrosa: el smoke histórico registró `storeCount=430` y `rowCount=1`, pero su criterio solo exigía `rowCount>0`. La nueva validación debe diferenciar una fila real de una fila de “Sin resultados” y comparar DOM contra `Orbit.access.filter(...)`, rol, scope, advisorId, países y diagnósticos de render.

## Regla transversal

La baseline certificada se conserva hasta que un cambio funcional intencional produzca una nueva candidata, evidencia causal y aceptación explícita. No existe actualización silenciosa de baseline.

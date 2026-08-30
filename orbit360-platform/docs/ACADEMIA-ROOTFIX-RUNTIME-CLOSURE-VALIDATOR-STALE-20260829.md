# Orbit Academia · Rootfix, package closure y Validator Stale · 2026-08-29

## Clasificación

`ACADEMIA_ACTUALIZAR`

Fuente curricular segura para incorporar a Orbit Academia sin crear un nuevo delta de producto dentro del cierre source-only actual.

## Objetivo de aprendizaje

Al terminar esta lección, Dirección, Operativo y responsables técnicos deben distinguir cuándo una falla pertenece al producto y cuándo pertenece al mecanismo que valida o compone la versión servida.

## 1. No toda falla visible es un defecto funcional

Antes de corregir un módulo se clasifica el problema.

### FUNCTIONAL_DEFECT

La versión vigente y realmente servida incumple su contrato funcional. Ejemplo: el owner correcto está cargado, recibe el dato correcto y aun así no permite la acción definida.

### VALIDATOR_STALE

El producto vigente cumple el contrato actual, pero una prueba sigue esperando una versión, nombre de función, literal, estado o supuesto histórico. En este caso no se repara el módulo para satisfacer el test antiguo: se congela producto/datos y se actualiza el validador, registro y workflow relacionados.

### PIPELINE_MECHANISM_FAILURE

La cadena de aceptación/composición/publicación permite que se pierda el binding de una versión aprobada, que aparezcan dos autoridades o que un error sea reducido sin su causa exacta.

## 2. Archivo existente no significa capacidad servida

La Academia debe enseñar esta secuencia:

`repository existence != runtime reachability != operational eligibility != runtime proof`

Que un archivo exista en GitHub no demuestra que el navegador lo cargue. Que el navegador pueda alcanzarlo no demuestra que sea el owner final. Que sea el owner final no demuestra que el usuario haya visto la capacidad en runtime.

## 3. Baseline + overlay aceptado + package closure

Orbit 360 conserva un baseline certificado y permite overlays explícitamente aceptados.

Un overlay aceptado:

- debe estar ligado a una candidata y a evidencia exacta;
- solo puede reemplazar miembros del package closure autorizado;
- no puede crear silenciosamente un nuevo owner fuera del paquete;
- debe conservar trazabilidad antes/después;
- no equivale a deploy automático.

El package closure define qué componentes son obligatorios para la capacidad aprobada. En el cierre del 29 de agosto de 2026 se verificaron seis capacidades de paquete: Aseguradoras, Cliente 360, Pólizas, Cobros, Ops y Leads.

## 4. Source PASS no equivale a Runtime PASS

Tres niveles deben mantenerse separados:

1. **Source/contract PASS:** código y contratos son coherentes.
2. **Package/lineage PASS:** la autoridad vigente forma parte del paquete y su lineage está alineado.
3. **Runtime proof PASS:** el host servido, sesión, roles, store y UI demuestran la capacidad en una ejecución real.

Por eso un gate source-only no debe cerrar un defecto visible.

## 5. Regla stop-retry

Si una etapa o código falla dos veces, no se crea otro parche ni se salta a otro módulo. Se detienen reintentos y se identifica la causa raíz del gate/pipeline.

Los consumidores vinculados deben evolucionar juntos:

`owner + registry + validator + workflow + frozen baseline + docs + Academia`

## 6. No reimportar para corregir composición

Una falla de visualización, acceso, cache, proyección, owner, entrypoint o package closure no autoriza reimportación de Clientes o Aseguradoras.

La reimportación solo corresponde cuando existe una causa de datos demostrada y la fuente/carril de migración la autoriza.

## 7. Caso Aseguradoras 2026-08-29

La solución no fue recuperar OP2 como segunda autoridad. Se confirmó que la arquitectura actual ya tiene un owner canónico. La capacidad aprobada se consolidó dentro de ese owner en versión `20260829.1`.

Para roles autorizados:

- la contraseña permanece oculta por defecto;
- puede resolverse temporalmente desde un campo operacional existente permitido;
- el provider seguro se conserva como fallback;
- no se registra el secreto en logs/evidencia/Academia;
- no se reimportan aseguradoras para resolver el reveal.

## 8. Caso Cliente 360

Un validador obsoleto buscaba literales históricos y confundía una implementación vigente con una regresión. La corrección fue validar la semántica actual del wrapper de `Orbit.store`, la colección `clientes`, el estado vacío, el refresh reactivo y la hidratación, sin obligar al producto a recuperar nombres de funciones antiguos.

## 9. Caso Login

La validación vigente debe seguir al owner real de autenticación y sus esperas acotadas. No debe exigir una función antigua del router si el control actual está en Auth.

La latencia sigue siendo un blocker runtime: source PASS solo demuestra que existe el camino y que sus límites están definidos; la experiencia humana debe medirse en vivo.

## 10. Preguntas de comprobación

1. Si un archivo correcto existe en GitHub pero no está en el package closure, ¿puede declararse runtime PASS? **No.**
2. Si un validador exige un literal que ya no forma parte del contrato vigente, ¿debe reescribirse el producto para recuperar ese literal? **No; primero se clasifica como posible VALIDATOR_STALE.**
3. ¿Un source-only PASS autoriza cerrar un problema visual? **No.**
4. ¿Una falla de package closure autoriza reimportar Clientes o Aseguradoras? **No.**
5. ¿Puede existir un overlay aceptado sin trazabilidad exacta de candidata y digests? **No.**
6. Si la misma etapa falla dos veces, ¿se debe crear otro parche? **No; aplica stop-retry y diagnóstico de causa raíz.**

## Aplicación por rol

### Dirección

Debe leer un PASS visible como resultado de una cadena completa, no como sinónimo de “el archivo existe”. Puede exigir evidencia de runtime antes de aceptar visualmente.

### Operativo

Debe reportar la diferencia entre dato faltante, acceso restringido y elemento no renderizado; no debe resolver un problema de visualización alterando datos.

### Asesor

Debe respetar scopes y usar gestiones de corrección cuando falte una relación o dato fuera de su autorización. Una falla de acceso no autoriza reasignar, borrar o modificar información protegida.

### Equipo técnico/QA

Debe mantener owner, registry, validator, workflow, frozen baseline y documentación sincronizados; una firma textual histórica no puede reemplazar una comprobación semántica vigente.

## Evidencia de referencia

- aceptación Aseguradoras: run `33284848913`.
- rootfix reusable: run `33286857084`.
- package closure: run `33286888487`.
- owner lineage: run `33287054078`.
- cierre técnico: `docs/ROOTFIX-APPROVED-MODULE-RUNTIME-CLOSURE-20260829.md`.

## Frontera

Esta actualización es curricular/documental. No modifica `modules/academia.js`, `data/`, runtime ni producción dentro de este cierre. Su materialización futura dentro de la UI de Academia deberá respetar el baseline vigente y el mecanismo normal de aceptación de producto.

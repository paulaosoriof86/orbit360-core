# DIAGNÓSTICO DE CAUSA RAÍZ — COMPOSICIÓN RUNTIME DE MÓDULOS

Fecha: 2026-08-28  
Proyecto: Orbit 360 / A&S  
Baseline inspeccionado: `d4d1b7133354ae3e439d408a6ed282f1bf922800`  
Source-stage: `ays/source-stage-runtime-composition-v20260828`  
Producción/datos/deploy: no tocados

## 1. Clasificación

- Primaria: `PIPELINE_MECHANISM_FAILURE`
- Secundaria: `VALIDATOR_STALE`
- No corresponde: reimportación, corrupción de datos, pérdida del código aprobado o reconstrucción del módulo.

## 2. Causa raíz demostrada

El mecanismo vigente podía certificar o preservar archivos aprobados por existencia/digest/linaje sin demostrar que la capacidad aprobada fuese alcanzable desde el entrypoint operativo real.

En Aseguradoras, la capacidad OP-2 aprobada seguía presente en el repositorio, incluida la corrección v1.223 para `revealCredential()` resistente a re-render, pero `orbit360-platform/index.html` no cargaba sus owners/policies operativos. Por ello la UI podía volver a una superficie anterior aun cuando el código aprobado no hubiese desaparecido.

El validador histórico `tools/orbit360-validar-aseguradoras-op2.mjs` trataba varias ausencias de integración en `index.html` como warnings, por lo que podía quedar verde aunque el runtime no compusiera la capacidad.

La auditoría acumulativa RC1.2 declaró activos archivos OP-2 que no estaban enlazados por el entrypoint operativo. Esto confirma que se confundió `archivo presente` con `capacidad runtime alcanzable`.

## 3. Corrección source-stage aplicada

Commit de composición: `f80e41c405168df09ac02442b1613eda4db30517`

Se restauró en el entrypoint source-stage la composición de Aseguradoras OP-2:

- `styles/aseguradoras-op2-v1217.css`
- `data/academia-v1217-aseguradoras-op2.js`
- `core/aseguradoras-op2-source-guard.js`
- `core/aseguradoras-op2-import-ui-guard.js`
- `core/aseguradoras-op2-role-visibility.js`
- `core/aseguradoras-op2-operational-access-policy.js`
- `core/aseguradoras-op2-secure-provider-policy-guard.js`
- `modules/aseguradoras-op2-closure-bridge.js`
- `modules/aseguradoras-op2-permission-guard.js`
- `modules/aseguradoras-op2-operational-resources.js`

No se modificaron secretos, datos reales, Firestore, colecciones, providers ni producción.

## 4. Control transversal nuevo

Se agregó el registro estático:

`orbit360-platform/docs/orbit360-runtime-capability-registry-v20260828.json`

Y el validador:

`tools/orbit360-validar-runtime-capability-composition-v20260828.mjs`

Regla nueva fail-closed:

> existencia en repositorio no equivale a reachability runtime.

El validador recorre desde `index.html`, sigue referencias JS literales y exige:

1. que cada script aprobado por el preservation registry sea alcanzable;
2. que cada owner de capacidad registrado sea alcanzable;
3. que los estilos directos obligatorios estén enlazados;
4. que un owner aprobado huérfano bloquee el cierre como `PIPELINE_MECHANISM_FAILURE`.

## 5. Hallazgo transversal adicional

El preservation registry vigente contiene 53 `approvedModuleScripts`. El entrypoint operativo no enlaza directamente todos. Dos (`modules/importar-p0-dashboard.js` y `modules/importar-p0-confirmacion.js`) sí están cargados dinámicamente por `modules/importar.js`, por lo que deben considerarse alcanzables por grafo y no exigirse como `<script>` directo.

En cambio, permanecen bajo revisión de reachability tres scripts aprobados de Aseguradoras:

- `modules/aseguradoras-batch-admin-form-p09j.js`
- `modules/aseguradoras-knowledge-p09.js`
- `modules/aseguradoras-knowledge-panel-p09f.js`

No se deben cargar a ciegas. El nuevo validador debe decidir si son realmente owners runtime vigentes o si el preservation registry quedó stale y deben reclasificarse. Esta distinción evita volver a empalmar una versión antigua para satisfacer un registro desactualizado.

## 6. Cliente 360

El registro transversal incluye `modules/cliente360.js` como owner primario certificado y exige reachability desde el entrypoint. Esto protege el linaje aprobado sin asumir que el defecto visual de listado sea el mismo que Aseguradoras. La composición source actual sí referencia `modules/cliente360.js`; su problema de runtime debe diagnosticarse después de cerrar el gate transversal de composición, no reconstruyendo el módulo.

## 7. Estado de validación

- Escritura source-stage: realizada.
- Relectura GitHub del entrypoint source-stage: confirma la nueva composición OP-2.
- Sintaxis del nuevo validador: comprobada con `node --check` fuera del repositorio.
- Ejecución integral del validador contra checkout source-stage: pendiente por indisponibilidad de red del entorno local de ejecución; el intento de `git clone` falló por resolución DNS y no se sustituyó por una simulación presentada como evidencia real.
- GitHub Actions automático para el commit source-stage: no existe run asociado.

Clasificación de esta imposibilidad puntual: `ENVIRONMENT_FAILURE`. No autoriza modificar producto ni crear un gate paralelo.

## 8. Siguiente acción exacta

1. Ejecutar el validador de composición mediante el mecanismo source-only autorizado/capaz de leer la rama source-stage.
2. Si aparecen owners aprobados huérfanos, resolver cada resultado como una de dos cosas, sin mezclar capas:
   - owner vigente → componerlo correctamente;
   - registro stale/superseded → actualizar el registro/validator, no revivir código antiguo.
3. Obtener `ok:true` del gate transversal de composición.
4. Promover el delta únicamente mediante el mecanismo canónico de source acceptance/certified baseline; no copiar commits manualmente a la rama canónica.
5. Solo entonces ejecutar la comprobación runtime de provider → `credentialRef` → `revealCredential()` y validar visualmente Aseguradoras.
6. Aplicar el mismo control de reachability a Cliente 360 y a los siguientes módulos antes de cualquier revisión uno-a-uno.

## 9. Impacto Claude / Academia

- Clasificación Claude: `REPLICABLE_CLAUDE_ACUMULADO` solo para el patrón de composición/owner; no compartir provider, secretos ni backend.
- Academia: documentar diferencia entre archivo existente, owner aprobado y capacidad realmente alcanzable; reforzar `FUNCTIONAL_DEFECT` vs `VALIDATOR_STALE` vs `PIPELINE_MECHANISM_FAILURE`.

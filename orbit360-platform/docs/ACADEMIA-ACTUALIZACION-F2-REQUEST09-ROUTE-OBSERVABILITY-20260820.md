# Academia Orbit 360 — actualización F2 Request09 / observabilidad de ruta

Fecha: 2026-08-20

## Qué debe enseñar este caso
1. **Readiness de producto no equivale a aceptación visual completa.** Product App puede terminar `started:true` y aun así una ruta posterior de la matriz puede fallar su requisito visual.
2. **Un error de herramienta sin contexto no debe convertirse automáticamente en defecto funcional.** Si Playwright solo informa `#host no visible` sin vista/ruta/DOM, el primer problema es de observabilidad del pipeline.
3. **No se debilita el gate para hacerlo pasar.** El rootfix conserva `state:'visible'`; agrega evidencia estructurada para separar no-renderizado de no-visible.
4. **Una autorización runtime de un solo uso se consume incluso cuando el resultado es fallo.** Request09 no se repite; cualquier nueva ejecución requiere Request10 y autorización fresca.
5. **Integridad before/after es independiente del resultado visual.** Request09 probó cero writes y snapshots idénticos aunque la matriz browser no cerró PASS.
6. **Clasificación correcta:** `PIPELINE_MECHANISM_FAILURE:F2_BROWSER_ROUTE_WAIT_UNLABELED` hasta que una ejecución fresca identifique la vista/ruta y permita decidir si existe `FUNCTIONAL_DEFECT`, `VALIDATOR_STALE` u otra causa.

## Patrón reutilizable
Para cualquier gate browser: etiquetar `vista + rol + ruta`; capturar existencia, contenido, display, visibility, dimensiones, authStage y estado pre-auth; preservar la condición de aceptación original; y evitar replay de una autorización consumida.

Clasificación Claude: **REPLICABLE_CLAUDE_INMEDIATO** para arquitectura de validadores/observabilidad. No incluye datos reales, secretos ni backend protegido.
